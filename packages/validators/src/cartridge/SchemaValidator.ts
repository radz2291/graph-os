/**
 * SchemaValidator - Validates cartridge JSON structure
 * 
 * Validates cartridges against the JSON schema definition.
 * Checks for required fields, correct types, and format constraints.
 * 
 * @module @graph-os/validators
 */

import { Cartridge, CartridgeValidationError, CartridgeValidationWarning } from '@graph-os/core';

/**
 * Result of schema validation.
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: CartridgeValidationError[];
  warnings: CartridgeValidationWarning[];
}

/**
 * SchemaValidator validates cartridge structure.
 */
export class SchemaValidator {
  /**
   * Validates a cartridge against the schema.
   * 
   * @param cartridge - The cartridge to validate
   * @returns Validation result with errors and warnings
   */
  validate(cartridge: Cartridge): SchemaValidationResult {
    const errors: CartridgeValidationError[] = [];
    const warnings: CartridgeValidationWarning[] = [];

    // Validate version
    if (!cartridge.version) {
      errors.push({
        code: 'MISSING_VERSION',
        message: 'Cartridge must have a version field',
        path: 'version',
        suggestion: 'Add "version": "1.0.0" to your cartridge',
      });
    } else if (!this.isValidSemver(cartridge.version)) {
      errors.push({
        code: 'INVALID_VERSION',
        message: `Invalid version format: ${cartridge.version}`,
        path: 'version',
        suggestion: 'Use semver format (e.g., "1.0.0")',
      });
    }

    // Validate name
    if (!cartridge.name) {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Cartridge must have a name field',
        path: 'name',
        suggestion: 'Add a descriptive name to your cartridge',
      });
    } else if (!this.isValidName(cartridge.name)) {
      errors.push({
        code: 'INVALID_NAME',
        message: `Invalid cartridge name: ${cartridge.name}`,
        path: 'name',
        suggestion: 'Use kebab-case (lowercase letters, numbers, and hyphens)',
      });
    }

    // Validate description
    if (!cartridge.description) {
      warnings.push({
        code: 'MISSING_DESCRIPTION',
        message: 'Cartridge should have a description',
        path: 'description',
      });
    } else if (cartridge.description.length < 10) {
      warnings.push({
        code: 'SHORT_DESCRIPTION',
        message: 'Description is too short. Consider adding more detail.',
        path: 'description',
      });
    }

    // Validate nodes
    if (!Array.isArray(cartridge.nodes)) {
      errors.push({
        code: 'MISSING_NODES',
        message: 'Cartridge must have a nodes array',
        path: 'nodes',
        suggestion: 'Add a "nodes" array with at least one node definition',
      });
    } else {
      this.validateNodes(cartridge, errors, warnings);
    }

    // Validate wires
    if (!Array.isArray(cartridge.wires)) {
      errors.push({
        code: 'MISSING_WIRES',
        message: 'Cartridge must have a wires array',
        path: 'wires',
        suggestion: 'Add a "wires" array (can be empty)',
      });
    } else {
      this.validateWires(cartridge, errors, warnings);
    }

    // Validate inputs
    if (cartridge.inputs) {
      this.validatePorts(cartridge.inputs, 'inputs', errors, warnings);
    }

    // Validate outputs
    if (cartridge.outputs) {
      this.validatePorts(cartridge.outputs, 'outputs', errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates node definitions.
   */
  private validateNodes(
    cartridge: Cartridge,
    errors: CartridgeValidationError[],
    warnings: CartridgeValidationWarning[]
  ): void {
    const nodeIds = new Set<string>();

    for (let i = 0; i < cartridge.nodes.length; i++) {
      const node = cartridge.nodes[i];
      const nodePath = `nodes[${i}]`;

      // Check required fields
      if (!node.id) {
        errors.push({
          code: 'MISSING_NODE_ID',
          message: `Node at index ${i} is missing an id`,
          path: nodePath,
        });
      } else {
        if (nodeIds.has(node.id)) {
          errors.push({
            code: 'DUPLICATE_NODE_ID',
            message: `Duplicate node id: ${node.id}`,
            path: `${nodePath}.id`,
          });
        }
        nodeIds.add(node.id);

        if (!this.isValidNodeId(node.id)) {
          errors.push({
            code: 'INVALID_NODE_ID',
            message: `Invalid node id format: ${node.id}`,
            path: `${nodePath}.id`,
            suggestion: 'Use kebab-case (lowercase letters, numbers, and hyphens)',
          });
        }
      }

      if (!node.type) {
        errors.push({
          code: 'MISSING_NODE_TYPE',
          message: `Node ${node.id || i} is missing a type`,
          path: `${nodePath}.type`,
        });
      } else if (!this.isValidNodeType(node.type)) {
        errors.push({
          code: 'INVALID_NODE_TYPE',
          message: `Invalid node type format: ${node.type}`,
          path: `${nodePath}.type`,
          suggestion: 'Use format: category.subtype (e.g., "logic.validate")',
        });
      }

      if (!node.description) {
        warnings.push({
          code: 'MISSING_NODE_DESCRIPTION',
          message: `Node ${node.id || i} should have a description`,
          path: `${nodePath}.description`,
        });
      }

      if (node.config === undefined) {
        warnings.push({
          code: 'MISSING_NODE_CONFIG',
          message: `Node ${node.id || i} should have a config object`,
          path: `${nodePath}.config`,
        });
      }
    }
  }

  /**
   * Validates wire definitions.
   */
  private validateWires(
    cartridge: Cartridge,
    errors: CartridgeValidationError[],
    warnings: CartridgeValidationWarning[]
  ): void {
    const nodeIds = new Set(cartridge.nodes.map(n => n.id));

    for (let i = 0; i < cartridge.wires.length; i++) {
      const wire = cartridge.wires[i];
      const wirePath = `wires[${i}]`;

      if (!wire.from) {
        errors.push({
          code: 'MISSING_WIRE_FROM',
          message: `Wire at index ${i} is missing a "from" field`,
          path: wirePath,
        });
      } else if (!nodeIds.has(wire.from)) {
        errors.push({
          code: 'UNKNOWN_WIRE_SOURCE',
          message: `Wire references unknown source node: ${wire.from}`,
          path: `${wirePath}.from`,
        });
      }

      if (!wire.to) {
        errors.push({
          code: 'MISSING_WIRE_TO',
          message: `Wire at index ${i} is missing a "to" field`,
          path: wirePath,
        });
      } else if (!nodeIds.has(wire.to)) {
        errors.push({
          code: 'UNKNOWN_WIRE_TARGET',
          message: `Wire references unknown target node: ${wire.to}`,
          path: `${wirePath}.to`,
        });
      }

      if (!wire.signalType) {
        errors.push({
          code: 'MISSING_SIGNAL_TYPE',
          message: `Wire at index ${i} is missing a signalType`,
          path: `${wirePath}.signalType`,
        });
      } else if (!this.isValidSignalType(wire.signalType)) {
        errors.push({
          code: 'INVALID_SIGNAL_TYPE',
          message: `Invalid signal type format: ${wire.signalType}`,
          path: `${wirePath}.signalType`,
          suggestion: 'Use format: NAMESPACE.ACTION (e.g., "USER.LOGIN")',
        });
      }
    }
  }

  /**
   * Validates port definitions.
   */
  private validatePorts(
    ports: Array<{ name: string; signalType: string; description: string }>,
    path: string,
    errors: CartridgeValidationError[],
    warnings: CartridgeValidationWarning[]
  ): void {
    const portNames = new Set<string>();

    for (let i = 0; i < ports.length; i++) {
      const port = ports[i];
      const portPath = `${path}[${i}]`;

      if (!port.name) {
        errors.push({
          code: 'MISSING_PORT_NAME',
          message: `Port at index ${i} is missing a name`,
          path: portPath,
        });
      } else if (portNames.has(port.name)) {
        errors.push({
          code: 'DUPLICATE_PORT_NAME',
          message: `Duplicate port name: ${port.name}`,
          path: `${portPath}.name`,
        });
      } else {
        portNames.add(port.name);
      }

      if (!port.signalType) {
        errors.push({
          code: 'MISSING_PORT_SIGNAL_TYPE',
          message: `Port ${port.name || i} is missing a signalType`,
          path: `${portPath}.signalType`,
        });
      }

      if (!port.description) {
        warnings.push({
          code: 'MISSING_PORT_DESCRIPTION',
          message: `Port ${port.name || i} should have a description`,
          path: `${portPath}.description`,
        });
      }
    }
  }

  /**
   * Validates semver format.
   */
  private isValidSemver(version: string): boolean {
    return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(version);
  }

  /**
   * Validates cartridge name format.
   */
  private isValidName(name: string): boolean {
    return /^[a-z][a-z0-9-]{0,99}$/.test(name);
  }

  /**
   * Validates node ID format.
   */
  private isValidNodeId(id: string): boolean {
    return /^[a-z][a-z0-9-]{0,49}$/.test(id);
  }

  /**
   * Validates node type format.
   */
  private isValidNodeType(type: string): boolean {
    return /^[a-z][a-z0-9-]*\.[a-z][a-z0-9.-]+$/.test(type);
  }

  /**
   * Validates signal type format.
   */
  private isValidSignalType(type: string): boolean {
    if (type === '*') return true;
    return /^[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]*$/.test(type);
  }
}
