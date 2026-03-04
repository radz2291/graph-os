/**
 * CompositeNode - Instantiates and manages composite cartridges
 * 
 * Composites are reusable cartridges that can be referenced by other cartridges.
 * CompositeNode acts as a wrapper that exposes the composite's signal processing
 * as if it were part of the parent cartridge.
 * 
 * @module @graph-os/runtime
 */

import {
  BaseNode,
  Signal,
  NodeConfig,
  CompositeConfig as CoreCompositeConfig,
  SignalMapping,
  CompositeCartridge,
} from '@graph-os/core';
import { CartridgeLoader } from '../../loader/CartridgeLoader';
import { GraphRuntime } from '../../engine/GraphRuntimeBuilder';
import { Logger } from '../../utils/Logger';

/**
 * Extended composite config with runtime-specific options.
 */
export interface CompositeConfig extends CoreCompositeConfig {
  /** Logger instance for logging */
  logger?: Logger;
}

/**
 * CompositeNode represents a reusable composite in a graph.
 * 
 * This node loads a composite cartridge and routes signals through it.
 * Input signals are transformed to match composite's input contracts.
 * Output signals are transformed back to parent's output format.
 */
export class CompositeNode extends BaseNode {
  type = 'ui.composite';
  private compositeCartridge: CompositeCartridge | null = null;
  private compositeLoader: CartridgeLoader;
  private inlineNodes: boolean;
  private signalNamespace: string | undefined;
  private internalRuntime: GraphRuntime | null = null;
  private logger: Logger;
  private initialized: boolean = false;

  constructor(id: string, config: NodeConfig) {
    super(id, config);
    const compositeConfig = config as CompositeConfig;

    this.compositeLoader = new CartridgeLoader(compositeConfig.logger);
    this.inlineNodes = compositeConfig.inline || false;
    this.signalNamespace = compositeConfig.signalNamespace;
    this.logger = compositeConfig.logger || new Logger();
  }

  /**
   * Loads and validates the composite cartridge.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      // Composite already initialized
      return;
    }

    let compositeData: any;
    const config = this.config as CompositeConfig;

    if (config.compositePath) {
      // Load from file
      compositeData = await this.compositeLoader.loadCartridge(config.compositePath);
    } else if (config.composite) {
      // Use provided data
      compositeData = config.composite;
    } else {
      throw new Error('CompositeNode requires either compositePath or composite config');
    }

    // Validate it's a composite
    if (!compositeData || compositeData.type !== 'composite') {
      throw new Error(
        `Cartridge is not a composite. Composite cartridges must have type: "composite".`
      );
    }

    this.compositeCartridge = compositeData as CompositeCartridge;

    // Validate constraints (Constitutional limits)
    const maxNodes = compositeData.constraints?.maxNodes || 30;
    const maxWires = compositeData.constraints?.maxWires || 50;
    const maxSignals = compositeData.constraints?.maxSignals || 10;

    if (compositeData.nodes.length > maxNodes) {
      throw new Error(
        `Composite exceeds maximum nodes: ${compositeData.nodes.length} > ${maxNodes}`
      );
    }

    if (compositeData.wires.length > maxWires) {
      throw new Error(
        `Composite exceeds maximum wires: ${compositeData.wires.length} > ${maxWires}`
      );
    }

    if (compositeData.inputs.length + compositeData.outputs.length > maxSignals) {
      throw new Error(
        `Composite exceeds maximum signals: ${compositeData.inputs.length + compositeData.outputs.length} > ${maxSignals}`
      );
    }

    // Create internal runtime
    this.internalRuntime = new GraphRuntime(undefined, this.logger);

    // Set up output signal bridging
    // Principle 4: Composites are boundary units. We bridge internal outputs back to external.
    this.internalRuntime.getSignalBus().subscribe('*', (internalSignal: Signal) => {
      this.handleInternalSignal(internalSignal);
    });

    await this.internalRuntime.initialize({
      data: compositeData,
    });

    this.initialized = true;
    this.logger.info(
      `Composite initialized: ${compositeData.name} (${compositeData.nodes.length} nodes, ${compositeData.wires.length} wires)`
    );
  }

  /**
   * Processes signals through the composite.
   * 
   * Signals are routed to the composite's internal runtime.
   */
  async process(signal: Signal): Promise<Signal | Signal[] | null> {
    if (!this.initialized || !this.compositeCartridge || !this.internalRuntime) {
      throw new Error('Composite not initialized');
    }

    // Apply input signal mappings
    const mappings = (this.config as CompositeConfig).signalMappings || [];
    const inputMapping = mappings.find(
      (m: any) => m.externalSignal === signal.type && m.direction === 'input'
    );

    // If no explicit mapping and not in composite's declared inputs, ignore
    if (!inputMapping && !this.compositeCartridge.inputs.find((i: any) => i.type === signal.type)) {
      this.logger.debug(`Composite ignored signal: ${signal.type}`);
      return null;
    }

    const internalSignalType = inputMapping ? inputMapping.internalSignal : signal.type;

    try {
      // Start internal runtime if not running
      if (this.internalRuntime.getState() !== 'running') {
        await this.internalRuntime.start();
      }

      // Create internal signal
      const internalSignal: Signal = {
        type: internalSignalType,
        payload: signal.payload,
        timestamp: new Date(),
        sourceNodeId: 'boundary', // Standard ID for composite boundary
        metadata: {
          ...(signal.metadata || {}),
          _compositeId: this.id,
          _externalSignal: signal.type,
        },
      };

      // Send to internal runtime
      this.internalRuntime.sendSignal(internalSignal);

      // CompositeNode handles outputs asynchronously via SignalBus subscription
      // Principle 1: Signal-First Architecture. Processing results are emitted as signals.
      return null;
    } catch (error) {
      this.logger.error(`Composite processing error for ${this.id}:`, error);
      return this.createErrorSignal(error);
    }
  }

  /**
   * Handles signals coming from the internal runtime and bridges them to the parent.
   */
  private handleInternalSignal(internalSignal: Signal): void {
    if (!this.compositeCartridge || !this.context) return;

    // Find output mapping
    const mappings = (this.config as CompositeConfig).signalMappings || [];
    const outputMapping = mappings.find(
      (m: any) => m.internalSignal === internalSignal.type && m.direction === 'output'
    );

    // If no explicit mapping and not in composite's declared outputs, don't bridge
    if (!outputMapping && !this.compositeCartridge.outputs.find((o: any) => o.type === internalSignal.type)) {
      return;
    }

    const externalSignalType = outputMapping ? outputMapping.externalSignal : internalSignal.type;

    this.logger.debug(
      `Bridging composite output for ${this.id}: ${internalSignal.type} -> ${externalSignalType}`
    );

    // Create external signal using the helper from BaseNode
    const externalSignal = this.createOutputSignal(
      externalSignalType,
      internalSignal.payload,
      {
        ...(internalSignal.metadata || {}),
        _internalSignal: internalSignal.type,
      }
    );

    // Principle 4: Composites are boundary units. Emit to parent via context.
    this.context.sendSignal(externalSignal);
  }

  private createErrorSignal(error: unknown): Signal {
    return this.createOutputSignal('COMPOSITE.ERROR', {
      compositeId: this.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  /**
   * Gets the composite cartridge configuration.
   */
  getCompositeConfig(): CompositeCartridge | null {
    return this.compositeCartridge;
  }

  /**
   * Gets the composite's input ports.
   */
  getInputs(): any[] {
    return this.compositeCartridge?.inputs || [];
  }

  /**
   * Gets the composite's output ports.
   */
  getOutputs(): any[] {
    return this.compositeCartridge?.outputs || [];
  }

  /**
   * Checks if this is an inline composite.
   */
  isInlined(): boolean {
    return this.inlineNodes;
  }

  /**
   * Checks if the composite is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clean up internal runtime resources.
   */
  async destroy(): Promise<void> {
    if (this.internalRuntime) {
      try {
        await this.internalRuntime.destroy();
        this.internalRuntime = null;
        this.initialized = false;
        this.logger.info('Composite destroyed');
      } catch (error) {
        this.logger.error('Error destroying composite:', error);
      }
    }
  }
}
