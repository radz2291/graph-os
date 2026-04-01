/**
 * Built-in extensions barrel — registers all Level 1 extensions
 *
 * @module @graph-os/runtime
 */

import { PhasesExtension } from './phases';
import { GuardExtension } from './guard';
import { RetryExtension } from './retry';
import { TimeoutExtension } from './timeout';
import { CompensationExtension } from './compensation';
import type { ExtensionRegistry } from '../ExtensionRegistry';

export { PhasesExtension } from './phases';
export { GuardExtension } from './guard';
export { RetryExtension, calculateBackoff } from './retry';
export { TimeoutExtension } from './timeout';
export { CompensationExtension } from './compensation';

/**
 * Register all built-in extensions into the given registry.
 * Order matters: phases first (foundation), then its dependents.
 */
export function registerBuiltInExtensions(
  registry: ExtensionRegistry,
): void {
  registry.register(PhasesExtension);
  registry.register(GuardExtension);
  registry.register(TimeoutExtension);
  registry.register(RetryExtension);
  registry.register(CompensationExtension);
}
