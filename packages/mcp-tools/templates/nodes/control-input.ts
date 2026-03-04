/**
 * {{nodeType}} - Input control node
 * {{#if description}}{{description}}{{/if}}
 * {{#if author}}@author {{author}}{{/if}}
 */

import type { Signal, NodeConfig } from '@graph-os/core';

export interface {{pascalCase}}Config extends NodeConfig {
  /** Input type */
  inputType?: 'text' | 'number' | 'email' | 'password' | 'file' | 'custom';
  /** Placeholder text */
  placeholder?: string;
  /** Default value */
  defaultValue?: unknown;
  /** Validation rules (client-side) */
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  /** Debounce time in ms */
  debounceMs?: number;
}

/**
 * {{nodeType}} - Captures user input and emits signals
 * 
 * Emits: {{upperCase}}.CHANGE, {{upperCase}}.BLUR
 */
export class {{pascalCase}}Node {
  readonly type = '{{nodeType}}';
  readonly category = '{{category}}';
  
  private config: {{pascalCase}}Config;
  private lastEmit = 0;

  constructor(config: {{pascalCase}}Config = {}) {
    this.config = config;
  }

  /**
   * Process incoming signal (typically from UI)
   */
  async process(signal: Signal): Promise<Signal[]> {
    const now = Date.now();
    
    // Apply debouncing
    if (this.config.debounceMs && now - this.lastEmit < this.config.debounceMs) {
      return [];
    }
    this.lastEmit = now;

    return [
      {
        type: '{{upperCase}}.CHANGE',
        payload: {
          value: signal.payload,
          inputType: this.config.inputType,
          timestamp: now,
        },
        timestamp: new Date(),
        sourceNodeId: signal.sourceNodeId,
      }
    ];
  }

  /**
   * Emit blur signal
   */
  async onBlur(sourceNodeId?: string): Promise<Signal> {
    return {
      type: '{{upperCase}}.BLUR',
      payload: { blurred: true },
      timestamp: new Date(),
      sourceNodeId: sourceNodeId || 'unknown',
    };
  }
}

export default {{pascalCase}}Node;
