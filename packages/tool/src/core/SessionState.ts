/**
 * Session State Manager
 *
 * Manages project context, active cartridge, runtime state, and history.
 *
 * @module @graph-os/tool/core
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import type {
  GraphOSProjectConfig,
  HistoryEntry,
  Checkpoint,
  PatchOperation,
} from './types';

// =============================================================================
// SESSION STATE
// =============================================================================

/**
 * Complete session state structure
 */
export interface SessionState {
  /** Loaded project configuration */
  config: GraphOSProjectConfig | null;
  /** Config file path */
  configPath: string | null;
  /** Current cartridge alias */
  activeCartridge: string | null;
  /** Loaded cartridge data */
  cartridgeData: unknown | null;
  /** Cartridge file path */
  cartridgePath: string | null;
  /** Signal registry */
  signalRegistry: SignalRegistry | null;
  /** Composite registry */
  compositeRegistry: CompositeRegistry | null;
  /** Active runtime instance */
  runtime: unknown | null;
  /** Runtime status */
  runtimeStatus: 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
  /** Operation history */
  history: HistoryEntry[];
  /** Checkpoints */
  checkpoints: Checkpoint[];
  /** Cache store */
  cache: Map<string, CacheEntry>;
  /** Cache version for invalidation */
  cacheVersion: number;
}

/**
 * Signal registry structure
 */
export interface SignalRegistry {
  signals: Array<{
    type: string;
    description: string;
    payloadSchema?: Record<string, unknown>;
    emittedBy?: string[];
    consumedBy?: string[];
  }>;
}

/**
 * Composite registry structure
 */
export interface CompositeRegistry {
  composites: Array<{
    name: string;
    description: string;
    path: string;
  }>;
}

/**
 * Cache entry
 */
export interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
  tags: string[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CONFIG_FILE_NAME = 'graph-os.config.json';
const MAX_HISTORY_ENTRIES = 100;
const MAX_CHECKPOINTS = 10;

// =============================================================================
// SESSION MANAGER
// =============================================================================

/**
 * Global session manager for Graph-OS Tool
 */
export class SessionManager {
  private state: SessionState;
  private static instance: SessionManager | null = null;

  constructor() {
    this.state = this.createInitialState();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Create initial state
   */
  private createInitialState(): SessionState {
    return {
      config: null,
      configPath: null,
      activeCartridge: null,
      cartridgeData: null,
      cartridgePath: null,
      signalRegistry: null,
      compositeRegistry: null,
      runtime: null,
      runtimeStatus: 'stopped',
      history: [],
      checkpoints: [],
      cache: new Map(),
      cacheVersion: 0,
    };
  }

  // ===========================================================================
  // GETTERS
  // ===========================================================================

  /** Get current config */
  get config(): GraphOSProjectConfig | null {
    return this.state.config;
  }

  /** Get active cartridge alias */
  get activeCartridge(): string | null {
    return this.state.activeCartridge;
  }

  /** Get cartridge data */
  get cartridgeData(): unknown | null {
    return this.state.cartridgeData;
  }

  /** Get cartridge path */
  get cartridgePath(): string | null {
    return this.state.cartridgePath;
  }

  /** Get signal registry */
  get signalRegistry(): SignalRegistry | null {
    return this.state.signalRegistry;
  }

  /** Get runtime status */
  get runtimeStatus(): SessionState['runtimeStatus'] {
    return this.state.runtimeStatus;
  }

  /** Get runtime instance */
  get runtime(): unknown | null {
    return this.state.runtime;
  }

  /** Get full state */
  getState(): SessionState {
    return { ...this.state, cache: new Map(this.state.cache) };
  }

  /** Check if session is initialized */
  isInitialized(): boolean {
    return this.state.config !== null && this.state.activeCartridge !== null;
  }

  /** Get config path */
  get configPath(): string | null {
    return this.state.configPath;
  }

  /** Get cartridges map */
  get cartridges(): Record<string, { path: string; description?: string }> {
    return this.state.config?.cartridges || {};
  }

  // ===========================================================================
  // SETTERS
  // ===========================================================================

  /**
   * Set project configuration
   */
  setConfig(config: GraphOSProjectConfig, path: string): void {
    this.state.config = config;
    this.state.configPath = path;
  }

  /**
   * Set active cartridge
   */
  setActiveCartridge(alias: string, data: unknown, path: string): void {
    this.state.activeCartridge = alias;
    this.state.cartridgeData = data;
    this.state.cartridgePath = path;
  }

  /**
   * Set signal registry
   */
  setSignalRegistry(registry: SignalRegistry): void {
    this.state.signalRegistry = registry;
  }

  /**
   * Set composite registry
   */
  setCompositeRegistry(registry: CompositeRegistry): void {
    this.state.compositeRegistry = registry;
  }

  /**
   * Set runtime
   */
  setRuntime(runtime: unknown, status: SessionState['runtimeStatus']): void {
    this.state.runtime = runtime;
    this.state.runtimeStatus = status;
  }

  // ===========================================================================
  // PROJECT LOADING (Phase 3 Implementation)
  // ===========================================================================

  /**
   * Load project from path
   */
  async loadProject(path: string): Promise<void> {
    const resolvedPath = resolve(path);
    let configPath: string;
    let configDir: string;

    // Check if path is a file or directory
    if (resolvedPath.endsWith('.json')) {
      configPath = resolvedPath;
      configDir = dirname(resolvedPath);
    } else {
      // Look for config file in directory
      configPath = join(resolvedPath, CONFIG_FILE_NAME);
      configDir = resolvedPath;
    }

    // Verify config file exists
    if (!existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    // Load and parse config
    const configContent = await readFile(configPath, 'utf-8');
    let config: GraphOSProjectConfig;

    try {
      config = JSON.parse(configContent);
    } catch (e) {
      throw new Error(`Invalid JSON in config file: ${configPath}`);
    }

    // Validate required fields
    this.validateConfig(config, configPath);

    // Resolve root path
    if (!config.root) {
      config.root = configDir;
    }

    // Resolve relative paths in config
    this.resolveConfigPaths(config, configDir);

    // Set config
    this.state.config = config;
    this.state.configPath = configPath;

    // Load active cartridge
    const activeAlias = config.activeCartridge;
    const cartridgeConfig = config.cartridges[activeAlias];

    if (!cartridgeConfig) {
      throw new Error(`Active cartridge '${activeAlias}' not found in config`);
    }

    await this.loadCartridge(activeAlias, cartridgeConfig.path, config.root);

    // Load registries
    await this.loadRegistries(config);

    // Clear cache
    this.clearCache();
  }

  /**
   * Auto-detect project from current directory
   */
  async detectProject(startDir?: string): Promise<void> {
    let currentDir = startDir ? resolve(startDir) : process.cwd();
    const root = resolve('/');

    // Walk up directory tree looking for config file
    while (currentDir !== root) {
      const configPath = join(currentDir, CONFIG_FILE_NAME);

      if (existsSync(configPath)) {
        await this.loadProject(configPath);
        return;
      }

      currentDir = dirname(currentDir);
    }

    throw new Error(`No ${CONFIG_FILE_NAME} found in current directory or parent directories`);
  }

  /**
   * Switch active cartridge
   */
  async switchCartridge(alias: string): Promise<void> {
    if (!this.state.config) {
      throw new Error('No project loaded');
    }

    const cartridgeConfig = this.state.config.cartridges[alias];
    if (!cartridgeConfig) {
      const available = Object.keys(this.state.config.cartridges);
      throw new Error(`Cartridge '${alias}' not found. Available: ${available.join(', ')}`);
    }

    // Stop runtime if running
    if (this.state.runtimeStatus === 'running') {
      this.state.runtimeStatus = 'stopping';
      // Runtime will be cleaned up by the tool
      this.state.runtime = null;
      this.state.runtimeStatus = 'stopped';
    }

    // Load new cartridge
    await this.loadCartridge(alias, cartridgeConfig.path, this.state.config.root);

    // Update active cartridge in config
    this.state.config.activeCartridge = alias;

    // Clear cache
    this.clearCache();
  }

  /**
   * Load a cartridge by alias and path
   */
  private async loadCartridge(alias: string, relativePath: string, root: string): Promise<void> {
    const cartridgePath = resolve(root, relativePath);

    if (!existsSync(cartridgePath)) {
      throw new Error(`Cartridge file not found: ${cartridgePath}`);
    }

    const cartridgeContent = await readFile(cartridgePath, 'utf-8');
    let cartridgeData: unknown;

    try {
      cartridgeData = JSON.parse(cartridgeContent);
    } catch (e) {
      throw new Error(`Invalid JSON in cartridge file: ${cartridgePath}`);
    }

    this.state.activeCartridge = alias;
    this.state.cartridgeData = cartridgeData;
    this.state.cartridgePath = cartridgePath;
  }

  /**
   * Load signal and composite registries
   */
  private async loadRegistries(config: GraphOSProjectConfig): Promise<void> {
    const root = config.root;

    // Load signal registry
    if (config.signalRegistry) {
      const signalRegistryPath = resolve(root, config.signalRegistry);
      if (existsSync(signalRegistryPath)) {
        try {
          const content = await readFile(signalRegistryPath, 'utf-8');
          this.state.signalRegistry = JSON.parse(content);
        } catch (e) {
          // Non-fatal: continue without signal registry
          console.warn(`Failed to load signal registry: ${signalRegistryPath}`);
        }
      }
    }

    // Load composite registry
    if (config.compositeRegistry) {
      const compositeRegistryPath = resolve(root, config.compositeRegistry);
      if (existsSync(compositeRegistryPath)) {
        try {
          const content = await readFile(compositeRegistryPath, 'utf-8');
          this.state.compositeRegistry = JSON.parse(content);
        } catch (e) {
          // Non-fatal: continue without composite registry
          console.warn(`Failed to load composite registry: ${compositeRegistryPath}`);
        }
      }
    }
  }

  /**
   * Validate config structure
   */
  private validateConfig(config: GraphOSProjectConfig, configPath: string): void {
    if (!config.name) {
      throw new Error(`Config missing required field 'name': ${configPath}`);
    }

    if (!config.activeCartridge) {
      throw new Error(`Config missing required field 'activeCartridge': ${configPath}`);
    }

    if (!config.cartridges || typeof config.cartridges !== 'object') {
      throw new Error(`Config missing required field 'cartridges': ${configPath}`);
    }

    // Validate active cartridge exists
    if (!config.cartridges[config.activeCartridge]) {
      throw new Error(
        `Active cartridge '${config.activeCartridge}' not defined in cartridges: ${configPath}`
      );
    }

    // Validate each cartridge has a path
    for (const [alias, cartridge] of Object.entries(config.cartridges)) {
      if (!cartridge.path) {
        throw new Error(`Cartridge '${alias}' missing required field 'path': ${configPath}`);
      }
    }
  }

  /**
   * Resolve relative paths in config to absolute paths
   */
  private resolveConfigPaths(config: GraphOSProjectConfig, configDir: string): void {
    // Ensure root is absolute
    if (config.root && !this.isAbsolute(config.root)) {
      config.root = resolve(configDir, config.root);
    }

    const root = config.root || configDir;

    // Resolve cartridge paths
    for (const cartridge of Object.values(config.cartridges)) {
      if (cartridge.path && !this.isAbsolute(cartridge.path)) {
        cartridge.path = resolve(root, cartridge.path);
      }
    }

    // Resolve registry paths
    if (config.signalRegistry && !this.isAbsolute(config.signalRegistry)) {
      config.signalRegistry = resolve(root, config.signalRegistry);
    }

    if (config.compositeRegistry && !this.isAbsolute(config.compositeRegistry)) {
      config.compositeRegistry = resolve(root, config.compositeRegistry);
    }
  }

  /**
   * Check if path is absolute (cross-platform)
   */
  private isAbsolute(path: string): boolean {
    return path.startsWith('/') || /^[A-Za-z]:/.test(path);
  }

  // ===========================================================================
  // HISTORY & CHECKPOINTS (Phase 3 Implementation)
  // ===========================================================================

  /**
   * Add history entry
   */
  addHistoryEntry(tool: string, params: Record<string, unknown>, result: unknown): void {
    const entry: HistoryEntry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      tool,
      params,
      result,
    };

    this.state.history.push(entry);

    // Trim history if too long
    if (this.state.history.length > MAX_HISTORY_ENTRIES) {
      this.state.history = this.state.history.slice(-MAX_HISTORY_ENTRIES);
    }
  }

  /**
   * Create checkpoint
   */
  createCheckpoint(name?: string, operations?: PatchOperation[]): Checkpoint {
    const checkpoint: Checkpoint = {
      id: `ckpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name || `Checkpoint ${this.state.checkpoints.length + 1}`,
      timestamp: new Date(),
      description: operations
        ? `${operations.length} operation(s)`
        : 'Manual checkpoint',
      operations: operations || [],
      snapshot: this.state.cartridgeData ? JSON.parse(JSON.stringify(this.state.cartridgeData)) : null,
    };

    this.state.checkpoints.push(checkpoint);

    // Trim checkpoints if too many
    if (this.state.checkpoints.length > MAX_CHECKPOINTS) {
      this.state.checkpoints = this.state.checkpoints.slice(-MAX_CHECKPOINTS);
    }

    return checkpoint;
  }

  /**
   * Rollback to checkpoint
   */
  async rollback(id: string): Promise<void> {
    const checkpointIndex = this.state.checkpoints.findIndex(c => c.id === id);

    if (checkpointIndex === -1) {
      throw new Error(`Checkpoint not found: ${id}`);
    }

    const checkpoint = this.state.checkpoints[checkpointIndex];

    if (!checkpoint.snapshot) {
      throw new Error(`Checkpoint has no snapshot: ${id}`);
    }

    // Restore cartridge data
    this.state.cartridgeData = JSON.parse(JSON.stringify(checkpoint.snapshot));

    // Write to file
    if (this.state.cartridgePath) {
      await writeFile(
        this.state.cartridgePath,
        JSON.stringify(checkpoint.snapshot, null, 2),
        'utf-8'
      );
    }

    // Remove checkpoints after this one
    this.state.checkpoints = this.state.checkpoints.slice(0, checkpointIndex + 1);

    // Clear cache
    this.clearCache();
  }

  /**
   * Get checkpoints
   */
  getCheckpoints(): Checkpoint[] {
    return [...this.state.checkpoints];
  }

  /**
   * Get history
   */
  getHistory(): HistoryEntry[] {
    return [...this.state.history];
  }

  // ===========================================================================
  // CACHE
  // ===========================================================================

  /**
   * Get cached value
   */
  getCached<T>(key: string): T | null {
    const entry = this.state.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.state.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached value
   */
  setCached(key: string, data: unknown, ttl: number = 60000, tags: string[] = []): void {
    this.state.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      tags,
    });
  }

  /**
   * Invalidate cache by tags
   */
  invalidateCache(tags: string[]): void {
    for (const [key, entry] of this.state.cache) {
      if (entry.tags.some(t => tags.includes(t))) {
        this.state.cache.delete(key);
      }
    }
    this.state.cacheVersion++;
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.state.cache.clear();
    this.state.cacheVersion++;
  }

  // ===========================================================================
  // RESET
  // ===========================================================================

  /**
   * Reset session state
   */
  reset(): void {
    this.state = this.createInitialState();
  }

  // ===========================================================================
  // UTILITY
  // ===========================================================================

  /**
   * Save cartridge data to file
   */
  async saveCartridge(): Promise<void> {
    if (!this.state.cartridgePath || !this.state.cartridgeData) {
      return;
    }

    await writeFile(
      this.state.cartridgePath,
      JSON.stringify(this.state.cartridgeData, null, 2),
      'utf-8'
    );
  }

  /**
   * Save config to file
   */
  async saveConfig(): Promise<void> {
    if (!this.state.configPath || !this.state.config) {
      return;
    }

    await writeFile(
      this.state.configPath,
      JSON.stringify(this.state.config, null, 2),
      'utf-8'
    );
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const globalSessionManager = SessionManager.getInstance();
