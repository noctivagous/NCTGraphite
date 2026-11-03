import { APP_LOGIC_FORMAT, APP_LOGIC_VERSION, type AppLogic } from '@nct/nctgraphite';
import type { Node, Project } from '../model';

function item(id: string, label: string, left: number, top: number, width: number, height: number, child: Node): Node {
  return { id, kind: 'sceneItem', label, props: { left, top, width, height }, children: [child] };
}

function key(id: string, label: string, left: number, top: number, width = 64, height = 56): Node {
  return item(`${id}-item`, `${label} key`, left, top, width, height, { id, kind: 'button', label, props: {}, children: [] });
}

/** Starter project: a calculator composed as an absolute scene region.
 * Demonstrates free placement with snapped coordinates alongside the
 * bound stack/grid layouts. */
export function starterProject(): Project {
  const cols = [16, 88, 160, 232];
  const rows = [96, 160, 224, 288, 352];
  const keys: Node[] = [
    key('btn-c', 'C', cols[0], rows[0]),
    key('btn-neg', '±', cols[1], rows[0]),
    key('btn-pct', '%', cols[2], rows[0]),
    key('btn-div', '÷', cols[3], rows[0]),
    key('btn-7', '7', cols[0], rows[1]),
    key('btn-8', '8', cols[1], rows[1]),
    key('btn-9', '9', cols[2], rows[1]),
    key('btn-mul', '×', cols[3], rows[1]),
    key('btn-4', '4', cols[0], rows[2]),
    key('btn-5', '5', cols[1], rows[2]),
    key('btn-6', '6', cols[2], rows[2]),
    key('btn-sub', '−', cols[3], rows[2]),
    key('btn-1', '1', cols[0], rows[3]),
    key('btn-2', '2', cols[1], rows[3]),
    key('btn-3', '3', cols[2], rows[3]),
    key('btn-add', '+', cols[3], rows[3]),
    key('btn-0', '0', cols[0], rows[4], 136),
    key('btn-dot', '.', cols[2], rows[4]),
    key('btn-eq', '=', cols[3], rows[4]),
  ];
  return {
    name: 'Calculator',
    density: 'compact',
    modules: [],
    root: {
      id: 'calc',
      kind: 'scene',
      label: 'Calculator',
      props: { width: 320, height: 440 },
      children: [
        item('display-item', 'Display item', 16, 16, 288, 64, {
          id: 'display', kind: 'valueDisplay', label: 'Display', props: { value: '0' }, children: [],
        }),
        ...keys,
      ],
    },
  };
}

/** Starter logic: display state bound to the readout, clear command on C. */
export function starterLogic(): AppLogic {
  return {
    format: APP_LOGIC_FORMAT,
    version: APP_LOGIC_VERSION,
    state: [{ key: 'display', type: 'string', default: '0' }],
    commands: [{ id: 'clear', label: 'Clear', defaultKey: 'Escape' }],
    bindings: [
      { nodeId: 'display', prop: 'value', stateKey: 'display' },
      { nodeId: 'btn-c', prop: 'label', commandId: 'clear' },
    ],
  };
}
