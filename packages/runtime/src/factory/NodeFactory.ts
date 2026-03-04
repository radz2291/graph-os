/**
 * NodeFactory - Factory for creating node instances
 * 
 * The NodeFactory is responsible for instantiating nodes based on
 * their type identifier. It maintains a registry of node types
 * and their constructors.
 * 
 * @module @graph-os/runtime
 */

import { Node, NodeConfig, NodeFactory as INodeFactory, BaseNode } from '@graph-os/core';
import { Logger } from '../utils/Logger';
import { GraphError } from '../errors/ErrorHandler';

/**
 * Node constructor type.
 */
type NodeConstructor = new (id: string, config: NodeConfig) => Node;

/**
 * NodeFactory creates and manages node instances.
 */
export class NodeFactoryImpl implements INodeFactory {
  private nodeTypes: Map<string, NodeConstructor> = new Map();
  private logger: Logger;

  constructor(logger: Logger = new Logger()) {
    this.logger = logger;
  }

  /**
   * Creates a new node instance.
   * 
   * @param nodeType - Type of node to create
   * @param config - Node configuration
   * @param id - Unique identifier for the node
   * @returns A new Node instance
   * @throws GraphError if node type is not registered
   */
  async createNode(
    nodeType: string,
    config: NodeConfig,
    id: string
  ): Promise<Node> {
    const NodeClass = this.nodeTypes.get(nodeType);
    
    if (!NodeClass) {
      throw new GraphError(
        `Unknown node type: ${nodeType}. Available types: ${Array.from(this.nodeTypes.keys()).join(', ')}`,
        'UNKNOWN_NODE_TYPE'
      );
    }

    this.logger.debug(`Creating node: ${id} of type ${nodeType}`);
    
    try {
      const node = new NodeClass(id, config);
      return node;
    } catch (error) {
      throw new GraphError(
        `Failed to create node ${id}: ${error instanceof Error ? error.message : String(error)}`,
        'NODE_CREATION_ERROR'
      );
    }
  }

  /**
   * Registers a node type with the factory.
   * 
   * @param nodeType - Type identifier for the node (e.g., "logic.validate")
   * @param nodeClass - Node class constructor
   */
  registerNodeType(
    nodeType: string,
    nodeClass: NodeConstructor
  ): void {
    if (this.nodeTypes.has(nodeType)) {
      this.logger.warn(`Overwriting existing node type: ${nodeType}`);
    }
    
    this.nodeTypes.set(nodeType, nodeClass);
    this.logger.debug(`Registered node type: ${nodeType}`);
  }

  /**
   * Checks if a node type is registered.
   * 
   * @param nodeType - Type identifier to check
   * @returns True if the node type is registered
   */
  hasNodeType(nodeType: string): boolean {
    return this.nodeTypes.has(nodeType);
  }

  /**
   * Gets all registered node types.
   * 
   * @returns Array of registered node type identifiers
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.nodeTypes.keys());
  }

  /**
   * Unregisters a node type.
   * 
   * @param nodeType - Type identifier to unregister
   * @returns True if the type was unregistered
   */
  unregisterNodeType(nodeType: string): boolean {
    return this.nodeTypes.delete(nodeType);
  }

  /**
   * Clears all registered node types.
   */
  clear(): void {
    this.nodeTypes.clear();
    this.logger.debug('Cleared all registered node types');
  }
}

// Export singleton instance for convenience
export const nodeFactory = new NodeFactoryImpl();
