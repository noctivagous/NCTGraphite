/** Component metadata for AI discovery (React port of the NoctCode contract).
 * Every NCTGraphite component exports a `NCTGraphite…Meta` object so AI can
 * query capability without vector search.
 */
export interface NCTGraphiteComponentMeta {
  tag: string;
  category: string;
  description: string;
  props: Record<string, NCTGraphitePropMeta>;
  slots?: Record<string, string>;
  emits: string[];
  dependencies: string[];
  examples?: string[];
}

export interface NCTGraphitePropMeta {
  type: string | string[];
  default?: unknown;
  required?: boolean;
  description?: string;
}
