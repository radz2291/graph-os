/**
 * DisplayNode - Displays data to the user
 * 
 * This node outputs data to the console or other display targets.
 * It consumes display signals and renders their content.
 * 
 * @module @graph-os/runtime
 */

import { BaseNode, Signal, NodeConfig } from '@graph-os/core';

/**
 * Configuration for DisplayNode.
 */
interface DisplayConfig extends NodeConfig {
  /** Output format */
  format?: 'json' | 'text' | 'table';
  /** Prefix for output */
  prefix?: string;
  /** Whether to include timestamps */
  showTimestamp?: boolean;
  /** Field to display (if payload is object) */
  field?: string;
}

/**
 * DisplayNode displays data to the user.
 */
export class DisplayNode extends BaseNode {
  type = 'control.display';
  private format: 'json' | 'text' | 'table';
  private prefix: string;
  private showTimestamp: boolean;
  private field: string | undefined;

  constructor(id: string, config: DisplayConfig) {
    super(id, config);
    this.format = config.format || 'json';
    this.prefix = config.prefix || '';
    this.showTimestamp = config.showTimestamp ?? true;
    this.field = config.field;
  }

  async process(signal: Signal): Promise<Signal | null> {
    const payload = signal.payload as Record<string, unknown>;
    
    // Get data to display
    let data = this.field ? payload[this.field] : payload;
    
    // Format output
    const output = this.formatOutput(data, signal);
    
    // Display
    this.display(output);
    
    // Return null (display nodes don't emit signals)
    return null;
  }

  /**
   * Formats the output based on configuration.
   */
  private formatOutput(data: unknown, signal: Signal): string {
    const parts: string[] = [];
    
    // Add timestamp
    if (this.showTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }
    
    // Add prefix
    if (this.prefix) {
      parts.push(this.prefix);
    }
    
    // Format data
    switch (this.format) {
      case 'json':
        parts.push(JSON.stringify(data, null, 2));
        break;
      case 'text':
        parts.push(String(data));
        break;
      case 'table':
        if (typeof data === 'object' && data !== null) {
          parts.push(this.formatTable(data as Record<string, unknown>));
        } else {
          parts.push(String(data));
        }
        break;
    }
    
    return parts.join(' ');
  }

  /**
   * Formats data as a table.
   */
  private formatTable(data: Record<string, unknown>): string {
    const lines: string[] = [];
    const entries = Object.entries(data);
    
    if (entries.length === 0) {
      return '(empty)';
    }
    
    const maxKeyLength = Math.max(...entries.map(([key]) => key.length));
    
    for (const [key, value] of entries) {
      const paddedKey = key.padEnd(maxKeyLength);
      const displayValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : String(value);
      lines.push(`  ${paddedKey} : ${displayValue}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Displays the output.
   */
  private display(output: string): void {
    console.log(output);
  }

  /**
   * Displays a success message with green color.
   */
  displaySuccess(message: string): void {
    console.log(`\x1b[32m✅ ${message}\x1b[0m`);
  }

  /**
   * Displays an error message with red color.
   */
  displayError(message: string): void {
    console.log(`\x1b[31m❌ ${message}\x1b[0m`);
  }

  /**
   * Displays a warning message with yellow color.
   */
  displayWarning(message: string): void {
    console.log(`\x1b[33m⚠️  ${message}\x1b[0m`);
  }

  /**
   * Displays an info message with blue color.
   */
  displayInfo(message: string): void {
    console.log(`\x1b[34mℹ️  ${message}\x1b[0m`);
  }
}
