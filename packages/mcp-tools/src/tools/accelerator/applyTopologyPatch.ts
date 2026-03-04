/**
 * apply_topology_patch - Universal graph modification tool
 * 
 * This tool supersedes 9 deprecated tools:
 * - add_node, add_wire, remove_node, remove_wire
 * - update_node, update_wire
 * - create_signal, remove_signal
 * - add_composite_ref
 * 
 * @module @graph-os/mcp-tools/accelerator
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MCPToolResult, MCPToolDefinition, MCPParameterSchema } from '../../core/MCPTool';
import { ConflictDetector } from '../../core/ConflictDetector';
import { ConflictResolver } from '../../core/ConflictResolver';
import { GraphMerger } from '../../core/GraphMerger';
import type { 
  Cartridge, 
  TopologyPatch, 
  NodeDefinition, 
  WireDefinition,
  SignalDefinition,
  SignalRegistry 
} from '../../core/ConflictDetector';
import type { ResolutionStrategy } from '../../core/ConflictResolver';
import type { MergeStrategy } from '../../core/GraphMerger';

// =============================================================================
// Types
// =============================================================================

export type PatchOperationType = 'add' | 'remove' | 'update' | 'replace';

export interface NodePatchOperation {
  type: 'add' | 'remove' | 'update' | 'replace';
  target: 'node';
  data?: NodeDefinition;
  id?: string;
}

export interface WirePatchOperation {
  type: 'add' | 'remove';
  target: 'wire';
  data?: WireDefinition;
}

export interface SignalPatchOperation {
  type: 'add' | 'remove' | 'update';
  target: 'signal';
  data?: SignalDefinition;
  signalType?: string;
}

export interface CompositeRefPatchOperation {
  type: 'add' | 'remove';
  target: 'composite-ref';
  data?: {
    name: string;
    path: string;
  };
}

export type PatchOperation = 
  | NodePatchOperation 
  | WirePatchOperation 
  | SignalPatchOperation 
  | CompositeRefPatchOperation;

export interface ApplyTopologyPatchInput {
  /** Path to the cartridge file to modify */
  cartridgePath: string;
  /** Path to signal registry (optional, for signal validation) */
  signalRegistryPath?: string;
  /** Path to composite registry (optional) */
  compositeRegistryPath?: string;
  /** Nodes to add/update/remove */
  nodes?: NodeDefinition[];
  /** Wires to add/remove */
  wires?: WireDefinition[];
  /** Signals to register */
  signals?: SignalDefinition[];
  /** Composite references to add */
  compositeRefs?: Array<{ name: string; path: string }>;
  /** Patch operations (alternative to declarative format) */
  operations?: PatchOperation[];
  /** Merge strategy */
  mergeStrategy?: MergeStrategy;
  /** Conflict resolution strategy */
  conflictResolution?: ResolutionStrategy;
  /** Validate before applying */
  validateBeforeApply?: boolean;
  /** Create snapshot before modification */
  createSnapshot?: boolean;
  /** Rollback on error */
  rollbackOnError?: boolean;
  /** Return detailed explanation */
  explain?: boolean;
}

export interface ApplyTopologyPatchOutput {
  success: boolean;
  modified: boolean;
  stats: {
    nodesAdded: number;
    nodesUpdated: number;
    nodesRemoved: number;
    wiresAdded: number;
    wiresRemoved: number;
    signalsAdded: number;
    compositesAdded: number;
  };
  conflicts: Array<{
    type: string;
    severity: string;
    message: string;
    resolution?: string;
  }>;
  warnings: string[];
  snapshotPath?: string;
  explanation?: string;
}

// =============================================================================
// ApplyTopologyPatchTool Class
// =============================================================================

/**
 * ApplyTopologyPatchTool - Universal graph modification tool
 * 
 * Allows building entire features in a single turn by accepting
 * a partial graph definition and intelligently merging it.
 * 
 * @example
 * ```typescript
 * const tool = new ApplyTopologyPatchTool();
 * const result = await tool.execute({
 *   cartridgePath: './cartridges/app.cartridge.json',
 *   nodes: [
 *     { id: 'validator', type: 'logic.validate', config: { rules: ['email'] } }
 *   ],
 *   wires: [
 *     { from: 'input', to: 'validator', signalType: 'USER.INPUT' }
 *   ],
 *   mergeStrategy: 'merge'
 * });
 * ```
 */
export class ApplyTopologyPatchTool {
  readonly definition: MCPToolDefinition = {
    name: 'apply_topology_patch',
    description: 'Universal graph modification tool. Build entire features in a single turn by applying a partial graph definition (nodes, wires, signals) to an existing cartridge. Supersedes add_node, add_wire, remove_node, remove_wire, update_node, update_wire.',
    parameters: [
      {
        name: 'cartridgePath',
        type: 'string',
        required: true,
        description: 'Path to the cartridge file to modify'
      },
      {
        name: 'signalRegistryPath',
        type: 'string',
        required: false,
        description: 'Path to signal registry for signal validation'
      },
      {
        name: 'nodes',
        type: 'array',
        required: false,
        description: 'Nodes to add or update'
      },
      {
        name: 'wires',
        type: 'array',
        required: false,
        description: 'Wires to add or remove'
      },
      {
        name: 'signals',
        type: 'array',
        required: false,
        description: 'Signals to register'
      },
      {
        name: 'mergeStrategy',
        type: 'string',
        required: false,
        description: 'Merge strategy: merge (smart), replace (overwrite), overlay (additive only), atomic (all or nothing)'
      },
      {
        name: 'conflictResolution',
        type: 'string',
        required: false,
        description: 'Conflict resolution: preserve-existing, use-patch, fail, merge-both'
      },
      {
        name: 'validateBeforeApply',
        type: 'boolean',
        required: false,
        description: 'Validate changes before applying (default: true)'
      },
      {
        name: 'createSnapshot',
        type: 'boolean',
        required: false,
        description: 'Create backup snapshot before modification (default: true)'
      },
      {
        name: 'rollbackOnError',
        type: 'boolean',
        required: false,
        description: 'Rollback changes if error occurs (default: true)'
      },
      {
        name: 'explain',
        type: 'boolean',
        required: false,
        description: 'Return detailed explanation of changes'
      }
    ],
    returnType: 'ApplyTopologyPatchOutput',
    category: 'accelerator',
    bestFor: ['bulk operations', 'multi-node edits', 'feature creation', 'rapid development'],
    deprecates: ['add_node', 'add_wire', 'remove_node', 'remove_wire', 'update_node', 'update_wire', 'create_signal', 'remove_signal', 'add_composite_ref'],
    complexity: 'medium'
  };

  private conflictDetector = new ConflictDetector();
  private conflictResolver = new ConflictResolver();
  private graphMerger = new GraphMerger();

  async execute(input: ApplyTopologyPatchInput): Promise<MCPToolResult<ApplyTopologyPatchOutput>> {
    const stats = {
      nodesAdded: 0,
      nodesUpdated: 0,
      nodesRemoved: 0,
      wiresAdded: 0,
      wiresRemoved: 0,
      signalsAdded: 0,
      compositesAdded: 0,
    };
    const conflicts: Array<{ type: string; severity: string; message: string; resolution?: string }> = [];
    const warnings: string[] = [];
    let snapshotPath: string | undefined;

    try {
      // Validate cartridge exists
      if (!fs.existsSync(input.cartridgePath)) {
        return {
          success: false,
          error: `Cartridge not found: ${input.cartridgePath}`
        };
      }

      // Load cartridge
      const cartridgeData = fs.readFileSync(input.cartridgePath, 'utf-8');
      const cartridge: Cartridge = JSON.parse(cartridgeData);

      // Load signal registry if provided
      let signalRegistry: SignalRegistry | undefined;
      if (input.signalRegistryPath && fs.existsSync(input.signalRegistryPath)) {
        signalRegistry = JSON.parse(fs.readFileSync(input.signalRegistryPath, 'utf-8'));
      }

      // Build patch
      const patch: TopologyPatch = {
        nodes: input.nodes || [],
        wires: input.wires || [],
        signals: input.signals || [],
      };

      // Create snapshot if requested
      if (input.createSnapshot !== false) {
        snapshotPath = this.createSnapshot(input.cartridgePath, cartridgeData);
      }

      // Detect conflicts
      const conflictResult = this.conflictDetector.detectAllConflicts(
        cartridge,
        patch,
        signalRegistry
      );

      // Process conflicts
      for (const conflict of conflictResult.conflicts) {
        conflicts.push({
          type: conflict.type,
          severity: conflict.severity,
          message: conflict.message,
        });
      }

      // Stop if errors and fail strategy
      if (conflictResult.hasErrors && input.conflictResolution === 'fail') {
        return {
          success: false,
          error: 'Conflicts detected and conflict resolution is set to fail',
          data: {
            success: false,
            modified: false,
            stats,
            conflicts,
            warnings,
            snapshotPath,
          }
        };
      }

      // Validate if requested
      if (input.validateBeforeApply !== false && conflictResult.hasErrors) {
        warnings.push('Validation found errors - proceeding with caution');
      }

      // Merge
      const mergeStrategy: MergeStrategy = (input.mergeStrategy as MergeStrategy) || 'merge';
      const conflictResolution: ResolutionStrategy = (input.conflictResolution as ResolutionStrategy) || 'merge-both';

      const mergeResult = this.graphMerger.mergeCartridge(cartridge, patch, {
        strategy: mergeStrategy,
        conflictResolution,
      });

      // Update stats
      stats.nodesAdded = mergeResult.stats.nodesAdded;
      stats.nodesUpdated = mergeResult.stats.nodesUpdated;
      stats.nodesRemoved = mergeResult.stats.nodesRemoved;
      stats.wiresAdded = mergeResult.stats.wiresAdded;
      stats.wiresRemoved = mergeResult.stats.wiresRemoved;
      warnings.push(...mergeResult.warnings);

      // Add signals to registry if provided
      if (input.signals && input.signals.length > 0 && signalRegistry) {
        const signalResult = this.graphMerger.mergeSignals(signalRegistry, input.signals, mergeStrategy);
        stats.signalsAdded = signalResult.added;
        
        // Save signal registry
        fs.writeFileSync(input.signalRegistryPath!, JSON.stringify(signalRegistry, null, 2));
      }

      // Handle errors
      if (mergeResult.errors.length > 0) {
        if (input.rollbackOnError !== false && snapshotPath) {
          this.restoreSnapshot(snapshotPath, input.cartridgePath);
          return {
            success: false,
            error: mergeResult.errors.join('; '),
            data: {
              success: false,
              modified: false,
              stats,
              conflicts,
              warnings,
              snapshotPath,
            }
          };
        }
      }

      // Save modified cartridge
      if (mergeResult.cartridge) {
        fs.writeFileSync(input.cartridgePath, JSON.stringify(mergeResult.cartridge, null, 2));
      }

      // Generate explanation if requested
      let explanation: string | undefined;
      if (input.explain) {
        explanation = this.generateExplanation(stats, conflicts, warnings);
      }

      return {
        success: true,
        data: {
          success: true,
          modified: stats.nodesAdded > 0 || stats.nodesUpdated > 0 || stats.wiresAdded > 0,
          stats,
          conflicts,
          warnings,
          snapshotPath,
          explanation,
        }
      };

    } catch (error) {
      // Rollback on error if snapshot exists
      if (input.rollbackOnError !== false && snapshotPath) {
        this.restoreSnapshot(snapshotPath, input.cartridgePath);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: {
          success: false,
          modified: false,
          stats,
          conflicts,
          warnings,
          snapshotPath,
        }
      };
    }
  }

  /**
   * Create a snapshot of the cartridge before modification
   */
  private createSnapshot(cartridgePath: string, data: string): string {
    const snapshotDir = path.join(path.dirname(cartridgePath), '.snapshots');
    
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const basename = path.basename(cartridgePath, '.json');
    const snapshotPath = path.join(snapshotDir, `${basename}.${timestamp}.snapshot.json`);

    fs.writeFileSync(snapshotPath, data);

    return snapshotPath;
  }

  /**
   * Restore cartridge from a snapshot
   */
  private restoreSnapshot(snapshotPath: string, cartridgePath: string): void {
    if (fs.existsSync(snapshotPath)) {
      const data = fs.readFileSync(snapshotPath, 'utf-8');
      fs.writeFileSync(cartridgePath, data);
    }
  }

  /**
   * Generate human-readable explanation of changes
   */
  private generateExplanation(
    stats: ApplyTopologyPatchOutput['stats'],
    conflicts: ApplyTopologyPatchOutput['conflicts'],
    warnings: string[]
  ): string {
    const parts: string[] = [];

    if (stats.nodesAdded > 0) {
      parts.push(`Added ${stats.nodesAdded} node(s)`);
    }
    if (stats.nodesUpdated > 0) {
      parts.push(`Updated ${stats.nodesUpdated} node(s)`);
    }
    if (stats.wiresAdded > 0) {
      parts.push(`Added ${stats.wiresAdded} wire(s)`);
    }
    if (stats.signalsAdded > 0) {
      parts.push(`Registered ${stats.signalsAdded} signal(s)`);
    }

    if (conflicts.length > 0) {
      const errors = conflicts.filter(c => c.severity === 'error');
      const warns = conflicts.filter(c => c.severity === 'warning');
      
      if (errors.length > 0) {
        parts.push(`Encountered ${errors.length} error(s)`);
      }
      if (warns.length > 0) {
        parts.push(`Had ${warns.length} warning(s)`);
      }
    }

    return parts.length > 0 
      ? `Topology patch applied: ${parts.join(', ')}.`
      : 'No changes were made.';
  }

  validateParams(params: unknown): params is ApplyTopologyPatchInput {
    if (typeof params !== 'object' || params === null) return false;
    const p = params as Record<string, unknown>;
    return typeof p.cartridgePath === 'string';
  }
}

/**
 * Factory function to create an ApplyTopologyPatchTool instance
 */
export function createApplyTopologyPatchTool(): ApplyTopologyPatchTool {
  return new ApplyTopologyPatchTool();
}
