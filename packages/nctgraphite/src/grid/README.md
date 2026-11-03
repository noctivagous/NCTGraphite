# NCTGraphite grid geometry

`NCTGraphiteGridGeometry.ts` contains renderer-independent geometry for square,
flat-top hex, and pointy-top hex grids. It deliberately owns only grid layout:
coordinate conversion, polygon corners, adjacency, bounds, and hit testing.

For hex grids, `q` and `r` are axial coordinates. For squares they are the
column and row. `size` is a hex radius or a square half-side. The optional
origin locates coordinate `0,0` in document space.

```ts
import {
  gridCell, gridNeighbors, pointToGridCoordinate,
} from '@nct/nctgraphite';

const grid = { kind: 'hex-flat', size: 28, origin: { x: 480, y: 340 } } as const;
const coordinate = pointToGridCoordinate(grid, pointer);
const cell = gridCell(grid, coordinate);
const neighbors = gridNeighbors(grid, coordinate);
```

Modes own their paint data and rendering. More grid kinds should be added when
their mode migrates, rather than represented as an approximate existing kind.
