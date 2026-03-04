/**
 * {{nodeType}} - Domain adapter node
 * {{#if description}}{{description}}{{/if}}
 * {{#if author}}@author {{author}}{{/if}}
 */

import type { Signal, NodeConfig } from '@graph-os/core';

export interface {{pascalCase}}Config extends NodeConfig {
  /** Domain-specific schema for adaptation */
  inputSchema?: Record<string, string>;
  /** Output schema mapping */
  outputSchema?: Record<string, string>;
  /** Default values for missing fields */
  defaults?: Record<string, unknown>;
}

/**
 * {{nodeType}} - Adapts data between different domain schemas
 * 
 * Emits: {{upperCase}}.ADAPTED
 */
export class {{pascalCase}}Node {
  readonly type = '{{nodeType}}';
  readonly category = '{{category}}';
  
  private config: {{pascalCase}}Config;

  constructor(config: {{pascalCase}}Config = {}) {
    this.config = config;
  }

  /**
   * Process incoming signal and adapt to domain schema
   */
  async process(signal: Signal): Promise<Signal[]> {
    let data = signal.payload;

    // Apply defaults for missing fields
    if (this.config.defaults && typeof data === 'object' && data !== null) {
      data = {
        ...this.config.defaults,
        ...(data as Record<string, unknown>),
      };
    }

    // Adapt to output schema
    if (this.config.outputSchema && typeof data === 'object' && data !== null) {
      const adapted: Record<string, unknown> = {};
      const inputData = data as Record<string, unknown>;
      
      for (const [outputField, inputField] of Object.entries(this.config.outputSchema)) {
        adapted[outputField] = inputData[inputField];
      }
      data = adapted;
    }

    return [
      {
        type: '{{upperCase}}.ADAPTED',
        payload: data,
        timestamp: new Date(),
        sourceNodeId: signal.sourceNodeId,
      }
    ];
  }
}

export default {{pascalCase}}Node;
