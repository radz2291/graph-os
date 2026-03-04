/**
 * SignalValidator - Validates signal naming conventions
 * 
 * Ensures signal names follow Graph-OS conventions:
 * - NAMESPACE.ACTION format
 * - No forbidden prefixes
 * - Proper naming structure
 * 
 * @module @graph-os/validators
 */

import { Cartridge, CartridgeValidationError, CartridgeValidationWarning } from '@graph-os/core';

/**
 * Forbidden signal prefixes.
 */
export const FORBIDDEN_PREFIXES = [
  'TEMP_',
  'TEST_',
  'DEBUG_',
  'INTERNAL_',
  '__',
];

/**
 * Reserved signal namespaces.
 */
export const RESERVED_NAMESPACES = [
  'SYSTEM',
  'GRAPH',
  'RUNTIME',
];

/**
 * Result of signal validation.
 */
export interface SignalValidationResult {
  valid: boolean;
  errors: CartridgeValidationError[];
  warnings: CartridgeValidationWarning[];
  signalTypes: string[];
  namespaces: string[];
}

/**
 * SignalValidator validates signal naming conventions.
 */
export class SignalValidator {
  /**
   * Validates signal names in a cartridge.
   * 
   * @param cartridge - The cartridge to validate
   * @returns Validation result with errors and warnings
   */
  validate(cartridge: Cartridge): SignalValidationResult {
    const errors: CartridgeValidationError[] = [];
    const warnings: CartridgeValidationWarning[] = [];
    const signalTypes = new Set<string>();
    const namespaces = new Set<string>();

    // Collect all signal types
    for (const wire of cartridge.wires || []) {
      if (wire.signalType !== '*') {
        signalTypes.add(wire.signalType);
      }
    }

    for (const input of cartridge.inputs || []) {
      if (input.signalType !== '*') {
        signalTypes.add(input.signalType);
      }
    }

    for (const output of cartridge.outputs || []) {
      if (output.signalType !== '*') {
        signalTypes.add(output.signalType);
      }
    }

    // Validate each signal type
    for (const signalType of signalTypes) {
      const result = this.validateSignalName(signalType);
      errors.push(...result.errors);
      warnings.push(...result.warnings);

      // Extract namespace
      const parts = signalType.split('.');
      if (parts.length >= 2) {
        namespaces.add(parts[0]);
      }
    }

    // Check for namespace conflicts
    for (const namespace of namespaces) {
      if (RESERVED_NAMESPACES.includes(namespace)) {
        warnings.push({
          code: 'RESERVED_NAMESPACE',
          message: `Namespace "${namespace}" is reserved for system use`,
          path: 'wires',
        });
      }
    }

    // Check for consistency in naming
    const actionNames = new Map<string, string[]>();
    for (const signalType of signalTypes) {
      const parts = signalType.split('.');
      if (parts.length >= 2) {
        const action = parts[1];
        const existing = actionNames.get(action) || [];
        existing.push(signalType);
        actionNames.set(action, existing);
      }
    }

    for (const [action, signals] of actionNames) {
      if (signals.length > 1) {
        const namespacesForAction = signals.map(s => s.split('.')[0]);
        const uniqueNamespaces = new Set(namespacesForAction);
        if (uniqueNamespaces.size > 1) {
          warnings.push({
            code: 'ACTION_NAME_REUSE',
            message: `Action "${action}" is used across multiple namespaces: ${Array.from(uniqueNamespaces).join(', ')}`,
            path: 'wires',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      signalTypes: Array.from(signalTypes),
      namespaces: Array.from(namespaces),
    };
  }

  /**
   * Validates a single signal name.
   */
  private validateSignalName(signalType: string): {
    errors: CartridgeValidationError[];
    warnings: CartridgeValidationWarning[];
  } {
    const errors: CartridgeValidationError[] = [];
    const warnings: CartridgeValidationWarning[] = [];

    // Check format
    if (!this.isValidSignalFormat(signalType)) {
      errors.push({
        code: 'INVALID_SIGNAL_FORMAT',
        message: `Signal "${signalType}" does not follow NAMESPACE.ACTION format`,
        suggestion: 'Use format: NAMESPACE.ACTION (e.g., "USER.LOGIN_REQUEST")',
      });
      return { errors, warnings };
    }

    const parts = signalType.split('.');
    const namespace = parts[0];
    const action = parts[1];

    // Check for forbidden prefixes
    for (const prefix of FORBIDDEN_PREFIXES) {
      if (namespace.startsWith(prefix) || action.startsWith(prefix)) {
        errors.push({
          code: 'FORBIDDEN_PREFIX',
          message: `Signal "${signalType}" uses forbidden prefix "${prefix}"`,
          suggestion: `Remove the "${prefix}" prefix from your signal name`,
        });
      }
    }

    // Check namespace conventions
    if (!/^[A-Z][A-Z0-9_]*$/.test(namespace)) {
      errors.push({
        code: 'INVALID_NAMESPACE',
        message: `Namespace "${namespace}" must be UPPER_SNAKE_CASE`,
        suggestion: 'Use uppercase letters, numbers, and underscores',
      });
    }

    // Check action conventions
    if (!/^[A-Z][A-Z0-9_]*$/.test(action)) {
      errors.push({
        code: 'INVALID_ACTION',
        message: `Action "${action}" must be UPPER_SNAKE_CASE`,
        suggestion: 'Use uppercase letters, numbers, and underscores',
      });
    }

    // Check for common issues
    if (namespace.length < 2) {
      warnings.push({
        code: 'SHORT_NAMESPACE',
        message: `Namespace "${namespace}" is very short. Consider a more descriptive name.`,
      });
    }

    if (action.endsWith('_REQUEST') || action.endsWith('_RESPONSE')) {
      // This is a common pattern, no warning needed
    } else if (action.endsWith('_SUCCESS') || action.endsWith('_FAILURE')) {
      // Also common pattern
    } else if (!action.includes('_')) {
      warnings.push({
        code: 'SIMPLE_ACTION_NAME',
        message: `Action "${action}" could be more descriptive. Consider adding context.`,
      });
    }

    return { errors, warnings };
  }

  /**
   * Checks if a signal type follows the NAMESPACE.ACTION format.
   */
  private isValidSignalFormat(signalType: string): boolean {
    return /^[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]*$/.test(signalType);
  }

  /**
   * Validates a signal name string.
   */
  isValidName(signalType: string): boolean {
    return this.isValidSignalFormat(signalType);
  }
}
