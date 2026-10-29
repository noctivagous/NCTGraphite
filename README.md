# NCTGraphite

NCTGraphite is to be a shared React component library, tag language, and GUI-builder
home for NCT web applications.

## Purpose

When web applications, including React JS applications, are made with AI
assistance, the AI builds custom UI code from scratch each time without referencing a
stable framework. The resulting GUI and code are idiomatic, for each application,
which is chaotic and inefficient. It is costly in many ways. Later changes force the AI to excavate that
application's own conventions instead of working within a familiar software
framework structure that has references and practices. An experimental 
`noct-code-appkit` project began as an answer to this problem, but it never became 
a stable framework.

NCTGraphite is the stable-framework followup that will combine its efforts and
XML-driven app files from other projects into a single location. Its goal is to
give AI-assisted development a reusable vocabulary of components, layouts, themes, bindings, and XML
documents.  In the process, it may be the case that the AI constructs apps more
rapidly since the underlying components are modular and AI-first.  
Generation starts from that framework rather than from a blank page,
and later changes stay inside it as well.

NCTGraphite exists so that `nct-project-manager`, `nibglider`, noctappcode, and
future NCT applications stop paying this from-scratch UI cost on every project. Common layout
primitives, controls, themes, bindings, and XML documents will live here once.
The NCTGraphite framework will be made by having Noctivagous projects, web applications 
and contribute generally useful additions back through the same repository while
they are built out.

## Goal

The goal is a complete NCTGraphite app kit for mobile and desktop applications:

- A coherent set of GUI components.
- Underlying layout components comparable to layout primitives such as
  StackPanel (Windows WPF).
- Logic components for application behavior.
- A tag language in the tradition of MXML, FXML, XAML, and XUL, so most of an
  app can be expressed declaratively in tags.
- A GUI builder studio that is maintained alongside changes.
- Documents that NCTGraphite Studio and AI-assisted workflows can read, check,
  generate, edit, and round-trip through a visual builder.
- A kit that grows contextually while real applications are being built, rather
  than as an isolated speculative framework.
- Future: Studio-resident AI assistance capable of rearranging GUI designs directly by
  swapping validated NCTGraphite tags.
  


Every public tag is an `NCTGraphite…` component in both JSX and XML. The same
component vocabulary therefore works for hand-written code, generated code, XML
documents, validation, builder editing, and runtime rendering.

## Benefits

NCTGraphite is intended to make applications:

- Faster to build by reusing proven UI instead of regenerating custom screens.
- More consistent across applications and screens.
- More themeable through shared tokens rather than scattered styles.
- Easier to adjust after creation, because UI is structured XML and metadata,
  not an opaque hodgepodge of one-off code.
- Easier to change directly in NCTGraphite Studio, so routine GUI revisions do
  not all have to travel through text prompts.
- More accessible to AI-assisted construction, because generation assembles a
  closed, validated NCTGraphite tag vocabulary instead of inventing new markup.
- Faster to piece together when XML tag-based logic components are AI-ready and
  used consistently across applications.
- More predictable to modify by prompt when prompts are still appropriate,
  because the AI works within the same framework structure rather than digging
  through application-specific conventions.
- Better suited to both mobile and desktop through shared layout primitives,
  density handling, and theme tokens.

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

Representative tags include `NCTGraphiteStack`, `NCTGraphiteField`,
`NCTGraphiteView`, and `NCTGraphiteScope`.

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
