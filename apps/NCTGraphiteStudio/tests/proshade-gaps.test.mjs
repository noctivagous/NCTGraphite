import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => server.close());
const lib = await server.ssrLoadModule('../../packages/nctgraphite/src/index.ts');
const model = await server.ssrLoadModule('./src/model.ts');

const doc = () => ({
  name: 'Proshade gaps',
  density: 'compact',
  modules: [],
  root: {
    id: 'root', kind: 'stack', label: 'App', props: {}, children: [
      {
        id: 'panel', kind: 'panel', label: 'Channel Strip', props: { variant: 'raised' }, children: [
          { id: 'slider', kind: 'slider', label: 'Volume', props: { value: 58, min: 0, max: 100 }, children: [] },
          { id: 'toggle', kind: 'toggle', label: 'Mute', props: { checked: false }, children: [] },
          { id: 'seg', kind: 'segmented', label: 'Mode', props: { options: 'One, Two', value: 'One' }, children: [] },
        ],
      },
      {
        id: 'toolbar', kind: 'toolbar', label: 'Toolbar', props: { size: 'sm' }, children: [
          { id: 'icon', kind: 'iconButton', label: 'Star', props: { variant: 'ghost' }, children: [] },
        ],
      },
      { id: 'hidden', kind: 'text', label: 'Secret', props: { hidden: true, locked: true }, children: [] },
    ],
  },
});

test('catalog exposes the Proshade palette gap kinds', () => {
  const catalog = lib.buildLayoutCatalog();
  for (const kind of ['slider', 'toggle', 'segmented', 'panel', 'toolbar', 'iconButton']) {
    assert.ok(catalog.some((e) => e.kind === kind), `catalog covers ${kind}`);
  }
  assert.ok(lib.editablePropsFor('slider').includes('value'));
  assert.ok(lib.editablePropsFor('panel').includes('variant'));
});

test('panel and toolbar are containers; leaf widgets reject children', () => {
  assert.ok(lib.layoutContainers.includes('panel'));
  assert.ok(lib.layoutContainers.includes('toolbar'));
  assert.equal(lib.validLayoutNode({ id: 'x', kind: 'slider', label: 'S', props: {}, children: [{ id: 'y', kind: 'text', label: 'T', props: {}, children: [] }] }), false);
  assert.equal(lib.validLayoutDocument(doc()), true);
});

test('XML round-trips new kinds including the iconButton marker and visibility props', () => {
  const xml = lib.serializeLayoutDocument(doc());
  assert.match(xml, /NCTGraphiteSlider/);
  assert.match(xml, /NCTGraphiteToggle/);
  assert.match(xml, /NCTGraphiteSegmented/);
  assert.match(xml, /NCTGraphitePanel/);
  assert.match(xml, /NCTGraphiteToolbar/);
  assert.match(xml, /iconButton="true"/);
  assert.match(xml, /hidden="true"/);
  const back = lib.parseLayoutDocument(xml);
  assert.deepEqual(back, doc());
  assert.equal(back.root.children[1].children[0].kind, 'iconButton');
});

test('drop coordinates are zoom-corrected and clamped at zero', () => {
  assert.deepEqual(model.dropCoords(100, 80, { left: 20, top: 30 }, 100), { x: 80, y: 50 });
  assert.deepEqual(model.dropCoords(100, 80, { left: 20, top: 30 }, 200), { x: 40, y: 25 });
  assert.deepEqual(model.dropCoords(5, 5, { left: 20, top: 30 }, 100), { x: 0, y: 0 });
});

test('scene drops wrap the widget in a positioned scene item', () => {
  const widget = { ...model.makeNode('button'), props: {} };
  const item = model.wrapInSceneItem(widget, 32, 64);
  assert.equal(item.kind, 'sceneItem');
  assert.deepEqual(item.props, { left: 32, top: 64 });
  assert.deepEqual(item.children, [widget]);
  assert.equal(lib.validLayoutDocument({ name: 'D', density: 'compact', modules: [], root: { id: 'r', kind: 'scene', label: 'S', props: {}, children: [item] } }), true);
});

test('grid snapping rounds to spacing or to whole pixels when off', () => {
  assert.equal(model.snapValue(83, true, 10), 80);
  assert.equal(model.snapValue(87, true, 10), 90);
  assert.equal(model.snapValue(83.4, false, 10), 83);
  assert.equal(model.snapValue(83, true, 20), 80);
});

test('scene resize honors handle direction and minimum dimensions', () => {
  const snap = (v) => Math.round(v);
  const orig = { left: 32, top: 64, width: 340, height: 200 };
  assert.deepEqual(model.resizeSceneRect(orig, 'se', 15, 10, snap), { left: 32, top: 64, width: 355, height: 210 });
  assert.deepEqual(model.resizeSceneRect(orig, 'w', 500, 0, snap), { left: 352, top: 64, width: 20, height: 200 });
  assert.deepEqual(model.resizeSceneRect(orig, 'n', 0, 500, snap), { left: 32, top: 250, width: 340, height: 14 });
});

test('calculator starter is a valid bound scene with bound display logic', async () => {
  const starter = await server.ssrLoadModule('./src/studio/starter.ts');
  const project = starter.starterProject();
  assert.equal(lib.validLayoutDocument(project), true);
  assert.equal(project.root.kind, 'scene');
  const display = lib.findLayoutNode(project.root, 'display');
  assert.equal(display?.kind, 'valueDisplay');
  assert.equal(project.root.props.width, 320);
  assert.equal(project.root.props.height, 440);
  const logic = starter.starterLogic();
  assert.deepEqual(lib.validateAppLogic(logic), []);
  assert.equal(lib.getBindingIssues(project, logic).length, 0);
});

test('wide scene geometry overrides persist and revert to base', () => {
  const node = { id: 's', kind: 'sceneItem', label: 'S', props: { left: 16, top: 16, width: 100, height: 50 }, wide: { left: 32, width: 200 }, children: [] };
  const xml = lib.serializeLayoutDocument({ name: 'D', density: 'compact', modules: [], root: { id: 'r', kind: 'scene', label: 'R', props: {}, children: [node] } });
  assert.match(xml, /wide-left="32"/);
  assert.match(xml, /wide-width="200"/);
  const back = lib.parseLayoutDocument(xml);
  assert.deepEqual(lib.findLayoutNode(back.root, 's').wide, { left: 32, width: 200 });
  const reverted = lib.updateLayoutNode(back.root, 's', (n) => { const next = { ...n }; delete next.wide; return next; });
  assert.equal(lib.findLayoutNode(reverted, 's').wide, undefined);
  assert.equal(lib.validLayoutDocument({ name: 'D', density: 'compact', modules: [], root: reverted }), true);
});

test('scene styles keep item wrappers pass-through and children filling frames', () => {
  const css = readFileSync(new URL('../src/studio.css', import.meta.url), 'utf8');
  assert.match(css, /\.preview-node\[data-kind="scene"\][\s\S]*?position:\s*static/);
  assert.match(css, /\.preview-node\[data-kind="sceneItem"\][\s\S]*?width:\s*100%/);
});

test('canvas reparent keeps documents valid and refuses cycles', () => {
  const root = doc().root;
  const moved = lib.moveLayoutNode(root, 'slider', 'toolbar', 1);
  assert.equal(moved.children[1].children[1].id, 'slider');
  assert.equal(lib.validLayoutDocument({ name: 'D', density: 'compact', modules: [], root: moved }), true);
  const panel = lib.findLayoutNode(root, 'panel');
  assert.ok(lib.findLayoutNode(panel, 'slider'));
  assert.deepEqual(lib.moveLayoutNode(root, 'panel', 'slider', 0), root);
  assert.deepEqual(lib.moveLayoutNode(root, 'root', 'panel', 0), root);
});

test('scene reparent repositions with snapped coordinates in one edit', () => {
  const root = doc().root;
  const node = lib.findLayoutNode(root, 'slider');
  const pt = model.dropCoords(120, 90, { left: 20, top: 30 }, 100);
  const placed = { ...node, props: { ...node.props, left: model.snapValue(pt.x, true, 10), top: model.snapValue(pt.y, true, 10) } };
  const next = lib.updateLayoutNode(lib.removeLayoutNode(root, 'slider'), 'toolbar', (n) => ({ ...n, children: [...n.children, placed] }));
  assert.equal(lib.findLayoutNode(next, 'slider').props.left, 100);
  assert.equal(lib.findLayoutNode(next, 'slider').props.top, 60);
  assert.equal(lib.findLayoutNode(next, 'panel').children.length, 2);
});

test('tree moves respect containers and cycles for the new kinds', () => {
  const root = doc().root;
  const moved = lib.moveLayoutNode(root, 'slider', 'toolbar', 1);
  assert.equal(moved.children[1].children[1].id, 'slider');
  assert.deepEqual(lib.moveLayoutNode(root, 'panel', 'slider', 0), root);
});
