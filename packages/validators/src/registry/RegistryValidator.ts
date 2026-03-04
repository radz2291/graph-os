/**
 * RegistryValidator - Validates signal and composite registries
 * 
 * Ensures all signals and composites are properly registered
 * and referenced correctly in cartridges.
 * 
 * @module @graph-os/validators
 */

import { Cartridge, CartridgeValidationError, CartridgeValidationWarning } from '@graph-os/core';

/**
 * Signal registry entry.
 */
interface SignalRegistryEntry {
  type: string;
  namespace: string;
  action: string;
  description: string;
  payloadSchema?: Record<string, unknown>;
  emittedBy?: string[];
  consumedBy?: string[];
}

/**
 * Composite registry entry.
 */
interface CompositeRegistryEntry {
  id: string;
  name: string;
  description: string;
  path: string;
  nodeCount: number;
  wireCount?: number;
  inputs?: string[];
  outputs?: string[];
}

/**
 * Result of registry validation.
 */
export interface RegistryValidationResult {
  valid: boolean;
  errors: CartridgeValidationError[];
  warnings: CartridgeValidationWarning[];
  missingSignals: string[];
  missingComposites: string[];
}

/**
 * RegistryValidator validates signal and composite registries.
 */
export class RegistryValidator {
  private signalRegistry: Map<string, SignalRegistryEntry> = new Map();
  private compositeRegistry: Map<string, CompositeRegistryEntry> = new Map();

  /**
   * Loads a signal registry.
   */
  loadSignalRegistry(registry: SignalRegistryEntry[]): void {
    this.signalRegistry.clear();
    for (const entry of registry) {
      this.signalRegistry.set(entry.type, entry);
    }
  }

  /**
   * Loads a composite registry.
   */
  loadCompositeRegistry(registry: CompositeRegistryEntry[]): void {
    this.compositeRegistry.clear();
    for (const entry of registry) {
      this.compositeRegistry.set(entry.id, entry);
    }
  }

  /**
   * Validates a cartridge against registries.
   * 
   * @param cartridge - The cartridge to validate
   * @returns Validation result with errors and warnings
   */
  validate(cartridge: Cartridge): RegistryValidationResult {
    const errors: CartridgeValidationError[] = [];
    const warnings: CartridgeValidationWarning[] = [];
    const missingSignals: string[] = [];
    const missingComposites: string[] = [];

    // If registries are empty, skip validation
    if (this.signalRegistry.size === 0 && this.compositeRegistry.size === 0) {
      warnings.push({
        code: 'NO_REGISTRIES',
        message: 'No registries loaded. Skipping registry validation.',
        path: '',
      });
      return {
        valid: true,
        errors,
        warnings,
        missingSignals,
        missingComposites,
      };
    }

    // Check signal types in wires
    const wireSignals = new Set<string>();
    for (const wire of cartridge.wires || []) {
      wireSignals.add(wire.signalType);
    }

    for (const signalType of wireSignals) {
      if (signalType === '*') continue; // Wildcard is always valid

      if (this.signalRegistry.size > 0 && !this.signalRegistry.has(signalType)) {
        missingSignals.push(signalType);
        errors.push({
          code: 'UNREGISTERED_SIGNAL',
          message: `Signal type "${signalType}" is not registered`,
          path: 'wires',
          suggestion: `Register "${signalType}" in signal-registry.json`,
        });
      }
    }

    // Check signal types in ports
    for (const input of cartridge.inputs || []) {
      if (input.signalType !== '*' && 
          this.signalRegistry.size > 0 && 
          !this.signalRegistry.has(input.signalType)) {
        missingSignals.push(input.signalType);
        warnings.push({
          code: 'UNREGISTERED_PORT_SIGNAL',
          message: `Input port "${input.name}" uses unregistered signal type "${input.signalType}"`,
          path: `inputs.${input.name}`,
        });
      }
    }

    for (const output of cartridge.outputs || []) {
      if (output.signalType !== '*' && 
          this.signalRegistry.size > 0 && 
          !this.signalRegistry.has(output.signalType)) {
        missingSignals.push(output.signalType);
        warnings.push({
          code: 'UNREGISTERED_PORT_SIGNAL',
          message: `Output port "${output.name}" uses unregistered signal type "${output.signalType}"`,
          path: `outputs.${output.name}`,
        });
      }
    }

    // Check composite references (if any in node types)
    for (const node of cartridge.nodes || []) {
      if (node.type.startsWith('composite.')) {
        if (this.compositeRegistry.size > 0 && !this.compositeRegistry.has(node.type)) {
          missingComposites.push(node.type);
          errors.push({
            code: 'UNREGISTERED_COMPOSITE',
            message: `Composite "${node.type}" is not registered`,
            path: `nodes.${node.id}`,
            suggestion: `Register "${node.type}" in composite-registry.json`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      missingSignals,
      missingComposites,
    };
  }

  /**
   * Gets a signal entry from the registry.
   */
  getSignal(type: string): SignalRegistryEntry | undefined {
    return this.signalRegistry.get(type);
  }

  /**
   * Gets a composite entry from the registry.
   */
  getComposite(id: string): CompositeRegistryEntry | undefined {
    return this.compositeRegistry.get(id);
  }

  /**
   * Lists all registered signals.
   */
  listSignals(): SignalRegistryEntry[] {
    return Array.from(this.signalRegistry.values());
  }

  /**
   * Lists all registered composites.
   */
  listComposites(): CompositeRegistryEntry[] {
    return Array.from(this.compositeRegistry.values());
  }
}
