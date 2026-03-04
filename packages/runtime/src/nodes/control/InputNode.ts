/**
 * InputNode - Accepts user input
 * 
 * This node captures user input from CLI or other sources
 * and emits signals when input is received.
 * 
 * @module @graph-os/runtime
 */

import { BaseNode, Signal, NodeConfig } from '@graph-os/core';

/**
 * Configuration for InputNode.
 */
interface InputConfig extends NodeConfig {
  /** Prompt to display to the user */
  prompt?: string;
  /** Signal type to emit on input */
  outputSignalType?: string;
  /** Whether to mask input (for passwords) */
  mask?: boolean;
  /** Default value if no input provided */
  defaultValue?: string;
  /** Field name in the output payload */
  fieldName?: string;
}

/**
 * InputNode accepts user input.
 */
export class InputNode extends BaseNode {
  type = 'control.input';
  private prompt: string;
  private outputSignalType: string;
  private mask: boolean;
  private defaultValue: string | undefined;
  private fieldName: string;
  private rl: any | null = null;

  constructor(id: string, config: InputConfig) {
    super(id, config);
    this.prompt = config.prompt || 'Enter input: ';
    this.outputSignalType = config.outputSignalType || 'INPUT.SUBMITTED';
    this.mask = config.mask || false;
    this.defaultValue = config.defaultValue;
    this.fieldName = config.fieldName || 'value';
  }

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      // Set up readline interface
      const readline = await import('readline');
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
    }
  }

  async process(signal: Signal): Promise<Signal | null> {
    const payload = signal.payload as Record<string, unknown>;

    // Get prompt from signal or use default
    const prompt = (payload.prompt as string) || this.prompt;

    // Get input from user
    const input = await this.getInput(prompt);

    // Emit signal with input
    return this.createOutputSignal(this.outputSignalType, {
      [this.fieldName]: input,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Gets input from the user.
   */
  private getInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      if (!this.rl) {
        // Fallback if not initialized
        resolve(this.defaultValue || '');
        return;
      }

      this.rl.question(prompt, (answer: string) => {
        const trimmed = answer.trim();
        resolve(trimmed || this.defaultValue || trimmed);
      });
    });
  }

  /**
   * Triggers an input prompt without an incoming signal.
   */
  async triggerInput(customPrompt?: string): Promise<Signal> {
    const input = await this.getInput(customPrompt || this.prompt);
    return this.createOutputSignal(this.outputSignalType, {
      [this.fieldName]: input,
      timestamp: new Date().toISOString(),
    });
  }

  async destroy(): Promise<void> {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}
