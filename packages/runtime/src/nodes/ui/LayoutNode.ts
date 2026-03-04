/**
 * LayoutNode - React layout node for Graph-OS
 * 
 * Layout nodes represent layout containers that manage
 * the arrangement of child components.
 * 
 * @module @graph-os/runtime
 */

import { BaseNode, Signal, NodeConfig } from '@graph-os/core';

/**
 * Configuration for LayoutNode.
 */
export interface LayoutConfig extends NodeConfig {
  /** Layout type (flex, grid, stack, etc.) */
  layoutType?: 'flex' | 'grid' | 'stack' | 'custom';
  /** Layout direction */
  direction?: 'row' | 'column';
  /** Gap between children */
  gap?: number;
  /** Padding */
  padding?: number | string;
  /** Additional styles */
  styles?: Record<string, string | number>;
  /** Child component IDs */
  children?: string[];
  /** Alignment */
  alignItems?: string;
  /** Justify content */
  justifyContent?: string;
}

/**
 * LayoutNode represents a layout container.
 */
export class LayoutNode extends BaseNode {
  type = 'ui.layout';
  private layoutType: 'flex' | 'grid' | 'stack' | 'custom';
  private direction: 'row' | 'column';
  private gap: number;
  private padding: number | string;
  private styles: Record<string, string | number>;
  private children: string[];
  private alignItems: string;
  private justifyContent: string;

  constructor(id: string, config: LayoutConfig) {
    super(id, config);
    this.layoutType = config.layoutType || 'flex';
    this.direction = config.direction || 'column';
    this.gap = config.gap || 0;
    this.padding = config.padding || 0;
    this.styles = config.styles || {};
    this.children = config.children || [];
    this.alignItems = config.alignItems || 'stretch';
    this.justifyContent = config.justifyContent || 'flex-start';
  }

  /**
   * Gets layout type.
   */
  getLayoutType(): string {
    return this.layoutType;
  }

  /**
   * Gets layout direction.
   */
  getDirection(): string {
    return this.direction;
  }

  /**
   * Sets layout direction.
   */
  setDirection(direction: 'row' | 'column'): void {
    this.direction = direction;
  }

  /**
   * Gets layout styles.
   */
  getLayoutStyles(): Record<string, string | number> {
    const baseStyles: Record<string, string | number> = {
      display: this.layoutType === 'flex' ? 'flex' : this.layoutType,
      flexDirection: this.direction,
      alignItems: this.alignItems,
      justifyContent: this.justifyContent,
    };

    if (this.gap > 0) {
      baseStyles.gap = this.gap;
    }

    if (this.padding) {
      baseStyles.padding = this.padding;
    }

    return { ...baseStyles, ...this.styles };
  }

  /**
   * Gets child IDs.
   */
  getChildren(): string[] {
    return [...this.children];
  }

  /**
   * Adds a child.
   */
  addChild(childId: string): void {
    if (!this.children.includes(childId)) {
      this.children.push(childId);
    }
  }

  /**
   * Removes a child.
   */
  removeChild(childId: string): void {
    const index = this.children.indexOf(childId);
    if (index !== -1) {
      this.children.splice(index, 1);
    }
  }

  /**
   * Clears all children.
   */
  clearChildren(): void {
    this.children = [];
  }

  async process(signal: Signal): Promise<Signal | Signal[] | null> {
    const payload = signal.payload as Record<string, unknown>;

    // Update styles if provided
    if (payload.styles) {
      this.styles = { ...this.styles, ...payload.styles as Record<string, string | number> };
    }

    // Update children if provided
    if (payload.addChild) {
      this.addChild(payload.addChild as string);
    }

    if (payload.removeChild) {
      this.removeChild(payload.removeChild as string);
    }

    // Update direction if provided
    if (payload.direction) {
      this.direction = payload.direction as 'row' | 'column';
    }

    return null;
  }
}
