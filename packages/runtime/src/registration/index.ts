/**
 * Node Registration - Register all built-in node types
 * 
 * This module provides a function to register all built-in node types
 * with a NodeFactory instance.
 * 
 * @module @graph-os/runtime
 */

import { NodeFactoryImpl } from '../factory/NodeFactory';
import { ValidatorNode } from '../nodes/logic/ValidatorNode';
import { TransformerNode } from '../nodes/logic/TransformerNode';
import { DomainAdapterNode } from '../nodes/logic/DomainAdapterNode';
import { ApiClientNode } from '../nodes/infra/ApiClientNode';
import { StorageNode } from '../nodes/infra/StorageNode';
import { BrowserStorageNode } from '../nodes/infra/BrowserStorageNode';
import { InputNode } from '../nodes/control/InputNode';
import { DisplayNode } from '../nodes/control/DisplayNode';
import { ComponentNode } from '../nodes/ui/ComponentNode';
import { LayoutNode } from '../nodes/ui/LayoutNode';
import { PageNode } from '../nodes/ui/PageNode';
import { CompositeNode } from '../nodes/ui/CompositeNode';

/**
 * Registers all built-in node types with the provided factory.
 * 
 * @param factory - The NodeFactory instance to register nodes with
 */
export function registerBuiltInNodes(factory: NodeFactoryImpl): void {
  // Logic nodes
  factory.registerNodeType('logic.validate', ValidatorNode);
  factory.registerNodeType('logic.transform', TransformerNode);
  factory.registerNodeType('logic.domain-adapter', DomainAdapterNode);

  // Infrastructure nodes
  factory.registerNodeType('infra.api.client', ApiClientNode);

  // SMART STORAGE SELECTION
  // Detect if we are in a browser environment
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    factory.registerNodeType('infra.storage.local', BrowserStorageNode);
  } else {
    factory.registerNodeType('infra.storage.local', StorageNode);
  }

  // Control nodes (legacy - for CLI apps)
  factory.registerNodeType('control.input', InputNode);
  factory.registerNodeType('control.display', DisplayNode);

  // UI nodes (for React apps)
  factory.registerNodeType('ui.component', ComponentNode);
  factory.registerNodeType('ui.layout', LayoutNode);
  factory.registerNodeType('ui.page', PageNode);
  factory.registerNodeType('ui.composite', CompositeNode); // ← ADD THIS
}

/**
 * Creates a NodeFactory with all built-in nodes pre-registered.
 * 
 * @returns A new NodeFactory with all built-in nodes registered
 */
export function createNodeFactory(): NodeFactoryImpl {
  const factory = new NodeFactoryImpl();
  registerBuiltInNodes(factory);
  return factory;
}
