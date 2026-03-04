/**
 * SizeValidator - Validates cartridge size constraints
 * 
 * Ensures cartridges don't exceed size limits for:
 * - Node count (max 30)
 * - Wire count (max 50)
 * - Signal types (max 10)
 * - Top-level composites (max 7)
 * 
 * @module @graph-os/validators
 */

import { Cartridge, CartridgeValidationError, CartridgeValidationWarning } from '@graph-os/core';

/**
 * Size constraint limits.
 */
export const SIZE_LIMITS = {
  MAX_NODES: 30,
  MAX_WIRES: 50,
  MAX_SIGNAL_TYPES: 10,
  MAX_TOP_LEVEL_COMPOSITES: 7,
  MAX_SUBSYSTEM_COMPOSITES: 7,
  MAX_HIERARCHY_DEPTH: 10,
};

/**
 * Result of size validation.
 */
export interface SizeValidationResult {
  valid: boolean;
  errors: CartridgeValidationError[];
  warnings: CartridgeValidationWarning[];
  stats: {
    nodeCount: number;
    wireCount: number;
    signalTypeCount: number;
  };
}

/**
 * SizeValidator validates cartridge size constraints.
 */
export class SizeValidator {
  /**
   * Validates a cartridge against size constraints.
   * 
   * @param cartridge - The cartridge to validate
   * @returns Validation result with errors and warnings
   */
  validate(cartridge: Cartridge): SizeValidationResult {
    const errors: CartridgeValidationError[] = [];
    const warnings: CartridgeValidationWarning[] = [];

    // Count nodes
    const nodeCount = cartridge.nodes?.length || 0;
    if (nodeCount === 0) {
      errors.push({
        code: 'NO_NODES',
        message: 'Cartridge must have at least one node',
        path: 'nodes',
        suggestion: 'Add at least one node to your cartridge',
      });
    } else if (nodeCount > SIZE_LIMITS.MAX_NODES) {
      errors.push({
        code: 'TOO_MANY_NODES',
        message: `Cartridge has ${nodeCount} nodes, maximum is ${SIZE_LIMITS.MAX_NODES}`,
        path: 'nodes',
        suggestion: 'Split your cartridge into smaller composites',
      });
    } else if (nodeCount > SIZE_LIMITS.MAX_NODES * 0.8) {
      warnings.push({
        code: 'APPROACHING_NODE_LIMIT',
        message: `Cartridge has ${nodeCount} nodes, approaching limit of ${SIZE_LIMITS.MAX_NODES}`,
        path: 'nodes',
      });
    }

    // Count wires
    const wireCount = cartridge.wires?.length || 0;
    if (wireCount > SIZE_LIMITS.MAX_WIRES) {
      errors.push({
        code: 'TOO_MANY_WIRES',
        message: `Cartridge has ${wireCount} wires, maximum is ${SIZE_LIMITS.MAX_WIRES}`,
        path: 'wires',
        suggestion: 'Simplify your graph topology',
      });
    } else if (wireCount > SIZE_LIMITS.MAX_WIRES * 0.8) {
      warnings.push({
        code: 'APPROACHING_WIRE_LIMIT',
        message: `Cartridge has ${wireCount} wires, approaching limit of ${SIZE_LIMITS.MAX_WIRES}`,
        path: 'wires',
      });
    }

    // Count unique signal types
    const signalTypes = new Set<string>();
    cartridge.wires?.forEach(wire => signalTypes.add(wire.signalType));
    cartridge.inputs?.forEach(input => signalTypes.add(input.signalType));
    cartridge.outputs?.forEach(output => signalTypes.add(output.signalType));

    const signalTypeCount = signalTypes.size;
    if (signalTypeCount > SIZE_LIMITS.MAX_SIGNAL_TYPES) {
      errors.push({
        code: 'TOO_MANY_SIGNAL_TYPES',
        message: `Cartridge has ${signalTypeCount} signal types, maximum is ${SIZE_LIMITS.MAX_SIGNAL_TYPES}`,
        path: 'wires',
        suggestion: 'Reduce the number of unique signal types',
      });
    }

    // Check input port count
    const inputCount = cartridge.inputs?.length || 0;
    if (inputCount > 10) {
      errors.push({
        code: 'TOO_MANY_INPUTS',
        message: `Cartridge has ${inputCount} inputs, maximum is 10`,
        path: 'inputs',
      });
    }

    // Check output port count
    const outputCount = cartridge.outputs?.length || 0;
    if (outputCount > 10) {
      errors.push({
        code: 'TOO_MANY_OUTPUTS',
        message: `Cartridge has ${outputCount} outputs, maximum is 10`,
        path: 'outputs',
      });
    }

    // Check node ID length
    for (const node of cartridge.nodes || []) {
      if (node.id && node.id.length > 50) {
        errors.push({
          code: 'NODE_ID_TOO_LONG',
          message: `Node ID "${node.id}" exceeds 50 characters`,
          path: `nodes.${node.id}`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        nodeCount,
        wireCount,
        signalTypeCount,
      },
    };
  }
}
