import type { Signal, NodeConfig } from '@graph-os/core';

export interface CustomHabitTransformerConfig extends NodeConfig {
  outputSignalType: string;
}

/**
 * Custom node for transforming habit data
 */
export class CustomHabitTransformerNode {
  readonly type = 'custom.habit-transformer';
  readonly category = 'logic';
  
  private config: CustomHabitTransformerConfig;

  constructor(config: CustomHabitTransformerConfig = {}) {
    this.config = config;
  }

  /**
   * Process incoming signal and transform habit data
   */
  async process(signal: Signal): Promise<Signal[]> {
    const payload = signal.payload as any;
    
    // Generate ID and metadata
    const habit = {
      id: crypto.randomUUID(),
      name: payload.name,
      description: payload.description,
      frequency: payload.frequency,
      createdAt: new Date().toISOString(),
      completions: []
    };

    return [{
      type: this.config.outputSignalType || 'HABIT.TRANSFORMED',
      payload: habit,
      timestamp: new Date(),
      sourceNodeId: signal.sourceNodeId
    }];
  }
}

export default CustomHabitTransformerNode;
