/**
 * Cache Manager for Graph-OS Tool
 *
 * Provides caching for query results with tag-based invalidation.
 *
 * @module @graph-os/tool/core
 */

// =============================================================================
// CACHE TYPES
// =============================================================================

/**
 * Cache entry structure
 */
export interface CacheEntry<T = unknown> {
  /** Cached data */
  data: T;
  /** Creation timestamp */
  timestamp: number;
  /** Time to live in milliseconds */
  ttl: number;
  /** Tags for invalidation */
  tags: string[];
  /** Cache version when created */
  version: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  entries: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

// =============================================================================
// CACHE KEYS
// =============================================================================

/**
 * Cache key generators
 */
export const CACHE_KEYS = {
  // Cartridge
  cartridge: (alias: string) => `cartridge:${alias}:data`,
  cartridgeValidation: (alias: string) => `cartridge:${alias}:validation`,
  cartridgeStats: (alias: string) => `cartridge:${alias}:stats`,

  // Nodes
  nodes: (alias: string) => `nodes:${alias}:all`,
  nodesByType: (alias: string, type: string) => `nodes:${alias}:type:${type}`,
  node: (alias: string, id: string) => `node:${alias}:${id}`,
  nodeUpstream: (alias: string, id: string) => `node:${alias}:${id}:upstream`,
  nodeDownstream: (alias: string, id: string) => `node:${alias}:${id}:downstream`,

  // Wires
  wires: (alias: string) => `wires:${alias}:all`,
  wiresBySignal: (alias: string, signal: string) => `wires:${alias}:signal:${signal}`,

  // Signals
  signals: (registry: string) => `signals:${registry}:all`,
  signal: (registry: string, type: string) => `signal:${registry}:${type}`,
  signalEmitters: (registry: string, type: string) => `signal:${registry}:${type}:emitters`,
  signalConsumers: (registry: string, type: string) => `signal:${registry}:${type}:consumers`,

  // Composites
  composites: (registry: string) => `composites:${registry}:all`,
  composite: (registry: string, name: string) => `composite:${registry}:${name}`,

  // Topology
  topology: (alias: string) => `topology:${alias}:data`,
  topologyMermaid: (alias: string) => `topology:${alias}:mermaid`,
  topologyPaths: (alias: string) => `topology:${alias}:paths`,
  signalPath: (alias: string, from: string, to: string) => `path:${alias}:${from}->${to}`,

  // State
  runtimeState: (alias: string) => `state:${alias}:runtime`,
  signalHistory: (alias: string) => `state:${alias}:history`,

  // Config
  projectConfig: (path: string) => `config:${path}`,
} as const;

// =============================================================================
// CACHE TTL
// =============================================================================

/**
 * Default TTL values in milliseconds
 */
export const CACHE_TTL = {
  /** Short-lived: 10 seconds (validation, state) */
  SHORT: 10000,
  /** Medium: 30 seconds (nodes, topology) */
  MEDIUM: 30000,
  /** Standard: 1 minute (cartridge, wires) */
  STANDARD: 60000,
  /** Long: 5 minutes (signals, composites) */
  LONG: 300000,
  /** Extended: 10 minutes (project config) */
  EXTENDED: 600000,
} as const;

// =============================================================================
// CACHE MANAGER
// =============================================================================

/**
 * Cache manager with tag-based invalidation
 */
export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private version: number = 0;
  private stats: CacheStats = {
    entries: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
    hitRate: 0,
  };

  // ===========================================================================
  // CORE OPERATIONS
  // ===========================================================================

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check TTL
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.evictions++;
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check version
    if (entry.version < this.version) {
      this.cache.delete(key);
      this.stats.evictions++;
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, data: T, ttl: number = CACHE_TTL.STANDARD, tags: string[] = []): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      tags,
      version: this.version,
    };

    this.cache.set(key, entry);
    this.stats.entries = this.cache.size;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete single key
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.stats.entries = this.cache.size;
    return result;
  }

  // ===========================================================================
  // INVALIDATION
  // ===========================================================================

  /**
   * Invalidate all entries with matching tags
   */
  invalidate(tags: string[]): number {
    let invalidated = 0;

    for (const [key, entry] of this.cache) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    this.stats.evictions += invalidated;
    this.stats.entries = this.cache.size;
    return invalidated;
  }

  /**
   * Invalidate all entries matching key prefix
   */
  invalidatePrefix(prefix: string): number {
    let invalidated = 0;

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    this.stats.evictions += invalidated;
    this.stats.entries = this.cache.size;
    return invalidated;
  }

  /**
   * Increment global version (invalidates all)
   */
  bumpVersion(): void {
    this.version++;
    this.stats.evictions += this.cache.size;
    this.cache.clear();
    this.stats.entries = 0;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.stats.evictions += this.cache.size;
    this.cache.clear();
    this.version++;
    this.stats.entries = 0;
  }

  // ===========================================================================
  // UTILITY
  // ===========================================================================

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get entries by tag
   */
  getByTag<T>(tag: string): Array<{ key: string; data: T }> {
    const results: Array<{ key: string; data: T }> = [];

    for (const [key, entry] of this.cache) {
      if (entry.tags.includes(tag)) {
        results.push({ key, data: entry.data as T });
      }
    }

    return results;
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  // ===========================================================================
  // SINGLETON
  // ===========================================================================

  private static instance: CacheManager | null = null;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const globalCacheManager = CacheManager.getInstance();

// =============================================================================
// CACHE TAGS
// =============================================================================

/**
 * Standard cache tags for invalidation
 */
export const CACHE_TAGS = {
  CARTRIDGE: 'cartridge',
  NODES: 'nodes',
  WIRES: 'wires',
  SIGNALS: 'signals',
  COMPOSITES: 'composites',
  TOPOLOGY: 'topology',
  STATE: 'state',
  CONFIG: 'config',
} as const;
