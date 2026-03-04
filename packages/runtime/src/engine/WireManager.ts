/**
 * WireManager - Manages wire connections between nodes
 * 
 * The WireManager handles the creation, validation, and management
 * of wire connections in the graph. Can optionally validate signal
 * types against a signal registry.
 * 
 * @module @graph-os/runtime
 */

import { WireDefinition, Node } from '@graph-os/core';
import { Logger } from '../utils/Logger';
import { SignalRegistryLoader } from '../registry/SignalRegistryLoader';
import { ValidationError } from '../errors/ErrorHandler';

/**
 * WireManager handles wire connection management.
 */
export class WireManager {
  private wires: WireDefinition[] = [];
  private nodeMap: Map<string, Node> = new Map();
  private logger: Logger;
  private signalRegistry?: SignalRegistryLoader;

  constructor(
    logger: Logger = new Logger(),
    signalRegistryPath?: string
  ) {
    this.logger = logger;

    // Load signal registry if path provided
    if (signalRegistryPath) {
      this.signalRegistry = new SignalRegistryLoader();
      this.signalRegistry.loadRegistry(signalRegistryPath).catch((error) => {
        this.logger.warn(`Failed to load signal registry: ${error.message}`);
      });
    }
  }

  /**
   * Connects wires between nodes based on wire definitions.
   * 
   * @param wireDefs - Wire definitions from the cartridge
   * @param nodes - Map of node IDs to node instances
   */
  connectWires(wireDefs: WireDefinition[], nodes: Map<string, Node>): void {
    this.wires = wireDefs;
    this.nodeMap = nodes;

    // Validate all connections
    this.validateConnections();

    this.logger.info(`Connected ${this.wires.length} wires`);
  }

  /**
   * Validates all wire connections.
   * Checks for:
   * - Valid source nodes
   * - Valid target nodes
   * - Valid signal type format
   * - Valid signal type (if registry loaded)
   * - Circular dependencies
   * - Orphaned nodes
   */
  private validateConnections(): void {
    const errors: string[] = [];

    for (const wire of this.wires) {
      // Check source node exists
      if (!this.nodeMap.has(wire.from)) {
        errors.push(`Wire source node not found: ${wire.from}`);
      }

      // Check target node exists
      if (!this.nodeMap.has(wire.to)) {
        errors.push(`Wire target node not found: ${wire.to}`);
      }

      // Check signal type format
      if (!this.isValidSignalType(wire.signalType)) {
        errors.push(`Invalid signal type: ${wire.signalType}`);
      }

      // Check signal type against registry (if loaded)
      if (this.signalRegistry && wire.signalType !== '*') {
        try {
          this.signalRegistry.validate(wire.signalType);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Signal type validation failed for '${wire.signalType}': ${errorMessage}`);
        }
      }
    }

    // Check for circular dependencies
    const cycles = this.detectCycles();
    if (cycles.length > 0) {
      const cycleDescriptions = cycles.map(c => c.join(' -> ')).join(', ');
      throw new ValidationError(
        `Circular dependencies detected: ${cycleDescriptions}`,
        [{ code: 'CIRCULAR_DEPENDENCY', message: cycleDescriptions }]
      );
    }
  }

  /**
   * Validates signal type format.
   */
  private isValidSignalType(signalType: string): boolean {
    if (signalType === '*') return true;
    return /^[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]*$/.test(signalType);
  }

  /**
   * Detects circular dependencies in the wire graph.
   * 
   * @returns Array of cycles found (each cycle is an array of node IDs)
   */
  detectCycles(): string[][] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (nodeId: string, path: string[]): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      // Get all outgoing wires from this node
      const outgoingWires = this.wires.filter(w => w.from === nodeId);

      for (const wire of outgoingWires) {
        const nextNode = wire.to;

        if (!visited.has(nextNode)) {
          if (dfs(nextNode, [...path, nextNode])) {
            return true;
          }
        } else if (recursionStack.has(nextNode)) {
          // Found a cycle
          const cycleStart = path.indexOf(nextNode);
          cycles.push([...path.slice(cycleStart), nextNode]);
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Check all nodes
    for (const nodeId of this.nodeMap.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, [nodeId]);
      }
    }

    return cycles;
  }

  /**
   * Finds orphaned nodes (nodes with no incoming or outgoing wires).
   * 
   * @returns Array of orphaned node IDs
   */
  findOrphanedNodes(): string[] {
    const connectedNodes = new Set<string>();

    for (const wire of this.wires) {
      connectedNodes.add(wire.from);
      connectedNodes.add(wire.to);
    }

    const orphaned: string[] = [];
    for (const nodeId of this.nodeMap.keys()) {
      if (!connectedNodes.has(nodeId)) {
        orphaned.push(nodeId);
      }
    }

    return orphaned;
  }

  /**
   * Gets all wire definitions.
   */
  getWires(): WireDefinition[] {
    return [...this.wires];
  }

  /**
   * Gets wires connected to a specific node.
   * 
   * @param nodeId - The node ID
   * @returns Object with incoming and outgoing wires
   */
  getNodeWires(nodeId: string): { incoming: WireDefinition[]; outgoing: WireDefinition[] } {
    return {
      incoming: this.wires.filter(w => w.to === nodeId),
      outgoing: this.wires.filter(w => w.from === nodeId),
    };
  }

  /**
   * Gets the number of wires.
   */
  getWireCount(): number {
    return this.wires.length;
  }

  /**
   * Clears all wires.
   */
  clear(): void {
    this.wires = [];
    this.nodeMap.clear();
  }
}
