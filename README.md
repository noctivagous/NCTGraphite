# NCTGraphite

NCTGraphite is the shared React component library, tag language, and GUI-builder
home for the NCT application family.

It exists so `nct-project-manager`, `nibglider`, noctappcode, and future NCT
applications stop rebuilding the same UI from new custom code on every project.
Common layout primitives, controls, themes, bindings, and XML documents live
here once. Applications consume them, delete their local duplicates, and
contribute generally useful additions back through the same repository.

The project name is always shown in full as NCTGraphite. Library packages,
components, hooks, providers, themes, files, and XML tags all carry the full
`NCTGraphite` prefix. The shortened suffix form is never used on its own.

## What lives here

Planned repository layout:

```text
NCTGraphite/
  packages/
    nctgraphite/
      src/
        components/
        theme/
        xml/
        bindings/
      package.json
  apps/
    NCTGraphiteStudio/
  examples/
```

- `packages/nctgraphite/` is the distributable React library:
  layout primitives, controls, themes, XML parsing/validation, bindings,
  scopes, and the `NCTGraphiteView` renderer.
- `apps/NCTGraphiteStudio/` is the GUI builder. It consumes the published-style
  library API exactly like an external application would.
- `examples/` holds minimal integration examples for each consuming application.

Every public tag is an `NCTGraphite…` component in both JSX and XML, for example
`NCTGraphiteStack`, `NCTGraphiteField`, `NCTGraphiteView`, and
`NCTGraphiteScope`.

## How applications use it

Each consuming application includes the complete NCTGraphite Git repository as
a git submodule, normally at:

```text
<application>/NCTGraphite/
```

The application then depends on the library through an npm workspace path rather
than a downloaded package:

```json
{
  "workspaces": [
    "NCTGraphite"
  ],
  "dependencies": {
    "@nct/nctgraphite": "*"
  }
}
```

During installation, npm creates the normal workspace symlink:

```text
<application>/node_modules/@nct/nctgraphite
  -> <application>/NCTGraphite/packages/nctgraphite
```

Applications therefore import NCTGraphite as ordinary source code:

```tsx
import {
  NCTGraphiteStack,
  NCTGraphitePanel,
  NCTGraphiteField
} from "@nct/nctgraphite";
```

XML documents resolve those same components through `NCTGraphiteView`:

```tsx
import { NCTGraphiteView } from "@nct/nctgraphite";

return (
  <NCTGraphiteView
    document={settingsDocument}
    scope={settingsScope}
  />
);
```

Do not hand-create symlinks inside `node_modules`. The workspace dependency is
the supported symlink mechanism. A manually linked package can behave
differently from a clean install and is harder for other developers and CI to
reproduce.

## How NCTGraphite is built up

NCTGraphite grows contextually from real application work:

1. Build a feature in a consuming application.
2. When a UI element proves generally useful — ideally when a second project
   needs it, or its roadmap already names the same need — extract or redesign
   it as an `NCTGraphite…` component.
3. Add its metadata, theme tokens, tests, XML validation rules, and examples.
4. Commit and push that library change in the NCTGraphite repository.
5. Update the consuming application to the new NCTGraphite submodule commit
   and remove the application-local duplicate.
6. Let every other application upgrade on its own schedule by moving its own
   submodule pointer forward.

The consuming application records an exact NCTGraphite commit. One application's
library upgrade therefore cannot silently change another application's UI.

Normal local workflow:

```bash
git clone --recurse-submodules <application-repo>
npm install
npm run dev
```

After changing the checked-out `NCTGraphite` submodule, verify the library
itself, commit the library change, then commit the application with the updated
submodule pointer.

## Contribution rules

- A component enters NCTGraphite when two applications need it, or when one
  application needs it now and another application's roadmap already names the
  same need. Application-specific UI stays in its application.
- New components must use NCTGraphite design tokens and metadata.
- Public names must retain the complete `NCTGraphite` prefix.
- Application domain types, drawing-engine types, and task-domain types do not
  belong in the library. Hosts adapt through `NCTGraphiteBindingScope`.
- Changes should update tests, generated catalog entries, XML validation, and
  the affected application call sites.

## Status

This repository is being established as the Phase 0 unification target:
shared theme, layout primitives, duplicated controls, settings-window patterns,
then the XML and binding core, followed by selective mining of the older
experimental NoctCode components.
