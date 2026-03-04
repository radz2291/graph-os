/**
 * Configuration interface for custom.habit-transformer
 * * Transforms habit data by adding id, createdAt, and initializing completions array
 */

import type { NodeConfig } from '@graph-os/core';

export interface CustomHabitTransformerConfig extends NodeConfig {
  // Add your configuration properties here
  // Example:
  // enabled?: boolean;
  // timeout?: number;
}

export default CustomHabitTransformerConfig;
