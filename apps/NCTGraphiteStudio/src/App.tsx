import { useRef, useState, type ChangeEvent } from 'react';
import { NCTGraphiteAccordion, NCTGraphiteButton, NCTGraphiteGrid, NCTGraphiteLayoutItem, NCTGraphiteOverlay, NCTGraphiteStack, NCTGraphiteToolbar } from '@nct/nctgraphite';
import { cloneWithIds, containers, find, instantiateModule, labels, makeNode, remove, removeModuleRefs, update, validModule, validNode, type Kind, type Node, type Project, type SavedModule } from './model';

const initial: Project = { name: 'Untitled app', density: 'compact', modules: [], root: { id: 'root', kind: 'stack', label: 'App layout', children: [{ id: 'intro', kind: 'text', label: 'Welcome to your app', children: [] }, { id: 'section', kind: 'accordion', label: 'Controls', children: [{ id: 'action', kind: 'button', label: 'Get started', children: [] }] }] } };

function Tree({ node, modules, selected, select, depth = 0 }: { node: Node; modules: SavedModule[]; selected: string; select: (id: string) => void; depth?: number }) {
  const name = node.kind === 'module' ? modules.find(m => m.id === node.moduleId)?.name ?? node.label : node.label || labels[node.kind];
  return <><button className={`tree-item ${selected === node.id ? 'selected' : ''}`} style={{ paddingLeft: 10 + depth * 15 }} onClick={() => select(node.id)}><span className="tree-icon">{containers.includes(node.kind) ? '▾' : '·'}</span>{name}<span className="tree-kind">{node.kind}</span></button>{node.children.map(child => <Tree key={child.id} node={child} modules={modules} selected={selected} select={select} depth={depth + 1} />)}</>;
}

function Preview({ node, modules, selected, select, seen = new Set<string>() }: { node: Node; modules: SavedModule[]; selected: string; select: (id: string) => void; seen?: Set<string> }) {
  const children = node.children.map(child => <Preview key={child.id} node={child} modules={modules} selected={selected} select={select} seen={seen} />);
  let content;
  switch (node.kind) {
    case 'stack': case 'row': content = <NCTGraphiteStack direction={node.kind === 'row' ? 'row' : 'column'} gap="var(--nct-content-gap)">{children}</NCTGraphiteStack>; break;
    case 'grid': content = <NCTGraphiteGrid columns="repeat(2, minmax(0, 1fr))" gap="var(--nct-content-gap)">{children}</NCTGraphiteGrid>; break;
    case 'overlay': content = <NCTGraphiteOverlay>{children}</NCTGraphiteOverlay>; break;
    case 'accordion': content = <NCTGraphiteAccordion title={node.label} defaultOpen>{children}</NCTGraphiteAccordion>; break;
    case 'text': content = <span className="preview-text">{node.label}</span>; break;
    case 'button': content = <NCTGraphiteButton label={node.label} />; break;
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

export default function App() {
  const [project, setProject] = useState<Project>(initial);
  const [selectedId, setSelected] = useState('section');
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [notice, setNotice] = useState('Ready');
  const input = useRef<HTMLInputElement>(null);
  const editingModule = editingModuleId ? project.modules.find(m => m.id === editingModuleId) ?? null : null;
  const activeRoot = editingModule?.root ?? project.root;
  const selected = find(activeRoot, selectedId) ?? activeRoot;
  const changeTree = (fn: (root: Node) => Node) => setProject(p => editingModuleId
    ? { ...p, modules: p.modules.map(m => m.id === editingModuleId ? { ...m, root: fn(m.root) } : m) }
    : { ...p, root: fn(p.root) });
  function add(kind: Kind) {
    const parent = containers.includes(selected.kind) ? selected : project.root;
    const child = makeNode(kind);
    changeTree(root => update(root, parent.id, n => ({ ...n, children: [...n.children, child] })));
    setSelected(child.id);
    setNotice(`Added ${labels[kind]} to ${parent.label}`);
  }
  function saveAsModule() {
    if (editingModuleId) { setNotice('Finish editing this module before saving a nested module'); return; }
    const node = find(project.root, selectedId);
    if (!node || node.id === project.root.id) { setNotice('Select a component to save as a module'); return; }
    const source = node.kind === 'module' ? project.modules.find(m => m.id === node.moduleId)?.root : node;
    if (!source) { setNotice('That module no longer exists'); return; }
    const def: SavedModule = { id: crypto.randomUUID(), name: `${source.label} module`, root: cloneWithIds(source) };
    setProject(p => ({ ...p, modules: [...p.modules, def] }));
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
    setProject(p => ({
      ...p,
      modules: p.modules.filter(m => m.id !== id).map(m => ({ ...m, root: removeModuleRefs(m.root, id) })),
      root: removeModuleRefs(p.root, id),
    }));
    setNotice(`Deleted module ${def.name} and its instances`);
  }
  function save() {
    const blob = new Blob([JSON.stringify({ format: 'nctgraphite-studio', version: 2, ...project }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${project.name.trim().replace(/[^a-z0-9_-]+/gi, '-') || 'project'}.nctgraphite.json`; a.click(); URL.revokeObjectURL(url); setNotice('Project downloaded');
  }
  async function load(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.format !== 'nctgraphite-studio' || (data.version !== 1 && data.version !== 2) || typeof data.name !== 'string' || !['compact', 'comfortable'].includes(data.density)) throw new Error('Invalid project');
      const modules: SavedModule[] = data.version === 2 ? data.modules : [];
      if (!Array.isArray(modules)) throw new Error('Invalid project');
      const ids = new Set<string>();
      if (!modules.every(m => validModule(m, modules, ids)) || !validNode(data.root, modules, ids) || !containers.includes(data.root.kind)) throw new Error('Invalid project');
      setProject({ name: data.name, density: data.density, root: data.root, modules });
      setEditingModuleId(null); setSelected(data.root.id); setNotice('Project opened');
    } catch { setNotice('Could not open this project: invalid or unsupported file'); }
  }
  const selectedModuleDef = selected.kind === 'module' ? project.modules.find(m => m.id === selected.moduleId) : undefined;
  return <NCTGraphiteStack className="studio">
    <header className="topbar"><div className="brand"><span className="brand-mark">N</span><span>NCTGraphite <strong>Studio</strong><small>APP BUILDER</small></span></div><NCTGraphiteLayoutItem className="project-title" grow={1}><span className="status-dot" />{project.name}<span className="title-sub"> / Design workspace</span></NCTGraphiteLayoutItem><NCTGraphiteToolbar className="top-actions" compact size="sm"><button onClick={() => input.current?.click()}>Open</button><button className="primary" onClick={save}>Save project</button><input ref={input} hidden type="file" accept=".json,application/json" onChange={load} /></NCTGraphiteToolbar></header>
    <NCTGraphiteGrid className="workspace" columns="190px minmax(280px, 1fr)" wideMinWidth={801} wideColumns="244px minmax(300px, 1fr) 244px">
      <aside className="sidebar left"><div className="sidebar-title">COMPONENTS <span>01</span></div><div className="sidebar-intro">Build from the structure up.<br /><span>Select a container, then add a component.</span></div><NCTGraphiteAccordion title="Layout" defaultOpen><div className="palette">{(['stack', 'row', 'grid', 'overlay', 'accordion'] as Kind[]).map((kind, i) => <button key={kind} onClick={() => add(kind)}><span>{['▤', '▥', '▦', '◫', '▧'][i]}</span>{labels[kind]}<b>+</b></button>)}</div></NCTGraphiteAccordion><NCTGraphiteAccordion title="Controls & content" defaultOpen><div className="palette">{(['text', 'button'] as Kind[]).map(kind => <button key={kind} onClick={() => add(kind)}><span>{kind === 'text' ? 'T' : '◉'}</span>{labels[kind]}<b>+</b></button>)}</div></NCTGraphiteAccordion><div className="sidebar-title">MODULES <span>{String(project.modules.length).padStart(2, '0')}</span></div>{editingModule
        ? <div className="sidebar-intro">Editing <strong>{editingModule.name}</strong>.<br /><span>Changes update every instance.</span><br /><button className="primary" onClick={() => { setEditingModuleId(null); setSelected(project.root.id); setNotice('Back to app layout'); }} style={{ marginTop: 8 }}>Done editing</button></div>
        : <><div className="sidebar-intro"><span>Save components as reusable modules, then insert them anywhere.</span><br /><button onClick={saveAsModule} style={{ marginTop: 8 }}>Save selection as module</button></div><div className="tree">{project.modules.map(m => <div key={m.id} className={`tree-item ${selectedModuleDef?.id === m.id ? 'selected' : ''}`}><span className="tree-icon">▣</span>{m.name}<span className="tree-kind"><button onClick={() => insertModule(m.id)} title={`Insert ${m.name}`}>insert</button> <button onClick={() => { setEditingModuleId(m.id); setSelected(m.root.id); setNotice(`Editing ${m.name}`); }} title={`Edit ${m.name}`}>edit</button> <button onClick={() => deleteModule(m.id)} title={`Delete ${m.name}`}>✕</button></span></div>)}</div></>}</aside>
      <main className="editor"><div className="editor-bar"><div><span className="eyebrow">DESIGN</span><span className="bar-separator" /> <strong>{editingModule ? `Module: ${editingModule.name}` : 'Layout canvas'}</strong></div><div className="canvas-mode">LIVE PREVIEW <span className="status-dot" /></div></div><div className="canvas"><div className="canvas-label"><span>{editingModule ? 'MODULE PREVIEW' : 'APP PREVIEW'}</span><span>RESPONSIVE LAYOUT</span></div><div className={`artboard ${project.density}`} data-nct-density={project.density}><div className="artboard-header"><span className="artboard-dot" />{editingModule?.name ?? project.name}<span>•••</span></div><div className="artboard-body"><Preview node={activeRoot} modules={project.modules} selected={selectedId} select={setSelected} /></div></div><div className="canvas-help">Select a component on the canvas or in the document tree.</div></div><div className="editor-footer"><span>◈ &nbsp; LAYOUT EDITOR</span><span>Tree-based composition</span></div></main>
      <aside className="sidebar right"><div className="sidebar-title">INSPECTOR <span>02</span></div><div className="selection"><span className="selection-icon">◈</span><div><strong>{selected.kind === 'module' ? selectedModuleDef?.name ?? selected.label : selected.label || labels[selected.kind]}</strong><small>NCTGraphite {labels[selected.kind]}</small></div></div>{selected.kind === 'module' && selectedModuleDef
        ? <NCTGraphiteAccordion title="Module instance" defaultOpen><div className="property"><p>Instances reference {selectedModuleDef.name}. Editing the module updates every instance.</p></div><div className="property"><button onClick={() => { setEditingModuleId(selectedModuleDef.id); setSelected(selectedModuleDef.root.id); setNotice(`Editing ${selectedModuleDef.name}`); }}>Edit module</button></div></NCTGraphiteAccordion>
        : <NCTGraphiteAccordion title="Properties" defaultOpen><div className="property"><label htmlFor="node-label">{selected.kind === 'text' ? 'TEXT' : 'LABEL'}</label><input id="node-label" value={selected.label} onChange={e => changeTree(root => update(root, selected.id, n => ({ ...n, label: e.target.value })))} /></div><div className="property"><label>TYPE</label><div className="readout">{labels[selected.kind]}</div></div></NCTGraphiteAccordion>}<NCTGraphiteAccordion title="App settings" defaultOpen><div className="property"><label htmlFor="project-name">PROJECT NAME</label><input id="project-name" value={project.name} onChange={e => setProject(p => ({ ...p, name: e.target.value }))} /></div><div className="property"><label htmlFor="density">PREVIEW DENSITY</label><select id="density" value={project.density} onChange={e => setProject(p => ({ ...p, density: e.target.value as Project['density'] }))}><option value="compact">Compact</option><option value="comfortable">Comfortable</option></select><p>Preview spacing can vary independently of the Studio.</p></div></NCTGraphiteAccordion><div className="inspector-bottom"><button disabled={selected.id === activeRoot.id} onClick={() => { changeTree(root => remove(root, selected.id)); setSelected(activeRoot.id); setNotice('Component deleted'); }}>Delete component</button></div></aside>
    </NCTGraphiteGrid><footer className="statusbar"><span><i className="status-dot" /> {notice}</span><span>NCTGRAPHITE STUDIO &nbsp; / &nbsp; EARLY BUILD</span></footer>
  </NCTGraphiteStack>;
}
