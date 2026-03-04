/**
 * ValidatorNode - Validates signal payloads against a schema
 * 
 * This node validates incoming signal payloads against a JSON schema.
 * On success, it emits a VALIDATION.SUCCESS signal.
 * On failure, it emits a VALIDATION.FAILURE signal with error details.
 * 
 * @module @graph-os/runtime
 */

import { BaseNode, Signal, NodeConfig } from '@graph-os/core';

/**
 * Configuration for ValidatorNode.
 */
interface ValidatorConfig extends NodeConfig {
  /** JSON schema for validation */
  schema?: Record<string, unknown>;
  /** Signal type to emit on success */
  successSignalType?: string;
  /** Signal type to emit on failure */
  failureSignalType?: string;
}

/**
 * Detailed error object for validation failures.
 */
export interface ValidationErrorDetail {
  field: string;
  constraint: string;
  expected?: unknown;
  actual?: unknown;
  message: string;
}

/**
 * ValidatorNode validates signal payloads.
 */
export class ValidatorNode extends BaseNode {
  type = 'logic.validate';
  private schema: Record<string, unknown>;
  private successSignalType: string;
  private failureSignalType: string;

  constructor(id: string, config: ValidatorConfig) {
    super(id, config);
    this.schema = config.schema || {};
    this.successSignalType = config.successSignalType || 'VALIDATION.SUCCESS';
    this.failureSignalType = config.failureSignalType || 'VALIDATION.FAILURE';
  }

  async process(signal: Signal): Promise<Signal | null> {
    const payload = signal.payload as Record<string, unknown>;
    const validatedAt = new Date().toISOString();

    try {
      const errors = this.validateAgainstSchema(payload, this.schema);
      const isValid = errors.length === 0;

      if (isValid) {
        return this.createOutputSignal(this.successSignalType, {
          originalPayload: payload,
          validatedAt,
        });
      } else {
        return this.createOutputSignal(this.failureSignalType, {
          originalPayload: payload,
          validatedAt,
          errors,
        });
      }
    } catch (error) {
      return this.createOutputSignal(this.failureSignalType, {
        originalPayload: payload,
        validatedAt,
        errors: [{
          field: 'schema',
          constraint: 'internal',
          message: error instanceof Error ? error.message : String(error)
        }],
      });
    }
  }

  /**
   * Validates a payload against a schema.
   * Returns an array of error objects. Empty array means valid.
   */
  private validateAgainstSchema(
    payload: Record<string, unknown>,
    schema: Record<string, unknown>
  ): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = [];
    const required = schema['required'] as string[] | undefined;
    const properties = schema['properties'] as Record<string, unknown> | undefined;

    if (!properties) {
      return errors; // No schema properties to validate against
    }

    // Check required fields
    if (required && Array.isArray(required)) {
      for (const field of required) {
        if (!(field in payload)) {
          errors.push({
            field,
            constraint: 'required',
            message: `Missing required field: '${field}'`
          });
        }
      }
    }

    // Check types and constraints for each property
    for (const [key, propSchema] of Object.entries(properties)) {
      if (key in payload) {
        const value = payload[key];
        const propDef = propSchema as Record<string, unknown>;
        const expectedType = propDef['type'] as string;

        if (expectedType && !this.checkType(value, expectedType)) {
          errors.push({
            field: key,
            constraint: 'type',
            expected: expectedType,
            actual: typeof value,
            message: `Field '${key}' expects type '${expectedType}', but received '${typeof value}'`
          });
          continue;
        }

        // Apply advanced validation constraints
        if (expectedType === 'string' && typeof value === 'string') {
          if (typeof propDef.minLength === 'number' && value.length < propDef.minLength) {
            errors.push({
              field: key,
              constraint: 'minLength',
              expected: propDef.minLength,
              actual: value.length,
              message: `Field '${key}' length (${value.length}) is less than minimum allowed length (${propDef.minLength}).`
            });
          }
          if (typeof propDef.maxLength === 'number' && value.length > propDef.maxLength) {
            errors.push({
              field: key,
              constraint: 'maxLength',
              expected: propDef.maxLength,
              actual: value.length,
              message: `Field '${key}' length (${value.length}) exceeds maximum allowed length (${propDef.maxLength}).`
            });
          }
          if (typeof propDef.pattern === 'string') {
            try {
              const regex = new RegExp(propDef.pattern);
              if (!regex.test(value)) {
                errors.push({
                  field: key,
                  constraint: 'pattern',
                  expected: propDef.pattern,
                  actual: value,
                  message: `Field '${key}' does not match required pattern: ${propDef.pattern}`
                });
              }
            } catch (e) {
              errors.push({
                field: key,
                constraint: 'pattern',
                expected: propDef.pattern,
                message: `Field '${key}' has invalid regex pattern in schema (${propDef.pattern}).`
              });
            }
          }
        }

        if ((expectedType === 'number' || expectedType === 'integer') && typeof value === 'number') {
          if (typeof propDef.minimum === 'number' && value < propDef.minimum) {
            errors.push({
              field: key,
              constraint: 'minimum',
              expected: propDef.minimum,
              actual: value,
              message: `Field '${key}' value (${value}) is less than minimum allowed value (${propDef.minimum}).`
            });
          }
          if (typeof propDef.maximum === 'number' && value > propDef.maximum) {
            errors.push({
              field: key,
              constraint: 'maximum',
              expected: propDef.maximum,
              actual: value,
              message: `Field '${key}' value (${value}) exceeds maximum allowed value (${propDef.maximum}).`
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Checks if a value matches the expected type.
   */
  private checkType(value: unknown, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'integer':
        return typeof value === 'number' && Number.isInteger(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      case 'null':
        return value === null;
      default:
        return true;
    }
  }
}
