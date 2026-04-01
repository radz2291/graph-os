/**
 * SignalRouter - Routes signals between nodes based on wire definitions
 *
 * v2: Phase-aware routing. When currentPhase is provided, only wires
 * in that phase (or wires without a phase) are active.
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
  phase?: string;
  targetNode: Node;
  wire: WireDefinition;
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
        phase: wire.phase,
        targetNode,
        wire,
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
   *
   * v2: If currentPhase is provided, filters connections by phase.
   * Wires without a phase are always active (backward compatible).
   *
   * @param signal - The signal to route
   * @param currentPhase - Optional current phase for filtering (v2)
   * @returns Array of matching connections with target node and wire definition
   */
  findTargets(signal: Signal, currentPhase?: string): Node[] {
    const sourceIndex = this.index.get(signal.sourceNodeId);
    if (!sourceIndex) return [];

    const targets = new Set<Node>();

    // Add specific signal type matches
    const typeMatches = sourceIndex.get(signal.type);
    if (typeMatches) {
      for (const conn of typeMatches) {
        if (this.isConnectionActive(conn, currentPhase)) {
          targets.add(conn.targetNode);
        }
      }
    }

    // Add wildcard matches
    const wildcardMatches = sourceIndex.get('*');
    if (wildcardMatches) {
      for (const conn of wildcardMatches) {
        if (this.isConnectionActive(conn, currentPhase)) {
          targets.add(conn.targetNode);
        }
      }
    }

    return Array.from(targets);
  }

  /**
   * Find all matching connections (with wire definitions) for a signal.
   * Used by the pipeline to get wire context for each target.
   *
   * @param signal - The signal to route
   * @param currentPhase - Optional current phase for filtering
   * @returns Array of matching connections
   */
  findConnections(signal: Signal, currentPhase?: string): WireConnection[] {
    const sourceIndex = this.index.get(signal.sourceNodeId);
    if (!sourceIndex) return [];

    const results: WireConnection[] = [];

    const addMatches = (matches: WireConnection[] | undefined) => {
      if (!matches) return;
      for (const conn of matches) {
        if (this.isConnectionActive(conn, currentPhase)) {
          results.push(conn);
        }
      }
    };

    addMatches(sourceIndex.get(signal.type));
    addMatches(sourceIndex.get('*'));

    return results;
  }

  /**
   * Check if a connection is active given the current phase.
   * Wires without a phase are always active.
   */
  private isConnectionActive(conn: WireConnection, currentPhase?: string): boolean {
    // No phase on wire = always active (v1 backward compatible)
    if (!conn.phase) return true;
    // No phase tracking = all wires active
    if (currentPhase === undefined) return true;
    // Phase must match
    return conn.phase === currentPhase;
  }

  /**
   * Finds all connections for a specific signal type.
   */
  findBySignalType(signalType: string): WireConnection[] {
    return this.connections.filter(
      conn => conn.signalType === signalType || conn.signalType === '*',
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
