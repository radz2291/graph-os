/**
 * PageNode - React page node for Graph-OS
 * 
 * Page nodes represent application pages and manage
 * routing and page-level state.
 * 
 * @module @graph-os/runtime
 */

import { BaseNode, Signal, NodeConfig } from '@graph-os/core';

/**
 * Configuration for PageNode.
 */
export interface PageConfig extends NodeConfig {
  /** Page route */
  route?: string;
  /** Page title */
  title?: string;
  /** Layout node ID */
  layoutId?: string;
  /** Page component name */
  componentName?: string;
  /** Meta tags */
  meta?: Record<string, string>;
  /** Protected route (requires auth) */
  protected?: boolean;
  /** Page keywords */
  keywords?: string[];
}

/**
 * PageNode represents an application page.
 */
export class PageNode extends BaseNode {
  type = 'ui.page';
  private route: string;
  private title: string;
  private layoutId: string | undefined;
  private componentName: string | undefined;
  private meta: Record<string, string>;
  private protected: boolean;
  private keywords: string[];
  private active: boolean;

  constructor(id: string, config: PageConfig) {
    super(id, config);
    this.route = config.route || '/';
    this.title = config.title || '';
    this.layoutId = config.layoutId;
    this.componentName = config.componentName;
    this.meta = config.meta || {};
    this.protected = config.protected || false;
    this.keywords = config.keywords || [];
    this.active = false;
  }

  /**
   * Gets the page route.
   */
  getRoute(): string {
    return this.route;
  }

  /**
   * Gets the page title.
   */
  getTitle(): string {
    return this.title;
  }

  /**
   * Sets the page title.
   */
  setTitle(title: string): void {
    this.title = title;
  }

  /**
   * Gets the layout ID.
   */
  getLayoutId(): string | undefined {
    return this.layoutId;
  }

  /**
   * Gets the component name.
   */
  getComponentName(): string | undefined {
    return this.componentName;
  }

  /**
   * Gets page meta tags.
   */
  getMeta(): Record<string, string> {
    return { ...this.meta };
  }

  /**
   * Checks if page is protected.
   */
  isProtected(): boolean {
    return this.protected;
  }

  /**
   * Checks if page is active.
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Activates the page.
   */
  activate(): void {
    this.active = true;
  }

  /**
   * Deactivates the page.
   */
  deactivate(): void {
    this.active = false;
  }

  /**
   * Gets page keywords.
   */
  getKeywords(): string[] {
    return [...this.keywords];
  }

  /**
   * Creates a page activation signal.
   */
  createActivationSignal(): Signal {
    return this.createOutputSignal('UI.PAGE_ACTIVATED', {
      pageId: this.id,
      route: this.route,
      title: this.title,
      componentName: this.componentName,
      layoutId: this.layoutId,
    });
  }

  /**
   * Creates a page deactivation signal.
   */
  createDeactivationSignal(): Signal {
    return this.createOutputSignal('UI.PAGE_DEACTIVATED', {
      pageId: this.id,
      route: this.route,
    });
  }

  async process(signal: Signal): Promise<Signal | Signal[] | null> {
    const payload = signal.payload as Record<string, unknown>;

    // Handle navigation events
    if (signal.type === 'UI.NAVIGATE') {
      const targetRoute = payload.route as string;
      if (targetRoute === this.route) {
        this.active = true;
        return this.createActivationSignal();
      } else if (this.active) {
        this.active = false;
        return this.createDeactivationSignal();
      }
    }

    // Handle title updates
    if (payload.title) {
      this.title = payload.title as string;
    }

    // Handle meta updates
    if (payload.meta) {
      this.meta = { ...this.meta, ...payload.meta as Record<string, string> };
    }

    // Handle activation/deactivation commands
    if (payload.activate === true) {
      this.active = true;
      return this.createActivationSignal();
    }

    if (payload.deactivate === true) {
      this.active = false;
      return this.createDeactivationSignal();
    }

    return null;
  }
}
