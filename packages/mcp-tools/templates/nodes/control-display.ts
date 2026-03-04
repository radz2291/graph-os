/**
 * {{nodeType}} - Display control node
 * {{#if description}}{{description}}{{/if}}
 * {{#if author}}@author {{author}}{{/if}}
 */

import type { Signal, NodeConfig } from '@graph-os/core';

export interface {{pascalCase}}Config extends NodeConfig {
  /** Display format */
  format?: 'text' | 'json' | 'table' | 'list' | 'custom';
  /** Template string for custom format */
  template?: string;
  /** Maximum items to display */
  maxItems?: number;
  /** Enable auto-refresh */
  autoRefresh?: boolean;
  /** Refresh interval in ms */
  refreshInterval?: number;
}

/**
 * {{nodeType}} - Displays data from incoming signals
 * 
 * Consumes: Any signal type
 */
export class {{pascalCase}}Node {
  readonly type = '{{nodeType}}';
  readonly category = '{{category}}';
  
  private config: {{pascalCase}}Config;
  private lastData: unknown = null;

  constructor(config: {{pascalCase}}Config = {}) {
    this.config = config;
  }

  /**
   * Process incoming signal and prepare for display
   */
  async process(signal: Signal): Promise<Signal[]> {
    // Store data for display
    this.lastData = signal.payload;
    
    // Display nodes typically don't emit, they consume
    // But we can emit for testing/logging purposes
    return [];
  }

  /**
   * Get formatted display data
   */
  getDisplayData(): { formatted: string; raw: unknown } {
    let formatted: string;

    switch (this.config.format) {
      case 'json':
        formatted = JSON.stringify(this.lastData, null, 2);
        break;
      case 'table':
        if (Array.isArray(this.lastData)) {
          formatted = this.formatTable(this.lastData);
        } else {
          formatted = JSON.stringify(this.lastData, null, 2);
        }
        break;
      case 'list':
        if (Array.isArray(this.lastData)) {
          formatted = this.lastData.slice(0, this.config.maxItems || 10).join('\n');
        } else {
          formatted = String(this.lastData);
        }
        break;
      case 'custom':
        formatted = this.config.template 
          ? this.applyTemplate(this.config.template, this.lastData)
          : String(this.lastData);
        break;
      default:
        formatted = String(this.lastData);
    }

    return { formatted, raw: this.lastData };
  }

  private formatTable(data: unknown[]): string {
    if (data.length === 0) return '(empty)';
    const headers = Object.keys(data[0] as Record<string, unknown>);
    const rows = data.map(row => 
      headers.map(h => String((row as Record<string, unknown>)[h])).join(' | ')
    );
    return [headers.join(' | '), headers.map(() => '---').join(' | '), ...rows].join('\n');
  }

  private applyTemplate(template: string, data: unknown): string {
    // Simple template replacement: {{field}} → value
    return template.replace(/\{\{(\w+)\}\}/g, (_, field) => {
      if (typeof data === 'object' && data !== null) {
        return String((data as Record<string, unknown>)[field] || '');
      }
      return '';
    });
  }
}

export default {{pascalCase}}Node;
