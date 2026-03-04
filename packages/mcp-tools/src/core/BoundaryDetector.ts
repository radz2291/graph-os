/**
 * BoundaryDetector - Detects boundaries for composite extraction
 * 
 * Used by extract_to_composite to identify input/output signals
 * and side effects when extracting a cluster of nodes.
 * 
 * @module @graph-os/mcp-tools/core
 */

import type { NodeDefinition, WireDefinition, SignalRegistry } from './ConflictDetector';

// =============================================================================
// Types
// =============================================================================

export type SignalType = string;

export interface SideEffect {
  signalType: SignalType;
  fromNode: string;
  toNode: string;
  reason: string;
}

export interface Boundaries {
  /** Signals that enter the cluster from outside */
  inputSignals: SignalType[];
  /** Signals that exit the cluster to outside */
  outputSignals: SignalType[];
  /** Signals that are internal to the cluster */
  internalSignals: SignalType[];
  /** Side effects - signals from inside to outside that aren't outputs */
  sideEffects: SideEffect[];
  /** Wires that cross the boundary inward */
  incomingWires: WireDefinition[];
  /** Wires that cross the boundary outward */
  outgoingWires: WireDefinition[];
}

export interface ValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface NodeCluster {
  nodeIds: string[];
  nodes: NodeDefinition[];
  internalWires: WireDefinition[];
}

// =============================================================================
// BoundaryDetector Class
// =============================================================================

/**
 * BoundaryDetector - Detects signal boundaries for composite extraction
 * 
 * @example
 * ```typescript
 * const detector = new BoundaryDetector();
 * const boundaries = detector.detectBoundaries(cartridge.nodes, cartridge.wires, ['node1', 'node2', 'node3']);
 * 
 * console.log('Inputs:', boundaries.inputSignals);
 * console.log('Outputs:', boundaries.outputSignals);
 * console.log('Side Effects:', boundaries.sideEffects);
 * ```
 */
export class BoundaryDetector {
  
  /**
   * Detect boundaries for a cluster of nodes
   */
  detectBoundaries(
    nodes: NodeDefinition[],
    wires: WireDefinition[],
    clusterNodeIds: string[]
  ): Boundaries {
    const clusterSet = new Set(clusterNodeIds);
    const clusterNodes = nodes.filter(n => clusterSet.has(n.id));

    // Find all wires
    const incomingWires: WireDefinition[] = [];
    const outgoingWires: WireDefinition[] = [];
    const internalWires: WireDefinition[] = [];

    for (const wire of wires) {
      const fromInside = clusterSet.has(wire.from);
      const toInside = clusterSet.has(wire.to);

      if (!fromInside && toInside) {
        // Incoming wire (outside -> inside)
        incomingWires.push(wire);
      } else if (fromInside && !toInside) {
        // Outgoing wire (inside -> outside)
        outgoingWires.push(wire);
      } else if (fromInside && toInside) {
        // Internal wire (inside -> inside)
        internalWires.push(wire);
      }
    }

    // Calculate input/output signals
    const inputSignals = this.calculateInputSignals(incomingWires);
    const outputSignals = this.calculateOutputSignals(outgoingWires, incomingWires);
    const internalSignals = this.calculateInternalSignals(internalWires);

    // Detect side effects
    const sideEffects = this.detectSideEffects(outgoingWires, clusterSet, inputSignals, outputSignals);

    return {
      inputSignals,
      outputSignals,
      internalSignals,
      sideEffects,
      incomingWires,
      outgoingWires,
    };
  }

  /**
   * Calculate input signal types for a cluster
   */
  calculateInputSignals(
    incomingWires: WireDefinition[]
  ): SignalType[] {
    const signals = new Set<SignalType>();

    for (const wire of incomingWires) {
      signals.add(wire.signalType);
    }

    return Array.from(signals);
  }

  /**
   * Calculate output signal types for a cluster
   */
  calculateOutputSignals(
    outgoingWires: WireDefinition[],
    incomingWires: WireDefinition[]
  ): SignalType[] {
    const signals = new Set<SignalType>();
    const inputTypes = new Set(incomingWires.map(w => w.signalType));

    for (const wire of outgoingWires) {
      // Only count as output if it's not just passing through
      if (!inputTypes.has(wire.signalType)) {
        signals.add(wire.signalType);
      }
    }

    return Array.from(signals);
  }

  /**
   * Calculate internal signal types for a cluster
   */
  calculateInternalSignals(
    internalWires: WireDefinition[]
  ): SignalType[] {
    const signals = new Set<SignalType>();

    for (const wire of internalWires) {
      signals.add(wire.signalType);
    }

    return Array.from(signals);
  }

  /**
   * Detect side effects - signals that leave the cluster unexpectedly
   */
  detectSideEffects(
    outgoingWires: WireDefinition[],
    clusterSet: Set<string>,
    inputSignals: SignalType[],
    outputSignals: SignalType[]
  ): SideEffect[] {
    const sideEffects: SideEffect[] = [];
    const validOutputs = new Set(outputSignals);

    for (const wire of outgoingWires) {
      // If this signal isn't a valid output, it's a side effect
      if (!validOutputs.has(wire.signalType)) {
        // Check if it's just a passthrough (input signal going out)
        const isPassthrough = inputSignals.includes(wire.signalType);

        sideEffects.push({
          signalType: wire.signalType,
          fromNode: wire.from,
          toNode: wire.to,
          reason: isPassthrough 
            ? 'Passthrough signal - input signal exits without transformation'
            : 'Unexpected signal - signal exits cluster but not declared as output',
        });
      }
    }

    return sideEffects;
  }

  /**
   * Validate boundaries against a signal registry
   */
  validateBoundaries(
    boundaries: Boundaries,
    registry: SignalRegistry
  ): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const registeredTypes = new Set(registry.signals.map(s => s.type));

    // Check input signals
    for (const signalType of boundaries.inputSignals) {
      if (!registeredTypes.has(signalType)) {
        errors.push(`Input signal "${signalType}" is not registered in signal registry`);
        suggestions.push(`Register signal "${signalType}" or use a different signal type`);
      }
    }

    // Check output signals
    for (const signalType of boundaries.outputSignals) {
      if (!registeredTypes.has(signalType)) {
        errors.push(`Output signal "${signalType}" is not registered in signal registry`);
        suggestions.push(`Register signal "${signalType}" or use a different signal type`);
      }
    }

    // Check side effects
    if (boundaries.sideEffects.length > 0) {
      warnings.push(`${boundaries.sideEffects.length} side effects detected`);
      for (const effect of boundaries.sideEffects) {
        warnings.push(`  - ${effect.reason}: ${effect.signalType} from ${effect.fromNode} to ${effect.toNode}`);
      }
      suggestions.push('Consider including side effects as explicit outputs or removing the causing wires');
    }

    // Check for empty boundaries
    if (boundaries.inputSignals.length === 0 && boundaries.outputSignals.length === 0) {
      warnings.push('Cluster has no inputs or outputs - it may be isolated');
      suggestions.push('Verify the cluster selection includes connected nodes');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Get a node cluster definition
   */
  getNodeCluster(
    nodes: NodeDefinition[],
    wires: WireDefinition[],
    clusterNodeIds: string[]
  ): NodeCluster {
    const clusterSet = new Set(clusterNodeIds);
    const clusterNodes = nodes.filter(n => clusterSet.has(n.id));
    const internalWires = wires.filter(w => 
      clusterSet.has(w.from) && clusterSet.has(w.to)
    );

    return {
      nodeIds: clusterNodeIds,
      nodes: clusterNodes,
      internalWires,
    };
  }

  /**
   * Check if a cluster is valid for extraction
   */
  isValidCluster(
    nodes: NodeDefinition[],
    clusterNodeIds: string[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const nodeIds = new Set(nodes.map(n => n.id));

    // Check all cluster nodes exist
    for (const id of clusterNodeIds) {
      if (!nodeIds.has(id)) {
        errors.push(`Node "${id}" does not exist in cartridge`);
      }
    }

    // Check cluster has at least one node
    if (clusterNodeIds.length === 0) {
      errors.push('Cluster must contain at least one node');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Find all nodes connected to a given node (within specified depth)
   */
  findConnectedNodes(
    nodes: NodeDefinition[],
    wires: WireDefinition[],
    startNodeId: string,
    depth: number = 2
  ): string[] {
    const adjacency = new Map<string, Set<string>>();

    // Build adjacency list
    for (const wire of wires) {
      if (!adjacency.has(wire.from)) {
        adjacency.set(wire.from, new Set());
      }
      if (!adjacency.has(wire.to)) {
        adjacency.set(wire.to, new Set());
      }
      adjacency.get(wire.from)!.add(wire.to);
      adjacency.get(wire.to)!.add(wire.from); // Bidirectional for connectivity
    }

    // BFS to find connected nodes
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; distance: number }> = [
      { nodeId: startNodeId, distance: 0 },
    ];

    while (queue.length > 0) {
      const { nodeId, distance } = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      if (distance < depth) {
        const neighbors = adjacency.get(nodeId) || new Set();
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push({ nodeId: neighbor, distance: distance + 1 });
          }
        }
      }
    }

    return Array.from(visited);
  }

  /**
   * Suggest nodes for cluster extraction based on connectivity
   */
  suggestCluster(
    nodes: NodeDefinition[],
    wires: WireDefinition[],
    startNodeId: string,
    maxNodes: number = 10
  ): string[] {
    // Find connected nodes with increasing depth until we have enough
    for (let depth = 1; depth <= 5; depth++) {
      const connected = this.findConnectedNodes(nodes, wires, startNodeId, depth);
      if (connected.length >= maxNodes) {
        return connected.slice(0, maxNodes);
      }
    }

    // Return all connected nodes if less than max
    return this.findConnectedNodes(nodes, wires, startNodeId, 5);
  }
}

export default BoundaryDetector;
