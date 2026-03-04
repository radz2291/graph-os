/**
 * QUERY Tool - Read & Explore
 *
 * Query graph topology, signals, nodes, wires, and runtime state.
 *
 * @module @graph-os/tool/tools
 */

import { BaseTool, type ToolResult, type ToolDefinition } from '../core/Tool';
import { globalSessionManager } from '../core/SessionState';
import { globalCacheManager, CACHE_TTL, CACHE_TAGS } from '../core/CacheManager';
import type { QueryParams, QueryResult } from '../core/types';
import { ErrorCode } from '../core/types';

// =============================================================================
// TOOL DEFINITION
// =============================================================================

const QUERY_TOOL_DEFINITION: ToolDefinition = {
  name: 'query',
  purpose: 'Read and explore graph topology, signals, nodes, wires, and runtime state.',
  whenToUse: [
    'Understanding current graph structure',
    'Finding nodes that handle specific signals',
    'Validating graph before modifications',
    'Debugging signal flow paths',
    'Getting visual representation of topology',
    'Checking runtime state',
  ],
  whenNotToUse: [
    'Modifying the graph (use patch)',
    'Executing the runtime (use run)',
    'Generating new structures (use generate)',
  ],
  triggers: ['show', 'list', 'find', 'get', 'what', 'how many', 'validate', 'check', 'search', 'where does'],
  parameters: [
    {
      name: 'from',
      type: 'string',
      required: true,
      description: 'Target to query from',
      enum: ['cartridge', 'nodes', 'wires', 'signals', 'composites', 'topology', 'state', 'history', 'checkpoints'],
      hints: {
        cartridge: 'Full cartridge definition and validation',
        nodes: 'Processing units in the graph',
        wires: 'Connections between nodes',
        signals: 'Signal types in registry',
        composites: 'Reusable composite cartridges',
        topology: 'Signal flow structure',
        state: 'Current runtime state (if running)',
        history: 'Operation history',
        checkpoints: 'Saved checkpoints for rollback',
      },
    },
    {
      name: 'where',
      type: 'object',
      required: false,
      description: 'Filter criteria',
      hints: {
        id: 'Exact ID match',
        type: 'Pattern match on type (supports * wildcard)',
        handlesSignal: 'Find nodes that handle this signal type',
        upstream: 'Find nodes feeding into this node',
        downstream: 'Find nodes fed by this node',
        path: 'Find signal flow path between nodes: { from: "x", to: "y" }',
        search: 'Full-text search in descriptions',
      },
    },
    {
      name: 'select',
      type: 'string',
      required: false,
      description: 'Output format',
      default: 'summary',
      enum: ['summary', 'full', 'compact', 'graph', 'mermaid', 'stats', 'paths', 'validation'],
      hints: {
        summary: 'Concise overview (default)',
        full: 'Complete data structure',
        compact: 'Token-optimized format',
        graph: 'Adjacency list format',
        mermaid: 'Visual diagram code',
        stats: 'Numeric metrics only',
        paths: 'All signal flow paths',
        validation: 'Validation report',
      },
    },
    {
      name: 'cartridge',
      type: 'string',
      required: false,
      description: 'Override active cartridge',
    },
    {
      name: 'depth',
      type: 'number',
      required: false,
      description: 'Maximum depth for nested queries',
      default: 1,
    },
    {
      name: 'limit',
      type: 'number',
      required: false,
      description: 'Maximum results to return',
      default: 100,
    },
    {
      name: 'fresh',
      type: 'boolean',
      required: false,
      description: 'Skip cache and force fresh read',
      default: false,
    },
  ],
  returnType: 'QueryResult',
  examples: [
    {
      input: { from: 'topology', select: 'mermaid' },
      description: 'Get visual diagram of graph',
    },
    {
      input: { from: 'nodes', where: { type: 'logic.*' } },
      description: 'Find all logic nodes',
    },
    {
      input: { from: 'nodes', where: { handlesSignal: 'AUTH.*' } },
      description: 'Find nodes handling AUTH signals',
    },
    {
      input: { from: 'signals' },
      description: 'List all registered signals',
    },
    {
      input: { from: 'cartridge', select: 'validation' },
      description: 'Validate cartridge',
    },
    {
      input: { from: 'topology', select: 'paths', where: { path: { from: 'input', to: 'output' } } },
      description: 'Find signal path between nodes',
    },
  ],
};

// =============================================================================
// QUERY TOOL CLASS
// =============================================================================

/**
 * Query Tool - Read & Explore
 */
export class QueryTool extends BaseTool<QueryParams, QueryResult> {
  readonly name = 'query';
  readonly definition = QUERY_TOOL_DEFINITION;

  async execute(params: QueryParams): Promise<ToolResult<QueryResult>> {
    const session = globalSessionManager;

    // Check session
    if (!session.isInitialized()) {
      return this.error(ErrorCode.SESSION_NOT_INITIALIZED, 'No project loaded. Run use({ project: "path" }) first.', {
        recovery: {
          suggestions: ['Load a project with use({ project: "path" }) or use({ detect: true })'],
        },
      });
    }

    // Check cache
    if (!params.fresh) {
      const cacheKey = this.getCacheKey(params);
      const cached = globalCacheManager.get<ToolResult<QueryResult>>(cacheKey);
      if (cached) {
        return { ...cached, summary: `[Cached] ${cached.summary}` };
      }
    }

    // Route to query handler
    try {
      let result: ToolResult<QueryResult>;

      switch (params.from) {
        case 'cartridge':
          result = await this.queryCartridge(params);
          break;
        case 'nodes':
          result = await this.queryNodes(params);
          break;
        case 'wires':
          result = await this.queryWires(params);
          break;
        case 'signals':
          result = await this.querySignals(params);
          break;
        case 'composites':
          result = await this.queryComposites(params);
          break;
        case 'topology':
          result = await this.queryTopology(params);
          break;
        case 'state':
          result = await this.queryState(params);
          break;
        case 'history':
          result = await this.queryHistory(params);
          break;
        case 'checkpoints':
          result = await this.queryCheckpoints(params);
          break;
        default:
          return this.error(ErrorCode.INVALID_PARAMETERS, `Unknown query target: ${params.from}`);
      }

      // Cache result
      if (result.status === 'ok' && !params.fresh) {
        const cacheKey = this.getCacheKey(params);
        globalCacheManager.set(cacheKey, result, CACHE_TTL.MEDIUM, [CACHE_TAGS.CARTRIDGE]);
      }

      return result;
    } catch (error) {
      return this.error(
        ErrorCode.UNKNOWN_ERROR,
        error instanceof Error ? error.message : 'Query failed',
        { details: { params } }
      );
    }
  }

  // ===========================================================================
  // CACHE KEY
  // ===========================================================================

  private getCacheKey(params: QueryParams): string {
    return `query:${params.from}:${JSON.stringify(params.where)}:${params.select || 'summary'}:${params.limit || 100}:${params.depth || 1}`;
  }

  // ===========================================================================
  // QUERY HANDLERS (Phase 3 Implementation)
  // ===========================================================================

  /**
   * Query cartridge
   */
  private async queryCartridge(params: QueryParams): Promise<ToolResult<QueryResult>> {
    // TODO: Implement in Phase 3
    const session = globalSessionManager;
    const cartridgeData = session.cartridgeData as Record<string, unknown> | null;

    if (!cartridgeData) {
      return {
        summary: 'No cartridge loaded',
        status: 'empty',
      };
    }

    const select = params.select || 'summary';
    const nodeCount = (cartridgeData.nodes as unknown[])?.length || 0;
    const wireCount = (cartridgeData.wires as unknown[])?.length || 0;

    if (select === 'summary') {
      return {
        summary: `${cartridgeData.name as string}: ${nodeCount} nodes, ${wireCount} wires`,
        status: 'ok',
        metrics: { count: nodeCount },
      };
    }

    if (select === 'validation') {
      // TODO: Run validation pipeline
      return {
        summary: 'Validation pending (Phase 3)',
        status: 'ok',
        data: { issues: [] } as unknown as QueryResult,
      };
    }

    if (select === 'full') {
      return {
        summary: `${cartridgeData.name as string} (full data)`,
        status: 'ok',
        raw: cartridgeData,
      };
    }

    return {
      summary: `${cartridgeData.name as string} (${select})`,
      status: 'ok',
      data: cartridgeData as unknown as QueryResult,
    };
  }

  /**
   * Query nodes
   */
  private async queryNodes(params: QueryParams): Promise<ToolResult<QueryResult>> {
    const session = globalSessionManager;
    const cartridgeData = session.cartridgeData as Record<string, unknown> | null;

    if (!cartridgeData) {
      return {
        summary: 'No cartridge loaded',
        status: 'empty',
      };
    }

    const nodes = (cartridgeData.nodes as Array<Record<string, unknown>>) || [];
    const wires = (cartridgeData.wires as Array<Record<string, unknown>>) || [];
    const where = params.where;
    // Use nullish coalescing to preserve limit=0 (which is valid)
    const limit = params.limit ?? 100;

    let filtered = [...nodes];

    // Apply filters
    if (where?.id) {
      filtered = filtered.filter(n => n.id === where.id);
    }

    if (where?.type) {
      const pattern = where.type.replace('*', '.*');
      const regex = new RegExp(`^${pattern}$`);
      filtered = filtered.filter(n => regex.test(n.type as string));
    }

    if (where?.search) {
      const searchLower = where.search.toLowerCase();
      filtered = filtered.filter(n =>
        (n.description as string)?.toLowerCase().includes(searchLower) ||
        (n.id as string)?.toLowerCase().includes(searchLower)
      );
    }

    // Find nodes that handle a specific signal type
    if (where?.handlesSignal) {
      const signalPattern = where.handlesSignal.replace('*', '.*');
      const signalRegex = new RegExp(`^${signalPattern}$`);
      filtered = filtered.filter(n => {
        // Check if any wire targets this node with the signal
        return wires.some(w => 
          w.to === n.id && signalRegex.test(w.signalType as string)
        );
      });
    }

    // Find upstream nodes (nodes that feed into the target)
    if (where?.upstream) {
      const targetId = where.upstream;
      const upstreamIds = new Set<string>();
      
      // BFS to find all upstream nodes
      const queue: string[] = [targetId];
      const visited = new Set<string>([targetId]);
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const wire of wires) {
          if (wire.to === current && !visited.has(wire.from as string)) {
            visited.add(wire.from as string);
            upstreamIds.add(wire.from as string);
            queue.push(wire.from as string);
          }
        }
      }
      
      filtered = filtered.filter(n => upstreamIds.has(n.id as string));
    }

    // Find downstream nodes (nodes that are fed by the target)
    if (where?.downstream) {
      const targetId = where.downstream;
      const downstreamIds = new Set<string>();
      
      // BFS to find all downstream nodes
      const queue: string[] = [targetId];
      const visited = new Set<string>([targetId]);
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const wire of wires) {
          if (wire.from === current && !visited.has(wire.to as string)) {
            visited.add(wire.to as string);
            downstreamIds.add(wire.to as string);
            queue.push(wire.to as string);
          }
        }
      }
      
      filtered = filtered.filter(n => downstreamIds.has(n.id as string));
    }

    // Find path between two nodes
    if (where?.path && typeof where.path === 'object') {
      const pathFrom = (where.path as { from: string; to: string }).from;
      const pathTo = (where.path as { from: string; to: string }).to;
      
      // BFS to find shortest path
      const pathNodeIds = this.findPath(nodes, wires, pathFrom, pathTo);
      
      if (pathNodeIds) {
        filtered = filtered.filter(n => pathNodeIds.includes(n.id as string));
      } else {
        filtered = [];
      }
    }

    if (filtered.length === 0) {
      return {
        summary: 'No nodes found matching criteria',
        status: 'empty',
        metrics: { count: 0 },
      };
    }

    // Handle limit=0 case (return empty, matching SQL semantics)
    if (limit === 0) {
      return {
        summary: 'Found 0 nodes (limit=0)',
        status: 'ok',
        metrics: { count: filtered.length },
        data: [] as unknown as QueryResult,
      };
    }

    // Apply limit - validate and clamp negative/undefined values
    const validLimit = Math.max(1, Math.min(limit || 100, 10000));
    const limited = filtered.slice(0, validLimit);
    const wasLimited = filtered.length > validLimit;

    const select = params.select || 'summary';

    if (select === 'compact') {
      // Token-optimized format
      const compact = limited.map(n => [n.id, n.type]);
      return {
        summary: `Found ${filtered.length} nodes${wasLimited ? ` (showing ${validLimit})` : ''}`,
        status: 'ok',
        metrics: { count: filtered.length },
        data: compact as unknown as QueryResult,
      };
    }

    return {
      summary: `Found ${filtered.length} nodes${wasLimited ? ` (showing ${validLimit})` : ''}`,
      status: 'ok',
      metrics: { count: filtered.length },
      data: limited as unknown as QueryResult,
    };
  }

  /**
   * Find path between two nodes using BFS
   */
  private findPath(
    _nodes: Array<Record<string, unknown>>,
    wires: Array<Record<string, unknown>>,
    fromId: string,
    toId: string
  ): string[] | null {
    // Note: _nodes parameter kept for future validation if needed
    // BFS
    const queue: { nodeId: string; path: string[] }[] = [{ nodeId: fromId, path: [fromId] }];
    const visited = new Set<string>([fromId]);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.nodeId === toId) {
        return current.path;
      }

      for (const wire of wires) {
        if (wire.from === current.nodeId && !visited.has(wire.to as string)) {
          visited.add(wire.to as string);
          queue.push({
            nodeId: wire.to as string,
            path: [...current.path, wire.to as string]
          });
        }
      }
    }

    return null; // No path found
  }

  /**
   * Query wires
   */
  private async queryWires(_params: QueryParams): Promise<ToolResult<QueryResult>> {
    // TODO: Implement in Phase 3
    const session = globalSessionManager;
    const cartridgeData = session.cartridgeData as Record<string, unknown> | null;

    if (!cartridgeData) {
      return {
        summary: 'No cartridge loaded',
        status: 'empty',
      };
    }

    const wires = (cartridgeData.wires as Array<Record<string, unknown>>) || [];

    return {
      summary: `Found ${wires.length} wires`,
      status: 'ok',
      metrics: { count: wires.length },
      data: wires as unknown as QueryResult,
    };
  }

  /**
   * Query signals
   */
  private async querySignals(params: QueryParams): Promise<ToolResult<QueryResult>> {
    // TODO: Implement in Phase 3
    const session = globalSessionManager;
    const signalRegistry = session.getState().signalRegistry;

    if (!signalRegistry) {
      return {
        summary: 'No signal registry loaded',
        status: 'empty',
      };
    }

    const signals = signalRegistry.signals || [];
    const where = params.where;

    let filtered = signals;

    if (where?.type) {
      const pattern = where.type.replace('*', '.*');
      const regex = new RegExp(`^${pattern}$`);
      filtered = filtered.filter(s => regex.test(s.type));
    }

    return {
      summary: `Found ${filtered.length} signals`,
      status: 'ok',
      metrics: { count: filtered.length },
      data: filtered as unknown as QueryResult,
    };
  }

  /**
   * Query composites
   */
  private async queryComposites(_params: QueryParams): Promise<ToolResult<QueryResult>> {
    // TODO: Implement in Phase 3
    const session = globalSessionManager;
    const compositeRegistry = session.getState().compositeRegistry;

    if (!compositeRegistry) {
      return {
        summary: 'No composite registry loaded',
        status: 'empty',
      };
    }

    const composites = compositeRegistry.composites || [];

    return {
      summary: `Found ${composites.length} composites`,
      status: 'ok',
      metrics: { count: composites.length },
      data: composites as unknown as QueryResult,
    };
  }

  /**
   * Query topology
   */
  private async queryTopology(params: QueryParams): Promise<ToolResult<QueryResult>> {
    const session = globalSessionManager;
    const cartridgeData = session.cartridgeData as Record<string, unknown> | null;

    if (!cartridgeData) {
      return {
        summary: 'No cartridge loaded',
        status: 'empty',
      };
    }

    const nodes = (cartridgeData.nodes as Array<Record<string, unknown>>) || [];
    const wires = (cartridgeData.wires as Array<Record<string, unknown>>) || [];
    const select = params.select || 'summary';
    const depth = params.depth || Infinity;

    if (select === 'mermaid') {
      // Generate Mermaid diagram
      let mermaid = 'graph LR\n';
      for (const wire of wires) {
        mermaid += `  ${wire.from} -->|${wire.signalType}| ${wire.to}\n`;
      }
      return {
        summary: `Topology: ${nodes.length} nodes, ${wires.length} wires`,
        status: 'ok',
        visual: mermaid,
        metrics: { count: nodes.length },
      };
    }

    if (select === 'graph') {
      // Return adjacency list format
      const graph: Record<string, Array<{ to: string; signalType: string }>> = {};
      
      for (const node of nodes) {
        graph[node.id as string] = [];
      }
      
      for (const wire of wires) {
        const from = wire.from as string;
        if (!graph[from]) {
          graph[from] = [];
        }
        graph[from].push({
          to: wire.to as string,
          signalType: wire.signalType as string
        });
      }
      
      return {
        summary: `Topology graph: ${nodes.length} nodes, ${wires.length} edges`,
        status: 'ok',
        metrics: { count: nodes.length },
        data: { graph, nodes: nodes.length, edges: wires.length } as unknown as QueryResult,
      };
    }

    if (select === 'paths') {
      // Find all signal paths from inputs to outputs
      const paths: Array<{ start: string; end: string; path: string[]; signals: string[] }> = [];
      
      // Find entry points (nodes with no incoming wires)
      const nodesWithIncoming = new Set(wires.map(w => w.to as string));
      const entryPoints = nodes.filter(n => !nodesWithIncoming.has(n.id as string));
      
      // Find exit points (nodes with no outgoing wires)
      const nodesWithOutgoing = new Set(wires.map(w => w.from as string));
      const exitPoints = nodes.filter(n => !nodesWithOutgoing.has(n.id as string));
      
      // Find all paths from entry to exit points
      for (const entry of entryPoints) {
        for (const exit of exitPoints) {
          const pathResult = this.findAllPaths(
            nodes, 
            wires, 
            entry.id as string, 
            exit.id as string,
            depth
          );
          paths.push(...pathResult);
        }
      }
      
      return {
        summary: `Found ${paths.length} signal paths`,
        status: 'ok',
        metrics: { count: paths.length },
        data: { 
          entryPoints: entryPoints.map(n => n.id),
          exitPoints: exitPoints.map(n => n.id),
          paths 
        } as unknown as QueryResult,
      };
    }

    return {
      summary: `Topology: ${nodes.length} nodes, ${wires.length} wires`,
      status: 'ok',
      metrics: { count: nodes.length },
      data: { nodes: nodes.length, wires: wires.length } as unknown as QueryResult,
    };
  }

  /**
   * Find all paths between two nodes (with depth limit)
   */
  private findAllPaths(
    _nodes: Array<Record<string, unknown>>,
    wires: Array<Record<string, unknown>>,
    fromId: string,
    toId: string,
    maxDepth: number = Infinity
  ): Array<{ start: string; end: string; path: string[]; signals: string[] }> {
    // Note: _nodes parameter kept for future validation if needed
    const results: Array<{ start: string; end: string; path: string[]; signals: string[] }> = [];
    
    // DFS with path tracking
    const stack: { nodeId: string; path: string[]; signals: string[] }[] = [
      { nodeId: fromId, path: [fromId], signals: [] }
    ];
    
    while (stack.length > 0) {
      const current = stack.pop()!;
      
      if (current.nodeId === toId) {
        results.push({
          start: fromId,
          end: toId,
          path: current.path,
          signals: current.signals
        });
        continue;
      }
      
      // Depth limit check
      if (current.path.length >= maxDepth) {
        continue;
      }
      
      // Find outgoing wires
      for (const wire of wires) {
        if (wire.from === current.nodeId && !current.path.includes(wire.to as string)) {
          stack.push({
            nodeId: wire.to as string,
            path: [...current.path, wire.to as string],
            signals: [...current.signals, wire.signalType as string]
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Query state
   */
  private async queryState(_params: QueryParams): Promise<ToolResult<QueryResult>> {
    // TODO: Implement in Phase 3
    const session = globalSessionManager;

    return {
      summary: `Runtime: ${session.runtimeStatus}`,
      status: 'ok',
      data: {
        activeCartridge: session.activeCartridge,
        runtimeStatus: session.runtimeStatus,
        checkpointsAvailable: session.getCheckpoints().length,
      } as unknown as QueryResult,
    };
  }

  /**
   * Query history
   */
  private async queryHistory(_params: QueryParams): Promise<ToolResult<QueryResult>> {
    // TODO: Implement in Phase 3
    const session = globalSessionManager;
    const history = session.getState().history;

    return {
      summary: `History: ${history.length} entries`,
      status: 'ok',
      metrics: { count: history.length },
      data: history as unknown as QueryResult,
    };
  }

  /**
   * Query checkpoints
   */
  private async queryCheckpoints(params: QueryParams): Promise<ToolResult<QueryResult>> {
    const session = globalSessionManager;
    const checkpoints = session.getCheckpoints();

    // Filter by ID if provided
    let filtered = checkpoints;
    if (params.where?.id) {
      filtered = checkpoints.filter(c => c.id === params.where?.id);
    }

    // Select format
    const select = params.select || 'summary';

    if (select === 'full') {
      return {
        summary: `Found ${filtered.length} checkpoints`,
        status: 'ok',
        metrics: { count: filtered.length },
        data: filtered as unknown as QueryResult,
      };
    }

    // Summary format - return lightweight checkpoint info without full snapshot
    const summaryData = filtered.map(c => ({
      id: c.id,
      name: c.name,
      timestamp: c.timestamp,
      description: c.description,
    }));

    return {
      summary: `Found ${filtered.length} checkpoints`,
      status: 'ok',
      metrics: { count: filtered.length },
      data: summaryData as unknown as QueryResult,
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a Query tool instance
 */
export function createQueryTool(): QueryTool {
  return new QueryTool();
}
