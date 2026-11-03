# NCTGraphite Studio tasks

## First priority: NCTGraphite layout widgets for Studio

- [x] Audit the Studio interface and all three reference artifacts against the existing NCTGraphite layout widgets; record missing capabilities and required component APIs in LAYOUT-AUDIT.md.
- [x] Complete the shared stack and grid widgets for Studio's compact, responsive layouts, including sizing, spacing, alignment, wrapping, and grid tracks.
- [x] Finish layout primitives and validation: overlay, absolute scenes, text columns and per-item placement are available; baseline grids and responsive variants remain.
- [x] Complete reusable compositional widgets needed by Studio, including controlled accordions, themeable panels and wells, resizable splitters, and app shell regions.
- [x] Add saved layout modules to Studio, including definition, registration, editing, and instantiation.
- [x] Make layout and compositional widgets themeable and support both compact and comfortable density without imposing Studio's appearance on other apps.
- [x] Build the Studio interface using the public NCTGraphite layout and compositional widgets; address library gaps at their source.
- [x] Test widget behavior, accessibility, responsive layouts, and composition in Studio and other real NCTGraphite applications.
- [x] Evaluate reusable print layout guides for columns, gutters, and margins against the Grid Systems Lab reference.

## App projects and persistence

See [PROJECT-FORMAT.md](PROJECT-FORMAT.md) for the proposed project model.

- [x] Specify and version the project manifest and folder structure, including app logic, assets, themes, and entry points.
- [x] Implement new, open, save, and save-as operations with a storage abstraction for supported hosts.
- [x] Track unsaved changes, provide recovery, and detect external file conflicts.
- [x] Validate projects and implement explicit, non-destructive format migrations; reject unsupported newer versions safely.
- [x] Import the early Studio JSON format into the project model.
- [ ] Define an integration path for existing React apps that preserves files Studio does not understand.
- [x] Test project round trips, migrations, recovery, and conflict handling.

## Builder foundation

- [x] Define a shared NCTGraphite document model and XML format for layout trees.
- [x] Build the XML parser, validator, serializer, and React renderer.
- [x] Generate the component catalog from library metadata and use it in the palette and inspector.
- [x] Add tree reordering, reparenting, duplication, and undo/redo.
- [x] Edit layout properties, including spacing, alignment, sizing, wrapping, and grid tracks.
- [x] Add responsive layout editing and preview sizes.
- [x] Migrate early Studio JSON projects to the shared document format.

## Controls

- [ ] Make shared controls themeable and support compact and comfortable densities.
- [ ] Add the missing Proshade controls: fields, text areas, checkboxes, tabs, lists, image wells, separators, and progress indicators.
- [ ] Add accessible audio controls, including rotary knobs, faders, dual ranges, meters, and displays.
- [ ] Validate controls in Studio and other real NCTGraphite applications.

## App building

- [ ] Define safe state, binding, command, and app-logic models.
- [ ] Add editing and inspection for app logic and bindings.
- [ ] Design an AI agent integration that can inspect and modify app documents.
- [ ] Add app preview and export workflows.
- [ ] Make the Studio itself themeable using NCTGraphite.

## Quality

- [ ] Add tests for document operations, validation, and persistence.
- [ ] Test keyboard navigation and accessibility across the builder and controls.
- [ ] Verify responsive behavior and visual layout in the browser.
