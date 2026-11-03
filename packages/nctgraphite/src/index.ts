export const NCTGRAPHITE_VERSION = "0.0.0";

export { NCTParameterPanel, useNCTParameters } from './parameters/NCTGraphiteParameters.js';
export type { NCTParameterDefinition, NCTParameterValues } from './parameters/NCTGraphiteParameters.js';

export {
  NCTGRAPHITE_DOCUMENT_KIND,
  NCTGRAPHITE_DOCUMENT_VERSION,
  NCTGRAPHITE_DOCUMENT_FILE_TYPE,
  NCTGRAPHITE_DOCUMENT_FILE_EXTENSION,
  NCTGraphiteDocument,
  NCTGraphiteDocumentController,
  createNCTGraphiteDocumentId,
  createNCTGraphiteLayerId,
} from './document/NCTGraphiteDocument.js';
export type {
  NCTGraphiteDocumentCanvas,
  NCTGraphiteDocumentView,
  NCTGraphiteDocumentSnapshot,
  NCTGraphiteLayerRecord,
  NCTGraphiteUntitledDocumentOptions,
} from './document/NCTGraphiteDocument.js';
export { useNCTGraphiteDocument } from './document/NCTGraphiteDocumentReact.js';

export { fitDocumentToViewport, documentToViewport, viewportToDocument } from './grid/NCTGraphiteViewport.js';
export type { NCTGraphiteViewportTransform, NCTGraphiteViewportSize, NCTGraphiteViewportPoint } from './grid/NCTGraphiteViewport.js';

export {
  gridCell, gridCellBounds, gridCellCorners, gridCellId, gridCellsInBounds,
  gridCoordinateToPoint, gridNeighbors, pointInGridCell, pointInPolygon,
  pointToFractionalGridCoordinate, pointToGridCoordinate, roundHexCoordinate,
} from './grid/NCTGraphiteGridGeometry.js';
export type {
  NCTGraphiteGridBounds, NCTGraphiteGridCell, NCTGraphiteGridCoordinate,
  NCTGraphiteGridKind, NCTGraphiteGridSpec, NCTGraphitePoint,
} from './grid/NCTGraphiteGridGeometry.js';

export type { NCTGraphiteComponentMeta, NCTGraphitePropMeta } from './components/NCTGraphiteMeta.js';

export { NCTGraphiteSlider, NCTGraphiteSliderMeta } from './components/NCTGraphiteSlider.js';
export type { NCTGraphiteSliderProps } from './components/NCTGraphiteSlider.js';

export { NCTGraphitePanel, NCTGraphitePanelMeta } from './components/NCTGraphitePanel.js';
export type { NCTGraphitePanelProps } from './components/NCTGraphitePanel.js';

export { NCTGraphiteSegmented, NCTGraphiteSegmentedMeta } from './components/NCTGraphiteSegmented.js';
export type { NCTGraphiteSegmentedProps, NCTGraphiteSegmentedOption } from './components/NCTGraphiteSegmented.js';

export { NCTGraphiteSwatch, NCTGraphiteSwatchMeta } from './components/NCTGraphiteSwatch.js';
export type { NCTGraphiteSwatchProps } from './components/NCTGraphiteSwatch.js';

export { NCTGraphiteToggle, NCTGraphiteToggleMeta } from './components/NCTGraphiteToggle.js';
export type { NCTGraphiteToggleProps } from './components/NCTGraphiteToggle.js';

export { NCTGraphiteButton, NCTGraphiteButtonMeta } from './components/NCTGraphiteButton.js';
export type { NCTGraphiteButtonProps } from './components/NCTGraphiteButton.js';

export {
  NCTGraphitePopover, NCTGraphitePopoverMeta, computeNCTGraphitePopoverPosition,
} from './components/NCTGraphitePopover.js';
export type { NCTGraphitePopoverProps, PopoverRect } from './components/NCTGraphitePopover.js';

export { NCTGraphiteHint, NCTGraphiteHintMeta, NCTGraphiteParamLabel } from './components/NCTGraphiteHint.js';
export type { NCTGraphiteHintProps } from './components/NCTGraphiteHint.js';

export { NCTGraphiteStack, NCTGraphiteStackMeta } from './components/NCTGraphiteStack.js';
export type { NCTGraphiteStackProps } from './components/NCTGraphiteStack.js';

export { NCTGraphiteGrid, NCTGraphiteGridMeta } from './components/NCTGraphiteGrid.js';
export type { NCTGraphiteGridProps } from './components/NCTGraphiteGrid.js';

export { NCTGraphiteToolbar, NCTGraphiteToolbarMeta } from './components/NCTGraphiteToolbar.js';
export type { NCTGraphiteToolbarProps } from './components/NCTGraphiteToolbar.js';

export {
  useNCTGraphiteCommands, NCTGraphiteCommandsMeta,
} from './bindings/NCTGraphiteCommands.js';
export type {
  NCTGraphiteCommandDef, NCTGraphiteCommandsOptions, NCTGraphiteCommands,
} from './bindings/NCTGraphiteCommands.js';

export {
  NCTGraphiteStage, NCTGraphiteStageMeta,
  NCTGraphiteStageBody, NCTGraphiteStagePanel, NCTGraphiteStageMain,
  NCTGraphiteStageFooter,
} from './components/NCTGraphiteStage.js';
export { NCTGraphiteAppShell, NCTGraphiteAppShellMeta } from './components/NCTGraphiteAppShell.js';
export type { NCTGraphiteAppShellProps } from './components/NCTGraphiteAppShell.js';
export type {
  NCTGraphiteStageProps, NCTGraphiteStageBodyProps,
  NCTGraphiteStagePanelProps, NCTGraphiteStageMainProps,
  NCTGraphiteStageFooterProps,
} from './components/NCTGraphiteStage.js';

export { NCTGraphiteKeyMap, NCTGraphiteKeyMapMeta } from './components/NCTGraphiteKeyMap.js';
export type { NCTGraphiteKeyMapProps } from './components/NCTGraphiteKeyMap.js';

export { NCTGraphiteDialog, NCTGraphiteDialogMeta } from './components/NCTGraphiteDialog.js';
export type { NCTGraphiteDialogProps } from './components/NCTGraphiteDialog.js';

export { NCTGraphiteToast, NCTGraphiteToastMeta } from './components/NCTGraphiteToast.js';
export type { NCTGraphiteToastProps } from './components/NCTGraphiteToast.js';

export {
  convexHull, chaikinSmooth, polygonArea, clusterPolygons, tracePerimeter, hullLoopsFromPolygons,
} from './utilities/graphics/hull.js';
export type { HullMode, HullPolygon, HullLoop } from './utilities/graphics/hull.js';

export {
  metaballKernel, fieldAt, gooToThreshold, buildGridValues, closedRingToBezierD, ringToPathD,
  contourLayersForBlobs, BRUSH_NOISE_PRESETS, brushNoisePreset, perlin2, fbm2, noisyStampCenters,
} from './utilities/graphics/metaballField.js';
export type {
  FieldBlob, PixelPt, ContourLayer, BrushNoisePreset, NoiseStampPt,
} from './utilities/graphics/metaballField.js';

export { satoNeck, roundRectStamp } from './utilities/graphics/satoNeck.js';
export type { StampCenter, RoundRectStamp, SatoNeck } from './utilities/graphics/satoNeck.js';

export {
  makeVectorField, vectorStyle, stampVectorField, applyVectorAttractors,
} from './utilities/graphics/vectorField.js';
export type {
  VectorFieldMode, VectorSample, VectorAttractor, VectorStyle, VectorStampAction,
} from './utilities/graphics/vectorField.js';

export {
  sampleSpacing, makeSampleLattice, shadingFalloff, stampSampleGain,
} from './utilities/graphics/sampleLattice.js';
export type {
  SampleGainPoint, ShadingFalloff, SampleStampAction, SampleRotationMode,
} from './utilities/graphics/sampleLattice.js';

export { NCTGraphiteAccordion, NCTGraphiteAccordionMeta } from './components/NCTGraphiteAccordion.js';
export type { NCTGraphiteAccordionProps } from './components/NCTGraphiteAccordion.js';
export { NCTGraphiteOverlay, NCTGraphiteOverlayMeta } from './components/NCTGraphiteOverlay.js';
export type { NCTGraphiteOverlayProps } from './components/NCTGraphiteOverlay.js';
export { NCTGraphiteScene, NCTGraphiteSceneMeta, NCTGraphiteSceneItem, NCTGraphiteSceneItemMeta } from './components/NCTGraphiteScene.js';
export type { NCTGraphiteSceneProps, NCTGraphiteSceneItemProps } from './components/NCTGraphiteScene.js';
export { NCTGraphiteLayoutItem, NCTGraphiteLayoutItemMeta } from './components/NCTGraphiteLayoutItem.js';
export type { NCTGraphiteLayoutItemProps } from './components/NCTGraphiteLayoutItem.js';
export { NCTGraphiteColumns, NCTGraphiteColumnsMeta } from './components/NCTGraphiteColumns.js';
export type { NCTGraphiteColumnsProps } from './components/NCTGraphiteColumns.js';
export { NCTGraphiteLayoutShell, NCTGraphiteLayoutShellMeta } from './components/NCTGraphiteLayoutShell.js';
export type { NCTGraphiteLayoutShellProps } from './components/NCTGraphiteLayoutShell.js';
export { NCTGraphiteBaseline, NCTGraphiteBaselineMeta } from './components/NCTGraphiteBaseline.js';
export type { NCTGraphiteBaselineProps } from './components/NCTGraphiteBaseline.js';
export { NCTGraphiteSplitter, NCTGraphiteSplitterMeta } from './components/NCTGraphiteSplitter.js';
export type { NCTGraphiteSplitterProps } from './components/NCTGraphiteSplitter.js';
export type { NCTGraphiteGridBreakpoint } from './components/NCTGraphiteGrid.js';
