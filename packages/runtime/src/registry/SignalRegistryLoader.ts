/**
 * Signal Registry Loader
 * 
 * Loads and validates signal type definitions from registry files.
 * Enables runtime validation of signal types to catch errors early.
 * 
 * @module @graph-os/runtime
 */

// Dynamic fs and path imports will be used inside loadRegistry

export interface SignalDefinition {
  type: string;
  description: string;
  namespace: string;
  action: string;
  payloadSchema?: any;
  emittedBy?: string[];
  consumedBy?: string[];
  deprecated?: boolean;
}

export interface SignalRegistryData {
  version: string;
  signals: SignalDefinition[];
}

export class SignalRegistryLoader {
  private registry: Map<string, SignalDefinition> = new Map();
  private loadedPaths: Set<string> = new Set();
  /**
   * Loads signal registry from a JSON file.
   * 
   * @param registryPath - Path to the signal registry JSON file
   * @returns Map of signal type to signal definition
   * @throws Error if file doesn't exist or has invalid format
   */
  async loadRegistry(registryPath: string): Promise<Map<string, SignalDefinition>> {
    // Check if already loaded
    if (this.loadedPaths.has(registryPath)) {
      return this.registry;
    }

    try {
      const fs = await import('fs/promises');
      // Read file
      const content = await fs.readFile(registryPath, 'utf-8');
      const data: SignalRegistryData = JSON.parse(content);

      // Validate format
      if (!data.signals || !Array.isArray(data.signals)) {
        throw new Error(`Invalid signal registry format: missing 'signals' array`);
      }

      if (data.version === undefined) {
        throw new Error(`Invalid signal registry format: missing 'version'`);
      }

      // Load signals into registry
      for (const signalDef of data.signals) {
        if (!signalDef.type) {
          throw new Error(`Invalid signal definition: missing 'type'`);
        }

        if (!signalDef.namespace || !signalDef.action) {
          throw new Error(`Invalid signal definition '${signalDef.type}': missing 'namespace' or 'action'`);
        }
        this.registry.set(signalDef.type, signalDef);
      }

      this.loadedPaths.add(registryPath);
      return this.registry;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to load signal registry from ${registryPath}: ${error.message}`
        );
      }
      throw new Error(
        `Failed to load signal registry from ${registryPath}: ${String(error)}`
      );
    }
  }

  /**
   * Validates a signal type against the registry.
   * 
   * @param signalType - The signal type to validate (e.g., "AUTH.LOGIN")
   * @returns Signal definition if valid
   * @throws Error if signal type is unknown or deprecated
   */
  validate(signalType: string): SignalDefinition {
    const definition = this.registry.get(signalType);

    if (!definition) {
      const knownTypes = Array.from(this.registry.keys()).join(', ');
      const available = knownTypes.length > 0
        ? `Known types: ${knownTypes}`
        : 'No signal types registered';

      throw new Error(
        `Unknown signal type: ${signalType}. ${available}`
      );
    }

    if (definition.deprecated) {
      throw new Error(
        `Deprecated signal type: ${signalType}. ${definition.description}`
      );
    }

    return definition;
  }

  /**
   * Checks if a signal type exists in the registry.
   * 
   * @param signalType - The signal type to check
   * @returns True if the signal type exists
   */
  hasSignal(signalType: string): boolean {
    return this.registry.has(signalType);
  }

  /**
   * Gets all registered signal types.
   * 
   * @returns Array of signal type strings
   */
  getSignalTypes(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Gets signal definition by type.
   * 
   * @param signalType - The signal type to get
   * @returns Signal definition or undefined if not found
   */
  getSignalDefinition(signalType: string): SignalDefinition | undefined {
    return this.registry.get(signalType);
  }

  /**
   * Gets all signal definitions.
   * 
   * @returns Array of all signal definitions
   */
  getAllSignalDefinitions(): SignalDefinition[] {
    return Array.from(this.registry.values());
  }

  /**
   * Clears all loaded registries.
   * Useful for testing or resetting state.
   */
  clear(): void {
    this.registry.clear();
    this.loadedPaths.clear();
  }

  /**
   * Gets the number of loaded signal types.
   * 
   * @returns Count of registered signal types
   */
  getCount(): number {
    return this.registry.size;
  }

  /**
   * Gets the paths of all loaded registry files.
   * 
   * @returns Array of registry file paths
   */
  getLoadedPaths(): string[] {
    return Array.from(this.loadedPaths);
  }
}
