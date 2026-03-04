/**
 * @graph-os/runtime
 * 
 * Runtime execution engine for Graph-OS platform.
 * 
 * This package provides the core execution engine that:
 * - Loads and validates cartridges
 * - Creates and manages node instances
 * - Routes signals between nodes
 * - Handles errors and provides logging
 * - Provides SignalBus for framework-agnostic communication
 * 
 * @module @graph-os/runtime
 * @version 1.0.0
 */

// ===== HIGH-LEVEL API (Recommended for most users) =====

/**
 * GraphRuntime - The main class for Graph-OS applications.
 * 
 * @example
 * ```typescript
 * import { GraphRuntime, createRuntime } from '@graph-os/runtime';
 * 
 * // Using factory function
 * const runtime = await createRuntime({
 *   cartridgePath: './cartridges/app.cartridge.json',
 *   signalRegistryPath: './registries/signal-registry.json'
 * });
 * 
 * // Or using class directly
 * const runtime = new GraphRuntime();
 * await runtime.loadCartridge({ path: './cartridges/app.cartridge.json' });
 * 
 * await runtime.start();
 * runtime.emit('USER.LOGIN', { email: 'user@example.com' });
 * ```
 */
export {
  GraphRuntime,
  createRuntime,
  createAndStartRuntime,
} from './engine/GraphRuntimeBuilder';

export type { RuntimeCreateOptions } from './engine/GraphRuntimeBuilder';

// ===== LOW-LEVEL API (For advanced use cases) =====

// Core engine exports
export { GraphRuntimeCore } from './engine/GraphRuntime';
export { BaseRuntimeCore } from './engine/BaseRuntimeCore';
export { SignalRouter } from './engine/SignalRouter';
export { WireManager } from './engine/WireManager';

// File watcher (for watch mode)
export { FileWatcher } from './engine/FileWatcher';

// Factory exports
export { NodeFactoryImpl, nodeFactory } from './factory/NodeFactory';

// Node registration
export { registerBuiltInNodes, createNodeFactory } from './registration/index';

// Node Implementation Registry (for testing custom nodes)
export {
  NodeImplementationRegistry,
  globalNodeRegistry,
  registerBuiltInNodeImplementations,
} from './registry/NodeImplementationRegistry';

// Type exports from registry
export type {
  NodeImplementation,
  NodeProcessResult,
  TransformNodeImplementation,
  ValidateNodeImplementation,
  InputNodeImplementation,
  DisplayNodeImplementation,
  ApiClientNodeImplementation,
  StorageNodeImplementation,
} from './registry/NodeImplementationRegistry';

// Export NodeConfig type from registry with alias to avoid conflict
export type { NodeConfig as TestNodeConfig } from './registry/NodeImplementationRegistry';

// Loader exports
export { CartridgeLoader } from './loader/CartridgeLoader';

// Signal registry loader exports
export { SignalRegistryLoader } from './registry/SignalRegistryLoader';
export type { SignalDefinition, SignalRegistryData } from './registry/SignalRegistryLoader';

// SignalBus exports
export { SignalBus } from './signal-bus/SignalBus';

// Logic node exports
export { ValidatorNode } from './nodes/logic/ValidatorNode';
export { TransformerNode } from './nodes/logic/TransformerNode';

// Infra node exports
export { ApiClientNode } from './nodes/infra/ApiClientNode';
export { StorageNode } from './nodes/infra/StorageNode';
export { BrowserStorageNode } from './nodes/infra/BrowserStorageNode';

// Control node exports
export { InputNode } from './nodes/control/InputNode';
export { DisplayNode } from './nodes/control/DisplayNode';

// UI node exports
export { ComponentNode } from './nodes/ui/ComponentNode';
export { LayoutNode } from './nodes/ui/LayoutNode';
export { PageNode } from './nodes/ui/PageNode';
export { CompositeNode, CompositeConfig } from './nodes/ui/CompositeNode';

// Re-export composite types from core
export type {
  CompositeCartridge,
  SignalMapping,
} from '@graph-os/core';

// Error exports
export {
  GraphError,
  NodeError,
  SignalError,
  ValidationError,
  CartridgeError,
  NodeTypeNotFoundError,
  WireError,
  ErrorHandler,
} from './errors/ErrorHandler';

// Utility exports
export { Logger } from './utils/Logger';
export type { LoggerOptions } from './utils/Logger';

// Re-export core types (type-only)
export type {
  Signal,
  Node,
  NodeConfig,
  Cartridge,
  WireDefinition,
  NodeDefinition,
  RuntimeState,
  RuntimeOptions,
  RuntimeStats,
} from '@graph-os/core';

// Re-export core values
export { isSignal, createSignal, BaseNode } from '@graph-os/core';
