import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { NCTGraphiteAccordion, NCTGraphiteButton, NCTGraphiteColumns, NCTGraphiteGrid, NCTGraphiteLayoutItem, NCTGraphiteLayoutShell, NCTGraphiteOverlay, NCTGraphitePanel, NCTGraphiteScene, NCTGraphiteSceneItem, NCTGraphiteStack, NCTGraphiteToolbar } from '@nct/nctgraphite';
import { buildLayoutCatalog, editablePropsFor, parseLayoutDocument, serializeLayoutDocument } from '@nct/nctgraphite';
import { cloneWithIds, containers, duplicateNode, find, instantiateModule, labels, makeNode, moveNode, remove, removeModuleRefs, update, validDocument, validModule, validNode, migrateLegacyStudioProject, type Kind, type Node, type Project, type SavedModule } from './model';

const initial: Project = { name: 'Untitled app', density: 'compact', modules: [], root: { id: 'root', kind: 'stack', label: 'App layout', props: {}, children: [{ id: 'intro', kind: 'text', label: 'Welcome to your app', props: {}, children: [] }, { id: 'section', kind: 'accordion', label: 'Controls', props: {}, children: [{ id: 'action', kind: 'button', label: 'Get started', props: {}, children: [] }] }] } };

const PREVIEW_WIDTHS = [360, 768, 1280];

const GRID_DEFAULT_COLUMNS = 'repeat(2, minmax(0, 1fr))';

function defaultsFor(kind: Kind): Node['props'] {
  if (kind === 'grid') return { columns: GRID_DEFAULT_COLUMNS };
  return {};
}

function parentOf(node: Node, id: string): Node | undefined {
  for (const child of node.children) {
    if (child.id === id) return node;
    const hit = parentOf(child, id);
    if (hit) return hit;
  }
  return undefined;
}

function Tree({ node, modules, selected, select, depth = 0 }: { node: Node; modules: SavedModule[]; selected: string; select: (id: string) => void; depth?: number }) {
  const name = node.kind === 'module' ? modules.find(m => m.id === node.moduleId)?.name ?? node.label : node.label || labels[node.kind];
  return <><button className={`tree-item ${selected === node.id ? 'selected' : ''}`} style={{ paddingLeft: 10 + depth * 15 }} onClick={() => select(node.id)}><span className="tree-icon">{containers.includes(node.kind) ? '▾' : '·'}</span>{name}<span className="tree-kind">{node.kind}</span></button>{node.children.map(child => <Tree key={child.id} node={child} modules={modules} selected={selected} select={select} depth={depth + 1} />)}</>;
}

function Preview({ node, modules, selected, select, seen = new Set<string>() }: { node: Node; modules: SavedModule[]; selected: string; select: (id: string) => void; seen?: Set<string> }) {
  const children = node.children.map(child => <Preview key={child.id} node={child} modules={modules} selected={selected} select={select} seen={seen} />);
  const wide = node.wide ?? {};
  let content;
  switch (node.kind) {
    case 'stack': case 'row': content = <NCTGraphiteStack direction={node.kind === 'row' ? 'row' : 'column'} gap="var(--nct-content-gap)" {...node.props}>{children}</NCTGraphiteStack>; break;
    case 'grid': content = <NCTGraphiteGrid gap="var(--nct-content-gap)" {...node.props} columns={(wide.columns as string) ?? (node.props.columns as string) ?? GRID_DEFAULT_COLUMNS}>{children}</NCTGraphiteGrid>; break;
    case 'overlay': content = <NCTGraphiteOverlay {...node.props}>{children}</NCTGraphiteOverlay>; break;
    case 'accordion': content = <NCTGraphiteAccordion title={node.label} defaultOpen {...node.props}>{children}</NCTGraphiteAccordion>; break;
    case 'columns': content = <NCTGraphiteColumns {...node.props}>{children}</NCTGraphiteColumns>; break;
    case 'scene': content = <NCTGraphiteScene {...node.props}>{children}</NCTGraphiteScene>; break;
    case 'sceneItem': content = <NCTGraphiteSceneItem {...node.props}>{children}</NCTGraphiteSceneItem>; break;
    case 'layoutItem': content = <NCTGraphiteLayoutItem {...node.props}>{children}</NCTGraphiteLayoutItem>; break;
    case 'text': content = <span className="preview-text">{node.label}</span>; break;
    case 'button': content = <NCTGraphiteButton label={node.label} {...node.props} />; break;
    case 'module': {
      const def = modules.find(m => m.id === node.moduleId);
      content = def && !seen.has(def.id)
        ? <Preview node={def.root} modules={modules} selected={selected} select={select} seen={new Set(seen).add(def.id)} />
        : <span className="preview-text">{node.label}</span>;
      break;
    }
  }
  return <div className={`preview-node ${selected === node.id ? 'is-selected' : ''}`} onClick={e => { e.stopPropagation(); select(node.id); }}><span className="node-tag">{labels[node.kind]}</span>{content}</div>;
}

function coerceInput(raw: string): string | number | boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(raw.trim()) && raw.trim() !== '') return Number(raw);
  return raw;
}

export default function App() {
  const [project, setProject] = useState<Project>(initial);
  const [past, setPast] = useState<Project[]>([]);
  const [future, setFuture] = useState<Project[]>([]);
  const [selectedId, setSelected] = useState('section');
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [notice, setNotice] = useState('Ready');
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const editingModule = editingModuleId ? project.modules.find(m => m.id === editingModuleId) ?? null : null;
  const activeRoot = editingModule?.root ?? project.root;
  const selected = find(activeRoot, selectedId) ?? activeRoot;
  const catalog = useMemo(buildLayoutCatalog, []);

  const commit = (next: Project) => {
    setPast(p => [...p.slice(-49), structuredClone(project)]);
    setFuture([]);
    setProject(next);
  };
  const changeTree = (fn: (root: Node) => Node) => {
    const next: Project = editingModuleId
      ? { ...project, modules: project.modules.map(m => m.id === editingModuleId ? { ...m, root: fn(m.root) } : m) }
      : { ...project, root: fn(project.root) };
    commit(next);
  };
  function undo() {
    const prev = past[past.length - 1];
    if (!prev) { setNotice('Nothing to undo'); return; }
    setPast(p => p.slice(0, -1));
    setFuture(f => [...f, structuredClone(project)]);
    setProject(prev);
    setNotice('Undone');
  }
  function redo() {
    const next = future[future.length - 1];
    if (!next) { setNotice('Nothing to redo'); return; }
    setFuture(f => f.slice(0, -1));
    setPast(p => [...p.slice(-49), structuredClone(project)]);
    setProject(next);
    setNotice('Redone');
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function add(kind: Kind) {
    const parent = containers.includes(selected.kind) ? selected : project.root;
    const child = { ...makeNode(kind), props: defaultsFor(kind) };
    changeTree(root => update(root, parent.id, n => ({ ...n, children: [...n.children, child] })));
    setSelected(child.id);
    setNotice(`Added ${labels[kind]} to ${parent.label}`);
  }
  function moveSelected(delta: -1 | 1) {
    if (selected.id === activeRoot.id) return;
    const parent = parentOf(activeRoot, selected.id);
    if (!parent) return;
    const index = parent.children.findIndex(c => c.id === selected.id);
    changeTree(root => moveNode(root, selected.id, parent.id, index + delta));
    setNotice(`Moved ${selected.label || labels[selected.kind]} ${delta < 0 ? 'up' : 'down'}`);
  }
  function indentSelected() {
    if (selected.id === activeRoot.id) return;
    const parent = parentOf(activeRoot, selected.id);
    if (!parent) return;
    const index = parent.children.findIndex(c => c.id === selected.id);
    const prev = parent.children[index - 1];
    if (!prev || !containers.includes(prev.kind)) { setNotice('Nothing to indent under'); return; }
    changeTree(root => moveNode(root, selected.id, prev.id, prev.children.length));
    setNotice(`Indented under ${prev.label || labels[prev.kind]}`);
  }
  function outdentSelected() {
    if (selected.id === activeRoot.id) return;
    const parent = parentOf(activeRoot, selected.id);
    if (!parent || parent.id === activeRoot.id) { setNotice('Already at top level'); return; }
    const grandparent = parentOf(activeRoot, parent.id);
    if (!grandparent) return;
    const index = grandparent.children.findIndex(c => c.id === parent.id);
    changeTree(root => moveNode(root, selected.id, grandparent.id, index + 1));
    setNotice('Outdented one level');
  }
  function duplicateSelected() {
    if (selected.id === activeRoot.id) { setNotice('Cannot duplicate the root'); return; }
    changeTree(root => duplicateNode(root, selected.id));
    setNotice(`Duplicated ${selected.label || labels[selected.kind]}`);
  }
  function setSelectedProp(name: string, value: string | number | boolean) {
    const id = selected.id;
    changeTree(root => update(root, id, n => ({ ...n, props: { ...n.props, [name]: value } })));
  }
  function setSelectedWide(name: string, value: string | undefined) {
    const id = selected.id;
    changeTree(root => update(root, id, n => {
      const wide = { ...n.wide };
      if (value) wide[name] = value;
      else delete wide[name];
      const next: Node = { ...n };
      if (Object.keys(wide).length > 0) next.wide = wide;
      else delete next.wide;
      return next;
    }));
  }
  function saveAsModule() {
    if (editingModuleId) { setNotice('Finish editing this module before saving a nested module'); return; }
    const node = find(project.root, selectedId);
    if (!node || node.id === project.root.id) { setNotice('Select a component to save as a module'); return; }
    const source = node.kind === 'module' ? project.modules.find(m => m.id === node.moduleId)?.root : node;
    if (!source) { setNotice('That module no longer exists'); return; }
    const def: SavedModule = { id: crypto.randomUUID(), name: `${source.label} module`, root: cloneWithIds(source) };
    commit({ ...project, modules: [...project.modules, def] });
    setNotice(`Saved module ${def.name}`);
  }
  function insertModule(id: string) {
    const def = project.modules.find(m => m.id === id);
    if (!def) return;
    if (editingModuleId) { setNotice('Finish editing this module before inserting'); return; }
    const parent = containers.includes(selected.kind) ? selected : project.root;
    const child = instantiateModule(def);
    changeTree(root => update(root, parent.id, n => ({ ...n, children: [...n.children, child] })));
    setSelected(child.id);
    setNotice(`Inserted ${def.name} into ${parent.label}`);
  }
  function deleteModule(id: string) {
    const def = project.modules.find(m => m.id === id);
    if (!def) return;
    if (editingModuleId === id) { setEditingModuleId(null); setSelected(project.root.id); }
    commit({
      ...project,
      modules: project.modules.filter(m => m.id !== id).map(m => ({ ...m, root: removeModuleRefs(m.root, id) })),
      root: removeModuleRefs(project.root, id),
    });
    setNotice(`Deleted module ${def.name} and its instances`);
  }
  function saveJson() {
    const blob = new Blob([JSON.stringify({ format: 'nctgraphite-studio', version: 2, ...project }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${project.name.trim().replace(/[^a-z0-9_-]+/gi, '-') || 'project'}.nctgraphite.json`; a.click(); URL.revokeObjectURL(url); setNotice('Project downloaded as JSON');
  }
  function saveXml() {
    const blob = new Blob([serializeLayoutDocument(project)], { type: 'application/xml' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${project.name.trim().replace(/[^a-z0-9_-]+/gi, '-') || 'project'}.nctgraphite.xml`; a.click(); URL.revokeObjectURL(url); setNotice('Project downloaded as XML');
  }
  async function load(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try {
      const text = await file.text();
      let next: Project | null = null;
      if (text.trimStart().startsWith('<')) {
        next = parseLayoutDocument(text);
      } else {
        const data = JSON.parse(text);
        next = migrateLegacyStudioProject(data);
        if (!next && validDocument(data)) next = data as Project;
      }
      if (!next) throw new Error('Invalid project');
      setPast(p => [...p.slice(-49), structuredClone(project)]);
      setFuture([]);
      setProject(next);
      setEditingModuleId(null); setSelected(next.root.id); setNotice('Project opened');
    } catch { setNotice('Could not open this project: invalid or unsupported file'); }
  }
  const selectedModuleDef = selected.kind === 'module' ? project.modules.find(m => m.id === selected.moduleId) : undefined;
  const selectedEntry = catalog.find(e => e.kind === selected.kind);
  const propNames = editablePropsFor(selected.kind).filter(n => n !== 'label' && n !== 'title');
  const topbar = <header className="topbar"><div className="brand"><span className="brand-mark">N</span><span>NCTGraphite <strong>Studio</strong><small>APP BUILDER</small></span></div><NCTGraphiteLayoutItem className="project-title" grow={1}><span className="status-dot" />{project.name}<span className="title-sub"> / Design workspace</span></NCTGraphiteLayoutItem><NCTGraphiteToolbar className="top-actions" compact size="sm"><button onClick={undo} disabled={past.length === 0} title="Undo">↩</button><button onClick={redo} disabled={future.length === 0} title="Redo">↪</button><button onClick={() => input.current?.click()}>Open</button><button onClick={saveJson}>Save JSON</button><button className="primary" onClick={saveXml}>Save XML</button><input ref={input} hidden type="file" accept=".json,.xml,application/json,application/xml" onChange={load} /></NCTGraphiteToolbar></header>;
  const statusbar = <footer className="statusbar"><span><i className="status-dot" /> {notice}</span><span>NCTGRAPHITE STUDIO &nbsp; / &nbsp; EARLY BUILD</span></footer>;
  const groups = new Map<string, typeof catalog>();
  for (const entry of catalog) {
    const list = groups.get(entry.category) ?? [];
    list.push(entry);
    groups.set(entry.category, list);
  }
  return <NCTGraphiteLayoutShell className="studio" header={topbar} footer={statusbar} columns="190px minmax(280px, 1fr)" wideMinWidth={801} wideColumns="244px minmax(300px, 1fr) 244px" gap={0}>
      <aside className="sidebar left"><div className="sidebar-title">COMPONENTS <span>01</span></div><div className="sidebar-intro">Build from the structure up.<br /><span>Select a container, then add a component.</span></div>{[...groups].map(([category, entries]) => <NCTGraphiteAccordion key={category} title={category[0].toUpperCase() + category.slice(1)} defaultOpen={category === 'layout'}><NCTGraphitePanel variant="well"><div className="palette">{entries.map(e => <button key={e.kind} onClick={() => add(e.kind)} title={e.description}><span>{e.kind === 'text' ? 'T' : '▦'}</span>{labels[e.kind]}<b>+</b></button>)}</div></NCTGraphitePanel></NCTGraphiteAccordion>)}<div className="sidebar-title">MODULES <span>{String(project.modules.length).padStart(2, '0')}</span></div>{editingModule
        ? <div className="sidebar-intro">Editing <strong>{editingModule.name}</strong>.<br /><span>Changes update every instance.</span><br /><button className="primary" onClick={() => { setEditingModuleId(null); setSelected(project.root.id); setNotice('Back to app layout'); }} style={{ marginTop: 8 }}>Done editing</button></div>
        : <><div className="sidebar-intro"><span>Save components as reusable modules, then insert them anywhere.</span><br /><button onClick={saveAsModule} style={{ marginTop: 8 }}>Save selection as module</button></div><div className="tree">{project.modules.map(m => <div key={m.id} className={`tree-item ${selectedModuleDef?.id === m.id ? 'selected' : ''}`}><span className="tree-icon">▣</span>{m.name}<span className="tree-kind"><button onClick={() => insertModule(m.id)} title={`Insert ${m.name}`}>insert</button> <button onClick={() => { setEditingModuleId(m.id); setSelected(m.root.id); setNotice(`Editing ${m.name}`); }} title={`Edit ${m.name}`}>edit</button> <button onClick={() => deleteModule(m.id)} title={`Delete ${m.name}`}>✕</button></span></div>)}</div></>}</aside>
      <main className="editor"><div className="editor-bar"><div><span className="eyebrow">DESIGN</span><span className="bar-separator" /> <strong>{editingModule ? `Module: ${editingModule.name}` : 'Layout canvas'}</strong></div><div className="canvas-mode"><span className="preview-sizes">{[null, ...PREVIEW_WIDTHS].map(w => <button key={String(w)} className={previewWidth === w ? 'primary' : ''} onClick={() => setPreviewWidth(w)} title={w == null ? 'Fluid width' : `${w}px preview`}>{w == null ? 'Fluid' : w}</button>)}</span><span className="status-dot" /> LIVE PREVIEW</div></div><div className="canvas"><div className="canvas-label"><span>{editingModule ? 'MODULE PREVIEW' : 'APP PREVIEW'}</span><span>RESPONSIVE LAYOUT</span></div><div className={`artboard ${project.density}`} data-nct-density={project.density} style={previewWidth ? { maxWidth: previewWidth } : undefined}><div className="artboard-header"><span className="artboard-dot" />{editingModule?.name ?? project.name}{previewWidth ? <span> · {previewWidth}px</span> : null}<span>•••</span></div><div className="artboard-body"><Preview node={activeRoot} modules={project.modules} selected={selectedId} select={setSelected} /></div></div><div className="canvas-help">Select a component on the canvas or in the document tree.</div></div><div className="editor-footer"><span>◈ &nbsp; LAYOUT EDITOR</span><span>Tree-based composition</span></div></main>
      <aside className="sidebar right"><div className="sidebar-title">INSPECTOR <span>02</span></div><div className="selection"><span className="selection-icon">◈</span><div><strong>{selected.kind === 'module' ? selectedModuleDef?.name ?? selected.label : selected.label || labels[selected.kind]}</strong><small>NCTGraphite {labels[selected.kind]}</small></div></div><NCTGraphiteAccordion title="Tree" defaultOpen><NCTGraphitePanel><div className="property tree-ops"><button onClick={() => moveSelected(-1)}>Move up</button><button onClick={() => moveSelected(1)}>Move down</button><button onClick={indentSelected}>Indent</button><button onClick={outdentSelected}>Outdent</button><button onClick={duplicateSelected}>Duplicate</button><button onClick={undo} disabled={past.length === 0}>Undo</button><button onClick={redo} disabled={future.length === 0}>Redo</button></div><div className="tree"><Tree node={activeRoot} modules={project.modules} selected={selectedId} select={setSelected} /></div></NCTGraphitePanel></NCTGraphiteAccordion>{selected.kind === 'module' && selectedModuleDef
        ? <NCTGraphiteAccordion title="Module instance" defaultOpen><NCTGraphitePanel><div className="property"><p>Instances reference {selectedModuleDef.name}. Editing the module updates every instance.</p></div><div className="property"><button onClick={() => { setEditingModuleId(selectedModuleDef.id); setSelected(selectedModuleDef.root.id); setNotice(`Editing ${selectedModuleDef.name}`); }}>Edit module</button></div></NCTGraphitePanel></NCTGraphiteAccordion>
        : <NCTGraphiteAccordion title="Properties" defaultOpen><div className="property"><label htmlFor="node-label">{selected.kind === 'text' ? 'TEXT' : 'LABEL'}</label><input id="node-label" value={selected.label} onChange={e => changeTree(root => update(root, selected.id, n => ({ ...n, label: e.target.value })))} /></div>{selectedEntry ? <div className="property"><label>TYPE</label><div className="readout">{selectedEntry.tag}</div><p>{selectedEntry.description}</p></div> : <div className="property"><label>TYPE</label><div className="readout">{labels[selected.kind]}</div></div>}{propNames.map(name => {
          const meta = selectedEntry?.meta.props[name];
          const value = selected.props[name];
          const types = meta ? (Array.isArray(meta.type) ? meta.type : [meta.type]) : [];
          if (types.includes('boolean')) {
            return <div className="property" key={name}><label htmlFor={`prop-${name}`}>{name}</label><select id={`prop-${name}`} value={String(value ?? meta?.default ?? false)} onChange={e => setSelectedProp(name, e.target.value === 'true')}><option value="true">true</option><option value="false">false</option></select>{meta?.description ? <p>{meta.description}</p> : null}</div>;
          }
          if (types.length > 0 && types.every(t => typeof t === 'string' && !['number', 'string', 'boolean', 'node', 'function', 'array'].includes(t))) {
            return <div className="property" key={name}><label htmlFor={`prop-${name}`}>{name}</label><select id={`prop-${name}`} value={String(value ?? meta?.default ?? types[0])} onChange={e => setSelectedProp(name, e.target.value)}>{types.map(t => <option key={t} value={t}>{t}</option>)}</select>{meta?.description ? <p>{meta.description}</p> : null}</div>;
          }
          return <div className="property" key={name}><label htmlFor={`prop-${name}`}>{name}</label><input id={`prop-${name}`} value={String(value ?? meta?.default ?? '')} placeholder={String(meta?.default ?? '')} onChange={e => setSelectedProp(name, coerceInput(e.target.value))} />{meta?.description ? <p>{meta.description}</p> : null}</div>;
        })}{selected.kind === 'grid' ? <div className="property"><label htmlFor="wide-columns">WIDE COLUMNS (≥ breakpoint)</label><input id="wide-columns" value={String(selected.wide?.columns ?? '')} placeholder={GRID_DEFAULT_COLUMNS} onChange={e => setSelectedWide('columns', e.target.value || undefined)} /><p>Applied in the wide preview; base columns apply below it.</p></div> : null}</NCTGraphiteAccordion>}<NCTGraphiteAccordion title="App settings" defaultOpen><div className="property"><label htmlFor="project-name">PROJECT NAME</label><input id="project-name" value={project.name} onChange={e => { const next = { ...project, name: e.target.value }; setPast(p => [...p.slice(-49), structuredClone(project)]); setFuture([]); setProject(next); }} /></div><div className="property"><label htmlFor="density">PREVIEW DENSITY</label><select id="density" value={project.density} onChange={e => { const next = { ...project, density: e.target.value as Project['density'] }; setPast(p => [...p.slice(-49), structuredClone(project)]); setFuture([]); setProject(next); }}><option value="compact">Compact</option><option value="comfortable">Comfortable</option></select><p>Preview spacing can vary independently of the Studio.</p></div></NCTGraphiteAccordion><div className="inspector-bottom"><button disabled={selected.id === activeRoot.id} onClick={() => { changeTree(root => remove(root, selected.id)); setSelected(activeRoot.id); setNotice('Component deleted'); }}>Delete component</button></div></aside>
    </NCTGraphiteLayoutShell>;
}
