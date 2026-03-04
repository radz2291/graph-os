/**
 * List Composites MCP Tool
 * 
 * Lists all available composites in a composite registry.
 * 
 * @module @graph-os/mcp-tools
 */

import { BaseMCPTool, MCPToolDefinition, MCPToolResult } from '../../core/MCPTool';

interface ListCompositesParams {
  /** Path to the composite registry file */
  registryPath: string;
  /** Filter by namespace (optional) */
  namespace?: string;
}

interface CompositeInfo {
  /** Composite name */
  name: string;
  /** Composite description */
  description: string;
  /** Path to composite file */
  path: string;
  /** Number of inputs */
  inputCount: number;
  /** Number of outputs */
  outputCount: number;
  /** Number of nodes */
  nodeCount: number;
  /** Creation timestamp */
  createdAt?: string;
}

interface ListCompositesResult {
  /** Registry path */
  registryPath: string;
  /** Total number of composites */
  total: number;
  /** List of composites */
  composites: CompositeInfo[];
}

/**
 * Tool for listing available composites.
 * 
 * This tool helps discover what composites are available for use in cartridges.
 * Composites are listed from a composite registry file.
 * 
 * @example
 * ```javascript
 * // List all composites in the registry
 * const result = await registry.execute('list_composites', {
 *   registryPath: './registries/composite-registry.json'
 * });
 * 
 * if (result.success) {
 *   console.log(`Found ${result.data.total} composites:`);
 *   result.data.composites.forEach(c => {
 *     console.log(`  - ${c.name}: ${c.description}`);
 *   });
 * }
 * ```
 */
export class ListCompositesTool extends BaseMCPTool<ListCompositesParams, ListCompositesResult> {
  definition: MCPToolDefinition = {
    name: 'list_composites',
    description: 'Lists all available composites in a composite registry for discovery and reuse.',
    parameters: [
      {
        name: 'registryPath',
        type: 'string',
        required: true,
        description: 'Path to the composite registry file',
      },
      {
        name: 'namespace',
        type: 'string',
        required: false,
        description: 'Filter composites by namespace (e.g., "auth" for auth-* composites)',
      },
    ],
    returnType: 'ListCompositesResult',
    category: 'composite',
    bestFor: ['discovery', 'registry inspection', 'composite enumeration'],
    complexity: 'low'
  };

  async execute(params: ListCompositesParams): Promise<MCPToolResult<ListCompositesResult>> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      // Check registry exists
      if (!fs.existsSync(params.registryPath)) {
        // Return empty list if registry doesn't exist
        return this.success({
          registryPath: params.registryPath,
          total: 0,
          composites: [],
        });
      }

      // Load registry
      const registryContent = fs.readFileSync(params.registryPath, 'utf-8');
      const registry = JSON.parse(registryContent);

      // Get composites from registry
      const composites = registry.composites || [];

      // Filter by namespace if provided
      let filteredComposites = composites;
      if (params.namespace) {
        const ns = params.namespace.toLowerCase();
        filteredComposites = composites.filter((c: CompositeInfo) => 
          c.name.toLowerCase().startsWith(ns)
        );
      }

      // Enrich composite info if files exist
      const enrichedComposites = await Promise.all(
        filteredComposites.map(async (c: CompositeInfo & { path: string }) => {
          try {
            const compositePath = path.resolve(path.dirname(params.registryPath), c.path);
            if (fs.existsSync(compositePath)) {
              const content = fs.readFileSync(compositePath, 'utf-8');
              const composite = JSON.parse(content);
              return {
                ...c,
                inputCount: composite.inputs?.length || 0,
                outputCount: composite.outputs?.length || 0,
                nodeCount: composite.nodes?.length || 0,
                createdAt: composite.metadata?.createdAt,
              };
            }
          } catch {
            // Keep original info if file can't be read
          }
          return {
            ...c,
            inputCount: 0,
            outputCount: 0,
            nodeCount: 0,
          };
        })
      );

      return this.success({
        registryPath: params.registryPath,
        total: enrichedComposites.length,
        composites: enrichedComposites,
      });

    } catch (error) {
      return this.failure(`Failed to list composites: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
