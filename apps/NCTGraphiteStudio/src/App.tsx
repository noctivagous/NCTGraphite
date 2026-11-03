import { useRef, useState, type ChangeEvent } from 'react';
import { NCTGraphiteAccordion, NCTGraphiteButton, NCTGraphiteGrid, NCTGraphiteLayoutItem, NCTGraphiteOverlay, NCTGraphiteStack, NCTGraphiteToolbar } from '@nct/nctgraphite';

type Kind = 'stack' | 'row' | 'grid' | 'overlay' | 'accordion' | 'text' | 'button';
type Node = { id: string; kind: Kind; label: string; children: Node[] };
type Project = { name: string; density: 'compact' | 'comfortable'; root: Node };
const containers: Kind[] = ['stack', 'row', 'grid', 'overlay', 'accordion'];
const labels: Record<Kind, string> = { stack: 'Vertical stack', row: 'Horizontal stack', grid: 'Grid', overlay: 'Overlay', accordion: 'Accordion', text: 'Text', button: 'Button' };
const makeNode = (kind: Kind, label = labels[kind]): Node => ({ id: crypto.randomUUID(), kind, label, children: [] });
const initial: Project = { name: 'Untitled app', density: 'compact', root: { id: 'root', kind: 'stack', label: 'App layout', children: [{ id: 'intro', kind: 'text', label: 'Welcome to your app', children: [] }, { id: 'section', kind: 'accordion', label: 'Controls', children: [{ id: 'action', kind: 'button', label: 'Get started', children: [] }] }] } };
function find(node: Node, id: string): Node | undefined { return node.id === id ? node : node.children.map(child => find(child, id)).find(Boolean); }
function update(node: Node, id: string, fn: (node: Node) => Node): Node { return node.id === id ? fn(node) : { ...node, children: node.children.map(child => update(child, id, fn)) }; }
function remove(node: Node, id: string): Node { return { ...node, children: node.children.filter(child => child.id !== id).map(child => remove(child, id)) }; }
function validNode(value: unknown, ids = new Set<string>()): value is Node {
  if (!value || typeof value !== 'object') return false;
  const n = value as Node;
  if (typeof n.id !== 'string' || !n.id || ids.has(n.id) || !Object.hasOwn(labels, n.kind) || typeof n.label !== 'string' || !Array.isArray(n.children) || (!containers.includes(n.kind) && n.children.length > 0)) return false;
  ids.add(n.id);
  return n.children.every(child => validNode(child, ids));
}
function Tree({ node, selected, select, depth = 0 }: { node: Node; selected: string; select: (id: string) => void; depth?: number }) {
  return <><button className={`tree-item ${selected === node.id ? 'selected' : ''}`} style={{ paddingLeft: 10 + depth * 15 }} onClick={() => select(node.id)}><span className="tree-icon">{containers.includes(node.kind) ? '▾' : '·'}</span>{node.label || labels[node.kind]}<span className="tree-kind">{node.kind}</span></button>{node.children.map(child => <Tree key={child.id} node={child} selected={selected} select={select} depth={depth + 1} />)}</>;
}
function Preview({ node, selected, select }: { node: Node; selected: string; select: (id: string) => void }) {
  const children = node.children.map(child => <Preview key={child.id} node={child} selected={selected} select={select} />);
  let content;
  switch (node.kind) {
    case 'stack': case 'row': content = <NCTGraphiteStack direction={node.kind === 'row' ? 'row' : 'column'} gap="var(--nct-content-gap)">{children}</NCTGraphiteStack>; break;
    case 'grid': content = <NCTGraphiteGrid columns="repeat(2, minmax(0, 1fr))" gap="var(--nct-content-gap)">{children}</NCTGraphiteGrid>; break;
    case 'overlay': content = <NCTGraphiteOverlay>{children}</NCTGraphiteOverlay>; break;
    case 'accordion': content = <NCTGraphiteAccordion title={node.label} defaultOpen>{children}</NCTGraphiteAccordion>; break;
    case 'text': content = <span className="preview-text">{node.label}</span>; break;
    case 'button': content = <NCTGraphiteButton label={node.label} />; break;
  }
  return <div className={`preview-node ${selected === node.id ? 'is-selected' : ''}`} onClick={e => { e.stopPropagation(); select(node.id); }}><span className="node-tag">{labels[node.kind]}</span>{content}</div>;
}
export default function App() {
  const [project, setProject] = useState<Project>(initial);
  const [selectedId, setSelected] = useState('section');
  const [notice, setNotice] = useState('Ready');
  const input = useRef<HTMLInputElement>(null);
  const selected = find(project.root, selectedId) ?? project.root;
  const changeRoot = (fn: (root: Node) => Node) => setProject(p => ({ ...p, root: fn(p.root) }));
  function add(kind: Kind) {
    const parent = containers.includes(selected.kind) ? selected : project.root;
    const child = makeNode(kind);
    changeRoot(root => update(root, parent.id, n => ({ ...n, children: [...n.children, child] })));
    setSelected(child.id);
    setNotice(`Added ${labels[kind]} to ${parent.label}`);
  }
  function save() {
    const blob = new Blob([JSON.stringify({ format: 'nctgraphite-studio', version: 1, ...project }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${project.name.trim().replace(/[^a-z0-9_-]+/gi, '-') || 'project'}.nctgraphite.json`; a.click(); URL.revokeObjectURL(url); setNotice('Project downloaded');
  }
  async function load(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.format !== 'nctgraphite-studio' || data.version !== 1 || typeof data.name !== 'string' || !['compact', 'comfortable'].includes(data.density) || !validNode(data.root) || !containers.includes(data.root.kind)) throw new Error('Invalid project');
      setProject({ name: data.name, density: data.density, root: data.root }); setSelected(data.root.id); setNotice('Project opened');
    } catch { setNotice('Could not open this project: invalid or unsupported file'); }
  }
  return <NCTGraphiteStack className="studio">
    <header className="topbar"><div className="brand"><span className="brand-mark">N</span><span>NCTGraphite <strong>Studio</strong><small>APP BUILDER</small></span></div><NCTGraphiteLayoutItem className="project-title" grow={1}><span className="status-dot" />{project.name}<span className="title-sub"> / Design workspace</span></NCTGraphiteLayoutItem><NCTGraphiteToolbar className="top-actions" compact size="sm"><button onClick={() => input.current?.click()}>Open</button><button className="primary" onClick={save}>Save project</button><input ref={input} hidden type="file" accept=".json,application/json" onChange={load} /></NCTGraphiteToolbar></header>
    <NCTGraphiteGrid className="workspace" columns="190px minmax(280px, 1fr)" wideMinWidth={801} wideColumns="244px minmax(300px, 1fr) 244px">
      <aside className="sidebar left"><div className="sidebar-title">COMPONENTS <span>01</span></div><div className="sidebar-intro">Build from the structure up.<br /><span>Select a container, then add a component.</span></div><NCTGraphiteAccordion title="Layout" defaultOpen><div className="palette">{(['stack', 'row', 'grid', 'overlay', 'accordion'] as Kind[]).map((kind, i) => <button key={kind} onClick={() => add(kind)}><span>{['▤', '▥', '▦', '◫', '▧'][i]}</span>{labels[kind]}<b>+</b></button>)}</div></NCTGraphiteAccordion><NCTGraphiteAccordion title="Controls & content" defaultOpen><div className="palette">{(['text', 'button'] as Kind[]).map(kind => <button key={kind} onClick={() => add(kind)}><span>{kind === 'text' ? 'T' : '◉'}</span>{labels[kind]}<b>+</b></button>)}</div></NCTGraphiteAccordion><div className="sidebar-title tree-heading">DOCUMENT TREE <span>LAYOUT</span></div><div className="tree"><Tree node={project.root} selected={selectedId} select={setSelected} /></div></aside>
      <main className="editor"><div className="editor-bar"><div><span className="eyebrow">DESIGN</span><span className="bar-separator" /> <strong>Layout canvas</strong></div><div className="canvas-mode">LIVE PREVIEW <span className="status-dot" /></div></div><div className="canvas"><div className="canvas-label"><span>APP PREVIEW</span><span>RESPONSIVE LAYOUT</span></div><div className={`artboard ${project.density}`} data-nct-density={project.density}><div className="artboard-header"><span className="artboard-dot" />{project.name}<span>•••</span></div><div className="artboard-body"><Preview node={project.root} selected={selectedId} select={setSelected} /></div></div><div className="canvas-help">Select a component on the canvas or in the document tree.</div></div><div className="editor-footer"><span>◈ &nbsp; LAYOUT EDITOR</span><span>Tree-based composition</span></div></main>
      <aside className="sidebar right"><div className="sidebar-title">INSPECTOR <span>02</span></div><div className="selection"><span className="selection-icon">◈</span><div><strong>{selected.label || labels[selected.kind]}</strong><small>NCTGraphite {labels[selected.kind]}</small></div></div><NCTGraphiteAccordion title="Properties" defaultOpen><div className="property"><label htmlFor="node-label">{selected.kind === 'text' ? 'TEXT' : 'LABEL'}</label><input id="node-label" value={selected.label} onChange={e => changeRoot(root => update(root, selected.id, n => ({ ...n, label: e.target.value })))} /></div><div className="property"><label>TYPE</label><div className="readout">{labels[selected.kind]}</div></div></NCTGraphiteAccordion><NCTGraphiteAccordion title="App settings" defaultOpen><div className="property"><label htmlFor="project-name">PROJECT NAME</label><input id="project-name" value={project.name} onChange={e => setProject(p => ({ ...p, name: e.target.value }))} /></div><div className="property"><label htmlFor="density">PREVIEW DENSITY</label><select id="density" value={project.density} onChange={e => setProject(p => ({ ...p, density: e.target.value as Project['density'] }))}><option value="compact">Compact</option><option value="comfortable">Comfortable</option></select><p>Preview spacing can vary independently of the Studio.</p></div></NCTGraphiteAccordion><div className="inspector-bottom"><button disabled={selected.id === project.root.id} onClick={() => { changeRoot(root => remove(root, selected.id)); setSelected(project.root.id); setNotice('Component deleted'); }}>Delete component</button></div></aside>
    </NCTGraphiteGrid><footer className="statusbar"><span><i className="status-dot" /> {notice}</span><span>NCTGRAPHITE STUDIO &nbsp; / &nbsp; EARLY BUILD</span></footer>
  </NCTGraphiteStack>;
}
