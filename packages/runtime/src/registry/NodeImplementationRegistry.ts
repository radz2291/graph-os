/**
 * Node Implementation Registry
 * 
 * Central registry for node implementations used by both runtime and testing.
 * This ensures consistency and enables extensibility for custom nodes.
 * 
 * @module @graph-os/runtime
 */

import type { Signal } from '@graph-os/core';

/**
 * Configuration for a node
 */
export type NodeConfig = Record<string, unknown>;

/**
 * Result of node processing
 */
export type NodeProcessResult = Signal | Signal[] | null;

/**
 * Interface for node implementations
 */
export interface NodeImplementation {
  /** Node type identifier (e.g., 'logic.transform') */
  readonly type: string;

  /** Human-readable description */
  readonly description?: string;

  /**
   * Process a signal and return output signal(s)
   * 
   * @param signal - Input signal
   * @param config - Node configuration
   * @param nodeId - Node instance ID
   * @returns Output signal(s) or null
   */
  process(
    signal: Signal,
    config: NodeConfig,
    nodeId: string
  ): Promise<NodeProcessResult>;

  /**
   * Validate node configuration (optional)
   * Returns error message if invalid, null if valid
   */
  validateConfig?(config: NodeConfig): string | null;

  /**
   * Get expected output signal types for given config (optional)
   */
  getOutputSignalTypes?(config: NodeConfig): string[];
}

/**
 * Node implementation constructor type
 */
export type NodeImplementationConstructor = new () => NodeImplementation;

/**
 * Registry for node implementations
 */
export class NodeImplementationRegistry {
  private implementations: Map<string, NodeImplementation> = new Map();
  private aliases: Map<string, string> = new Map();

  /**
   * Register a node implementation
   */
  register(implementation: NodeImplementation): void {
    if (this.implementations.has(implementation.type)) {
      console.warn(`Overwriting existing node implementation: ${implementation.type}`);
    }
    this.implementations.set(implementation.type, implementation);
  }

  /**
   * Register an alias for a node type
   */
  registerAlias(alias: string, targetType: string): void {
    this.aliases.set(alias, targetType);
  }

  /**
   * Get a node implementation by type
   */
  get(type: string): NodeImplementation | undefined {
    // Check direct implementation
    const impl = this.implementations.get(type);
    if (impl) return impl;

    // Check aliases
    const aliasedType = this.aliases.get(type);
    if (aliasedType) {
      return this.implementations.get(aliasedType);
    }

    return undefined;
  }

  /**
   * Check if a node type is registered
   */
  has(type: string): boolean {
    return this.implementations.has(type) || this.aliases.has(type);
  }

  /**
   * List all registered node types
   */
  list(): string[] {
    return Array.from(this.implementations.keys());
  }

  /**
   * Get all implementations with descriptions
   */
  listWithDescriptions(): Array<{ type: string; description?: string }> {
    return Array.from(this.implementations.values()).map(impl => ({
      type: impl.type,
      description: impl.description
    }));
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.implementations.clear();
    this.aliases.clear();
  }

  /**
   * Create a processor function for a node type
   */
  createProcessor(type: string, config: NodeConfig, nodeId: string): {
    process: (signal: Signal) => Promise<NodeProcessResult>;
    error?: string;
  } {
    const implementation = this.get(type);

    if (!implementation) {
      const availableTypes = this.list().join(', ');
      return {
        process: async () => null,
        error: `Unknown node type: "${type}". Available types: ${availableTypes}. ` +
          `To use custom nodes, register them with NodeImplementationRegistry.register()`
      };
    }

    // Validate config if implementation supports it
    if (implementation.validateConfig) {
      const configError = implementation.validateConfig(config);
      if (configError) {
        return {
          process: async () => null,
          error: `Invalid config for ${type}: ${configError}`
        };
      }
    }

    return {
      process: async (signal: Signal) => {
        return implementation.process(signal, config, nodeId);
      }
    };
  }
}

// Global registry instance
export const globalNodeRegistry = new NodeImplementationRegistry();

// ============================================================
// Built-in Node Implementations
// ============================================================

/**
 * Transform Node - Transforms signal payloads
 */
export class TransformNodeImplementation implements NodeImplementation {
  readonly type = 'logic.transform';
  readonly description = 'Transforms signal payloads according to mapping rules';

  async process(signal: Signal, config: NodeConfig, nodeId: string): Promise<NodeProcessResult> {
    const outputType = (config.outputSignalType as string) || `${signal.type}.TRANSFORMED`;
    const rules = (config.rules as Array<{ from: string; to: string; transform?: string }>) || [];
    const includeUnmatched = config.includeUnmatched ?? true;
    const payload = signal.payload as Record<string, unknown>;
    const transformed: Record<string, unknown> = includeUnmatched ? JSON.parse(JSON.stringify(payload)) : {};

    try {
      for (const rule of rules) {
        // Read from accumulating state first
        let value = rule.from ? this.getNestedValue(transformed, rule.from) : transformed;

        // Unbox primitives automatically if an empty path targets a wrapped payload
        if (!rule.from && value && typeof value === 'object' && 'value' in value && Object.keys(value).length === 1) {
          value = (value as any).value;
        }

        // Root fallback
        if (value === undefined || (typeof value === 'object' && Object.keys(value as any).length === 0 && !rule.from)) {
          value = rule.from ? this.getNestedValue(payload, rule.from) : payload;
        }

        if (value !== undefined) {
          let transformedValue = value;

          if (rule.transform === 'uppercase' && typeof value === 'string') {
            transformedValue = value.toUpperCase();
          } else if (rule.transform === 'lowercase' && typeof value === 'string') {
            transformedValue = value.toLowerCase();
          } else if (rule.transform === 'number' && typeof value === 'string') {
            transformedValue = parseFloat(value) || 0;
          } else if (rule.transform === 'string') {
            transformedValue = String(value);
          } else if (rule.transform === 'boolean') {
            transformedValue = Boolean(value);
          } else if (rule.transform === 'json') {
            transformedValue = JSON.stringify(value);
          } else if (['multiply', 'add', 'subtract', 'divide'].includes(rule.transform as string)) {
            const numValue = Number(value);
            if (isNaN(numValue)) throw new Error(`Mathematical operation requires a numerical value`);

            const anyRule = rule as any;
            const operand = anyRule.factor !== undefined ? anyRule.factor : anyRule.value;
            if (operand === undefined || isNaN(Number(operand))) {
              throw new Error(`Mathematical operation requires a 'factor' or 'value' configuration property.`);
            }

            switch (rule.transform) {
              case 'multiply': transformedValue = numValue * operand; break;
              case 'add': transformedValue = numValue + operand; break;
              case 'subtract': transformedValue = numValue - operand; break;
              case 'divide':
                if (operand === 0) throw new Error("Division by zero in TransformerNode.");
                transformedValue = numValue / operand;
                break;
            }
          }

          if (!rule.to) {
            if (typeof transformedValue === 'object' && transformedValue !== null) {
              Object.assign(transformed, transformedValue);
            } else {
              transformed['value'] = transformedValue;
            }
          } else {
            this.setNestedValue(transformed, rule.to, transformedValue);
          }
        }
      }

      return {
        type: outputType,
        payload: transformed,
        timestamp: new Date(),
        sourceNodeId: nodeId,
      };
    } catch (e) {
      return {
        type: `${outputType}.FAILURE`,
        payload: {
          error: e instanceof Error ? e.message : String(e),
          originalPayload: payload
        },
        timestamp: new Date(),
        sourceNodeId: nodeId,
      };
    };
  }
  private getNestedValue(obj: Record<string, unknown>, path?: string): unknown {
    if (!path) return obj;
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    if (!path) return;
    const parts = path.split('.');
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }

  getOutputSignalTypes(config: NodeConfig): string[] {
    return [config.outputSignalType as string || 'DATA.TRANSFORMED'];
  }
}

/**
 * Validate Node - Validates signal payloads
 */
export class ValidateNodeImplementation implements NodeImplementation {
  readonly type = 'logic.validate';
  readonly description = 'Validates signal payloads against a schema';

  async process(signal: Signal, config: NodeConfig, nodeId: string): Promise<NodeProcessResult> {
    const successType = (config.successSignalType as string) || 'VALIDATION.SUCCESS';
    const failureType = (config.failureSignalType as string) || 'VALIDATION.FAILURE';
    const schema = config.schema as Record<string, unknown> | undefined;

    const payload = signal.payload as Record<string, unknown>;
    const errors: Array<{ field: string; constraint: string; expected?: unknown; actual?: unknown; message: string }> = [];

    // Check required fields
    const required = schema?.required as string[] | undefined;
    if (required) {
      for (const field of required) {
        if (!(field in payload) || payload[field] === undefined) {
          errors.push({
            field,
            constraint: 'required',
            message: `Missing required field: ${field}`
          });
        }
      }
    }

    // Check type constraints
    const properties = schema?.properties as Record<string, Record<string, unknown>> | undefined;
    if (properties) {
      for (const [field, constraints] of Object.entries(properties)) {
        const value = payload[field];
        if (value !== undefined) {
          // Type check
          if (constraints.type === 'string' && typeof value !== 'string') {
            errors.push({ field, constraint: 'type', expected: 'string', actual: typeof value, message: `Field "${field}" must be a string` });
          } else if (constraints.type === 'number' && typeof value !== 'number') {
            errors.push({ field, constraint: 'type', expected: 'number', actual: typeof value, message: `Field "${field}" must be a number` });
          } else if (constraints.type === 'boolean' && typeof value !== 'boolean') {
            errors.push({ field, constraint: 'type', expected: 'boolean', actual: typeof value, message: `Field "${field}" must be a boolean` });
          } else if (constraints.type === 'array' && !Array.isArray(value)) {
            errors.push({ field, constraint: 'type', expected: 'array', actual: typeof value, message: `Field "${field}" must be an array` });
          }

          // Min length
          if (constraints.minLength && typeof value === 'string' && value.length < (constraints.minLength as number)) {
            errors.push({ field, constraint: 'minLength', expected: constraints.minLength, actual: value.length, message: `Field "${field}" must be at least ${constraints.minLength} characters` });
          }

          // Max length
          if (constraints.maxLength && typeof value === 'string' && value.length > (constraints.maxLength as number)) {
            errors.push({ field, constraint: 'maxLength', expected: constraints.maxLength, actual: value.length, message: `Field "${field}" must be at most ${constraints.maxLength} characters` });
          }

          // Min value
          if (constraints.minimum && typeof value === 'number' && value < (constraints.minimum as number)) {
            errors.push({ field, constraint: 'minimum', expected: constraints.minimum, actual: value, message: `Field "${field}" value must be at least ${constraints.minimum}` });
          }

          // Max value
          if (constraints.maximum && typeof value === 'number' && value > (constraints.maximum as number)) {
            errors.push({ field, constraint: 'maximum', expected: constraints.maximum, actual: value, message: `Field "${field}" value must be at most ${constraints.maximum}` });
          }

          // Pattern
          if (constraints.pattern && typeof value === 'string') {
            const regex = new RegExp(constraints.pattern as string);
            if (!regex.test(value)) {
              errors.push({ field, constraint: 'pattern', expected: constraints.pattern, actual: value, message: `Field "${field}" does not match pattern: ${constraints.pattern}` });
            }
          }

          // Format (email)
          if (constraints.format === 'email' && typeof value === 'string') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              errors.push({ field, constraint: 'format', expected: 'email', actual: value, message: `Field "${field}" must be a valid email` });
            }
          }
        }
      }
    }

    const validatedAt = new Date().toISOString();

    if (errors.length > 0) {
      return {
        type: failureType,
        payload: {
          errors,
          originalPayload: payload,
          validatedAt
        },
        timestamp: new Date(),
        sourceNodeId: nodeId,
      };
    }

    return {
      type: successType,
      payload: {
        ...payload,
        validatedAt
      },
      timestamp: new Date(),
      sourceNodeId: nodeId,
    };
  }

  getOutputSignalTypes(config: NodeConfig): string[] {
    return [
      config.successSignalType as string || 'VALIDATION.SUCCESS',
      config.failureSignalType as string || 'VALIDATION.FAILURE'
    ];
  }
}

/**
 * Input Node - Entry point for external signals
 */
export class InputNodeImplementation implements NodeImplementation {
  readonly type = 'control.input';
  readonly description = 'Entry point for external signals';

  async process(signal: Signal, config: NodeConfig, nodeId: string): Promise<NodeProcessResult> {
    const outputType = (config.outputSignalType as string) || 'INPUT.SUBMITTED';
    return {
      type: outputType,
      payload: signal.payload,
      timestamp: new Date(),
      sourceNodeId: nodeId,
    };
  }

  getOutputSignalTypes(config: NodeConfig): string[] {
    return [config.outputSignalType as string || 'INPUT.SUBMITTED'];
  }
}

/**
 * Display Node - Outputs signals (console, logging)
 */
export class DisplayNodeImplementation implements NodeImplementation {
  readonly type = 'control.display';
  readonly description = 'Outputs signals to console or logs';

  async process(signal: Signal, config: NodeConfig, nodeId: string): Promise<NodeProcessResult> {
    const format = (config.format as string) || 'json';
    const prefix = (config.prefix as string) || '';

    let output: string;
    if (format === 'json') {
      output = JSON.stringify(signal.payload, null, 2);
    } else if (format === 'yaml') {
      // Simple YAML-like output
      output = Object.entries(signal.payload as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join('\n');
    } else {
      output = String(signal.payload);
    }

    console.log(prefix + output);

    // Display nodes don't emit signals
    return null;
  }
}

/**
 * API Client Node - Makes HTTP requests
 */
export class ApiClientNodeImplementation implements NodeImplementation {
  readonly type = 'infra.api.client';
  readonly description = 'Makes HTTP API requests';

  async process(signal: Signal, config: NodeConfig, nodeId: string): Promise<NodeProcessResult> {
    const successType = (config.successSignalType as string) || 'API.SUCCESS';
    const failureType = (config.failureSignalType as string) || 'API.FAILURE';

    // In test/development mode, return mock response
    const mockResponse = config.mockResponse as Record<string, unknown> | undefined;
    if (mockResponse) {
      return {
        type: successType,
        payload: mockResponse,
        timestamp: new Date(),
        sourceNodeId: nodeId,
      };
    }

    // For real implementation, would use fetch
    // This is a placeholder for the actual implementation
    return {
      type: successType,
      payload: {
        message: 'API call simulated',
        requestPayload: signal.payload,
        config: {
          url: config.url,
          method: config.method || 'GET'
        }
      },
      timestamp: new Date(),
      sourceNodeId: nodeId,
    };
  }
}

/**
 * Storage Node - Local storage operations
 */
export class StorageNodeImplementation implements NodeImplementation {
  readonly type = 'infra.storage.local';
  readonly description = 'Local storage operations';

  async process(signal: Signal, config: NodeConfig, nodeId: string): Promise<NodeProcessResult> {
    const operation = (config.operation as string) || 'read';
    const key = (config.key as string) || 'data';
    const successType = (config.successSignalType as string) || 'STORAGE.SUCCESS';

    // In-memory storage for testing
    const storage: Record<string, unknown> = {};

    if (operation === 'write' || operation === 'save') {
      storage[key] = signal.payload;
      return {
        type: successType,
        payload: { key, saved: true },
        timestamp: new Date(),
        sourceNodeId: nodeId,
      };
    }

    // Read operation
    return {
      type: successType,
      payload: storage[key] || null,
      timestamp: new Date(),
      sourceNodeId: nodeId,
    };
  }
}

/**
 * Domain Adapter Node - Translates domain signals to infrastructure signals
 */
export class DomainAdapterNodeImplementation implements NodeImplementation {
  readonly type = 'logic.domain-adapter';
  readonly description = 'Translates domain signals to infrastructure signals by merging constants and applying mappings';

  async process(signal: Signal, config: NodeConfig, nodeId: string): Promise<NodeProcessResult> {
    const outputType = (config.outputSignalType as string);
    const constants = (config.constants as Record<string, unknown>) || {};
    const mappings = (config.mappings as Array<{ from: string; to: string; transform?: string }>) || [];

    if (!outputType) {
      throw new Error(`DomainAdapterNode "${nodeId}" requires outputSignalType in config`);
    }

    const inputPayload = signal.payload as Record<string, unknown>;
    const outputPayload = JSON.parse(JSON.stringify(constants));

    for (const mapping of mappings) {
      const value = this.getNestedValue(inputPayload, mapping.from);
      if (value !== undefined) {
        let transformedValue = value;

        if (mapping.transform === 'uppercase' && typeof value === 'string') {
          transformedValue = value.toUpperCase();
        } else if (mapping.transform === 'lowercase' && typeof value === 'string') {
          transformedValue = value.toLowerCase();
        } else if (mapping.transform === 'number' && typeof value === 'string') {
          transformedValue = parseFloat(value) || 0;
        } else if (mapping.transform === 'string') {
          transformedValue = String(value);
        } else if (mapping.transform === 'boolean') {
          transformedValue = Boolean(value);
        } else if (mapping.transform === 'json') {
          transformedValue = JSON.stringify(value);
        }

        this.setNestedValue(outputPayload, mapping.to, transformedValue);
      }
    }

    return {
      type: outputType,
      payload: outputPayload,
      timestamp: new Date(),
      sourceNodeId: nodeId,
    };
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }

  getOutputSignalTypes(config: NodeConfig): string[] {
    return [config.outputSignalType as string || 'DATA.ADAPTED'];
  }
}

// ============================================================
// Auto-register built-in implementations
// ============================================================

export function registerBuiltInNodeImplementations(registry: NodeImplementationRegistry = globalNodeRegistry): void {
  registry.register(new TransformNodeImplementation());
  registry.register(new ValidateNodeImplementation());
  registry.register(new InputNodeImplementation());
  registry.register(new DisplayNodeImplementation());
  registry.register(new ApiClientNodeImplementation());
  registry.register(new StorageNodeImplementation());
  registry.register(new DomainAdapterNodeImplementation());

  // Register aliases for backwards compatibility
  registry.registerAlias('logic.transform', 'logic.transform');
  registry.registerAlias('logic.validate', 'logic.validate');
}

// Auto-register on import
registerBuiltInNodeImplementations();
