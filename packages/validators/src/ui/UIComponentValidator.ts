/**
 * UI Component Validator - Validates React component references
 * 
 * @module @graph-os/validators
 */

import { Cartridge, CartridgeValidationError, CartridgeValidationWarning } from '@graph-os/core';

/**
 * Result of UI component validation.
 */
export interface UIComponentValidationResult {
  valid: boolean;
  errors: CartridgeValidationError[];
  warnings: CartridgeValidationWarning[];
  components: string[];
  layouts: string[];
  pages: string[];
}

/**
 * UIComponentValidator validates UI node configurations.
 */
export class UIComponentValidator {
  /**
   * Validates UI nodes in a cartridge.
   */
  validate(cartridge: Cartridge): UIComponentValidationResult {
    const errors: CartridgeValidationError[] = [];
    const warnings: CartridgeValidationWarning[] = [];
    const components: string[] = [];
    const layouts: string[] = [];
    const pages: string[] = [];

    // Find all UI nodes
    const uiNodes = cartridge.nodes.filter(n => n.type.startsWith('ui.'));

    for (const node of uiNodes) {
      const nodePath = `nodes.${node.id}`;

      switch (node.type) {
        case 'ui.component':
          components.push(node.id);
          this.validateComponentNode(node, nodePath, errors, warnings);
          break;

        case 'ui.layout':
          layouts.push(node.id);
          this.validateLayoutNode(node, nodePath, errors, warnings);
          break;

        case 'ui.page':
          pages.push(node.id);
          this.validatePageNode(node, nodePath, errors, warnings);
          break;

        default:
          warnings.push({
            code: 'UNKNOWN_UI_NODE_TYPE',
            message: `Unknown UI node type: ${node.type}`,
            path: nodePath,
          });
      }
    }

    // Validate layout references
    for (const layout of layouts) {
      const layoutNode = cartridge.nodes.find(n => n.id === layout);
      if (layoutNode?.config.children) {
        for (const childId of layoutNode.config.children as string[]) {
          if (!cartridge.nodes.find(n => n.id === childId)) {
            errors.push({
              code: 'INVALID_LAYOUT_CHILD',
              message: `Layout "${layout}" references non-existent child: ${childId}`,
              path: `nodes.${layout}.config.children`,
              suggestion: 'Ensure all child IDs reference valid nodes',
            });
          }
        }
      }
    }

    // Validate page layout references
    for (const page of pages) {
      const pageNode = cartridge.nodes.find(n => n.id === page);
      if (pageNode?.config.layoutId) {
        if (!layouts.includes(pageNode.config.layoutId as string)) {
          errors.push({
            code: 'INVALID_PAGE_LAYOUT',
            message: `Page "${page}" references non-existent layout: ${pageNode.config.layoutId}`,
            path: `nodes.${page}.config.layoutId`,
            suggestion: 'Ensure layoutId references a valid ui.layout node',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      components,
      layouts,
      pages,
    };
  }

  /**
   * Validates a component node.
   */
  private validateComponentNode(
    node: { id: string; type: string; config: Record<string, unknown> },
    nodePath: string,
    errors: CartridgeValidationError[],
    warnings: CartridgeValidationWarning[]
  ): void {
    if (!node.config.componentName) {
      errors.push({
        code: 'MISSING_COMPONENT_NAME',
        message: `Component node "${node.id}" is missing componentName`,
        path: `${nodePath}.config.componentName`,
        suggestion: 'Add componentName to the node config',
      });
    }

    if (node.config.events && !Array.isArray(node.config.events)) {
      errors.push({
        code: 'INVALID_EVENTS_CONFIG',
        message: `Component node "${node.id}" has invalid events config`,
        path: `${nodePath}.config.events`,
        suggestion: 'events should be an array of { name, signalType }',
      });
    }
  }

  /**
   * Validates a layout node.
   */
  private validateLayoutNode(
    node: { id: string; type: string; config: Record<string, unknown> },
    nodePath: string,
    errors: CartridgeValidationError[],
    warnings: CartridgeValidationWarning[]
  ): void {
    const validLayoutTypes = ['flex', 'grid', 'stack', 'custom'];
    if (node.config.layoutType && !validLayoutTypes.includes(node.config.layoutType as string)) {
      warnings.push({
        code: 'UNKNOWN_LAYOUT_TYPE',
        message: `Layout node "${node.id}" has unknown layoutType: ${node.config.layoutType}`,
        path: `${nodePath}.config.layoutType`,
      });
    }
  }

  /**
   * Validates a page node.
   */
  private validatePageNode(
    node: { id: string; type: string; config: Record<string, unknown> },
    nodePath: string,
    errors: CartridgeValidationError[],
    warnings: CartridgeValidationWarning[]
  ): void {
    if (!node.config.route) {
      errors.push({
        code: 'MISSING_PAGE_ROUTE',
        message: `Page node "${node.id}" is missing route`,
        path: `${nodePath}.config.route`,
        suggestion: 'Add route to the node config (e.g., "/home")',
      });
    } else if (typeof node.config.route !== 'string' || !node.config.route.startsWith('/')) {
      warnings.push({
        code: 'INVALID_ROUTE_FORMAT',
        message: `Page node "${node.id}" has invalid route format: ${node.config.route}`,
        path: `${nodePath}.config.route`,
      });
    }
  }
}
