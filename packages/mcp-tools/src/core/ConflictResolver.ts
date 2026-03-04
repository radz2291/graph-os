/**
 * ConflictResolver - Resolves conflicts during patch application
 * 
 * @module @graph-os/mcp-tools/core
 */

import type { Conflict, ConflictType, NodeDefinition, WireDefinition, SignalDefinition } from './ConflictDetector';

// =============================================================================
// Types
// =============================================================================

export type ResolutionStrategy = 
  | 'preserve-existing'  // Keep existing value, ignore patch
  | 'use-patch'          // Use patch value, replace existing
  | 'fail'               // Throw error on conflict
  | 'merge-both';        // Attempt to merge both values

export interface ConflictResolution {
  strategy: ResolutionStrategy;
  reason?: string;
}

export interface ConflictResolutionResult {
  resolved: boolean;
  resolution: ConflictResolution;
  result?: unknown;
  message?: string;
}

// =============================================================================
// ConflictResolver Class
// =============================================================================

/**
 * ConflictResolver - Resolves conflicts using configurable strategies
 * 
 * @example
 * ```typescript
 * const resolver = new ConflictResolver();
 * const result = resolver.resolveConflict(conflict, { strategy: 'merge-both' });
 * 
 * if (result.resolved) {
 *   console.log('Conflict resolved:', result.message);
 * } else {
 *   console.error('Failed to resolve:', result.message);
 * }
 * ```
 */
export class ConflictResolver {
  
  /**
   * Resolve a conflict using the given resolution strategy
   */
  resolveConflict(
    conflict: Conflict,
    resolution: ConflictResolution
  ): ConflictResolutionResult {
    switch (conflict.type) {
      case 'duplicate_node_id':
      case 'conflicting_node_type':
        return this.resolveNodeConflict(conflict, resolution);
      
      case 'duplicate_wire':
        return this.resolveWireConflict(conflict, resolution);
      
      case 'duplicate_signal_type':
      case 'conflicting_signal_schema':
        return this.resolveSignalConflict(conflict, resolution);
      
      case 'circular_dependency':
      case 'broken_reference':
        return this.resolveStructuralConflict(conflict, resolution);
      
      default:
        return {
          resolved: false,
          resolution,
          message: `Unknown conflict type: ${conflict.type}`,
        };
    }
  }

  /**
   * Resolve node-related conflicts
   */
  resolveNodeConflict(
    conflict: Conflict,
    resolution: ConflictResolution
  ): ConflictResolutionResult {
    const existing = conflict.details?.existing as NodeDefinition | undefined;
    const patch = conflict.details?.patch as NodeDefinition | undefined;

    switch (resolution.strategy) {
      case 'preserve-existing':
        return {
          resolved: true,
          resolution,
          result: existing,
          message: `Preserved existing node "${existing?.id}"`,
        };

      case 'use-patch':
        return {
          resolved: true,
          resolution,
          result: patch,
          message: `Replaced node "${patch?.id}" with patch version`,
        };

      case 'merge-both':
        if (existing && patch) {
          // Merge configs
          const merged: NodeDefinition = {
            id: existing.id,
            type: patch.type || existing.type,
            description: patch.description || existing.description,
            config: {
              ...existing.config,
              ...patch.config,
            },
          };
          return {
            resolved: true,
            resolution,
            result: merged,
            message: `Merged node "${existing.id}" configs`,
          };
        }
        return {
          resolved: false,
          resolution,
          message: 'Cannot merge - missing existing or patch data',
        };

      case 'fail':
        return {
          resolved: false,
          resolution,
          message: `Node conflict not resolved (fail strategy): ${conflict.message}`,
        };

      default:
        return {
          resolved: false,
          resolution,
          message: `Unknown resolution strategy: ${resolution.strategy}`,
        };
    }
  }

  /**
   * Resolve wire-related conflicts
   */
  resolveWireConflict(
    conflict: Conflict,
    resolution: ConflictResolution
  ): ConflictResolutionResult {
    const existing = conflict.details?.existing as WireDefinition | undefined;
    const patch = conflict.details?.patch as WireDefinition | undefined;

    switch (resolution.strategy) {
      case 'preserve-existing':
        return {
          resolved: true,
          resolution,
          result: existing,
          message: 'Preserved existing wire',
        };

      case 'use-patch':
        return {
          resolved: true,
          resolution,
          result: patch,
          message: 'Replaced wire with patch version',
        };

      case 'merge-both':
        // For wires, merge-both means keep existing (duplicate wires don't make sense)
        return {
          resolved: true,
          resolution,
          result: existing,
          message: 'Kept existing wire (duplicates skipped)',
        };

      case 'fail':
        return {
          resolved: false,
          resolution,
          message: `Wire conflict not resolved (fail strategy): ${conflict.message}`,
        };

      default:
        return {
          resolved: false,
          resolution,
          message: `Unknown resolution strategy: ${resolution.strategy}`,
        };
    }
  }

  /**
   * Resolve signal-related conflicts
   */
  resolveSignalConflict(
    conflict: Conflict,
    resolution: ConflictResolution
  ): ConflictResolutionResult {
    const existing = conflict.details?.existing as SignalDefinition | undefined;
    const patch = conflict.details?.patch as SignalDefinition | undefined;

    switch (resolution.strategy) {
      case 'preserve-existing':
        return {
          resolved: true,
          resolution,
          result: existing,
          message: `Preserved existing signal "${existing?.type}"`,
        };

      case 'use-patch':
        return {
          resolved: true,
          resolution,
          result: patch,
          message: `Replaced signal "${patch?.type}" with patch version`,
        };

      case 'merge-both':
        if (existing && patch) {
          // Merge signal definitions
          const merged: SignalDefinition = {
            type: existing.type,
            description: patch.description || existing.description,
            payloadSchema: this.mergeSchemas(existing.payloadSchema, patch.payloadSchema),
            emittedBy: [...new Set([...(existing.emittedBy || []), ...(patch.emittedBy || [])])],
            consumedBy: [...new Set([...(existing.consumedBy || []), ...(patch.consumedBy || [])])],
          };
          return {
            resolved: true,
            resolution,
            result: merged,
            message: `Merged signal "${existing.type}"`,
          };
        }
        return {
          resolved: false,
          resolution,
          message: 'Cannot merge signals - missing data',
        };

      case 'fail':
        return {
          resolved: false,
          resolution,
          message: `Signal conflict not resolved (fail strategy): ${conflict.message}`,
        };

      default:
        return {
          resolved: false,
          resolution,
          message: `Unknown resolution strategy: ${resolution.strategy}`,
        };
    }
  }

  /**
   * Resolve structural conflicts (circular deps, broken refs)
   */
  resolveStructuralConflict(
    conflict: Conflict,
    resolution: ConflictResolution
  ): ConflictResolutionResult {
    // Structural conflicts cannot be auto-resolved
    switch (resolution.strategy) {
      case 'fail':
        return {
          resolved: false,
          resolution,
          message: `Structural conflict not resolved: ${conflict.message}`,
        };

      case 'preserve-existing':
      case 'use-patch':
      case 'merge-both':
        return {
          resolved: false,
          resolution,
          message: `Structural conflicts require manual resolution: ${conflict.message}. Suggestions: ${conflict.details?.suggestions?.join(', ')}`,
        };

      default:
        return {
          resolved: false,
          resolution,
          message: `Cannot resolve structural conflict`,
        };
    }
  }

  /**
   * Merge two JSON schemas
   */
  private mergeSchemas(
    existing?: Record<string, unknown>,
    patch?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    if (!existing && !patch) return undefined;
    if (!existing) return patch;
    if (!patch) return existing;

    // Merge properties
    const merged: Record<string, unknown> = {
      type: patch.type || existing.type,
      properties: {
        ...(existing.properties as Record<string, unknown> || {}),
        ...(patch.properties as Record<string, unknown> || {}),
      },
    };

    // Merge required fields (union)
    const existingRequired = (existing.required as string[]) || [];
    const patchRequired = (patch.required as string[]) || [];
    merged.required = [...new Set([...existingRequired, ...patchRequired])];

    return merged;
  }
}

export default ConflictResolver;
