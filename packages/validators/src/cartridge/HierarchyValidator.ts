/**
 * HierarchyValidator - Validates cartridge hierarchy constraints
 * 
 * Ensures cartridges don't have:
 * - Circular dependencies
 * - Excessive nesting depth
 * - Invalid composite references
 * 
 * @module @graph-os/validators
 */

import { Cartridge, CartridgeValidationError, CartridgeValidationWarning } from '@graph-os/core';
import { SIZE_LIMITS } from './SizeValidator';

/**
 * Result of hierarchy validation.
 */
export interface HierarchyValidationResult {
  valid: boolean;
  errors: CartridgeValidationError[];
  warnings: CartridgeValidationWarning[];
  cycles: string[][];
  depth: number;
}

/**
 * HierarchyValidator validates cartridge hierarchy.
 */
export class HierarchyValidator {
  /**
   * Validates a cartridge for hierarchy issues.
   * 
   * @param cartridge - The cartridge to validate
   * @returns Validation result with errors and warnings
   */
  validate(cartridge: Cartridge): HierarchyValidationResult {
    const errors: CartridgeValidationError[] = [];
    const warnings: CartridgeValidationWarning[] = [];

    // Build adjacency list
    const adjacencyList = this.buildAdjacencyList(cartridge);

    // Detect cycles
    const cycles = this.detectCycles(adjacencyList);
    if (cycles.length > 0) {
      for (const cycle of cycles) {
        errors.push({
          code: 'CIRCULAR_DEPENDENCY',
          message: `Circular dependency detected: ${cycle.join(' -> ')}`,
          path: 'wires',
          suggestion: 'Remove or restructure wires to eliminate the cycle',
        });
      }
    }

    // Calculate depth
    const depth = this.calculateDepth(adjacencyList);
    if (depth > SIZE_LIMITS.MAX_HIERARCHY_DEPTH) {
      errors.push({
        code: 'HIERARCHY_TOO_DEEP',
        message: `Graph depth is ${depth}, maximum is ${SIZE_LIMITS.MAX_HIERARCHY_DEPTH}`,
        path: 'wires',
        suggestion: 'Flatten your graph structure',
      });
    } else if (depth > SIZE_LIMITS.MAX_HIERARCHY_DEPTH - 1) {
      warnings.push({
        code: 'APPROACHING_DEPTH_LIMIT',
        message: `Graph depth is ${depth}, approaching limit of ${SIZE_LIMITS.MAX_HIERARCHY_DEPTH}`,
        path: 'wires',
      });
    }

    // Check for orphaned nodes
    const orphanedNodes = this.findOrphanedNodes(cartridge, adjacencyList);
    if (orphanedNodes.length > 0) {
      warnings.push({
        code: 'ORPHANED_NODES',
        message: `Found orphaned nodes: ${orphanedNodes.join(', ')}`,
        path: 'nodes',
      });
    }

    // Check for disconnected components
    const components = this.findConnectedComponents(cartridge, adjacencyList);
    if (components.length > 1) {
      warnings.push({
        code: 'DISCONNECTED_COMPONENTS',
        message: `Graph has ${components.length} disconnected components`,
        path: 'wires',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      cycles,
      depth,
    };
  }

  /**
   * Builds an adjacency list from the cartridge.
   */
  private buildAdjacencyList(cartridge: Cartridge): Map<string, Set<string>> {
    const adjacencyList = new Map<string, Set<string>>();

    // Initialize all nodes
    for (const node of cartridge.nodes || []) {
      adjacencyList.set(node.id, new Set());
    }

    // Add edges
    for (const wire of cartridge.wires || []) {
      const targets = adjacencyList.get(wire.from);
      if (targets) {
        targets.add(wire.to);
      }
    }

    return adjacencyList;
  }

  /**
   * Detects cycles in the graph using DFS.
   */
  private detectCycles(adjacencyList: Map<string, Set<string>>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = adjacencyList.get(node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (dfs(neighbor, [...path, neighbor])) {
              return true;
            }
          } else if (recursionStack.has(neighbor)) {
            // Found a cycle
            const cycleStart = path.indexOf(neighbor);
            if (cycleStart !== -1) {
              cycles.push([...path.slice(cycleStart), neighbor]);
            }
          }
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of adjacencyList.keys()) {
      if (!visited.has(node)) {
        dfs(node, [node]);
      }
    }

    return cycles;
  }

  /**
   * Calculates the maximum depth of the graph.
   */
  private calculateDepth(adjacencyList: Map<string, Set<string>>): number {
    const visited = new Set<string>();
    let maxDepth = 0;

    const dfs = (node: string, depth: number): void => {
      visited.add(node);
      maxDepth = Math.max(maxDepth, depth);

      const neighbors = adjacencyList.get(node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            dfs(neighbor, depth + 1);
          }
        }
      }
    };

    // Find root nodes (nodes with no incoming edges)
    const hasIncoming = new Set<string>();
    for (const neighbors of adjacencyList.values()) {
      for (const neighbor of neighbors) {
        hasIncoming.add(neighbor);
      }
    }

    const roots = Array.from(adjacencyList.keys()).filter(n => !hasIncoming.has(n));

    // Start DFS from root nodes
    for (const root of roots.length > 0 ? roots : adjacencyList.keys()) {
      if (!visited.has(root)) {
        dfs(root, 1);
      }
    }

    return maxDepth;
  }

  /**
   * Finds orphaned nodes (no incoming or outgoing edges).
   */
  private findOrphanedNodes(
    cartridge: Cartridge,
    adjacencyList: Map<string, Set<string>>
  ): string[] {
    const connected = new Set<string>();

    // Add all nodes with edges
    for (const [from, targets] of adjacencyList) {
      if (targets.size > 0) {
        connected.add(from);
        for (const to of targets) {
          connected.add(to);
        }
      }
    }

    // Find nodes not in connected set
    return (cartridge.nodes || [])
      .map(n => n.id)
      .filter(id => !connected.has(id));
  }

  /**
   * Finds connected components in the graph.
   */
  private findConnectedComponents(
    cartridge: Cartridge,
    adjacencyList: Map<string, Set<string>>
  ): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];

    // Build undirected adjacency list
    const undirected = new Map<string, Set<string>>();
    for (const node of cartridge.nodes || []) {
      undirected.set(node.id, new Set());
    }

    for (const [from, targets] of adjacencyList) {
      for (const to of targets) {
        undirected.get(from)?.add(to);
        undirected.get(to)?.add(from);
      }
    }

    const dfs = (node: string, component: string[]): void => {
      visited.add(node);
      component.push(node);

      const neighbors = undirected.get(node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            dfs(neighbor, component);
          }
        }
      }
    };

    for (const node of cartridge.nodes || []) {
      if (!visited.has(node.id)) {
        const component: string[] = [];
        dfs(node.id, component);
        components.push(component);
      }
    }

    return components;
  }
}
