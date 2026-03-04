/**
 * @graph-os/core
 * 
 * Core interfaces, types, and schemas for Graph-OS platform.
 * 
 * This package provides the foundational abstractions that all other
 * Graph-OS packages build upon:
 * 
 * - Signal: Message units that flow between nodes
 * - Node: Processing units in the graph
 * - Cartridge: Topology definitions
 * - JSON Schemas: Validation schemas for all structures
 * 
 * @module @graph-os/core
 * @version 1.0.0
 */

// Signal type exports (interfaces only exist at compile time)
export type {
  Signal,
  SignalEmitter,
  SignalReceiver,
} from './signal/Signal';

// Signal value exports (functions exist at runtime)
export {
  isSignal,
  createSignal,
} from './signal/Signal';

// Node type exports
export type {
  NodeConfig,
  NodeFactory,
  NodeContext,
} from './node/Node';

// Node value exports (BaseNode is a class)
export {
  BaseNode,
} from './node/Node';

// Node interface export (type-only)
export type { Node as NodeInterface } from './node/Node';

// Re-export Node interface with original name for backward compatibility
import type { Node as NodeType } from './node/Node';
export type { NodeType as Node };

// Cartridge type exports
export type {
  Cartridge,
  NodeDefinition,
  WireDefinition,
  InputDefinition,
  OutputDefinition,
  CartridgeLoadOptions,
  CartridgeValidationResult,
  CartridgeValidationError,
  CartridgeValidationWarning,
} from './cartridge/Cartridge';

// Type exports
export type {
  RuntimeState,
  LogLevel,
  ProcessResult,
  RuntimeStats,
  RuntimeOptions,
  RuntimeEventType,
  RuntimeEvent,
  RuntimeEventHandler,
} from './types/index';

// Composite node type exports
export type {
  CompositeCartridge,
  CompositeConfig,
  SignalMapping,
} from './composite/CompositeNodeTypes';
