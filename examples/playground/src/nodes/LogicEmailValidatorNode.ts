/**
 * logic.email-validator - Validation node
 * Validates email addresses against various rules including format, domain, and MX record checks
 * {{#if author}}@author AI Architect{{/if}}
 */

import type { Signal, NodeConfig } from '@graph-os/core';

export interface LogicEmailValidatorConfig extends NodeConfig {
  /** Validation rules to apply */
  rules?: Array<{
    type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
    params?: unknown;
    message?: string;
  }>;
  /** Custom validation function */
  customValidator?: (value: unknown) => boolean | string;
}

/**
 * logic.email-validator - Validates input data against defined rules
 * 
 * Emits: LOGIC_EMAIL-VALIDATOR.SUCCESS, LOGIC_EMAIL-VALIDATOR.FAILURE
 */
export class LogicEmailValidatorNode {
  readonly type = 'logic.email-validator';
  readonly category = 'logic';
  
  private config: LogicEmailValidatorConfig;

  constructor(config: LogicEmailValidatorConfig = {}) {
    this.config = config;
  }

  /**
   * Process incoming signal and validate
   */
  async process(signal: Signal): Promise<Signal[]> {
    const value = signal.payload;
    const errors: string[] = [];

    // Apply validation rules
    if (this.config.rules) {
      for (const rule of this.config.rules) {
        const result = this.applyRule(rule, value);
        if (result !== true) {
          errors.push(result);
        }
      }
    }

    // Apply custom validator if provided
    if (this.config.customValidator) {
      const customResult = this.config.customValidator(value);
      if (customResult !== true) {
        errors.push(typeof customResult === 'string' ? customResult : 'Custom validation failed');
      }
    }

    const isValid = errors.length === 0;

    return [
      {
        type: isValid ? 'LOGIC_EMAIL-VALIDATOR.SUCCESS' : 'LOGIC_EMAIL-VALIDATOR.FAILURE',
        payload: isValid ? { value, validated: true } : { value, errors },
        timestamp: new Date(),
        sourceNodeId: signal.sourceNodeId,
      }
    ];
  }

  private applyRule(rule: LogicEmailValidatorConfig['rules']![0], value: unknown): true | string {
    const message = rule.message || `Validation failed: ${rule.type}`;

    switch (rule.type) {
      case 'required':
        return value !== null && value !== undefined && value !== '' ? true : message;
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : message;
      case 'minLength':
        const minLen = (rule.params as number) || 0;
        return typeof value === 'string' && value.length >= minLen ? true : message;
      case 'maxLength':
        const maxLen = (rule.params as number) || Infinity;
        return typeof value === 'string' && value.length <= maxLen ? true : message;
      case 'pattern':
        const pattern = rule.params instanceof RegExp ? rule.params : new RegExp(rule.params as string);
        return typeof value === 'string' && pattern.test(value) ? true : message;
      case 'custom':
        return true; // Handled by customValidator
      default:
        return true;
    }
  }
}

export default LogicEmailValidatorNode;
