/**
 * TransformerNode - Transforms signal payloads
 * 
 * This node transforms incoming signal payloads according to transformation rules.
 * It can map fields, rename keys, and apply basic transformations.
 * 
 * @module @graph-os/runtime
 */

import { BaseNode, Signal, NodeConfig } from '@graph-os/core';

/**
 * Transformation rule definition.
 */
interface TransformRule {
  /** Source field path (e.g., "user.email") */
  from: string;
  /** Target field path (e.g., "email") */
  to: string;
  /** Optional transformation function name */
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'number' | 'string' | 'boolean' | 'json' | 'multiply' | 'add' | 'subtract' | 'divide';
  /** Optional factor/value for mathematical operations */
  factor?: number;
  value?: number;
}

/**
 * Configuration for TransformerNode.
 */
interface TransformerConfig extends NodeConfig {
  /** Output signal type */
  outputSignalType?: string;
  /** Transformation rules */
  rules?: TransformRule[];
  /** Whether to include unmatched fields */
  includeUnmatched?: boolean;
  /** Static values to be injected into the payload */
  constants?: Record<string, unknown>;
}

/**
 * TransformerNode transforms signal payloads.
 */
export class TransformerNode extends BaseNode {
  type = 'logic.transform';
  private outputSignalType: string;
  private rules: TransformRule[];
  private includeUnmatched: boolean;
  private constants: Record<string, unknown>;

  constructor(id: string, config: TransformerConfig) {
    super(id, config);
    this.outputSignalType = config.outputSignalType || '';
    this.rules = config.rules || [];
    this.includeUnmatched = config.includeUnmatched ?? true;
    this.constants = config.constants || {};
  }

  async process(signal: Signal): Promise<Signal | null> {
    const payload = signal.payload as Record<string, unknown>;
    const transformed = this.includeUnmatched ? JSON.parse(JSON.stringify(payload)) : {};
    const outputType = this.outputSignalType || `${signal.type}.TRANSFORMED`;

    try {
      for (const rule of this.rules) {
        // Handle empty or missing paths (operating on root primitive values)
        let value = rule.from ? this.getNestedValue(transformed, rule.from) : transformed;

        // Unbox primitives automatically if an empty path targets a wrapped payload
        if (!rule.from && value && typeof value === 'object' && 'value' in value && Object.keys(value).length === 1) {
          value = (value as any).value;
        }

        // Root fallback to original payload if transformed root is empty
        if (value === undefined || (typeof value === 'object' && Object.keys(value as any).length === 0 && !rule.from)) {
          value = rule.from ? this.getNestedValue(payload, rule.from) : payload;
        }

        if (value !== undefined) {
          const transformedValue = this.applyTransform(value, rule);

          if (!rule.to) {
            // Overwrite root directly
            if (typeof transformedValue === 'object' && transformedValue !== null) {
              Object.assign(transformed, transformedValue);
            } else {
              // If the root transforms into a primitive, we wrap it loosely back into the payload object
              // as signals enforce Record<string, unknown>. We'll map it to 'value'.
              transformed['value'] = transformedValue;
            }
          } else {
            this.setNestedValue(transformed, rule.to, transformedValue);
          }
        }
      }

      // Merge constants into the transformed payload
      const finalPayload = {
        ...transformed,
        ...this.constants
      };

      return this.createOutputSignal(outputType, finalPayload);
    } catch (e) {
      // Fail fast on transformation errors
      return this.createOutputSignal(`${outputType}.FAILURE`, {
        error: e instanceof Error ? e.message : String(e),
        originalPayload: payload
      });
    }
  }

  /**
   * Gets a nested value from an object using dot notation.
   * If path is empty or undefined, returns the root object.
   */
  private getNestedValue(obj: Record<string, unknown>, path?: string): unknown {
    if (!path) return obj;

    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Sets a nested value in an object using dot notation.
   */
  private setNestedValue(
    obj: Record<string, unknown>,
    path: string,
    value: unknown
  ): void {
    if (!path) return;

    const parts = path.split('.');
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  private applyTransform(value: unknown, rule: TransformRule): unknown {
    if (!rule.transform) return value;

    switch (rule.transform) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'number':
        return Number(value);
      case 'string':
        return String(value);
      case 'boolean':
        return Boolean(value);
      case 'json':
        return JSON.stringify(value);
      case 'multiply':
      case 'add':
      case 'subtract':
      case 'divide': {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          throw new Error(`Mathematical operation '${rule.transform}' requires a numerical source value. Received: ${typeof value}`);
        }
        const operand = rule.factor !== undefined ? rule.factor : rule.value;
        if (operand === undefined || isNaN(Number(operand))) {
          throw new Error(`Mathematical operation '${rule.transform}' requires a 'factor' or 'value' configuration property.`);
        }

        switch (rule.transform) {
          case 'multiply': return numValue * operand;
          case 'add': return numValue + operand;
          case 'subtract': return numValue - operand;
          case 'divide':
            if (operand === 0) throw new Error("Division by zero in TransformerNode.");
            return numValue / operand;
        }
        break; // Unreachable, handled by outer switch
      }
      default:
        throw new Error(`Unsupported transform operation: '${rule.transform}'`);
    }
  }
}
