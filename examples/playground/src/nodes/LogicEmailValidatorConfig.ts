/**
 * Configuration interface for logic.email-validator
 * * Validates email addresses against various rules including format, domain, and MX record checks
 */

import type { NodeConfig } from '@graph-os/core';

export interface LogicEmailValidatorConfig extends NodeConfig {
  // Add your configuration properties here
  // Example:
  // enabled?: boolean;
  // timeout?: number;
}

export default LogicEmailValidatorConfig;
