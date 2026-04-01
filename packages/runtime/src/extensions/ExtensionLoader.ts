/**
 * ExtensionLoader — Resolves dependency order and loads extensions
 *
 * Reads the cartridge's `extensions` array, resolves dependencies
 * via topological sort, and returns loaded extensions in order.
 *
 * @module @graph-os/runtime
 */

import type { GraphExtension } from '@graph-os/core';
import { ExtensionRegistry } from './ExtensionRegistry';
import { Logger } from '../utils/Logger';

export class ExtensionLoader {
  private registry: ExtensionRegistry;
  private logger: Logger;

  constructor(registry: ExtensionRegistry, logger?: Logger) {
    this.registry = registry;
    this.logger = logger || new Logger();
  }

  /**
   * Load extensions declared in a cartridge.
   * Resolves dependencies via topological sort.
   *
   * @param declarations - Array of extension IDs from cartridge
   * @returns Ordered array of loaded extensions (deps first)
   */
  load(declarations: string[]): GraphExtension[] {
    if (!declarations || declarations.length === 0) {
      return [];
    }

    // Resolve all required extension IDs (including transitive deps)
    const resolved = this.resolveDependencies(declarations);

    // Load in dependency order
    const loaded: GraphExtension[] = [];
    for (const id of resolved) {
      const ext = this.registry.get(id);
      if (!ext) {
        throw new Error(
          `Extension "${id}" declared in cartridge but not registered. ` +
          `Available: ${this.registry.list().join(', ')}`
        );
      }
      loaded.push(ext);
      this.logger.debug(`Loaded extension: ${ext.id}`);
    }

    return loaded;
  }

  /**
   * Resolve the full set of required extension IDs,
   * including transitive dependencies, in topological order.
   */
  private resolveDependencies(declarations: string[]): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    const visiting = new Set<string>();

    const visit = (id: string) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`Circular extension dependency detected: ${id}`);
      }

      visiting.add(id);

      const ext = this.registry.get(id);
      if (!ext) {
        throw new Error(
          `Extension "${id}" not found. Available: ${this.registry.list().join(', ')}`
        );
      }

      // Visit dependencies first
      if (ext.depends) {
        for (const dep of ext.depends) {
          visit(dep);
        }
      }

      visiting.delete(id);
      visited.add(id);
      order.push(id);
    };

    for (const id of declarations) {
      visit(id);
    }

    return order;
  }
}
