import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { NCTGraphiteAccordion, NCTGraphiteButton, NCTGraphiteCheckbox, NCTGraphiteColumns, NCTGraphiteDualRange, NCTGraphiteFader, NCTGraphiteField, NCTGraphiteGrid, NCTGraphiteImageWell, NCTGraphiteKnob, NCTGraphiteLayoutItem, NCTGraphiteList, NCTGraphiteMeter, NCTGraphiteOverlay, NCTGraphitePanel, NCTGraphiteProgress, NCTGraphiteScene, NCTGraphiteSceneItem, NCTGraphiteSegmented, NCTGraphiteSeparator, NCTGraphiteSlider, NCTGraphiteStack, NCTGraphiteTabs, NCTGraphiteTextArea, NCTGraphiteToggle, NCTGraphiteToolbar, NCTGraphiteValueDisplay } from '@nct/nctgraphite';
import { parseNCTOptionList, resolveNodeProp, type AppLogic, type PreviewValues } from '@nct/nctgraphite';
import { containers, labels, resizeSceneRect } from '../model';
import type { Node, SavedModule, SceneRect } from '../model';
import { GRID_DEFAULT_COLUMNS } from './constants';

const RESIZE_HANDLES: { dir: string; cursor: string; pos: CSSProperties }[] = [
  { dir: 'nw', cursor: 'nwse-resize', pos: { left: -6, top: -6 } },
  { dir: 'n', cursor: 'ns-resize', pos: { left: '50%', top: -6, marginLeft: -6 } },
  { dir: 'ne', cursor: 'nesw-resize', pos: { right: -6, top: -6 } },
  { dir: 'e', cursor: 'ew-resize', pos: { right: -6, top: '50%', marginTop: -6 } },
  { dir: 'se', cursor: 'nwse-resize', pos: { right: -6, bottom: -6 } },
  { dir: 's', cursor: 'ns-resize', pos: { left: '50%', bottom: -6, marginLeft: -6 } },
  { dir: 'sw', cursor: 'nesw-resize', pos: { left: -6, bottom: -6 } },
  { dir: 'w', cursor: 'ew-resize', pos: { left: -6, top: '50%', marginTop: -6 } },
];

/** Pointer move/resize overlay for the selected scene item (design mode only).
 * Live-updates the scene element during the gesture and commits one undo step
 * on release. Pointer deltas are corrected for canvas zoom. */
export function SceneSelectionOverlay({ artRef, node, zoom, snap, revision, onCommit }: {
  artRef: React.RefObject<HTMLDivElement | null>; node: Node; zoom: number;
  snap: (v: number) => number; revision: unknown;
  onCommit: (id: string, patch: Record<string, string | number | boolean>) => void;
}) {
  const [box, setBox] = useState<SceneRect | null>(null);
  const gesture = useRef<null | { mode: 'move' | 'resize'; dir: string; startX: number; startY: number; orig: SceneRect; el: HTMLElement; moved: boolean }>(null);
  useLayoutEffect(() => {
    const art = artRef.current;
    const wrap = art?.querySelector(`[data-node-id="${node.id}"]`);
    const el = wrap?.lastElementChild as HTMLElement | null;
    if (!art || !wrap || !el) { setBox(null); return; }
    const scale = zoom > 0 ? zoom / 100 : 1;
    const num = (v: unknown, fallback: number) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
    const r = el.getBoundingClientRect();
    const artRect = art.getBoundingClientRect();
    setBox({
      left: (r.left - artRect.left) / scale,
      top: (r.top - artRect.top) / scale,
      width: num(node.props.width, r.width / scale),
      height: num(node.props.height, r.height / scale),
    });
    void revision;
  }, [artRef, node, zoom, revision]);
  if (!box) return null;
  const scale = zoom > 0 ? zoom / 100 : 1;
  const num = (v: unknown, fallback: number) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  function sceneEl(): HTMLElement | null {
    const wrap = artRef.current?.querySelector(`[data-node-id="${node.id}"]`);
    return (wrap?.lastElementChild as HTMLElement | null) ?? null;
  }
  function paint(el: HTMLElement, rect: SceneRect, includeSize: boolean) {
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;
    if (includeSize) { el.style.width = `${rect.width}px`; el.style.height = `${rect.height}px`; }
    setBox(rect);
  }
  function begin(e: React.PointerEvent, mode: 'move' | 'resize', dir: string) {
    const el = sceneEl();
    if (!el) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    gesture.current = {
      mode, dir, startX: e.clientX, startY: e.clientY, moved: false, el,
      orig: {
        left: num(node.props.left, 0),
        top: num(node.props.top, 0),
        width: num(node.props.width, r.width / scale),
        height: num(node.props.height, r.height / scale),
      },
    };
  }
  function advance(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    e.preventDefault();
    const dx = (e.clientX - g.startX) / scale;
    const dy = (e.clientY - g.startY) / scale;
    if (!g.moved && Math.abs(e.clientX - g.startX) + Math.abs(e.clientY - g.startY) < 3) return;
    g.moved = true;
    if (g.mode === 'move') {
      const rect = { ...g.orig, left: Math.max(0, snap(g.orig.left + dx)), top: Math.max(0, snap(g.orig.top + dy)) };
      paint(g.el, rect, false);
    } else {
      paint(g.el, resizeSceneRect(g.orig, g.dir, dx, dy, snap), true);
    }
  }
  function finish(e: React.PointerEvent) {
    const g = gesture.current;
    gesture.current = null;
    if (!g?.moved) return;
    const style = g.el.style;
    const patch: Record<string, string | number | boolean> = {
      left: Math.round(parseFloat(style.left) || 0),
      top: Math.round(parseFloat(style.top) || 0),
    };
    if (g.mode === 'resize' || node.props.width !== undefined) patch.width = Math.round(parseFloat(style.width) || g.orig.width);
    if (g.mode === 'resize' || node.props.height !== undefined) patch.height = Math.round(parseFloat(style.height) || g.orig.height);
    onCommit(node.id, patch);
    void e;
  }
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
    <div
      onPointerDown={e => begin(e, 'move', '')} onPointerMove={advance} onPointerUp={finish} onPointerCancel={() => { gesture.current = null; }}
      title="Drag to move"
      style={{ position: 'absolute', left: box.left, top: box.top, width: Math.max(box.width, 8), height: Math.max(box.height, 8), cursor: 'move', pointerEvents: 'auto', border: '1px solid #679ce8' }}
    >
      {RESIZE_HANDLES.map(h => <span
        key={h.dir}
        onPointerDown={e => begin(e, 'resize', h.dir)} onPointerMove={advance} onPointerUp={finish} onPointerCancel={() => { gesture.current = null; }}
        title={`Resize ${h.dir}`}
        style={{ position: 'absolute', width: 12, height: 12, background: '#679ce8', border: '1px solid white', borderRadius: 2, cursor: h.cursor, pointerEvents: 'auto', ...h.pos }}
      />)}
    </div>
  </div>;
}

export function Preview({ node, modules, selected, select, logic, values, onValue, onCommand, widePreview = false, seen = new Set<string>(), dropId = null, onNodeDragStart = null }: { node: Node; modules: SavedModule[]; selected: string; select: (id: string) => void; logic?: AppLogic; values?: PreviewValues; onValue?: (key: string, value: string | number | boolean) => void; onCommand?: (id: string) => void; widePreview?: boolean; seen?: Set<string>; dropId?: string | null; onNodeDragStart?: ((id: string, e: React.DragEvent) => void) | null }) {
  const children = node.children.map(child => <Preview key={child.id} node={child} modules={modules} selected={selected} select={select} logic={logic} values={values} onValue={onValue} onCommand={onCommand} widePreview={widePreview} seen={seen} dropId={dropId} onNodeDragStart={onNodeDragStart} />);
  const wide = widePreview ? node.wide ?? {} : {};
  const valueBinding = logic?.bindings.find(b => b.nodeId === node.id && b.prop === 'value' && b.stateKey);
  const boundValue = valueBinding?.stateKey && values ? values[valueBinding.stateKey] : undefined;
  const changeBoundValue = (value: string | number | boolean) => {
    if (valueBinding?.stateKey) onValue?.(valueBinding.stateKey, value);
  };
  const command = logic?.bindings.find(b => b.nodeId === node.id && b.commandId)?.commandId;
  const hidden = node.props.hidden === true;
  const locked = node.props.locked === true;
  if (hidden && logic) return <></>;
  let content;
  switch (node.kind) {
    case 'stack': case 'row': content = <NCTGraphiteStack direction={node.kind === 'row' ? 'row' : 'column'} gap="var(--nct-content-gap)" {...node.props}>{children}</NCTGraphiteStack>; break;
    case 'grid': content = <NCTGraphiteGrid gap="var(--nct-content-gap)" {...node.props} columns={(wide.columns as string) ?? (node.props.columns as string) ?? GRID_DEFAULT_COLUMNS}>{children}</NCTGraphiteGrid>; break;
    case 'overlay': content = <NCTGraphiteOverlay {...node.props}>{children}</NCTGraphiteOverlay>; break;
    case 'accordion': content = <NCTGraphiteAccordion title={node.label} defaultOpen {...node.props}>{children}</NCTGraphiteAccordion>; break;
    case 'columns': content = <NCTGraphiteColumns {...node.props}>{children}</NCTGraphiteColumns>; break;
    case 'scene': content = <NCTGraphiteScene {...node.props}>{children}</NCTGraphiteScene>; break;
    case 'sceneItem': {
      const wideGeo: Record<string, string | number> = {};
      if (widePreview) {
        const len = (v: unknown) => typeof v === 'string' || typeof v === 'number' ? v : undefined;
        for (const k of ['left', 'top', 'right', 'bottom', 'width', 'height'] as const) {
          const v = len(node.wide?.[k]);
          if (v !== undefined) wideGeo[k] = v;
        }
        if (typeof node.wide?.zIndex === 'number') wideGeo.zIndex = node.wide.zIndex;
      }
      content = <NCTGraphiteSceneItem {...node.props} {...wideGeo}>{children}</NCTGraphiteSceneItem>; break;
    }
    case 'layoutItem': content = <NCTGraphiteLayoutItem {...node.props}>{children}</NCTGraphiteLayoutItem>; break;
    case 'text': content = <span className="preview-text">{logic && values ? String(resolveNodeProp(node, logic, values)) : node.label}</span>; break;
    case 'button': content = <NCTGraphiteButton label={logic && values ? String(resolveNodeProp(node, logic, values)) : node.label} {...node.props} onClick={command ? () => onCommand?.(command) : undefined} />; break;
    case 'field': content = <NCTGraphiteField {...node.props} label={logic && values ? String(resolveNodeProp(node, logic, values)) : node.label} {...(typeof boundValue === 'string' ? { value: boundValue } : {})} onChange={changeBoundValue} />; break;
    case 'textArea': content = <NCTGraphiteTextArea {...node.props} label={logic && values ? String(resolveNodeProp(node, logic, values)) : node.label} {...(typeof boundValue === 'string' ? { value: boundValue } : {})} onChange={changeBoundValue} />; break;
    case 'checkbox': content = <NCTGraphiteCheckbox {...node.props} label={logic && values ? String(resolveNodeProp(node, logic, values)) : node.label} {...(typeof boundValue === 'boolean' ? { checked: boundValue } : {})} onChange={changeBoundValue} />; break;
    case 'tabs': {
      const options = parseNCTOptionList(node.props.options) ?? [{ value: 'one', label: 'One' }];
      content = <NCTGraphiteTabs {...node.props} options={options} {...(typeof boundValue === 'string' ? { value: boundValue } : {})} onChange={changeBoundValue} />; break;
    }
    case 'list': {
      const options = parseNCTOptionList(node.props.options) ?? [{ value: 'one', label: 'One' }];
      content = <NCTGraphiteList {...node.props} options={options} {...(typeof boundValue === 'string' ? { value: boundValue } : {})} onChange={changeBoundValue} />; break;
    }
    case 'imageWell': content = <NCTGraphiteImageWell {...node.props} label={node.label} onBrowse={() => {}} />; break;
    case 'separator': content = <NCTGraphiteSeparator {...node.props} />; break;
    case 'progress': content = <NCTGraphiteProgress value={Number(boundValue ?? node.props.value ?? 0)} max={Number(node.props.max ?? 100)} />; break;
    case 'knob': content = <NCTGraphiteKnob label={node.label} value={Number(boundValue ?? node.props.value ?? 50)} min={Number(node.props.min ?? 0)} max={Number(node.props.max ?? 100)} onChange={changeBoundValue} />; break;
    case 'fader': content = <NCTGraphiteFader label={node.label} value={Number(boundValue ?? node.props.value ?? 50)} min={Number(node.props.min ?? 0)} max={Number(node.props.max ?? 100)} onChange={changeBoundValue} />; break;
    case 'dualRange': content = <NCTGraphiteDualRange label={node.label} min={Number(node.props.min ?? 0)} max={Number(node.props.max ?? 100)} onChange={() => {}} />; break;
    case 'meter': content = <NCTGraphiteMeter label={node.label} value={Number(boundValue ?? node.props.value ?? 0)} min={Number(node.props.min ?? 0)} max={Number(node.props.max ?? 100)} />; break;
    case 'valueDisplay': {
      const bound = logic && values ? logic.bindings.find(b => b.nodeId === node.id && b.prop === 'value' && b.stateKey) : undefined;
      const boundValue = bound?.stateKey && values ? values[bound.stateKey] : undefined;
      content = <NCTGraphiteValueDisplay label={node.label} value={(boundValue as string | number) ?? (node.props.value as string | number) ?? ''} />; break;
    }
    case 'slider': content = <NCTGraphiteSlider label={node.label} value={Number(typeof boundValue === 'number' ? boundValue : node.props.value ?? 50)} min={Number(node.props.min ?? 0)} max={Number(node.props.max ?? 100)} step={Number(node.props.step ?? 1)} onChange={changeBoundValue} />; break;
    case 'toggle': {
      const checkedBinding = logic?.bindings.find(b => b.nodeId === node.id && b.prop === 'checked' && b.stateKey);
      const checkedValue = checkedBinding?.stateKey && values ? values[checkedBinding.stateKey] : undefined;
      content = <NCTGraphiteToggle label={node.label} checked={typeof checkedValue === 'boolean' ? checkedValue : Boolean(node.props.checked ?? false)} onChange={(v) => { if (checkedBinding?.stateKey) onValue?.(checkedBinding.stateKey, v); else changeBoundValue(v); }} />; break;
    }
    case 'segmented': {
      const options = parseNCTOptionList(node.props.options) ?? [{ value: 'one', label: 'One' }];
      content = <NCTGraphiteSegmented label={node.label} options={options} value={typeof boundValue === 'string' ? boundValue : String(node.props.value ?? options[0].value)} onChange={changeBoundValue} />; break;
    }
    case 'panel': content = <NCTGraphitePanel title={node.label} {...node.props}>{children}</NCTGraphitePanel>; break;
    case 'toolbar': content = <NCTGraphiteToolbar {...node.props}>{children}</NCTGraphiteToolbar>; break;
    case 'iconButton': content = <NCTGraphiteButton label={logic && values ? String(resolveNodeProp(node, logic, values)) : node.label} {...node.props} variant="ghost" onClick={command ? () => onCommand?.(command) : undefined} />; break;
    case 'module': {
      const def = modules.find(m => m.id === node.moduleId);
      content = def && !seen.has(def.id)
        ? <Preview node={def.root} modules={modules} selected={selected} select={select} logic={logic} values={values} onValue={onValue} onCommand={onCommand} widePreview={widePreview} seen={new Set(seen).add(def.id)} dropId={dropId} onNodeDragStart={onNodeDragStart} />
        : <span className="preview-text">{node.label}</span>;
      break;
    }
  }
  const movable = onNodeDragStart != null && selected === node.id && !locked && !logic;
  const previewing = logic !== undefined;
  return <div className={`preview-node ${selected === node.id && !previewing ? 'is-selected' : ''}${hidden && !previewing ? ' is-hidden' : ''}${locked ? ' is-locked' : ''}${dropId === node.id ? ' drop-target' : ''}`} data-node-id={node.id} data-kind={node.kind} {...(containers.includes(node.kind) ? { 'data-container': 'true' } : {})} draggable={movable} onDragStart={movable && onNodeDragStart ? e => onNodeDragStart(node.id, e) : undefined} style={hidden && !previewing ? { opacity: 0.45 } : undefined} onClick={previewing ? undefined : e => { e.stopPropagation(); if (!locked) select(node.id); }}><span className="node-tag">{locked ? 'locked · ' : ''}{hidden ? 'hidden · ' : ''}{dropId === node.id ? 'drop here · ' : ''}{labels[node.kind]}</span>{content}</div>;
}
