/**
 * Configuration interface for logic.order-router
 * * Routes orders to appropriate handlers based on type
 */

import type { NodeConfig } from '@graph-os/core';

export interface LogicOrderRouterConfig extends NodeConfig {
  // Add your configuration properties here
  // Example:
  // enabled?: boolean;
  // timeout?: number;
}

export default LogicOrderRouterConfig;
