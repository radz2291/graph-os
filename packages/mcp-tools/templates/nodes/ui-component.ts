/**
 * {{nodeType}} - UI component node
 * {{#if description}}{{description}}{{/if}}
 * {{#if author}}@author {{author}}{{/if}}
 */

import type { Signal, NodeConfig } from '@graph-os/core';

export interface {{pascalCase}}Config extends NodeConfig {
  /** Component type */
  componentType?: 'button' | 'form' | 'card' | 'modal' | 'custom';
  /** Component props */
  props?: Record<string, unknown>;
  /** Event handlers configuration */
  events?: Array<{
    name: string;
    signalType: string;
  }>;
  /** UI state bindings */
  stateBindings?: Record<string, string>;
}

/**
 * {{nodeType}} - Manages UI component lifecycle and events
 * 
 * Emits: Configured event signals
 */
export class {{pascalCase}}Node {
  readonly type = '{{nodeType}}';
  readonly category = '{{category}}';
  
  private config: {{pascalCase}}Config;
  private state: Record<string, unknown> = {};

  constructor(config: {{pascalCase}}Config = {}) {
    this.config = config;
    // Initialize state from props
    if (config.props) {
      this.state = { ...config.props };
    }
  }

  /**
   * Process incoming signal (state update or event)
   */
  async process(signal: Signal): Promise<Signal[]> {
    // Handle state updates
    if (signal.type.startsWith('STATE.UPDATE')) {
      this.state = { ...this.state, ...(signal.payload as Record<string, unknown>) };
      return [];
    }

    // Handle events
    if (this.config.events) {
      const matchingEvent = this.config.events.find(e => 
        signal.type.includes(e.name.toUpperCase())
      );
      
      if (matchingEvent) {
        return [
          {
            type: matchingEvent.signalType,
            payload: {
              event: matchingEvent.name,
              data: signal.payload,
              state: this.state,
            },
            timestamp: new Date(),
            sourceNodeId: signal.sourceNodeId,
          }
        ];
      }
    }

    return [];
  }

  /**
   * Get current component state
   */
  getState(): Record<string, unknown> {
    return { ...this.state };
  }

  /**
   * Update component state
   */
  setState(newState: Partial<Record<string, unknown>>): void {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Get component configuration
   */
  getConfig(): { type: string; props: Record<string, unknown>; events: string[] } {
    return {
      type: this.config.componentType || 'custom',
      props: this.state,
      events: this.config.events?.map(e => e.name) || [],
    };
  }
}

export default {{pascalCase}}Node;
