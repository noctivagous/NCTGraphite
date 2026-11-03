import { containers, labels } from '../model';
import type { Node, SavedModule } from '../model';

export function Tree({ node, modules, selected, select, depth = 0 }: { node: Node; modules: SavedModule[]; selected: string; select: (id: string) => void; depth?: number }) {
  const name = node.kind === 'module' ? modules.find(m => m.id === node.moduleId)?.name ?? node.label : node.label || labels[node.kind];
  const dims = node.kind === 'sceneItem' && (node.props.width !== undefined || node.props.height !== undefined)
    ? `${String(node.props.width ?? '?')}×${String(node.props.height ?? '?')}` : null;
  const flags = `${node.props.hidden === true ? ' hidden' : ''}${node.props.locked === true ? ' locked' : ''}`;
  return <><button className={`tree-item ${selected === node.id ? 'selected' : ''}`} style={{ paddingLeft: 10 + depth * 15 }} onClick={() => select(node.id)}><span className="tree-icon">{containers.includes(node.kind) ? '▾' : '·'}</span>{name}{node.children.length > 0 ? <span className="tree-count">{node.children.length}</span> : null}{dims ? <span className="tree-dims">{dims}</span> : null}{flags ? <span className="tree-flags">{flags.trim()}</span> : null}<span className="tree-kind">{node.kind}</span></button>{node.children.map(child => <Tree key={child.id} node={child} modules={modules} selected={selected} select={select} depth={depth + 1} />)}</>;
}
