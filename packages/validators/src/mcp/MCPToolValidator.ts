/**
 * MCP Tool Validator - Validates MCP tool configurations
 * 
 * @module @graph-os/validators
 */

import { Cartridge, CartridgeValidationError, CartridgeValidationWarning } from '@graph-os/core';

/**
 * Result of MCP tool validation.
 */
export interface MCPToolValidationResult {
  valid: boolean;
  errors: CartridgeValidationError[];
  warnings: CartridgeValidationWarning[];
  tools: string[];
}

/**
 * MCPToolValidator validates MCP tool configurations.
 */
export class MCPToolValidator {
  /**
   * Validates MCP tool configurations in a cartridge.
   */
  validate(cartridge: Cartridge): MCPToolValidationResult {
    const errors: CartridgeValidationError[] = [];
    const warnings: CartridgeValidationWarning[] = [];
    const tools: string[] = [];

    // Check for MCP-related metadata
    const metadata = (cartridge as unknown as Record<string, unknown>).__mcp__;
    if (metadata) {
      this.validateMCPMetadata(metadata as Record<string, unknown>, errors, warnings);
    }

    // Check nodes for MCP-related types
    for (const node of cartridge.nodes) {
      if (node.type.startsWith('mcp.')) {
        tools.push(node.id);
        this.validateMCPNode(node, `nodes.${node.id}`, errors, warnings);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      tools,
    };
  }

  /**
   * Validates MCP metadata.
   */
  private validateMCPMetadata(
    metadata: Record<string, unknown>,
    errors: CartridgeValidationError[],
    warnings: CartridgeValidationWarning[]
  ): void {
    if (metadata.tools && !Array.isArray(metadata.tools)) {
      errors.push({
        code: 'INVALID_MCP_TOOLS',
        message: 'MCP tools must be an array',
        path: '__mcp__.tools',
      });
    }

    if (metadata.tools) {
      for (const tool of metadata.tools as Record<string, unknown>[]) {
        if (!tool.name) {
          errors.push({
            code: 'MISSING_TOOL_NAME',
            message: 'MCP tool is missing name',
            path: '__mcp__.tools',
          });
        }

        if (!tool.description) {
          warnings.push({
            code: 'MISSING_TOOL_DESCRIPTION',
            message: `MCP tool "${tool.name || 'unknown'}" is missing description`,
            path: '__mcp__.tools',
          });
        }
      }
    }
  }

  /**
   * Validates an MCP node.
   */
  private validateMCPNode(
    node: { id: string; type: string; config: Record<string, unknown> },
    nodePath: string,
    errors: CartridgeValidationError[],
    warnings: CartridgeValidationWarning[]
  ): void {
    // MCP nodes should have tool name
    if (!node.config.toolName) {
      errors.push({
        code: 'MISSING_TOOL_NAME',
        message: `MCP node "${node.id}" is missing toolName`,
        path: `${nodePath}.config.toolName`,
        suggestion: 'Add toolName to specify which MCP tool to use',
      });
    }

    // Parameters should be an object
    if (node.config.parameters && typeof node.config.parameters !== 'object') {
      errors.push({
        code: 'INVALID_TOOL_PARAMETERS',
        message: `MCP node "${node.id}" has invalid parameters`,
        path: `${nodePath}.config.parameters`,
        suggestion: 'parameters should be an object',
      });
    }
  }
}
