/**
 * CartridgeLoader - Loads and parses cartridge files
 * 
 * The CartridgeLoader is responsible for:
 * - Loading cartridge JSON files
 * - Parsing and validating the structure
 * - Resolving references to other cartridges (composites)
 * 
 * @module @graph-os/runtime
 */

import { Cartridge, CartridgeValidationResult } from '@graph-os/core';
import { Logger } from '../utils/Logger';
import { GraphError } from '../errors/ErrorHandler';

/**
 * CartridgeLoader loads cartridge files from the filesystem.
 */
export class CartridgeLoader {
  private logger: Logger;
  private loadedCartridges: Map<string, Cartridge> = new Map();

  constructor(logger: Logger = new Logger()) {
    this.logger = logger;
  }

  /**
   * Loads a cartridge from a file path.
   * 
   * @param cartridgePath - Path to the cartridge JSON file
   * @returns The loaded cartridge
   * @throws GraphError if loading fails
   */
  async loadCartridge(cartridgePath: string): Promise<Cartridge> {
    // Check cache
    const cached = this.loadedCartridges.get(cartridgePath);
    if (cached) {
      this.logger.debug(`Using cached cartridge: ${cartridgePath}`);
      return cached;
    }

    this.logger.info(`Loading cartridge: ${cartridgePath}`);

    try {
      if (typeof window === 'undefined') {
        const fs = await import('fs');
        // Read file
        const content = await fs.promises.readFile(cartridgePath, 'utf-8');

        // Parse JSON
        const cartridge = JSON.parse(content) as Cartridge;

        // Validate basic structure
        this.validateBasicStructure(cartridge, cartridgePath);

        // Cache the cartridge
        this.loadedCartridges.set(cartridgePath, cartridge);

        this.logger.info(`Loaded cartridge: ${cartridge.name} v${cartridge.version}`);
        return cartridge;
      } else {
        throw new Error("File path loading not supported in browser. Pass cartridge object directly.");
      }
    } catch (error) {
      if (error instanceof GraphError) {
        throw error;
      }

      throw new GraphError(
        `Failed to load cartridge from ${cartridgePath}: ${error instanceof Error ? error.message : String(error)}`,
        'CARTRIDGE_LOAD_ERROR'
      );
    }
  }

  /**
   * Loads a cartridge from a directory (looks for root.cartridge.json).
   * 
   * @param directory - Directory containing the cartridge
   * @returns The loaded cartridge
   */
  async loadFromDirectory(directory: string): Promise<Cartridge> {
    const path = await import('path');
    const cartridgePath = path.join(directory, 'root.cartridge.json');
    return this.loadCartridge(cartridgePath);
  }

  /**
   * Validates the basic structure of a cartridge.
   */
  private validateBasicStructure(cartridge: Cartridge, filePath: string): void {
    const errors: string[] = [];

    if (!cartridge.version) {
      errors.push('Missing version field');
    }

    if (!cartridge.name) {
      errors.push('Missing name field');
    }

    if (!cartridge.description) {
      errors.push('Missing description field');
    }

    if (!Array.isArray(cartridge.nodes)) {
      errors.push('nodes must be an array');
    } else if (cartridge.nodes.length === 0) {
      errors.push('Cartridge must have at least one node');
    }

    if (!Array.isArray(cartridge.wires)) {
      errors.push('wires must be an array');
    }

    // Check for duplicate node IDs
    const nodeIds = new Set<string>();
    for (const node of cartridge.nodes) {
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);
    }

    // Check wire references
    for (const wire of cartridge.wires) {
      if (!nodeIds.has(wire.from)) {
        errors.push(`Wire references unknown source node: ${wire.from}`);
      }
      if (!nodeIds.has(wire.to)) {
        errors.push(`Wire references unknown target node: ${wire.to}`);
      }
    }

    if (errors.length > 0) {
      throw new GraphError(
        `Invalid cartridge structure in ${filePath}:\n${errors.join('\n')}`,
        'INVALID_CARTRIDGE_STRUCTURE'
      );
    }
  }

  /**
   * Loads multiple cartridges from a directory.
   * 
   * @param directory - Directory containing cartridge files
   * @param pattern - Glob pattern for cartridge files (default: *.cartridge.json)
   * @returns Array of loaded cartridges
   */
  async loadCartridgesFromDirectory(
    directory: string,
    pattern: string = '*.cartridge.json'
  ): Promise<Cartridge[]> {
    const cartridges: Cartridge[] = [];

    try {
      if (typeof window === 'undefined') {
        const fs = await import('fs');
        const path = await import('path');
        const files = await fs.promises.readdir(directory);

        for (const file of files) {
          if (file.endsWith('.cartridge.json')) {
            const cartridge = await this.loadCartridge(path.join(directory, file));
            cartridges.push(cartridge);
          }
        }
      } else {
        throw new Error("Directory loading not supported in browser.");
      }

      return cartridges;
    } catch (error) {
      throw new GraphError(
        `Failed to load cartridges from directory ${directory}: ${error instanceof Error ? error.message : String(error)}`,
        'DIRECTORY_LOAD_ERROR'
      );
    }
  }

  /**
   * Clears the cartridge cache.
   */
  clearCache(): void {
    this.loadedCartridges.clear();
    this.logger.debug('Cartridge cache cleared');
  }

  /**
   * Gets a cached cartridge by path.
   */
  getCached(path: string): Cartridge | undefined {
    return this.loadedCartridges.get(path);
  }
}
