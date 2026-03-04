/**
 * query_topology - Universal query system for graph neighborhoods
 *
 * This tool enables efficient querying of graph topology including:
 * - Subgraph traversal (BFS/DFS)
 * - Registry queries (signals, composites)
 * - Node/signal/composite lookups
 * - LRU caching for performance
 *
 * @module @graph-os/mcp-tools/precision
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MCPToolResult, MCPToolDefinition } from '../../core/MCPTool';
import type { Cartridge, SignalRegistry, CompositeRegistry, NodeDefinition, WireDefinition } from '../../core/ConflictDetector';

// =============================================================================
// Types
// =============================================================================

export type QueryType = 
  | 'subgraph' 
  | 'signal-registry' 
  | 'composite-registry' 
  | 'node' 
  | 'signal' 
  | 'composite'
  | 'wires'
  | 'paths';

export type OutputFormat = 'full' | 'compact' | 'minimal';

export type TraversalMethod = 'bfs' | 'dfs';

export interface QueryFilter {
  pattern?: string;
  namespace?: string;
  emittedBy?: string[];
  consumedBy?: string[];
  nodeTypes?: string[];
  signalTypes?: string[];
}

export interface TopologyQuery {
  /** Type of query to perform */
  queryType: QueryType;
  /** Cartridge path (required for subgraph, node, wires, paths queries) */
  cartridgePath?: string;
  /** Anchor node ID for subgraph queries */
  anchorNodeId?: string;
  /** Depth of traversal for subgraph queries */
  depth?: number;
  /** Include incoming connections */
  includeIncoming?: boolean;
  /** Include outgoing connections */
  includeOutgoing?: boolean;
  /** Traversal method for subgraph queries */
  traversalMethod?: TraversalMethod;
  /** Specific node ID to query */
  nodeId?: string;
  /** Specific signal type to query */
  signalType?: string;
  /** Specific composite name to query */
  compositeName?: string;
  /** Signal registry path */
  signalRegistryPath?: string;
  /** Composite registry path */
  compositeRegistryPath?: string;
  /** Query filters */
  filter?: QueryFilter;
  /** Include metadata in results */
  includeMetadata?: boolean;
  /** Include node/signal configurations */
  includeConfig?: boolean;
  /** Output format */
  format?: OutputFormat;
  /** Find paths between two nodes */
  fromNodeId?: string;
  /** Target node for path finding */
  toNodeId?: string;
  /** Maximum paths to return */
  maxPaths?: number;
}

export interface SubgraphResult {
  nodes: NodeDefinition[];
  wires: WireDefinition[];
  anchorNode: string;
  depth: number;
  nodeCount: number;
  wireCount: number;
}

export interface SignalQueryResult {
  type: string;
  description?: string;
  payloadSchema?: Record<string, unknown>;
  emittedBy?: string[];
  consumedBy?: string[];
  usageCount?: number;
  cartridgeUsage?: string[];
}

export interface CompositeQueryResult {
  name: string;
  path: string;
  inputs?: string[];
  outputs?: string[];
  nodeCount?: number;
  wireCount?: number;
  usageCount?: number;
}

export interface PathResult {
  path: string[];
  signals: string[];
  length: number;
}

export interface TopologyQueryResult {
  success: boolean;
  queryType: QueryType;
  data: SubgraphResult | SignalQueryResult | CompositeQueryResult | NodeDefinition | NodeDefinition[] | SignalQueryResult[] | CompositeQueryResult[] | WireDefinition[] | PathResult[] | unknown;
  metadata?: {
    executionTimeMs: number;
    cached: boolean;
    totalResults: number;
  };
}

// =============================================================================
// LRU Cache Implementation
// =============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 100, ttlMs: number = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  set(key: K, value: V): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const queryCache = new LRUCache<string, unknown>(100, 60000);

// =============================================================================
// QueryTopologyTool Class
// =============================================================================

export class QueryTopologyTool {
  readonly definition: MCPToolDefinition = {
    name: 'query_topology',
    description: 'Universal query system for Graph-OS topology. Query subgraphs, registries, nodes, signals, composites, and paths with efficient caching.',
    parameters: [
      {
        name: 'queryType',
        type: 'string',
        required: true,
        description: 'Query type: subgraph, signal-registry, composite-registry, node, signal, composite, wires, paths'
      },
      {
        name: 'cartridgePath',
        type: 'string',
        required: false,
        description: 'Path to cartridge file (required for subgraph, node, wires, paths queries)'
      },
      {
        name: 'anchorNodeId',
        type: 'string',
        required: false,
        description: 'Starting node for subgraph traversal'
      },
      {
        name: 'depth',
        type: 'number',
        required: false,
        description: 'Traversal depth for subgraph queries (default: 2)'
      },
      {
        name: 'includeIncoming',
        type: 'boolean',
        required: false,
        description: 'Include incoming connections (default: true)'
      },
      {
        name: 'includeOutgoing',
        type: 'boolean',
        required: false,
        description: 'Include outgoing connections (default: true)'
      },
      {
        name: 'traversalMethod',
        type: 'string',
        required: false,
        description: 'Traversal method: bfs (breadth-first) or dfs (depth-first)'
      },
      {
        name: 'nodeId',
        type: 'string',
        required: false,
        description: 'Specific node ID to query'
      },
      {
        name: 'signalType',
        type: 'string',
        required: false,
        description: 'Signal type to query'
      },
      {
        name: 'compositeName',
        type: 'string',
        required: false,
        description: 'Composite name to query'
      },
      {
        name: 'signalRegistryPath',
        type: 'string',
        required: false,
        description: 'Path to signal registry'
      },
      {
        name: 'compositeRegistryPath',
        type: 'string',
        required: false,
        description: 'Path to composite registry'
      },
      {
        name: 'filter',
        type: 'object',
        required: false,
        description: 'Query filters (pattern, namespace, emittedBy, consumedBy)'
      },
      {
        name: 'format',
        type: 'string',
        required: false,
        description: 'Output format: full, compact, or minimal'
      },
      {
        name: 'fromNodeId',
        type: 'string',
        required: false,
        description: 'Start node for path finding'
      },
      {
        name: 'toNodeId',
        type: 'string',
        required: false,
        description: 'End node for path finding'
      }
    ],
    returnType: 'TopologyQueryResult',
    category: 'precision',
    bestFor: ['querying', 'exploration', 'analysis', 'neighborhood discovery'],
    complexity: 'medium'
  };

  async execute(input: TopologyQuery): Promise<MCPToolResult<TopologyQueryResult>> {
    const startTime = performance.now();
    let cached = false;

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(input);

      // Check cache
      const cachedResult = queryCache.get(cacheKey);
      if (cachedResult) {
        cached = true;
        return {
          success: true,
          data: cachedResult as TopologyQueryResult,
        };
      }

      let result: TopologyQueryResult;

      switch (input.queryType) {
        case 'subgraph':
          result = await this.querySubgraph(input);
          break;
        case 'signal-registry':
          result = await this.querySignalRegistry(input);
          break;
        case 'composite-registry':
          result = await this.queryCompositeRegistry(input);
          break;
        case 'node':
          result = await this.queryNode(input);
          break;
        case 'signal':
          result = await this.querySignal(input);
          break;
        case 'composite':
          result = await this.queryComposite(input);
          break;
        case 'wires':
          result = await this.queryWires(input);
          break;
        case 'paths':
          result = await this.queryPaths(input);
          break;
        default:
          return {
            success: false,
            error: `Unknown query type: ${input.queryType}`,
          };
      }

      // Add metadata
      const executionTime = performance.now() - startTime;
      result.metadata = {
        executionTimeMs: executionTime,
        cached: false,
        totalResults: this.countResults(result.data),
      };

      // Cache the result
      queryCache.set(cacheKey, result);

      return {
        success: true,
        data: result,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ===========================================================================
  // Query Implementations
  // ===========================================================================

  private async querySubgraph(input: TopologyQuery): Promise<TopologyQueryResult> {
    if (!input.cartridgePath || !input.anchorNodeId) {
      return {
        success: false,
        queryType: 'subgraph',
        data: { nodes: [], wires: [], anchorNode: '', depth: 0, nodeCount: 0, wireCount: 0 },
        metadata: { executionTimeMs: 0, cached: false, totalResults: 0 },
      };
    }

    const cartridge: Cartridge = JSON.parse(fs.readFileSync(input.cartridgePath, 'utf-8'));
    const depth = input.depth || 2;
    const method = input.traversalMethod || 'bfs';
    const includeIncoming = input.includeIncoming !== false;
    const includeOutgoing = input.includeOutgoing !== false;

    // Build adjacency lists
    const outgoing = new Map<string, Array<{ node: string; signal: string }>>();
    const incoming = new Map<string, Array<{ node: string; signal: string }>>();

    for (const wire of cartridge.wires) {
      // Outgoing connections
      if (!outgoing.has(wire.from)) {
        outgoing.set(wire.from, []);
      }
      outgoing.get(wire.from)!.push({ node: wire.to, signal: wire.signalType });

      // Incoming connections
      if (!incoming.has(wire.to)) {
        incoming.set(wire.to, []);
      }
      incoming.get(wire.to)!.push({ node: wire.from, signal: wire.signalType });
    }

    // Traverse
    const visitedNodes = new Set<string>();
    const collectedWires: WireDefinition[] = [];
    const queue: Array<{ nodeId: string; currentDepth: number }> = [
      { nodeId: input.anchorNodeId, currentDepth: 0 }
    ];

    while (queue.length > 0) {
      const { nodeId, currentDepth } = method === 'bfs'
        ? queue.shift()!
        : queue.pop()!;

      if (visitedNodes.has(nodeId) || currentDepth > depth) {
        continue;
      }

      visitedNodes.add(nodeId);

      // Add outgoing connections
      if (includeOutgoing && currentDepth < depth) {
        const outConnections = outgoing.get(nodeId) || [];
        for (const conn of outConnections) {
          if (!visitedNodes.has(conn.node)) {
            queue.push({ nodeId: conn.node, currentDepth: currentDepth + 1 });
          }
          
          // Add wire
          const wire = cartridge.wires.find(w =>
            w.from === nodeId && w.to === conn.node && w.signalType === conn.signal
          );
          if (wire && !collectedWires.includes(wire)) {
            collectedWires.push(wire);
          }
        }
      }

      // Add incoming connections
      if (includeIncoming && currentDepth < depth) {
        const inConnections = incoming.get(nodeId) || [];
        for (const conn of inConnections) {
          if (!visitedNodes.has(conn.node)) {
            queue.push({ nodeId: conn.node, currentDepth: currentDepth + 1 });
          }
          
          // Add wire
          const wire = cartridge.wires.find(w =>
            w.from === conn.node && w.to === nodeId && w.signalType === conn.signal
          );
          if (wire && !collectedWires.includes(wire)) {
            collectedWires.push(wire);
          }
        }
      }
    }

    // Collect nodes
    const nodes = cartridge.nodes.filter(n => visitedNodes.has(n.id));

    // Apply filters
    const filter = input.filter;
    if (filter) {
      if (filter.nodeTypes && filter.nodeTypes.length > 0) {
        // Filter nodes by type - but still include connected nodes
      }
    }

    const data: SubgraphResult = {
      nodes,
      wires: collectedWires,
      anchorNode: input.anchorNodeId,
      depth,
      nodeCount: nodes.length,
      wireCount: collectedWires.length,
    };

    return {
      success: true,
      queryType: 'subgraph',
      data,
    };
  }

  private async querySignalRegistry(input: TopologyQuery): Promise<TopologyQueryResult> {
    if (!input.signalRegistryPath) {
      return {
        success: false,
        queryType: 'signal-registry',
        data: [],
        metadata: { executionTimeMs: 0, cached: false, totalResults: 0 },
      };
    }

    const registry: SignalRegistry = JSON.parse(fs.readFileSync(input.signalRegistryPath, 'utf-8'));
    let signals = registry.signals || [];

    // Apply filters
    const filter = input.filter;
    if (filter) {
      if (filter.pattern) {
        const regex = new RegExp(filter.pattern, 'i');
        signals = signals.filter(s => regex.test(s.type) || (s.description && regex.test(s.description)));
      }
      if (filter.namespace) {
        signals = signals.filter(s => s.type.startsWith(filter.namespace + '.'));
      }
      if (filter.emittedBy && filter.emittedBy.length > 0) {
        signals = signals.filter(s =>
          s.emittedBy && s.emittedBy.some(e => filter.emittedBy!.includes(e))
        );
      }
      if (filter.consumedBy && filter.consumedBy.length > 0) {
        signals = signals.filter(s =>
          s.consumedBy && s.consumedBy.some(c => filter.consumedBy!.includes(c))
        );
      }
    }

    // Format output
    const format = input.format || 'full';
    const data = signals.map(s => this.formatSignal(s, format, input.includeConfig));

    return {
      success: true,
      queryType: 'signal-registry',
      data,
    };
  }

  private async queryCompositeRegistry(input: TopologyQuery): Promise<TopologyQueryResult> {
    if (!input.compositeRegistryPath) {
      return {
        success: false,
        queryType: 'composite-registry',
        data: [],
        metadata: { executionTimeMs: 0, cached: false, totalResults: 0 },
      };
    }

    const registry: CompositeRegistry = JSON.parse(fs.readFileSync(input.compositeRegistryPath, 'utf-8'));
    let composites = registry.composites || [];

    // Apply filters
    const filter = input.filter;
    if (filter) {
      if (filter.pattern) {
        const regex = new RegExp(filter.pattern, 'i');
        composites = composites.filter(c =>
          regex.test(c.name) || regex.test(c.path)
        );
      }
    }

    const data = composites.map(c => ({
      name: c.name,
      path: c.path,
      inputs: c.inputs,
      outputs: c.outputs,
      nodeCount: c.nodes?.length || 0,
      wireCount: c.wires?.length || 0,
    }));

    return {
      success: true,
      queryType: 'composite-registry',
      data,
    };
  }

  private async queryNode(input: TopologyQuery): Promise<TopologyQueryResult> {
    if (!input.cartridgePath || !input.nodeId) {
      return {
        success: false,
        queryType: 'node',
        data: null,
        metadata: { executionTimeMs: 0, cached: false, totalResults: 0 },
      };
    }

    const cartridge: Cartridge = JSON.parse(fs.readFileSync(input.cartridgePath, 'utf-8'));
    const node = cartridge.nodes.find(n => n.id === input.nodeId);

    if (!node) {
      return {
        success: false,
        queryType: 'node',
        data: null,
        metadata: { executionTimeMs: 0, cached: false, totalResults: 0 },
      };
    }

    // Add connection info
    const incomingWires = cartridge.wires.filter(w => w.to === input.nodeId);
    const outgoingWires = cartridge.wires.filter(w => w.from === input.nodeId);

    const data = {
      ...node,
      connections: {
        incoming: incomingWires.map(w => ({ from: w.from, signal: w.signalType })),
        outgoing: outgoingWires.map(w => ({ to: w.to, signal: w.signalType })),
      },
    };

    return {
      success: true,
      queryType: 'node',
      data,
    };
  }

  private async querySignal(input: TopologyQuery): Promise<TopologyQueryResult> {
    if (!input.signalRegistryPath || !input.signalType) {
      return {
        success: false,
        queryType: 'signal',
        data: null,
        metadata: { executionTimeMs: 0, cached: false, totalResults: 0 },
      };
    }

    const registry: SignalRegistry = JSON.parse(fs.readFileSync(input.signalRegistryPath, 'utf-8'));
    const signal = registry.signals?.find(s => s.type === input.signalType);

    if (!signal) {
      return {
        success: false,
        queryType: 'signal',
        data: null,
        metadata: { executionTimeMs: 0, cached: false, totalResults: 0 },
      };
    }

    const data: SignalQueryResult = {
      type: signal.type,
      description: signal.description,
      payloadSchema: signal.payloadSchema,
      emittedBy: signal.emittedBy,
      consumedBy: signal.consumedBy,
    };

    return {
      success: true,
      queryType: 'signal',
      data,
    };
  }

  private async queryComposite(input: TopologyQuery): Promise<TopologyQueryResult> {
    if (!input.compositeRegistryPath || !input.compositeName) {
      return {
        success: false,
        queryType: 'composite',
        data: null,
        metadata: { executionTimeMs: 0, cached: false, totalResults: 0 },
      };
    }

    const registry: CompositeRegistry = JSON.parse(fs.readFileSync(input.compositeRegistryPath, 'utf-8'));
    const composite = registry.composites?.find(c => c.name === input.compositeName);

    if (!composite) {
      return {
        success: false,
        queryType: 'composite',
        data: null,
        metadata: { executionTimeMs: 0, cached: false, totalResults: 0 },
      };
    }

    const data: CompositeQueryResult = {
      name: composite.name,
      path: composite.path,
      inputs: composite.inputs,
      outputs: composite.outputs,
      nodeCount: composite.nodes?.length || 0,
      wireCount: composite.wires?.length || 0,
    };

    return {
      success: true,
      queryType: 'composite',
      data,
    };
  }

  private async queryWires(input: TopologyQuery): Promise<TopologyQueryResult> {
    if (!input.cartridgePath) {
      return {
        success: false,
        queryType: 'wires',
        data: [],
        metadata: { executionTimeMs: 0, cached: false, totalResults: 0 },
      };
    }

    const cartridge: Cartridge = JSON.parse(fs.readFileSync(input.cartridgePath, 'utf-8'));
    let wires = cartridge.wires;

    // Apply filters
    const filter = input.filter;
    if (filter) {
      if (filter.signalTypes && filter.signalTypes.length > 0) {
        wires = wires.filter(w => filter.signalTypes!.includes(w.signalType));
      }
    }

    // Filter by node ID if provided
    if (input.nodeId) {
      wires = wires.filter(w => w.from === input.nodeId || w.to === input.nodeId);
    }

    return {
      success: true,
      queryType: 'wires',
      data: wires,
    };
  }

  private async queryPaths(input: TopologyQuery): Promise<TopologyQueryResult> {
    if (!input.cartridgePath || !input.fromNodeId || !input.toNodeId) {
      return {
        success: false,
        queryType: 'paths',
        data: [],
        metadata: { executionTimeMs: 0, cached: false, totalResults: 0 },
      };
    }

    const cartridge: Cartridge = JSON.parse(fs.readFileSync(input.cartridgePath, 'utf-8'));
    const maxPaths = input.maxPaths || 10;

    // Build adjacency list
    const adjacency = new Map<string, Array<{ node: string; signal: string }>>();
    for (const wire of cartridge.wires) {
      if (!adjacency.has(wire.from)) {
        adjacency.set(wire.from, []);
      }
      adjacency.get(wire.from)!.push({ node: wire.to, signal: wire.signalType });
    }

    // Find all paths using DFS
    const paths: PathResult[] = [];
    const visited = new Set<string>();

    const dfs = (currentNode: string, targetNode: string, currentPath: string[], currentSignals: string[]): void => {
      if (paths.length >= maxPaths) return;
      if (currentNode === targetNode) {
        paths.push({
          path: [...currentPath, currentNode],
          signals: currentSignals,
          length: currentPath.length,
        });
        return;
      }

      visited.add(currentNode);

      const neighbors = adjacency.get(currentNode) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.node)) {
          dfs(
            neighbor.node,
            targetNode,
            [...currentPath, currentNode],
            [...currentSignals, neighbor.signal]
          );
        }
      }

      visited.delete(currentNode);
    };

    dfs(input.fromNodeId, input.toNodeId, [], []);

    // Sort by path length
    paths.sort((a, b) => a.length - b.length);

    return {
      success: true,
      queryType: 'paths',
      data: paths,
    };
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  private generateCacheKey(input: TopologyQuery): string {
    const keyParts = [
      input.queryType,
      input.cartridgePath || '',
      input.anchorNodeId || '',
      String(input.depth || ''),
      input.nodeId || '',
      input.signalType || '',
      input.compositeName || '',
      input.signalRegistryPath || '',
      input.compositeRegistryPath || '',
      JSON.stringify(input.filter || {}),
      input.format || '',
      input.fromNodeId || '',
      input.toNodeId || '',
    ];
    return keyParts.join(':');
  }

  private formatSignal(signal: { type: string; description?: string; payloadSchema?: Record<string, unknown>; emittedBy?: string[]; consumedBy?: string[] }, format: OutputFormat, includeConfig?: boolean): SignalQueryResult {
    switch (format) {
      case 'minimal':
        return { type: signal.type };
      case 'compact':
        return {
          type: signal.type,
          description: signal.description,
          emittedBy: signal.emittedBy,
          consumedBy: signal.consumedBy,
        };
      default:
        return {
          type: signal.type,
          description: signal.description,
          payloadSchema: includeConfig ? signal.payloadSchema : undefined,
          emittedBy: signal.emittedBy,
          consumedBy: signal.consumedBy,
        };
    }
  }

  private countResults(data: unknown): number {
    if (Array.isArray(data)) {
      return data.length;
    }
    if (typeof data === 'object' && data !== null) {
      if ('nodeCount' in data) {
        return (data as SubgraphResult).nodeCount;
      }
      return 1;
    }
    return data ? 1 : 0;
  }

  validateParams(params: unknown): params is TopologyQuery {
    if (typeof params !== 'object' || params === null) return false;
    const p = params as Record<string, unknown>;
    return typeof p.queryType === 'string';
  }
}

/**
 * Factory function to create a QueryTopologyTool instance
 */
export function createQueryTopologyTool(): QueryTopologyTool {
  return new QueryTopologyTool();
}
