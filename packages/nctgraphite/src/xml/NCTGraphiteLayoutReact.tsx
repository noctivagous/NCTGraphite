import React from 'react';
import { NCTGraphiteStack } from '../components/NCTGraphiteStack.js';
import { NCTGraphiteGrid } from '../components/NCTGraphiteGrid.js';
import { NCTGraphiteOverlay } from '../components/NCTGraphiteOverlay.js';
import { NCTGraphiteAccordion } from '../components/NCTGraphiteAccordion.js';
import { NCTGraphiteColumns } from '../components/NCTGraphiteColumns.js';
import { NCTGraphiteScene, NCTGraphiteSceneItem } from '../components/NCTGraphiteScene.js';
import { NCTGraphiteLayoutItem } from '../components/NCTGraphiteLayoutItem.js';
import { NCTGraphiteButton } from '../components/NCTGraphiteButton.js';
import type { LayoutNode, SavedLayoutModule } from './NCTGraphiteLayoutDocument.js';

/** React renderer for the shared layout-tree document. */
export function NCTGraphiteLayoutView({
  node, modules, seen = new Set<string>(),
}: {
  node: LayoutNode;
  modules: SavedLayoutModule[];
  seen?: Set<string>;
}): React.ReactElement {
  const children = node.children.map((child) => (
    <NCTGraphiteLayoutView key={child.id} node={child} modules={modules} seen={seen} />
  ));
  const wide = node.wide ?? {};
  switch (node.kind) {
    case 'stack':
      return <NCTGraphiteStack {...node.props}>{children}</NCTGraphiteStack>;
    case 'row':
      return <NCTGraphiteStack direction="row" {...node.props}>{children}</NCTGraphiteStack>;
    case 'grid':
      return (
        <NCTGraphiteGrid
          columns={(wide.columns as string) ?? (node.props.columns as string) ?? 'repeat(2, minmax(0, 1fr))'}
          {...node.props}
        >
          {children}
        </NCTGraphiteGrid>
      );
    case 'overlay':
      return <NCTGraphiteOverlay {...node.props}>{children}</NCTGraphiteOverlay>;
    case 'accordion':
      return <NCTGraphiteAccordion title={node.label} defaultOpen {...node.props}>{children}</NCTGraphiteAccordion>;
    case 'columns':
      return <NCTGraphiteColumns {...node.props}>{children}</NCTGraphiteColumns>;
    case 'scene':
      return <NCTGraphiteScene {...node.props}>{children}</NCTGraphiteScene>;
    case 'sceneItem':
      return <NCTGraphiteSceneItem {...node.props}>{children}</NCTGraphiteSceneItem>;
    case 'layoutItem':
      return <NCTGraphiteLayoutItem {...node.props}>{children}</NCTGraphiteLayoutItem>;
    case 'text':
      return <span className="preview-text">{node.label}</span>;
    case 'button':
      return <NCTGraphiteButton label={node.label} {...node.props} />;
    case 'module': {
      const def = modules.find((m) => m.id === node.moduleId);
      if (!def || seen.has(def.id)) return <span className="preview-text">{node.label}</span>;
      return <NCTGraphiteLayoutView node={def.root} modules={modules} seen={new Set(seen).add(def.id)} />;
    }
  }
}
