/**
 * SignalRouter - Routes signals between nodes based on wire definitions
 * 
 * The SignalRouter determines which nodes should receive a signal
 * based on the wire connections defined in the cartridge.
 * 
 * @module @graph-os/runtime
 */

import { Signal, Node, WireDefinition } from '@graph-os/core';
import { Logger } from '../utils/Logger';

/**
 * WireConnection represents an active connection between nodes.
 */
interface WireConnection {
  fromNodeId: string;
  toNodeId: string;
  signalType: string;
  targetNode: Node;
}

/**
 * SignalRouter routes signals to their target nodes.
 */
export class SignalRouter {
  private connections: WireConnection[] = [];
  /** Index by sourceNodeId -> signalType -> connections */
  private index: Map<string, Map<string, WireConnection[]>> = new Map();
  private logger: Logger;

  constructor(logger: Logger = new Logger()) {
    this.logger = logger;
  }

  /**
   * Registers wire connections from wire definitions.
   */
  connect(wires: WireDefinition[], nodes: Map<string, Node>): void {
    this.connections = [];
    this.index.clear();

    for (const wire of wires) {
      const targetNode = nodes.get(wire.to);
      if (!targetNode) {
        this.logger.warn(`Wire target node not found: ${wire.to}`);
        continue;
      }

      const connection: WireConnection = {
        fromNodeId: wire.from,
        toNodeId: wire.to,
        signalType: wire.signalType,
        targetNode,
      };

      this.connections.push(connection);

      // Indexing logic
      let sourceIndex = this.index.get(wire.from);
      if (!sourceIndex) {
        sourceIndex = new Map();
        this.index.set(wire.from, sourceIndex);
      }

      const signalType = wire.signalType || '*';
      let typeConnections = sourceIndex.get(signalType);
      if (!typeConnections) {
        typeConnections = [];
        sourceIndex.set(signalType, typeConnections);
      }
      typeConnections.push(connection);
    }

    this.logger.debug(`Connected ${this.connections.length} wires with optimized indexing`);
  }

  /**
   * Finds all target nodes for a signal with O(1) lookup.
   */
  findTargets(signal: Signal): Node[] {
    const sourceIndex = this.index.get(signal.sourceNodeId);
    if (!sourceIndex) return [];

    const targets = new Set<Node>();

    // Add specific signal type matches
    const typeMatches = sourceIndex.get(signal.type);
    if (typeMatches) {
      for (const conn of typeMatches) {
        targets.add(conn.targetNode);
      }
    }

    // Add wildcard matches
    const wildcardMatches = sourceIndex.get('*');
    if (wildcardMatches) {
      for (const conn of wildcardMatches) {
        targets.add(conn.targetNode);
      }
    }

    return Array.from(targets);
  }

  /**
   * Finds all connections for a specific signal type.
   */
  findBySignalType(signalType: string): WireConnection[] {
    return this.connections.filter(
      conn => conn.signalType === signalType || conn.signalType === '*'
    );
  }

  /**
   * Finds all connections from a specific node.
   */
  findBySource(nodeId: string): WireConnection[] {
    const sourceIndex = this.index.get(nodeId);
    if (!sourceIndex) return [];

    const allForSource: WireConnection[] = [];
    for (const typeConnections of sourceIndex.values()) {
      allForSource.push(...typeConnections);
    }
    return allForSource;
  }

  /**
   * Finds all connections to a specific node.
   */
  findByTarget(nodeId: string): WireConnection[] {
    return this.connections.filter(conn => conn.toNodeId === nodeId);
  }

  /**
   * Gets the total number of connections.
   */
  getConnectionCount(): number {
    return this.connections.length;
  }

  /**
   * Clears all connections.
   */
  clear(): void {
    this.connections = [];
    this.index.clear();
  }
}
