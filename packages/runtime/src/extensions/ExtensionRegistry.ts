/**
 * ExtensionRegistry — Global registry of available extensions
 *
 * Extensions register themselves here. The ExtensionLoader
 * resolves and loads from this registry based on cartridge declarations.
 *
 * @module @graph-os/runtime
 */

import type { GraphExtension } from '@graph-os/core';
import { Logger } from '../utils/Logger';

export class ExtensionRegistry {
  private extensions: Map<string, GraphExtension> = new Map();
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
  }

  /**
   * Register an extension making it available for loading.
   */
  register(extension: GraphExtension): void {
    if (this.extensions.has(extension.id)) {
      this.logger.warn(`Overwriting extension: ${extension.id}`);
    }
    this.extensions.set(extension.id, extension);
    this.logger.debug(`Registered extension: ${extension.id} v${extension.apiVersion}`);
  }

  /**
   * Get an extension by ID.
   */
  get(id: string): GraphExtension | undefined {
    return this.extensions.get(id);
  }

  /**
   * Check if an extension is registered.
   */
  has(id: string): boolean {
    return this.extensions.has(id);
  }

  /**
   * List all registered extension IDs.
   */
  list(): string[] {
    return Array.from(this.extensions.keys());
  }

  /**
   * Unregister an extension.
   */
  unregister(id: string): boolean {
    return this.extensions.delete(id);
  }

  /**
   * Clear all registered extensions.
   */
  clear(): void {
    this.extensions.clear();
  }
}

/** Global singleton */
export const globalExtensionRegistry = new ExtensionRegistry();
