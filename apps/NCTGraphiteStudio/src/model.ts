/** Studio document model: layout trees plus saved reusable modules.
 * Pure helpers live here (testable without React); `App.tsx` owns the state.
 * Module instances (`kind: 'module'`) reference a saved definition by id, so
 * editing a definition updates every instance. Renderers guard cycles with a
 * `seen` set of module ids.
 */

export type Kind = 'stack' | 'row' | 'grid' | 'overlay' | 'accordion' | 'text' | 'button' | 'module';

export interface Node { id: string; kind: Kind; label: string; moduleId?: string; children: Node[] }

export interface SavedModule { id: string; name: string; root: Node }

export interface Project { name: string; density: 'compact' | 'comfortable'; root: Node; modules: SavedModule[] }

export const containers: Kind[] = ['stack', 'row', 'grid', 'overlay', 'accordion'];

export const labels: Record<Kind, string> = {
  stack: 'Vertical stack', row: 'Horizontal stack', grid: 'Grid', overlay: 'Overlay',
  accordion: 'Accordion', text: 'Text', button: 'Button', module: 'Module',
};

export const makeNode = (kind: Kind, label = labels[kind]): Node => ({
  id: crypto.randomUUID(), kind, label, children: [],
});

export function find(node: Node, id: string): Node | undefined {
  return node.id === id ? node : node.children.map(child => find(child, id)).find(Boolean);
}

export function update(node: Node, id: string, fn: (node: Node) => Node): Node {
  return node.id === id ? fn(node) : { ...node, children: node.children.map(child => update(child, id, fn)) };
}

export function remove(node: Node, id: string): Node {
  return { ...node, children: node.children.filter(child => child.id !== id).map(child => remove(child, id)) };
}

/** Deep copy with fresh ids. Module references keep their `moduleId`. */
export function cloneWithIds(node: Node): Node {
  return { ...node, id: crypto.randomUUID(), children: node.children.map(cloneWithIds) };
}

/** An instance node pointing at a saved definition (a leaf in the using tree). */
export function instantiateModule(def: SavedModule): Node {
  return { id: crypto.randomUUID(), kind: 'module', label: def.name, moduleId: def.id, children: [] };
}

/** Strip every instance of a deleted module from a tree. */
export function removeModuleRefs(node: Node, moduleId: string): Node {
  return {
    ...node,
    children: node.children
      .filter(child => child.moduleId !== moduleId)
      .map(child => removeModuleRefs(child, moduleId)),
  };
}

export function validNode(value: unknown, modules: Pick<SavedModule, 'id'>[] = [], ids = new Set<string>()): value is Node {
  if (!value || typeof value !== 'object') return false;
  const n = value as Node;
  if (typeof n.id !== 'string' || !n.id || ids.has(n.id) || !Object.hasOwn(labels, n.kind) || typeof n.label !== 'string' || !Array.isArray(n.children)) return false;
  if (n.kind === 'module') {
    if (typeof n.moduleId !== 'string' || !modules.some(m => m.id === n.moduleId) || n.children.length > 0) return false;
  } else if (!containers.includes(n.kind) && n.children.length > 0) return false;
  ids.add(n.id);
  return n.children.every(child => validNode(child, modules, ids));
}

export function validModule(value: unknown, modules: Pick<SavedModule, 'id'>[] = [], ids = new Set<string>()): value is SavedModule {
  if (!value || typeof value !== 'object') return false;
  const m = value as SavedModule;
  if (typeof m.id !== 'string' || !m.id || ids.has(m.id) || typeof m.name !== 'string') return false;
  ids.add(m.id);
  return containers.includes(m.root?.kind) && validNode(m.root, modules, ids);
}
