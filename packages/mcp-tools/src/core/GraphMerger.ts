/**
 * GraphMerger - Merges cartridges with patches using different strategies
 * 
 * @module @graph-os/mcp-tools/core
 */

import type { 
  NodeDefinition, 
  WireDefinition, 
  SignalDefinition, 
  CompositeDefinition,
  SignalRegistry,
  CompositeRegistry,
  Cartridge,
  TopologyPatch 
} from './ConflictDetector';
import type { ResolutionStrategy } from './ConflictResolver';

// =============================================================================
// Types
// =============================================================================

export type MergeStrategy = 
  | 'merge'      // Smart merge with conflict detection
  | 'replace'    // Full replacement (patch overwrites everything)
  | 'overlay'    // Additive only (no removals)
  | 'atomic';    // All or nothing (transaction-like)

export interface MergeOptions {
  strategy: MergeStrategy;
  conflictResolution?: ResolutionStrategy;
  validateAfterMerge?: boolean;
  preserveIds?: boolean;
}

export interface MergeResult {
  success: boolean;
  cartridge?: Cartridge;
  signalRegistry?: SignalRegistry;
  compositeRegistry?: CompositeRegistry;
  stats: {
    nodesAdded: number;
    nodesUpdated: number;
    nodesRemoved: number;
    wiresAdded: number;
    wiresRemoved: number;
    signalsAdded: number;
    compositesAdded: number;
  };
  warnings: string[];
  errors: string[];
}

// =============================================================================
// GraphMerger Class
// =============================================================================

/**
 * GraphMerger - Merges topology patches with existing cartridges
 * 
 * @example
 * ```typescript
 * const merger = new GraphMerger();
 * const result = merger.mergeCartridge(existingCartridge, patch, { strategy: 'merge' });
 * 
 * if (result.success) {
 *   console.log('Merged successfully:', result.stats);
 * } else {
 *   console.error('Merge failed:', result.errors);
 * }
 * ```
 */
export class GraphMerger {
  
  /**
   * Merge a patch into an existing cartridge
   */
  mergeCartridge(
    existing: Cartridge,
    patch: TopologyPatch,
    options: MergeOptions
  ): MergeResult {
    const stats = {
      nodesAdded: 0,
      nodesUpdated: 0,
      nodesRemoved: 0,
      wiresAdded: 0,
      wiresRemoved: 0,
      signalsAdded: 0,
      compositesAdded: 0,
    };
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      let merged: Cartridge;

      switch (options.strategy) {
        case 'replace':
          merged = this.mergeReplace(existing, patch, stats);
          break;
        case 'overlay':
          merged = this.mergeOverlay(existing, patch, stats, warnings);
          break;
        case 'atomic':
          merged = this.mergeAtomic(existing, patch, stats, errors);
          break;
        case 'merge':
        default:
          merged = this.mergeSmart(existing, patch, stats, warnings, options.conflictResolution);
          break;
      }

      return {
        success: errors.length === 0,
        cartridge: merged,
        stats,
        warnings,
        errors,
      };

    } catch (error) {
      return {
        success: false,
        stats,
        warnings,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Merge nodes using smart merge strategy
   */
  mergeNodes(
    existing: NodeDefinition[],
    patch: NodeDefinition[],
    strategy: MergeStrategy,
    conflictResolution: ResolutionStrategy = 'merge-both'
  ): { nodes: NodeDefinition[]; added: number; updated: number; removed: number } {
    const nodeMap = new Map<string, NodeDefinition>();
    let added = 0;
    let updated = 0;
    let removed = 0;

    // Add existing nodes to map
    for (const node of existing) {
      nodeMap.set(node.id, node);
    }

    // Process patch
    for (const patchNode of patch) {
      const existingNode = nodeMap.get(patchNode.id);

      if (existingNode) {
        // Update existing
        if (strategy === 'merge' || strategy === 'overlay') {
          nodeMap.set(patchNode.id, {
            ...existingNode,
            ...patchNode,
            config: {
              ...existingNode.config,
              ...patchNode.config,
            },
          });
          updated++;
        } else if (strategy === 'replace') {
          nodeMap.set(patchNode.id, patchNode);
          updated++;
        }
        // 'atomic' - no updates, only additions
      } else {
        // Add new
        nodeMap.set(patchNode.id, patchNode);
        added++;
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      added,
      updated,
      removed,
    };
  }

  /**
   * Merge wires using smart merge strategy
   */
  mergeWires(
    existing: WireDefinition[],
    patch: WireDefinition[],
    strategy: MergeStrategy
  ): { wires: WireDefinition[]; added: number; removed: number } {
    const wireSet = new Map<string, WireDefinition>();
    let added = 0;

    // Add existing wires to set
    for (const wire of existing) {
      const key = `${wire.from}:${wire.to}:${wire.signalType}`;
      wireSet.set(key, wire);
    }

    // Add patch wires (duplicates will be overwritten)
    for (const wire of patch) {
      const key = `${wire.from}:${wire.to}:${wire.signalType}`;
      if (!wireSet.has(key)) {
        added++;
      }
      wireSet.set(key, wire);
    }

    return {
      wires: Array.from(wireSet.values()),
      added,
      removed: 0, // Wires are never removed in merge
    };
  }

  /**
   * Merge signals into a signal registry
   */
  mergeSignals(
    registry: SignalRegistry,
    signals: SignalDefinition[],
    strategy: MergeStrategy
  ): { registry: SignalRegistry; added: number } {
    const signalMap = new Map<string, SignalDefinition>();
    let added = 0;

    // Add existing signals to map
    for (const signal of registry.signals) {
      signalMap.set(signal.type, signal);
    }

    // Add patch signals
    for (const patchSignal of signals) {
      if (!signalMap.has(patchSignal.type)) {
        signalMap.set(patchSignal.type, patchSignal);
        added++;
      } else if (strategy === 'replace') {
        signalMap.set(patchSignal.type, patchSignal);
      }
      // Otherwise, preserve existing
    }

    return {
      registry: { signals: Array.from(signalMap.values()) },
      added,
    };
  }

  // =============================================================================
  // Private Methods - Strategy Implementations
  // =============================================================================

  /**
   * Replace strategy - patch overwrites everything
   */
  private mergeReplace(
    existing: Cartridge,
    patch: TopologyPatch,
    stats: MergeResult['stats']
  ): Cartridge {
    return {
      version: existing.version,
      name: patch.nodes?.length ? existing.name : existing.name,
      description: existing.description,
      nodes: patch.nodes || existing.nodes,
      wires: patch.wires || existing.wires,
      inputs: existing.inputs,
      outputs: existing.outputs,
      composites: existing.composites,
    };
  }

  /**
   * Overlay strategy - additive only, no removals
   */
  private mergeOverlay(
    existing: Cartridge,
    patch: TopologyPatch,
    stats: MergeResult['stats'],
    warnings: string[]
  ): Cartridge {
    const nodeResult = this.mergeNodes(existing.nodes, patch.nodes || [], 'overlay');
    const wireResult = this.mergeWires(existing.wires, patch.wires || [], 'overlay');

    stats.nodesAdded = nodeResult.added;
    stats.nodesUpdated = nodeResult.updated;
    stats.wiresAdded = wireResult.added;

    return {
      version: existing.version,
      name: existing.name,
      description: existing.description,
      nodes: nodeResult.nodes,
      wires: wireResult.wires,
      inputs: existing.inputs,
      outputs: existing.outputs,
      composites: existing.composites,
    };
  }

  /**
   * Atomic strategy - all or nothing
   */
  private mergeAtomic(
    existing: Cartridge,
    patch: TopologyPatch,
    stats: MergeResult['stats'],
    errors: string[]
  ): Cartridge {
    // Validate that patch is complete
    if (!patch.nodes || patch.nodes.length === 0) {
      errors.push('Atomic merge requires at least one node in patch');
      return existing;
    }

    // In atomic mode, we either apply everything or nothing
    // For now, just do a smart merge but fail on any conflict
    const result = this.mergeSmart(existing, patch, stats, [], 'fail');
    return result;
  }

  /**
   * Smart merge strategy - intelligent conflict handling
   */
  private mergeSmart(
    existing: Cartridge,
    patch: TopologyPatch,
    stats: MergeResult['stats'],
    warnings: string[],
    conflictResolution: ResolutionStrategy = 'merge-both'
  ): Cartridge {
    const nodeResult = this.mergeNodes(existing.nodes, patch.nodes || [], 'merge', conflictResolution);
    const wireResult = this.mergeWires(existing.wires, patch.wires || [], 'merge');

    stats.nodesAdded = nodeResult.added;
    stats.nodesUpdated = nodeResult.updated;
    stats.nodesRemoved = nodeResult.removed;
    stats.wiresAdded = wireResult.added;
    stats.wiresRemoved = wireResult.removed;

    // Generate warnings for updated nodes
    if (nodeResult.updated > 0) {
      warnings.push(`${nodeResult.updated} nodes were updated (merged configs)`);
    }

    return {
      version: existing.version,
      name: existing.name,
      description: existing.description,
      nodes: nodeResult.nodes,
      wires: wireResult.wires,
      inputs: existing.inputs,
      outputs: existing.outputs,
      composites: existing.composites,
    };
  }
}

export default GraphMerger;
