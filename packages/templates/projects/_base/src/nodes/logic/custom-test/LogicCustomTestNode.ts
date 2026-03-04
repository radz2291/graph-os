/**
 * logic.custom-test - Transformation node
 * Test node for run_cartridge integration
 * 
 */

import type { Signal, NodeConfig } from '@graph-os/core';

export interface LogicCustomTestConfig extends NodeConfig {
  /** Field mappings: { sourceField: targetField } */
  mappings?: Record<string, string>;
  /** Transformations to apply */
  transforms?: Array<{
    field: string;
    operation: 'uppercase' | 'lowercase' | 'trim' | 'prefix' | 'suffix' | 'custom';
    params?: unknown;
  }>;
  /** Custom transform function */
  customTransform?: (input: unknown) => unknown;
}

/**
 * logic.custom-test - Transforms input data according to defined rules
 * 
 * Emits: LOGIC_CUSTOM-TEST.OUTPUT
 */
export class LogicCustomTestNode {
  readonly type = 'logic.custom-test';
  readonly category = 'logic';
  
  private config: LogicCustomTestConfig;

  constructor(config: LogicCustomTestConfig = {}) {
    this.config = config;
  }

  /**
   * Process incoming signal and transform
   */
  async process(signal: Signal): Promise<Signal[]> {
    let result = signal.payload;

    // Apply field mappings
    if (this.config.mappings && typeof result === 'object' && result !== null) {
      const mapped: Record<string, unknown> = {};
      for (const [source, target] of Object.entries(this.config.mappings)) {
        mapped[target] = (result as Record<string, unknown>)[source];
      }
      result = mapped;
    }

    // Apply transformations
    if (this.config.transforms && typeof result === 'object' && result !== null) {
      for (const transform of this.config.transforms) {
        result = this.applyTransform(result as Record<string, unknown>, transform);
      }
    }

    // Apply custom transform if provided
    if (this.config.customTransform) {
      result = this.config.customTransform(result);
    }

    return [
      {
        type: 'LOGIC_CUSTOM-TEST.OUTPUT',
        payload: result,
        timestamp: new Date(),
        sourceNodeId: signal.sourceNodeId,
      }
    ];
  }

  private applyTransform(data: Record<string, unknown>, transform: LogicCustomTestConfig['transforms']![0]): Record<string, unknown> {
    const value = data[transform.field];
    if (value === undefined) return data;

    let transformed: unknown;
    switch (transform.operation) {
      case 'uppercase':
        transformed = typeof value === 'string' ? value.toUpperCase() : value;
        break;
      case 'lowercase':
        transformed = typeof value === 'string' ? value.toLowerCase() : value;
        break;
      case 'trim':
        transformed = typeof value === 'string' ? value.trim() : value;
        break;
      case 'prefix':
        transformed = typeof value === 'string' ? String(transform.params) + value : value;
        break;
      case 'suffix':
        transformed = typeof value === 'string' ? value + String(transform.params) : value;
        break;
      case 'custom':
        transformed = value;
        break;
      default:
        transformed = value;
    }

    return { ...data, [transform.field]: transformed };
  }
}

export default LogicCustomTestNode;
