import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => server.close());
const { NCTGraphiteStack, NCTGraphiteGrid, NCTGraphiteOverlay, NCTGraphiteAccordion, NCTGraphiteToolbar, NCTGraphiteScene, NCTGraphiteSceneItem, NCTGraphiteLayoutItem, NCTGraphiteColumns, NCTGraphiteLayoutShell, NCTGraphiteBaseline } = await server.ssrLoadModule('../../packages/nctgraphite/src/index.ts');
const render = (component, props, ...children) => renderToStaticMarkup(React.createElement(component, props, ...children));

test('stack composes a wrapping row with baseline alignment', () => {
  const html = render(NCTGraphiteStack, { direction: 'row', align: 'baseline', wrap: true, gap: 8 }, 'A', 'B');
  assert.match(html, /flex-direction:row/); assert.match(html, /align-items:baseline/); assert.match(html, /flex-wrap:wrap/); assert.match(html, /gap:8px/);
});
test('grid preserves explicit tracks and gap', () => {
  const html = render(NCTGraphiteGrid, { columns: '12rem minmax(0, 1fr)', gap: 'var(--gap)' }, 'A');
  assert.match(html, /grid-template-columns:12rem minmax\(0, 1fr\)/); assert.match(html, /gap:var\(--gap\)/);
});
test('stack supports inner spacing and wrapped-line distribution', () => {
  const html = render(NCTGraphiteStack, { direction: 'row', wrap: true, alignContent: 'between', padding: 12 }, 'A', 'B');
  assert.match(html, /flex-wrap:wrap/); assert.match(html, /align-content:space-between/); assert.match(html, /padding:12px/);
});
test('stack passes through CSS padding values', () => {
  const html = render(NCTGraphiteStack, { padding: 'var(--preview-gap)' }, 'A');
  assert.match(html, /padding:var\(--preview-gap\)/);
});
test('grid distributes tracks and pads its content box', () => {
  const html = render(NCTGraphiteGrid, { columns: 'repeat(2, 1fr)', alignContent: 'center', justifyContent: 'space-between', padding: 'var(--gap)' }, 'A');
  assert.match(html, /align-content:center/); assert.match(html, /justify-content:space-between/); assert.match(html, /padding:var\(--gap\)/);
});
test('grid sizes implicit tracks and honors template shorthand', () => {
  const implicit = render(NCTGraphiteGrid, { columns: '1fr', autoFlow: 'row dense', autoRows: 'minmax(2rem, auto)', autoColumns: '8rem' }, 'A');
  assert.match(implicit, /grid-auto-flow:row dense/); assert.match(implicit, /grid-auto-rows:minmax\(2rem, auto\)/); assert.match(implicit, /grid-auto-columns:8rem/);
  const shorthand = render(NCTGraphiteGrid, { template: 'auto 1fr / 12rem 1fr' }, 'A');
  assert.match(shorthand, /grid-template:auto 1fr \/ 12rem 1fr/);
});
test('overlay layers children in order without absolute positioning', () => {
  const html = render(NCTGraphiteOverlay, { align: 'center' }, React.createElement('span', { key: 'a' }, 'First'), React.createElement('span', { key: 'b' }, 'Second'));
  assert.equal((html.match(/grid-area:1 \/ 1/g) || []).length, 2); assert.ok(html.indexOf('First') < html.indexOf('Second')); assert.doesNotMatch(html, /position:absolute/);
});
test('accordion and toolbar expose native disclosure and orientation semantics', () => {
  assert.match(render(NCTGraphiteAccordion, { title: 'Section', defaultOpen: true }, 'Content'), /<details[^>]*open=""/);
  assert.match(render(NCTGraphiteToolbar, { orientation: 'vertical' }, 'Action'), /role="toolbar" aria-orientation="vertical"/);
});

test('scene provides a coordinate space and pinned item with explicit size', () => {
  const item = React.createElement(NCTGraphiteSceneItem, { left: 12, top: 4, right: 12, height: 40 }, 'Positioned');
  const html = render(NCTGraphiteScene, { width: 400, height: 200, overflow: 'hidden' }, item);
  assert.match(html, /position:relative;width:400px;height:200px;overflow:hidden/);
  assert.match(html, /position:absolute;left:12px;top:4px;right:12px;height:40px/);
});
test('layout item supplies flex sizing and grid placement', () => {
  const html = render(NCTGraphiteLayoutItem, { grow: 1, basis: '12rem', column: '2 / span 2', row: '1' }, 'Content');
  assert.match(html, /flex-grow:1/); assert.match(html, /flex-basis:12rem/);
  assert.match(html, /grid-column:2 \/ span 2/); assert.match(html, /grid-row:1/);
});
test('columns flow content in reading order', () => {
  const html = render(NCTGraphiteColumns, { count: 3, width: '12rem', gap: 16 }, 'Text');
  assert.match(html, /column-count:3/); assert.match(html, /column-width:12rem/); assert.match(html, /column-gap:16px/);
});

test('layout shell composes header, body regions and footer in reading order', () => {
  const html = render(NCTGraphiteLayoutShell, { header: React.createElement('header', null, 'Header'), footer: React.createElement('footer', null, 'Footer'), columns: '1fr' }, React.createElement('main', null, 'Main'));
  assert.ok(html.indexOf('Header') < html.indexOf('Main')); assert.ok(html.indexOf('Main') < html.indexOf('Footer'));
  assert.match(html, /grid-template-columns:1fr/);
});
test('grid breakpoints render the base tracks on the server', () => {
  const html = render(NCTGraphiteGrid, { columns: '1fr', breakpoints: [{ minWidth: 800, columns: '1fr 1fr' }, { minWidth: 1200, columns: '1fr 1fr 1fr' }] }, 'A');
  assert.match(html, /grid-template-columns:1fr/);
});
test('baseline paints rules on the line rhythm', () => {
  const html = render(NCTGraphiteBaseline, { line: 8, color: 'red' });
  assert.match(html, /repeating-linear-gradient\(to bottom, red 0, red 1px, transparent 1px, transparent 8px\)/);
  assert.match(html, /aria-hidden="true"/);
});
test('baseline accepts CSS rhythm units and offsets', () => {
  const html = render(NCTGraphiteBaseline, { line: 'var(--rhythm)', offset: 2 });
  assert.match(html, /transparent var\(--rhythm\)/); assert.match(html, /background-position-y:2px/);
});
