import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { NCTGraphiteAccordion, NCTGraphiteButton, NCTGraphiteCheckbox, NCTGraphiteColumns, NCTGraphiteDualRange, NCTGraphiteFader, NCTGraphiteField, NCTGraphiteGrid, NCTGraphiteImageWell, NCTGraphiteKnob, NCTGraphiteLayoutItem, NCTGraphiteLayoutShell, NCTGraphiteList, NCTGraphiteMeter, NCTGraphiteOverlay, NCTGraphitePanel, NCTGraphiteProgress, NCTGraphiteScene, NCTGraphiteSceneItem, NCTGraphiteSegmented, NCTGraphiteSeparator, NCTGraphiteSlider, NCTGraphiteStack, NCTGraphiteTabs, NCTGraphiteTextArea, NCTGraphiteToggle, NCTGraphiteToolbar, NCTGraphiteValueDisplay } from '@nct/nctgraphite';
import { buildLayoutCatalog, defaultAppLogic, editablePropsFor, getBindingIssues, parseLayoutDocument, parseNCTOptionList, resolveNodeProp, resolvePreviewValues, serializeLayoutDocument, validateAppLogic, type AppBinding, type AppLogic, type PreviewValues } from '@nct/nctgraphite';
import { cloneWithIds, containers, duplicateNode, find, instantiateModule, labels, makeNode, moveNode, remove, removeModuleRefs, update, validDocument, validModule, validNode, migrateLegacyStudioProject, type Kind, type Node, type Project, type SavedModule } from './model';
import {
  ProjectConflictError,
  decodeProjectBundle,
  decodeRecovery,
  defaultManifest,
  encodeProjectBundle,
  encodeRecovery,
  openProjectFromStorage,
  saveProjectToStorage,
  snapshotFingerprint,
  type OpenedProject,
  type ProjectManifest,
  type ProjectSnapshot,
  type RecoveryPayload,
} from './project';
import { FileSystemProjectStorage, canPickFolders, type StorageProvider } from './storage';

const RECOVERY_STORAGE_KEY = 'nctgraphite-studio:recovery:v1';

type PickerWindow = Window & { showDirectoryPicker?: (options?: { mode?: string }) => Promise<FileSystemDirectoryHandle> };

const initial: Project = { name: 'Untitled app', density: 'compact', modules: [], root: { id: 'root', kind: 'stack', label: 'App layout', props: {}, children: [{ id: 'intro', kind: 'text', label: 'Welcome to your app', props: {}, children: [] }, { id: 'section', kind: 'accordion', label: 'Controls', props: {}, children: [{ id: 'action', kind: 'button', label: 'Get started', props: {}, children: [] }] }] } };

const DEVICE_PRESETS = [
  { id: 'fluid', label: 'Fluid', width: null as number | null },
  { id: 'phone', label: 'Phone', width: 390 as number | null },
  { id: 'tablet', label: 'Tablet', width: 768 as number | null },
  { id: 'desktop', label: 'Desktop', width: 1280 as number | null },
];

const GRID_DEFAULT_COLUMNS = 'repeat(2, minmax(0, 1fr))';

function defaultsFor(kind: Kind): Node['props'] {
  if (kind === 'grid') return { columns: GRID_DEFAULT_COLUMNS };
  if (kind === 'tabs' || kind === 'list' || kind === 'segmented') return { options: 'One, Two, Three' };
  if (kind === 'knob' || kind === 'fader' || kind === 'slider') return { value: 50, min: 0, max: 100 };
  if (kind === 'dualRange') return { min: 0, max: 100 };
  if (kind === 'meter') return { value: 40, min: 0, max: 100 };
  if (kind === 'progress') return { value: 68, max: 100 };
  if (kind === 'valueDisplay') return { value: 0 };
  if (kind === 'toggle') return { checked: false };
  if (kind === 'panel') return { variant: 'raised' };
  if (kind === 'toolbar') return { size: 'md' };
  if (kind === 'iconButton') return { variant: 'ghost' };
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
  const dims = node.kind === 'sceneItem' && (node.props.width !== undefined || node.props.height !== undefined)
    ? `${String(node.props.width ?? '?')}×${String(node.props.height ?? '?')}` : null;
  const flags = `${node.props.hidden === true ? ' hidden' : ''}${node.props.locked === true ? ' locked' : ''}`;
  return <><button className={`tree-item ${selected === node.id ? 'selected' : ''}`} style={{ paddingLeft: 10 + depth * 15 }} onClick={() => select(node.id)}><span className="tree-icon">{containers.includes(node.kind) ? '▾' : '·'}</span>{name}{node.children.length > 0 ? <span className="tree-count">{node.children.length}</span> : null}{dims ? <span className="tree-dims">{dims}</span> : null}{flags ? <span className="tree-flags">{flags.trim()}</span> : null}<span className="tree-kind">{node.kind}</span></button>{node.children.map(child => <Tree key={child.id} node={child} modules={modules} selected={selected} select={select} depth={depth + 1} />)}</>;
}

function Preview({ node, modules, selected, select, logic, values, onValue, onCommand, widePreview = false, seen = new Set<string>() }: { node: Node; modules: SavedModule[]; selected: string; select: (id: string) => void; logic?: AppLogic; values?: PreviewValues; onValue?: (key: string, value: string | number | boolean) => void; onCommand?: (id: string) => void; widePreview?: boolean; seen?: Set<string> }) {
  const children = node.children.map(child => <Preview key={child.id} node={child} modules={modules} selected={selected} select={select} logic={logic} values={values} onValue={onValue} onCommand={onCommand} widePreview={widePreview} seen={seen} />);
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
    case 'sceneItem': content = <NCTGraphiteSceneItem {...node.props}>{children}</NCTGraphiteSceneItem>; break;
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
        ? <Preview node={def.root} modules={modules} selected={selected} select={select} logic={logic} values={values} onValue={onValue} onCommand={onCommand} widePreview={widePreview} seen={new Set(seen).add(def.id)} />
        : <span className="preview-text">{node.label}</span>;
      break;
    }
  }
  return <div className={`preview-node ${selected === node.id ? 'is-selected' : ''}${hidden ? ' is-hidden' : ''}${locked ? ' is-locked' : ''}`} style={hidden ? { opacity: 0.45 } : undefined} onClick={e => { e.stopPropagation(); if (!locked) select(node.id); }}><span className="node-tag">{locked ? 'locked · ' : ''}{hidden ? 'hidden · ' : ''}{labels[node.kind]}</span>{content}</div>;
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
  const [zoom, setZoom] = useState(100);
  const [showExport, setShowExport] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  function fitZoom() {
    const canvas = canvasRef.current;
    const art = artboard.current;
    if (!canvas || !art) { setZoom(100); return; }
    const avail = canvas.clientWidth - 60;
    const cur = art.offsetWidth || avail;
    const trueW = cur * (100 / zoom);
    const target = previewWidth ?? trueW;
    if (!target || target <= 0) { setZoom(100); return; }
    const next = Math.max(25, Math.min(200, Math.round((avail / target) * 100)));
    setZoom(next);
    setNotice(`Zoom fit to ${next}%`);
  }
  const input = useRef<HTMLInputElement>(null);
  const artboard = useRef<HTMLDivElement>(null);
  const [artboardWidth, setArtboardWidth] = useState(0);
  useEffect(() => {
    const element = artboard.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => setArtboardWidth(entries[0].contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const [manifest, setManifest] = useState<ProjectManifest>(() => defaultManifest(initial.name));
  const [otherViews, setOtherViews] = useState<Record<string, string>>({});
  const [extraFiles, setExtraFiles] = useState<Record<string, string>>({});
  const [store, setStore] = useState<StorageProvider | null>(null);
  const [revisions, setRevisions] = useState<Record<string, string>>({});
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(null);
  const [conflictPath, setConflictPath] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<RecoveryPayload | null>(null);
  const [logic, setLogic] = useState<AppLogic>(() => defaultAppLogic());
  const [previewMode, setPreviewMode] = useState(false);
  const [previewOverrides, setPreviewOverrides] = useState<PreviewValues>({});
  const [commandLog, setCommandLog] = useState<string[]>([]);
  const [studioTheme, setStudioTheme] = useState<'graphite' | 'classic' | 'lab'>('graphite');
  const [newStateKey, setNewStateKey] = useState('');
  const [newCommandId, setNewCommandId] = useState('');
  const [bindProp, setBindProp] = useState('label');
  const [bindTarget, setBindTarget] = useState('');
  const editingModule = editingModuleId ? project.modules.find(m => m.id === editingModuleId) ?? null : null;
  const activeRoot = editingModule?.root ?? project.root;
  const selected = find(activeRoot, selectedId) ?? activeRoot;
  const catalog = useMemo(buildLayoutCatalog, []);

  const commit = (next: Project) => {
    setPast(p => [...p.slice(-49), structuredClone(project)]);
    setFuture([]);
    setProject(next);
  };
  const previewValues = useMemo(() => resolvePreviewValues(logic, previewOverrides), [logic, previewOverrides]);
  const bindingIssues = useMemo(() => getBindingIssues(project, logic), [project, logic]);
  const logicErrors = useMemo(() => validateAppLogic(logic), [logic]);
  const updateLogic = (next: AppLogic) => {
    const errors = validateAppLogic(next);
    if (errors.length > 0) { setNotice(`Logic invalid: ${errors[0]}`); return; }
    setLogic(next);
  };
  const currentSnapshot = (): ProjectSnapshot => ({
    manifest: { ...manifest, name: project.name },
    views: { [manifest.entry]: project },
    rawViews: otherViews,
    extraFiles,
    logic,
  });
  const dirty = savedFingerprint === null || snapshotFingerprint(currentSnapshot()) !== savedFingerprint;
  function clearRecovery() {
    try { localStorage.removeItem(RECOVERY_STORAGE_KEY); } catch { /* private mode */ }
    setRecovery(null);
  }
  function confirmDiscard(): boolean {
    if (!dirty) return true;
    return window.confirm('You have unsaved changes. Discard them?');
  }
  function applyOpened(opened: OpenedProject, nextStore: StorageProvider | null) {
    const entryDoc = opened.snapshot.views[opened.snapshot.manifest.entry];
    setProject(entryDoc);
    setManifest(opened.snapshot.manifest);
    setOtherViews(opened.snapshot.rawViews);
    setExtraFiles(opened.snapshot.extraFiles);
    setLogic(opened.snapshot.logic ?? defaultAppLogic());
    setPreviewOverrides({});
    setCommandLog([]);
    setRevisions(opened.revisions);
    setStore(nextStore);
    setSavedFingerprint(snapshotFingerprint(opened.snapshot));
    setPast([]);
    setFuture([]);
    setEditingModuleId(null);
    setSelected(entryDoc.root.id);
    setConflictPath(null);
  }
  function newProject() {
    if (!confirmDiscard()) return;
    const fresh = structuredClone(initial);
    setProject(fresh);
    setManifest(defaultManifest(fresh.name));
    setOtherViews({});
    setExtraFiles({});
    setLogic(defaultAppLogic());
    setPreviewOverrides({});
    setCommandLog([]);
    setRevisions({});
    setStore(null);
    setSavedFingerprint(null);
    setPast([]);
    setFuture([]);
    setEditingModuleId(null);
    setSelected(fresh.root.id);
    clearRecovery();
    setNotice('New project — unsaved');
  }
  async function openFolder() {
    const picker = window as PickerWindow;
    if (!canPickFolders(picker) || !picker.showDirectoryPicker) { input.current?.click(); return; }
    if (!confirmDiscard()) return;
    try {
      const dir = await picker.showDirectoryPicker({ mode: 'readwrite' });
      const nextStore = new FileSystemProjectStorage(dir);
      const opened = await openProjectFromStorage(nextStore);
      applyOpened(opened, nextStore);
      clearRecovery();
      setNotice(`Opened ${opened.snapshot.manifest.name}`);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setNotice(`Could not open this project: ${(err as Error).message}`);
    }
  }
  function downloadBundle(snap: ProjectSnapshot) {
    const blob = new Blob([encodeProjectBundle(snap)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
    a.download = `${snap.manifest.name.trim().replace(/[^a-z0-9_-]+/gi, '-') || 'project'}.nctgraphite-project.json`;
    a.click(); URL.revokeObjectURL(url);
  }
  async function save() {
    const snap = currentSnapshot();
    const fingerprint = snapshotFingerprint(snap);
    if (store?.canWriteDirectly) {
      try {
        const next = await saveProjectToStorage(store, snap, revisions);
        setRevisions(next);
        setSavedFingerprint(fingerprint);
        clearRecovery();
        setNotice('Project saved');
      } catch (err) {
        if (err instanceof ProjectConflictError) {
          setConflictPath(err.path);
          setNotice(`External change in ${err.path} — review before saving`);
        } else {
          setNotice(`Could not save: ${(err as Error).message}`);
        }
      }
      return;
    }
    downloadBundle(snap);
    setSavedFingerprint(fingerprint);
    clearRecovery();
    setNotice('Project exported — use Open with a folder picker to save directly');
  }
  async function saveAs() {
    const snap = currentSnapshot();
    const picker = window as PickerWindow;
    if (!canPickFolders(picker) || !picker.showDirectoryPicker) {
      downloadBundle(snap);
      setNotice('Project exported as a copy');
      return;
    }
    try {
      const dir = await picker.showDirectoryPicker({ mode: 'readwrite' });
      const nextStore = new FileSystemProjectStorage(dir);
      const next = await saveProjectToStorage(nextStore, snap, {});
      setStore(nextStore);
      setRevisions(next);
      setSavedFingerprint(snapshotFingerprint(snap));
      clearRecovery();
      setNotice(`Saved a copy in ${snap.manifest.name}`);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setNotice(err instanceof ProjectConflictError ? `Save As stopped: ${err.path} already exists in that folder` : `Could not save a copy: ${(err as Error).message}`);
    }
  }
  async function overwriteConflict() {
    if (!store || !conflictPath) return;
    try {
      const snap = currentSnapshot();
      const next = await saveProjectToStorage(store, snap, revisions, { forcePaths: [conflictPath] });
      setRevisions(next);
      setSavedFingerprint(snapshotFingerprint(snap));
      clearRecovery();
      setConflictPath(null);
      setNotice('Saved — external changes overwritten');
    } catch (err) {
      if (err instanceof ProjectConflictError) { setConflictPath(err.path); setNotice(`External change in ${err.path} — review before saving`); }
      else setNotice(`Could not save: ${(err as Error).message}`);
    }
  }
  async function reloadFromDisk() {
    if (!store) return;
    try {
      const opened = await openProjectFromStorage(store);
      applyOpened(opened, store);
      setNotice('Reloaded from disk — your edits were discarded');
    } catch (err) {
      setNotice(`Could not reload: ${(err as Error).message}`);
    }
  }
  function resumeRecovery() {
    if (!recovery) return;
    const snap = recovery.snapshot;
    const entryDoc = snap.views[snap.manifest.entry];
    if (!entryDoc) { setNotice('Recovery data is incomplete'); return; }
    setProject(entryDoc);
    setManifest(snap.manifest);
    setOtherViews(snap.rawViews);
    setExtraFiles(snap.extraFiles);
    setLogic(snap.logic ?? defaultAppLogic());
    setStore(null);
    setRevisions({});
    setPast([]);
    setFuture([]);
    setEditingModuleId(null);
    setSelected(entryDoc.root.id);
    setSavedFingerprint(null);
    setRecovery(null);
    setNotice('Recovered unsaved work — save to keep it');
  }
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECOVERY_STORAGE_KEY);
      if (!raw) return;
      setRecovery(decodeRecovery(raw));
    } catch {
      try { localStorage.removeItem(RECOVERY_STORAGE_KEY); } catch { /* private mode */ }
    }
  }, []);
  useEffect(() => {
    if (!dirty || recovery) return;
    const id = window.setTimeout(() => {
      try { localStorage.setItem(RECOVERY_STORAGE_KEY, encodeRecovery(currentSnapshot())); } catch { /* private mode */ }
    }, 800);
    return () => window.clearTimeout(id);
  });
  useEffect(() => {
    if (!dirty) return;
    const onBefore = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirty]);
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
      const target = e.target as HTMLElement | null;
      const inField = !!target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA');
      const mod = e.metaKey || e.ctrlKey;
      if (mod) {
        if (inField) return;
        if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
        else if (e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); }
        return;
      }
      if (inField) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function add(kind: Kind) {
    const parent = containers.includes(selected.kind) ? selected : activeRoot;
    const child = { ...makeNode(kind), props: defaultsFor(kind) };
    changeTree(root => update(root, parent.id, n => ({ ...n, children: [...n.children, child] })));
    setSelected(child.id);
    setNotice(`Added ${labels[kind]} to ${parent.label}`);
  }
  function moveSelected(delta: -1 | 1) {
    if (selected.id === activeRoot.id) return;
    if (selected.props.locked === true) { setNotice(`${selected.label || labels[selected.kind]} is locked`); return; }
    const parent = parentOf(activeRoot, selected.id);
    if (!parent) return;
    const index = parent.children.findIndex(c => c.id === selected.id);
    changeTree(root => moveNode(root, selected.id, parent.id, index + delta));
    setNotice(`Moved ${selected.label || labels[selected.kind]} ${delta < 0 ? 'up' : 'down'}`);
  }
  function indentSelected() {
    if (selected.id === activeRoot.id) return;
    if (selected.props.locked === true) { setNotice(`${selected.label || labels[selected.kind]} is locked`); return; }
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
    if (selected.props.locked === true) { setNotice(`${selected.label || labels[selected.kind]} is locked`); return; }
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
    if (selected.props.locked === true) { setNotice(`${selected.label || labels[selected.kind]} is locked`); return; }
    changeTree(root => duplicateNode(root, selected.id));
    setNotice(`Duplicated ${selected.label || labels[selected.kind]}`);
  }
  function deleteSelected() {
    if (selected.id === activeRoot.id) { setNotice('Cannot delete the root'); return; }
    if (selected.props.locked === true) { setNotice(`${selected.label || labels[selected.kind]} is locked`); return; }
    changeTree(root => remove(root, selected.id));
    setSelected(activeRoot.id);
    setNotice('Component deleted');
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
    const cloned = cloneWithIds(source);
    const moduleRoot = containers.includes(cloned.kind) ? cloned : { ...makeNode('stack'), label: `${source.label} layout`, children: [cloned] };
    const def: SavedModule = { id: crypto.randomUUID(), name: `${source.label} module`, root: moduleRoot };
    commit({ ...project, modules: [...project.modules, def] });
    setNotice(`Saved module ${def.name}`);
  }
  function insertModule(id: string) {
    const def = project.modules.find(m => m.id === id);
    if (!def) return;
    if (editingModuleId) { setNotice('Finish editing this module before inserting'); return; }
    const parent = containers.includes(selected.kind) ? selected : activeRoot;
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
    if (!confirmDiscard()) return;
    try {
      const text = await file.text();
      if (!text.trimStart().startsWith('<')) {
        const data = JSON.parse(text);
        if (data && typeof data === 'object' && (data as { format?: unknown }).format === 'nctgraphite-project-bundle') {
          const snap = decodeProjectBundle(text);
          applyOpened({ snapshot: snap, revisions: {} }, null);
          setSavedFingerprint(null);
          clearRecovery(); setNotice('Project imported — save to keep it');
          return;
        }
      }
      let next: Project | null = null;
      if (text.trimStart().startsWith('<')) {
        next = parseLayoutDocument(text);
      } else {
        const data = JSON.parse(text);
        next = migrateLegacyStudioProject(data);
        if (!next && validDocument(data)) next = data as Project;
      }
      if (!next) throw new Error('Invalid project');
      setPast([]);
      setFuture([]);
      setProject(next);
      setManifest(defaultManifest(next.name));
      setOtherViews({});
      setExtraFiles({});
      setLogic(defaultAppLogic());
      setPreviewOverrides({});
      setCommandLog([]);
      setRevisions({});
      setStore(null);
      setSavedFingerprint(null);
      setEditingModuleId(null); setSelected(next.root.id); clearRecovery(); setNotice('Project opened');
    } catch { setNotice('Could not open this project: invalid or unsupported file'); }
  }
  const selectedModuleDef = selected.kind === 'module' ? project.modules.find(m => m.id === selected.moduleId) : undefined;
  const selectedEntry = catalog.find(e => e.kind === selected.kind);
  const propNames = editablePropsFor(selected.kind).filter(n => n !== 'label' && n !== 'title');
  const topbar = <header className="topbar"><div className="brand"><span className="brand-mark">N</span><span>NCTGraphite <strong>Studio</strong><small>APP BUILDER</small></span></div><NCTGraphiteLayoutItem className="project-title" grow={1}><span className="status-dot" />{project.name}{dirty ? ' • unsaved' : ''}<span className="title-sub"> / Design workspace</span></NCTGraphiteLayoutItem><NCTGraphiteToolbar className="top-actions" compact size="sm"><button onClick={undo} disabled={past.length === 0} title="Undo">↩</button><button onClick={redo} disabled={future.length === 0} title="Redo">↪</button><button onClick={newProject}>New</button><button onClick={openFolder}>Open</button><button onClick={() => input.current?.click()}>Import file</button><button className="primary" onClick={save}>Save</button><button onClick={saveAs}>Save As</button><button onClick={saveJson} title="Export the layout as a single JSON file">Export JSON</button><button onClick={saveXml} title="Export the layout as a single XML file">Export XML</button><button disabled title="Runnable app export is not yet available">Export app</button><select value={studioTheme} onChange={e => setStudioTheme(e.target.value as typeof studioTheme)} title="Studio theme"><option value="graphite">Graphite</option><option value="classic">Classic</option><option value="lab">Lab</option></select><input ref={input} hidden type="file" accept=".json,.xml,application/json,application/xml" onChange={load} /></NCTGraphiteToolbar></header>;
  const banners = <>
    {recovery && <div className="banner recovery" role="alert"><span>Unsaved work from {recovery.savedAt} was found.</span><span className="banner-actions"><button onClick={resumeRecovery}>Resume</button><button onClick={clearRecovery}>Discard</button></span></div>}
    {conflictPath && <div className="banner conflict" role="alert"><span>{conflictPath} changed on disk. Reload it, or overwrite it with your version.</span><span className="banner-actions"><button onClick={reloadFromDisk}>Reload from disk</button><button onClick={overwriteConflict}>Overwrite</button><button onClick={() => setConflictPath(null)}>Cancel</button></span></div>}
  </>;
  const statusbar = <footer className="statusbar"><span><i className="status-dot" /> {notice}</span><span>NCTGRAPHITE STUDIO &nbsp; / &nbsp; EARLY BUILD</span></footer>;
  const groups = new Map<string, typeof catalog>();
  for (const entry of catalog) {
    const list = groups.get(entry.category) ?? [];
    list.push(entry);
    groups.set(entry.category, list);
  }
  return <NCTGraphiteLayoutShell className={`studio studio-theme-${studioTheme}`} header={topbar} footer={statusbar} columns="190px minmax(280px, 1fr)" wideMinWidth={801} wideColumns="244px minmax(300px, 1fr) 244px" gap={0} style={{ height: '100dvh', overflow: 'hidden' }}>
      <aside className="sidebar left"><div className="sidebar-title">COMPONENTS <span>01</span></div><div className="sidebar-intro">Build from the structure up.<br /><span>Select a container, then add a component.</span></div>{[...groups].map(([category, entries]) => <NCTGraphiteAccordion key={category} title={category[0].toUpperCase() + category.slice(1)} defaultOpen={category === 'layout'}><NCTGraphitePanel variant="well"><div className="palette">{entries.map(e => <button key={e.kind} onClick={() => add(e.kind)} title={e.description}><span>{e.kind === 'text' ? 'T' : '▦'}</span>{labels[e.kind]}<b>+</b></button>)}</div></NCTGraphitePanel></NCTGraphiteAccordion>)}<div className="sidebar-title">MODULES <span>{String(project.modules.length).padStart(2, '0')}</span></div>{editingModule
        ? <div className="sidebar-intro">Editing <strong>{editingModule.name}</strong>.<br /><span>Changes update every instance.</span><br /><button className="primary" onClick={() => { setEditingModuleId(null); setSelected(project.root.id); setNotice('Back to app layout'); }} style={{ marginTop: 8 }}>Done editing</button></div>
        : <><div className="sidebar-intro"><span>Save components as reusable modules, then insert them anywhere.</span><br /><button onClick={saveAsModule} style={{ marginTop: 8 }}>Save selection as module</button></div><div className="tree">{project.modules.map(m => <div key={m.id} className={`tree-item ${selectedModuleDef?.id === m.id ? 'selected' : ''}`}><span className="tree-icon">▣</span>{m.name}<span className="tree-kind"><button onClick={() => insertModule(m.id)} title={`Insert ${m.name}`}>insert</button> <button onClick={() => { setEditingModuleId(m.id); setSelected(m.root.id); setNotice(`Editing ${m.name}`); }} title={`Edit ${m.name}`}>edit</button> <button onClick={() => deleteModule(m.id)} title={`Delete ${m.name}`}>✕</button></span></div>)}</div></>}</aside>
      <main className="editor"><div className="editor-bar"><div><span className="eyebrow">{previewMode ? 'PREVIEW' : 'DESIGN'}</span><span className="bar-separator" /> <strong>{editingModule ? `Module: ${editingModule.name}` : 'Layout canvas'}</strong></div><div className="canvas-mode"><button className={previewMode ? 'primary' : ''} onClick={() => setPreviewMode(v => !v)} title="Toggle app preview with live state">{previewMode ? 'Exit preview' : 'Preview app'}</button><span className="preview-sizes" role="group" aria-label="Device preset">{DEVICE_PRESETS.map(d => <button key={d.id} className={previewWidth === d.width ? 'primary' : ''} onClick={() => { setPreviewWidth(d.width); setNotice(d.width == null ? 'Fluid preview' : `${d.label} preview · ${d.width}px`); }} title={d.width == null ? 'Fluid width' : `${d.label} · ${d.width}px viewport`} aria-pressed={previewWidth === d.width}>{d.label}{d.width != null ? ` ${d.width}` : ''}</button>)}</span><span className="preview-sizes" role="group" aria-label="Canvas zoom"><button onClick={() => setZoom(z => Math.max(50, z - 25))} title="Zoom out">−</button><button title="Canvas zoom" onClick={() => setZoom(100)}>{zoom}%</button><button onClick={() => setZoom(z => Math.min(200, z + 25))} title="Zoom in">+</button><button onClick={fitZoom} title="Fit canvas to available width">Fit</button><button onClick={() => setZoom(100)} title="Reset zoom to 100%">Reset</button></span><span className="status-dot" /> LIVE PREVIEW</div></div>{banners}{previewMode && <div className="banner preview" role="status"><span>Previewing with {logic.state.length} state keys{previewOverrides && Object.keys(previewOverrides).length > 0 ? ` (${Object.keys(previewOverrides).length} overrides)` : ''}{commandLog.length > 0 ? ` — last command: ${commandLog[commandLog.length - 1]}` : ''}</span><span className="banner-actions">{logic.commands.map(c => <button key={c.id} onClick={() => setCommandLog(l => [...l.slice(-19), c.id])}>{c.label}</button>)}</span></div>}<div ref={canvasRef} className="canvas"><div className="canvas-label"><span>{editingModule ? 'MODULE PREVIEW' : 'APP PREVIEW'}</span><span>RESPONSIVE LAYOUT</span></div><div ref={artboard} className={`artboard ${project.density}`} data-nct-density={project.density} data-device={DEVICE_PRESETS.find(d => d.width === previewWidth)?.id ?? 'fluid'} style={{ ...(previewWidth ? { maxWidth: previewWidth } : {}), zoom: zoom === 100 ? undefined : `${zoom}%` } as React.CSSProperties}><div className="artboard-header"><span className="artboard-dot" />{editingModule?.name ?? project.name}{previewWidth ? <span> · {previewWidth}px</span> : null}<span>•••</span></div><div className="artboard-body"><Preview node={activeRoot} modules={project.modules} selected={selectedId} select={setSelected} logic={previewMode ? logic : undefined} values={previewMode ? previewValues : undefined} onValue={(key, value) => setPreviewOverrides(o => ({ ...o, [key]: value }))} onCommand={id => setCommandLog(l => [...l.slice(-19), id])} widePreview={(artboardWidth || previewWidth || 0) >= 768} /></div></div><div className="canvas-help">Select a component on the canvas or in the document tree. Shortcuts: Delete removes selection · Ctrl/⌘+D duplicates · Ctrl/⌘+Z / Shift+Ctrl/⌘+Z undo/redo.</div></div><div className="editor-footer"><span>◈ &nbsp; {selected.kind === 'module' ? selectedModuleDef?.name ?? selected.label : selected.label || labels[selected.kind]} · {labels[selected.kind]} · {selected.children.length} children · {DEVICE_PRESETS.find(d => d.width === previewWidth)?.label ?? 'Fluid'}{previewWidth ? ` ${previewWidth}px` : ''} · {zoom}%</span><span>Tree-based composition</span></div></main>
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
        })}{selected.kind === 'grid' ? <div className="property"><label htmlFor="wide-columns">WIDE COLUMNS (≥ breakpoint)</label><input id="wide-columns" value={String(selected.wide?.columns ?? '')} placeholder={GRID_DEFAULT_COLUMNS} onChange={e => setSelectedWide('columns', e.target.value || undefined)} /><p>Applied in the wide preview; base columns apply below it.</p></div> : null}</NCTGraphiteAccordion>}{selected.kind === 'sceneItem' ? <NCTGraphiteAccordion title="Geometry" defaultOpen><NCTGraphitePanel>{(['left', 'top', 'width', 'height'] as const).map(name => <div className="property" key={name}><label htmlFor={`geom-${name}`}>{name.toUpperCase()} (px or CSS)</label><input id={`geom-${name}`} value={String(selected.props[name] ?? '')} placeholder="—" onChange={e => { const raw = e.target.value.trim(); const id = selected.id; if (raw === '') changeTree(root => update(root, id, n => { const props = { ...n.props }; delete props[name]; return { ...n, props }; })); else changeTree(root => update(root, id, n => ({ ...n, props: { ...n.props, [name]: coerceInput(raw) } }))); }} /></div>)}<div className="property"><label htmlFor="geom-z">Z-INDEX</label><input id="geom-z" value={String(selected.props.zIndex ?? '')} placeholder="auto" onChange={e => { const raw = e.target.value.trim(); const id = selected.id; if (raw === '' || !/^-?\d+$/.test(raw)) { if (raw === '') changeTree(root => update(root, id, n => { const props = { ...n.props }; delete props.zIndex; return { ...n, props }; })); return; } changeTree(root => update(root, id, n => ({ ...n, props: { ...n.props, zIndex: Number(raw) } }))); }} /><p>Two-way synced with the canvas scene item.</p></div></NCTGraphitePanel></NCTGraphiteAccordion> : null}<NCTGraphiteAccordion title="Visibility" defaultOpen><NCTGraphitePanel><div className="property"><label htmlFor="vis-hidden">HIDDEN</label><select id="vis-hidden" value={String(selected.props.hidden ?? false)} onChange={e => { const id = selected.id; const v = e.target.value === 'true'; changeTree(root => update(root, id, n => { const props = { ...n.props }; if (v) props.hidden = true; else delete props.hidden; return { ...n, props }; })); setNotice(v ? 'Component hidden in preview' : 'Component visible'); }}><option value="true">true</option><option value="false">false</option></select><p>Hidden components stay in the tree but render nothing in preview and export.</p></div><div className="property"><label htmlFor="vis-locked">LOCKED</label><select id="vis-locked" value={String(selected.props.locked ?? false)} onChange={e => { const id = selected.id; const v = e.target.value === 'true'; changeTree(root => update(root, id, n => { const props = { ...n.props }; if (v) props.locked = true; else delete props.locked; return { ...n, props }; })); setNotice(v ? 'Component locked' : 'Component unlocked'); }}><option value="true">true</option><option value="false">false</option></select><p>Locked components ignore canvas selection, moves, and delete until unlocked.</p></div></NCTGraphitePanel></NCTGraphiteAccordion><NCTGraphiteAccordion title="Binding" defaultOpen><div className="property"><label htmlFor="bind-prop">PROP</label><select id="bind-prop" value={bindProp} onChange={e => { setBindProp(e.target.value); setBindTarget(''); }}><option value="label">label</option><option value="value">value</option></select><p>Bind {selected.id}.{bindProp} to state or a command.</p></div><div className="property"><label htmlFor="bind-target">TARGET</label><select id="bind-target" value={bindTarget} onChange={e => setBindTarget(e.target.value)}><option value="">— none —</option><optgroup label="State">{logic.state.map(s => <option key={s.key} value={`state:${s.key}`}>state:{s.key}</option>)}</optgroup><optgroup label="Commands">{logic.commands.map(c => <option key={c.id} value={`command:${c.id}`}>command:{c.id}</option>)}</optgroup></select></div><div className="property tree-ops"><button onClick={() => { if (!bindTarget) return; const [kind, id] = bindTarget.split(':'); const record: AppBinding = kind === 'state' ? { nodeId: selected.id, prop: bindProp, stateKey: id } : { nodeId: selected.id, prop: bindProp, commandId: id }; const rest = logic.bindings.filter(b => !(b.nodeId === selected.id && b.prop === bindProp)); updateLogic({ ...logic, bindings: [...rest, record] }); setNotice(`Bound ${selected.id}.${bindProp} to ${bindTarget}`); }}>Apply binding</button><button onClick={() => { updateLogic({ ...logic, bindings: logic.bindings.filter(b => !(b.nodeId === selected.id && b.prop === bindProp)) }); setBindTarget(''); setNotice('Binding cleared'); }}>Clear</button></div>{logic.bindings.filter(b => b.nodeId === selected.id).map(b => <div className="property" key={`${b.nodeId}:${b.prop}`}><div className="readout">{b.prop} → {b.stateKey ? `state:${b.stateKey}` : `command:${b.commandId}`}</div></div>)}{bindingIssues.filter(i => i.nodeId === selected.id).map(i => <div className="property" key={`${i.prop}:${i.message}`}><p>{i.message}</p></div>)}</NCTGraphiteAccordion><NCTGraphiteAccordion title={`Logic (${logic.state.length} keys, ${logic.bindings.length} bindings)`} defaultOpen><div className="property"><label>STATE KEYS</label>{logic.state.length === 0 ? <p>No state yet. Add a key, then bind a node prop to it.</p> : logic.state.map(s => <div key={s.key} className="readout" style={{ marginBottom: 4 }}>{s.key} : {s.type} = {String(s.default)} <button onClick={() => updateLogic({ ...logic, state: logic.state.filter(k => k.key !== s.key), bindings: logic.bindings.filter(b => b.stateKey !== s.key) })} title={`Remove ${s.key}`}>✕</button></div>)}</div><div className="property tree-ops"><input value={newStateKey} onChange={e => setNewStateKey(e.target.value)} placeholder="newKey" aria-label="New state key" /><button onClick={() => { const key = newStateKey.trim(); if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) { setNotice('State key must match /^[A-Za-z][A-Za-z0-9_]*$/'); return; } if (logic.state.some(s => s.key === key)) { setNotice('State key already exists'); return; } updateLogic({ ...logic, state: [...logic.state, { key, type: 'string', default: '' }] }); setNewStateKey(''); }}>Add state</button></div><div className="property"><label>COMMANDS</label>{logic.commands.length === 0 ? <p>No commands yet.</p> : logic.commands.map(c => <div key={c.id} className="readout" style={{ marginBottom: 4 }}>{c.id} — {c.label} ({c.defaultKey}) <button onClick={() => updateLogic({ ...logic, commands: logic.commands.filter(k => k.id !== c.id), bindings: logic.bindings.filter(b => b.commandId !== c.id) })} title={`Remove ${c.id}`}>✕</button></div>)}</div><div className="property tree-ops"><input value={newCommandId} onChange={e => setNewCommandId(e.target.value)} placeholder="commandId" aria-label="New command id" /><button onClick={() => { const id = newCommandId.trim(); if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) { setNotice('Command id must be a valid key'); return; } if (logic.commands.some(c => c.id === id)) { setNotice('Command already exists'); return; } updateLogic({ ...logic, commands: [...logic.commands, { id, label: id, defaultKey: id }] }); setNewCommandId(''); }}>Add command</button></div>{previewMode && <div className="property"><label>PREVIEW STATE</label>{logic.state.map(s => <div key={s.key} style={{ marginBottom: 4 }}><label htmlFor={`preview-${s.key}`}>{s.key}</label><input id={`preview-${s.key}`} value={String(previewValues[s.key] ?? '')} onChange={e => setPreviewOverrides(o => ({ ...o, [s.key]: s.type === 'number' ? Number(e.target.value) : e.target.value }))} /></div>)}</div>}{logicErrors.length > 0 && <div className="property"><p>{logicErrors[0]}</p></div>}{bindingIssues.length > 0 && <div className="property"><label>BINDING ISSUES ({bindingIssues.length})</label>{bindingIssues.map((i, n) => <p key={n}>{i.message}</p>)}</div>}</NCTGraphiteAccordion><NCTGraphiteAccordion title="App settings" defaultOpen><div className="property"><label htmlFor="project-name">PROJECT NAME</label><input id="project-name" value={project.name} onChange={e => { const next = { ...project, name: e.target.value }; setPast(p => [...p.slice(-49), structuredClone(project)]); setFuture([]); setProject(next); }} /></div><div className="property"><label htmlFor="density">PREVIEW DENSITY</label><select id="density" value={project.density} onChange={e => { const next = { ...project, density: e.target.value as Project['density'] }; setPast(p => [...p.slice(-49), structuredClone(project)]); setFuture([]); setProject(next); }}><option value="compact">Compact</option><option value="comfortable">Comfortable</option></select><p>Preview spacing can vary independently of the Studio.</p></div><div className="property"><label htmlFor="studio-theme">STUDIO THEME</label><select id="studio-theme" value={studioTheme} onChange={e => setStudioTheme(e.target.value as typeof studioTheme)}><option value="graphite">Graphite</option><option value="classic">Classic</option><option value="lab">Lab</option></select><p>Studio chrome follows NCTGraphite tokens; the edited app is unaffected.</p></div></NCTGraphiteAccordion><NCTGraphiteAccordion title="Export inspection" defaultOpen={showExport}><NCTGraphitePanel><div className="property tree-ops"><button onClick={() => setShowExport(v => !v)}>{showExport ? 'Hide serialized layout' : 'Show serialized layout'}</button></div>{showExport ? <div className="property"><label>ACTUAL SERIALIZED XML</label><textarea readOnly rows={12} style={{ width: '100%', fontFamily: 'ui-monospace,monospace', fontSize: 10 }} value={serializeLayoutDocument(editingModule ? { ...project, root: editingModule.root } : project)} aria-label="Serialized layout XML" /><p>Runnable app export remains a separate task.</p></div> : <div className="property"><p>Shows the exact XML that Export XML writes.</p></div>}</NCTGraphitePanel></NCTGraphiteAccordion><div className="inspector-bottom"><button disabled={selected.id === activeRoot.id} onClick={() => { changeTree(root => remove(root, selected.id)); setSelected(activeRoot.id); setNotice('Component deleted'); }}>Delete component</button></div></aside>
    </NCTGraphiteLayoutShell>;
}
