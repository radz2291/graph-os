/**
 * ConflictDetector - Detects conflicts between existing and patch data
 * 
 * This is a core component used by apply_topology_patch to detect conflicts
 * before merging changes into cartridges.
 * 
 * @module @graph-os/mcp-tools/core
 */

// =============================================================================
// Types
// =============================================================================

export interface NodeDefinition {
  id: string;
  type: string;
  description?: string;
  config?: Record<string, unknown>;
}

export interface WireDefinition {
  from: string;
  to: string;
  signalType: string;
}

export interface SignalDefinition {
  type: string;
  description?: string;
  payloadSchema?: Record<string, unknown>;
  emittedBy?: string[];
  consumedBy?: string[];
}

export interface CompositeDefinition {
  name: string;
  path: string;
  inputs?: string[];
  outputs?: string[];
  nodes?: NodeDefinition[];
  wires?: WireDefinition[];
}

export interface SignalRegistry {
  signals: SignalDefinition[];
}

export interface CompositeRegistry {
  composites: CompositeDefinition[];
}

export interface Cartridge {
  version: string;
  name: string;
  description?: string;
  nodes: NodeDefinition[];
  wires: WireDefinition[];
  inputs?: string[];
  outputs?: string[];
  composites?: Array<{
    name: string;
    path: string;
  }>;
}

export interface TopologyPatch {
  nodes?: NodeDefinition[];
  wires?: WireDefinition[];
  signals?: SignalDefinition[];
  composites?: CompositeDefinition[];
  operations?: PatchOperation[];
}

export interface PatchOperation {
  type: 'add' | 'remove' | 'update' | 'replace';
  target: 'node' | 'wire' | 'signal' | 'composite';
  data?: unknown;
  id?: string;
}

// =============================================================================
// Conflict Types
// =============================================================================

export type ConflictType = 
  | 'duplicate_node_id'
  | 'duplicate_wire'
  | 'duplicate_signal_type'
  | 'duplicate_composite_name'
  | 'conflicting_node_type'
  | 'conflicting_signal_schema'
  | 'circular_dependency'
  | 'broken_reference'
  | 'missing_signal_type'
  | 'missing_node_reference';

export type ConflictSeverity = 'error' | 'warning' | 'info';

export interface Conflict {
  type: ConflictType;
  severity: ConflictSeverity;
  message: string;
  location: {
    file?: string;
    nodeId?: string;
    wireIndex?: number;
    signalType?: string;
    compositeName?: string;
  };
  details?: {
    existing?: unknown;
    patch?: unknown;
    suggestions?: string[];
  };
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  conflicts: Conflict[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

// =============================================================================
// ConflictDetector Class
// =============================================================================

/**
 * ConflictDetector - Detects conflicts between existing cartridge and patch data
 * 
 * Used by apply_topology_patch to identify potential issues before applying changes.
 * 
 * @example
 * ```typescript
 * const detector = new ConflictDetector();
 * const result = detector.detectAllConflicts(cartridge, patch);
 * 
 * if (result.hasErrors) {
 *   console.error('Cannot apply patch - conflicts detected:');
 *   result.conflicts.forEach(c => console.error(`  - ${c.message}`));
 * }
 * ```
 */
export class ConflictDetector {
  
  /**
   * Detect all conflicts between existing cartridge and patch
   */
  detectAllConflicts(
    cartridge: Cartridge,
    patch: TopologyPatch,
    signalRegistry?: SignalRegistry,
    compositeRegistry?: CompositeRegistry
  ): ConflictDetectionResult {
    const conflicts: Conflict[] = [];

    // Detect node conflicts
    conflicts.push(...this.detectNodeConflicts(cartridge.nodes, patch.nodes || []));

    // Detect wire conflicts
    conflicts.push(...this.detectWireConflicts(cartridge.wires, patch.wires || []));

    // Detect signal conflicts if registry provided
    if (signalRegistry && patch.signals) {
      conflicts.push(...this.detectSignalConflicts(signalRegistry, patch.signals));
    }

    // Detect composite conflicts if registry provided
    if (compositeRegistry && patch.composites) {
      conflicts.push(...this.detectCompositeConflicts(compositeRegistry, patch.composites));
    }

    // Detect circular dependencies
    const circularDeps = this.detectCircularDependencies(cartridge, patch);
    conflicts.push(...circularDeps);

    // Detect broken references
    const brokenRefs = this.detectBrokenReferences(cartridge, patch, signalRegistry);
    conflicts.push(...brokenRefs);

    // Calculate summary
    const summary = {
      errors: conflicts.filter(c => c.severity === 'error').length,
      warnings: conflicts.filter(c => c.severity === 'warning').length,
      info: conflicts.filter(c => c.severity === 'info').length,
    };

    return {
      hasConflicts: conflicts.length > 0,
      hasErrors: summary.errors > 0,
      hasWarnings: summary.warnings > 0,
      conflicts,
      summary,
    };
  }

  /**
   * Detect conflicts between existing and patch nodes
   */
  detectNodeConflicts(
    existing: NodeDefinition[],
    patch: NodeDefinition[]
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const existingMap = new Map(existing.map(n => [n.id, n]));

    for (const patchNode of patch) {
      const existingNode = existingMap.get(patchNode.id);

      if (existingNode) {
        // Duplicate ID - check if types match
        if (existingNode.type !== patchNode.type) {
          conflicts.push({
            type: 'conflicting_node_type',
            severity: 'error',
            message: `Node "${patchNode.id}" exists with different type. Existing: "${existingNode.type}", Patch: "${patchNode.type}"`,
            location: { nodeId: patchNode.id },
            details: {
              existing: existingNode,
              patch: patchNode,
              suggestions: [
                `Remove existing node first if you want to change its type`,
                `Update existing node config instead of replacing it`,
                `Use a different node ID for the new node`,
              ],
            },
          });
        } else {
          // Same ID, same type - this is an update, not a conflict (warning)
          conflicts.push({
            type: 'duplicate_node_id',
            severity: 'warning',
            message: `Node "${patchNode.id}" already exists and will be updated`,
            location: { nodeId: patchNode.id },
            details: {
              existing: existingNode,
              patch: patchNode,
              suggestions: [`This will merge the patch config with existing config`],
            },
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect conflicts between existing and patch wires
   */
  detectWireConflicts(
    existing: WireDefinition[],
    patch: WireDefinition[]
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const existingSet = new Set(existing.map(w => `${w.from}:${w.to}:${w.signalType}`));

    for (const patchWire of patch) {
      const key = `${patchWire.from}:${patchWire.to}:${patchWire.signalType}`;

      if (existingSet.has(key)) {
        conflicts.push({
          type: 'duplicate_wire',
          severity: 'warning',
          message: `Wire "${patchWire.from}" -> "${patchWire.to}" (${patchWire.signalType}) already exists`,
          location: { wireIndex: existing.findIndex(w => 
            w.from === patchWire.from && 
            w.to === patchWire.to && 
            w.signalType === patchWire.signalType
          )},
          details: {
            existing: patchWire,
            patch: patchWire,
            suggestions: [`Duplicate wires will be skipped during merge`],
          },
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect conflicts between existing and patch signals
   */
  detectSignalConflicts(
    registry: SignalRegistry,
    signals: SignalDefinition[]
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const existingMap = new Map(registry.signals.map(s => [s.type, s]));

    for (const patchSignal of signals) {
      const existingSignal = existingMap.get(patchSignal.type);

      if (existingSignal) {
        // Check for schema conflicts
        if (patchSignal.payloadSchema && existingSignal.payloadSchema) {
          const schemaConflict = this.compareSchemas(
            existingSignal.payloadSchema,
            patchSignal.payloadSchema
          );

          if (schemaConflict) {
            conflicts.push({
              type: 'conflicting_signal_schema',
              severity: 'error',
              message: `Signal "${patchSignal.type}" has conflicting schema`,
              location: { signalType: patchSignal.type },
              details: {
                existing: existingSignal.payloadSchema,
                patch: patchSignal.payloadSchema,
                suggestions: [
                  `Merge schemas manually before applying`,
                  `Use the more permissive schema`,
                ],
              },
            });
          }
        } else {
          // Signal exists - this is a warning, not an error
          conflicts.push({
            type: 'duplicate_signal_type',
            severity: 'warning',
            message: `Signal "${patchSignal.type}" already exists in registry`,
            location: { signalType: patchSignal.type },
            details: {
              existing: existingSignal,
              patch: patchSignal,
              suggestions: [`Existing signal will be preserved`],
            },
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect conflicts between existing and patch composites
   */
  detectCompositeConflicts(
    registry: CompositeRegistry,
    composites: CompositeDefinition[]
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const existingMap = new Map(registry.composites.map(c => [c.name, c]));

    for (const patchComposite of composites) {
      const existingComposite = existingMap.get(patchComposite.name);

      if (existingComposite) {
        conflicts.push({
          type: 'duplicate_composite_name',
          severity: 'error',
          message: `Composite "${patchComposite.name}" already exists in registry`,
          location: { compositeName: patchComposite.name },
          details: {
            existing: existingComposite,
            patch: patchComposite,
            suggestions: [
              `Use a different composite name`,
              `Remove existing composite first`,
            ],
          },
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect circular dependencies in the graph
   */
  detectCircularDependencies(
    cartridge: Cartridge,
    patch: TopologyPatch
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    // Build adjacency list from existing + patch wires
    const adjacency = new Map<string, Set<string>>();
    
    const allWires = [...cartridge.wires, ...(patch.wires || [])];
    
    for (const wire of allWires) {
      if (!adjacency.has(wire.from)) {
        adjacency.set(wire.from, new Set());
      }
      adjacency.get(wire.from)!.add(wire.to);
    }

    // Detect cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycleNodes: string[][] = [];

    const dfs = (node: string, path: string[]): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = adjacency.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, [...path, neighbor])) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            cycleNodes.push(path.slice(cycleStart));
          }
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    // Check all nodes
    for (const node of adjacency.keys()) {
      if (!visited.has(node)) {
        dfs(node, [node]);
      }
    }

    // Create conflicts for cycles
    for (const cycle of cycleNodes) {
      conflicts.push({
        type: 'circular_dependency',
        severity: 'error',
        message: `Circular dependency detected: ${cycle.join(' -> ')} -> ${cycle[0]}`,
        location: { nodeId: cycle[0] },
        details: {
          existing: cycle,
          suggestions: [
            `Remove one of the wires in the cycle`,
            `Use a different signal flow pattern`,
          ],
        },
      });
    }

    return conflicts;
  }

  /**
   * Detect broken references (wires pointing to non-existent nodes)
   */
  detectBrokenReferences(
    cartridge: Cartridge,
    patch: TopologyPatch,
    signalRegistry?: SignalRegistry
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    // Get all node IDs
    const nodeIds = new Set([
      ...cartridge.nodes.map(n => n.id),
      ...(patch.nodes || []).map(n => n.id),
    ]);

    // Check all wires
    const allWires = [...cartridge.wires, ...(patch.wires || [])];
    
    for (let i = 0; i < allWires.length; i++) {
      const wire = allWires[i];

      if (!nodeIds.has(wire.from)) {
        conflicts.push({
          type: 'missing_node_reference',
          severity: 'error',
          message: `Wire references non-existent source node: "${wire.from}"`,
          location: { wireIndex: i },
          details: {
            existing: wire,
            suggestions: [`Add node "${wire.from}" to the cartridge first`],
          },
        });
      }

      if (!nodeIds.has(wire.to)) {
        conflicts.push({
          type: 'missing_node_reference',
          severity: 'error',
          message: `Wire references non-existent target node: "${wire.to}"`,
          location: { wireIndex: i },
          details: {
            existing: wire,
            suggestions: [`Add node "${wire.to}" to the cartridge first`],
          },
        });
      }
    }

    // Check signal types if registry provided
    if (signalRegistry) {
      const signalTypes = new Set(signalRegistry.signals.map(s => s.type));

      for (let i = 0; i < allWires.length; i++) {
        const wire = allWires[i];

        if (!signalTypes.has(wire.signalType)) {
          conflicts.push({
            type: 'missing_signal_type',
            severity: 'warning',
            message: `Wire uses unregistered signal type: "${wire.signalType}"`,
            location: { wireIndex: i },
            details: {
              existing: wire,
              suggestions: [
                `Register signal "${wire.signalType}" in the signal registry`,
                `Use an existing registered signal type`,
              ],
            },
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Compare two JSON schemas for compatibility
   */
  private compareSchemas(
    existing: Record<string, unknown>,
    patch: Record<string, unknown>
  ): boolean {
    // Simple comparison - check if required fields match
    const existingRequired = new Set((existing.required as string[]) || []);
    const patchRequired = new Set((patch.required as string[]) || []);

    // Check if patch removes any required fields from existing
    for (const field of existingRequired) {
      if (!patchRequired.has(field)) {
        return true; // Conflict - required field removed
      }
    }

    return false; // No conflict
  }
}

// =============================================================================
// Exports
// =============================================================================

export default ConflictDetector;
