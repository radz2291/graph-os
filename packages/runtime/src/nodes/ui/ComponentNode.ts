/**
 * ComponentNode - React component node for Graph-OS
 * 
 * UI component nodes reference React components and emit
 * UI events through the SignalBus.
 * 
 * @module @graph-os/runtime
 */

import { BaseNode, Signal, NodeConfig } from '@graph-os/core';

/**
 * Configuration for ComponentNode.
 */
export interface ComponentConfig extends NodeConfig {
  /** React component name */
  componentName?: string;
  /** Component path for import */
  componentPath?: string;
  /** Props to pass to the component */
  props?: Record<string, unknown>;
  /** Events to emit */
  events?: Array<{
    name: string;
    signalType: string;
  }>;
}

/**
 * ComponentNode represents a React component in the graph.
 */
export class ComponentNode extends BaseNode {
  type = 'ui.component';
  private componentName: string;
  private componentPath: string | undefined;
  private props: Record<string, unknown>;
  private events: Map<string, string> = new Map();

  constructor(id: string, config: ComponentConfig) {
    super(id, config);
    this.componentName = config.componentName || 'UnknownComponent';
    this.componentPath = config.componentPath;
    this.props = config.props || {};

    // Map event names to signal types
    if (config.events) {
      for (const event of config.events) {
        this.events.set(event.name, event.signalType);
      }
    }
  }

  /**
   * Gets the component name.
   */
  getComponentName(): string {
    return this.componentName;
  }

  /**
   * Gets the component path.
   */
  getComponentPath(): string | undefined {
    return this.componentPath;
  }

  /**
   * Gets the component props.
   */
  getProps(): Record<string, unknown> {
    return { ...this.props };
  }

  /**
   * Sets component props.
   */
  setProps(props: Record<string, unknown>): void {
    this.props = { ...props };
  }

  /**
   * Gets registered events.
   */
  getEvents(): Map<string, string> {
    return new Map(this.events);
  }

  /**
   * Emits an event as a signal.
   */
  emitEvent(eventName: string, eventData: unknown): Signal {
    const signalType = this.events.get(eventName);
    if (!signalType) {
      throw new Error(`Unknown event: ${eventName}`);
    }

    return this.createOutputSignal(signalType, {
      event: eventName,
      data: eventData,
      componentId: this.id,
    });
  }

  async process(signal: Signal): Promise<Signal | Signal[] | null> {
    // ComponentNode typically receives display signals
    // and may emit event signals in response
    const payload = signal.payload as Record<string, unknown>;

    // Update props if provided
    if (payload.props) {
      this.props = { ...this.props, ...payload.props as Record<string, unknown> };
    }

    // Check if this is an event trigger
    if (payload.triggerEvent && this.events.has(payload.triggerEvent as string)) {
      return this.emitEvent(payload.triggerEvent as string, payload.eventData);
    }

    return null;
  }
}
