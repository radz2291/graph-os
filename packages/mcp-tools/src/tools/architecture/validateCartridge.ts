/**
 * Validate Cartridge MCP Tool
 * 
 * Validates a cartridge using the comprehensive Graph-OS validation pipeline.
 * Performs deep validation including schema, size, hierarchy, registry, and signal checks.
 * 
 * @module @graph-os/mcp-tools
 */

import { BaseMCPTool, MCPToolDefinition, MCPToolResult } from '../../core/MCPTool';
import { ValidationPipeline, ValidationReport, SIZE_LIMITS } from '@graph-os/validators';
import type { Cartridge } from '@graph-os/core';

interface ValidateCartridgeParams {
  /** Path to cartridge file */
  cartridgePath: string;
  /** Path to signal registry (optional) */
  signalRegistryPath?: string;
  /** Path to composite registry (optional) */
  compositeRegistryPath?: string;
  /** Validate wire connections deeply */
  deepValidation?: boolean;
}

interface ValidateCartridgeResult {
  /** Whether validation passed */
  valid: boolean;
  /** Number of errors */
  errorCount: number;
  /** Number of warnings */
  warningCount: number;
  /** Error details */
  errors: Array<{
    code: string;
    message: string;
    path?: string;
    suggestion?: string;
  }>;
  /** Warning details */
  warnings: Array<{
    code: string;
    message: string;
    path?: string;
  }>;
  /** Summary statistics */
  summary: {
    nodeCount: number;
    wireCount: number;
    signalTypeCount: number;
    maxNodes: number;
    maxWires: number;
  };
  /** Detailed validation results */
  details: {
    schema: { valid: boolean; errorCount: number };
    size: { valid: boolean; errorCount: number };
    hierarchy: { valid: boolean; errorCount: number; hasCycles: boolean };
    registry: { valid: boolean; errorCount: number; missingSignals: string[] };
    signal: { valid: boolean; errorCount: number };
  };
}

/**
 * Tool for validating cartridges using the real validation pipeline.
 * 
 * This tool provides comprehensive validation including:
 * - Schema validation (JSON structure)
 * - Size validation (node/wire limits)
 * - Hierarchy validation (cycles, depth)
 * - Registry validation (signals, composites)
 * - Signal validation (naming conventions)
 */
export class ValidateCartridgeTool extends BaseMCPTool<ValidateCartridgeParams, ValidateCartridgeResult> {
  definition: MCPToolDefinition = {
    name: 'validate_cartridge',
    description: 'Validates a cartridge against all Graph-OS constraints using the comprehensive validation pipeline. Checks schema, size limits, hierarchy, registries, and signal naming.',
    parameters: [
      {
        name: 'cartridgePath',
        type: 'string',
        required: true,
        description: 'Path to the cartridge file to validate',
      },
      {
        name: 'signalRegistryPath',
        type: 'string',
        required: false,
        description: 'Path to signal registry file for signal validation',
      },
      {
        name: 'compositeRegistryPath',
        type: 'string',
        required: false,
        description: 'Path to composite registry file for composite validation',
      },
      {
        name: 'deepValidation',
        type: 'boolean',
        required: false,
        description: 'Enable deep wire connection validation (default: true)',
      },
    ],
    returnType: 'ValidateCartridgeResult',
    category: 'architecture',
    bestFor: ['validation', 'quality checks', 'error detection', 'constraint verification'],
    complexity: 'low'
  };

  async execute(params: ValidateCartridgeParams): Promise<MCPToolResult<ValidateCartridgeResult>> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      // Read cartridge
      if (!fs.existsSync(params.cartridgePath)) {
        return this.failure(`Cartridge file not found: ${params.cartridgePath}`);
      }

      const cartridgeContent = fs.readFileSync(params.cartridgePath, 'utf-8');
      let cartridge: Cartridge;

      try {
        cartridge = JSON.parse(cartridgeContent);
      } catch (parseError) {
        return this.failure(`Invalid JSON in cartridge file: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      // Create validation pipeline
      const pipeline = new ValidationPipeline();

      // Load signal registry if provided
      if (params.signalRegistryPath && fs.existsSync(params.signalRegistryPath)) {
        try {
          const registryContent = fs.readFileSync(params.signalRegistryPath, 'utf-8');
          const registry = JSON.parse(registryContent);

          // Support both array and object formats
          const signals = Array.isArray(registry) ? registry : (registry.signals || []);
          pipeline.loadSignalRegistry(signals);
        } catch (registryError) {
          // Continue without registry validation
          console.warn(`Could not load signal registry: ${registryError}`);
        }
      }

      // Load composite registry if provided
      if (params.compositeRegistryPath && fs.existsSync(params.compositeRegistryPath)) {
        try {
          const registryContent = fs.readFileSync(params.compositeRegistryPath, 'utf-8');
          const registry = JSON.parse(registryContent);

          // Support both array and object formats
          const composites = Array.isArray(registry) ? registry : (registry.composites || []);
          pipeline.loadCompositeRegistry(composites);
        } catch (registryError) {
          // Continue without composite validation
          console.warn(`Could not load composite registry: ${registryError}`);
        }
      }

      // Run validation
      const report = pipeline.validate(cartridge);

      // Perform additional deep validation if requested
      if (params.deepValidation !== false) {
        this.addDeepValidation(cartridge, report);
      }

      // Format result
      const result: ValidateCartridgeResult = {
        valid: report.valid,
        errorCount: report.errors.length,
        warningCount: report.warnings.length,
        errors: report.errors.map(e => ({
          code: e.code,
          message: e.message,
          path: e.path,
          suggestion: e.suggestion,
        })),
        warnings: report.warnings.map(w => ({
          code: w.code,
          message: w.message,
          path: w.path,
        })),
        summary: {
          nodeCount: report.summary.nodeCount,
          wireCount: report.summary.wireCount,
          signalTypeCount: report.summary.signalTypeCount,
          maxNodes: SIZE_LIMITS.MAX_NODES,
          maxWires: SIZE_LIMITS.MAX_WIRES,
        },
        details: {
          schema: {
            valid: report.schema.valid,
            errorCount: report.schema.errors.length,
          },
          size: {
            valid: report.size.valid,
            errorCount: report.size.errors.length,
          },
          hierarchy: {
            valid: report.hierarchy.valid,
            errorCount: report.hierarchy.errors.length,
            hasCycles: report.hierarchy.cycles && report.hierarchy.cycles.length > 0,
          },
          registry: {
            valid: report.registry.valid,
            errorCount: report.registry.errors.length,
            missingSignals: report.registry.missingSignals || [],
          },
          signal: {
            valid: report.signal.valid,
            errorCount: report.signal.errors.length,
          },
        },
      };

      return this.success(result);
    } catch (error) {
      return this.failure(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add deep validation checks for wire connections and node references.
   */
  private addDeepValidation(cartridge: Cartridge, report: ValidationReport): void {
    const nodeIds = new Set((cartridge.nodes || []).map(n => n.id));
    const nodeTypes = new Set((cartridge.nodes || []).map(n => n.type));

    // Known built-in node types and core namespaces
    const knownNodeTypes = new Set([
      'logic.validate',
      'logic.transform',
      'logic.domain-adapter',
      'control.input',
      'control.display',
      'infra.api.client',
      'infra.storage.local',
      'ui.component',
      'ui.layout',
      'ui.page',
      'ui.composite',
    ]);

    // Valid core extension prefixes
    const validPrefixes = [
      'logic.',
      'control.',
      'ui.',
      'infra.',
      'data.',
      'effect.'
    ];

    // Check for unknown node types
    for (const nodeType of nodeTypes) {
      if (!knownNodeTypes.has(nodeType)) {
        // Check if it's a valid extension namespace before throwing a warning
        const isCustomExtension = validPrefixes.some(prefix => nodeType.startsWith(prefix));

        if (!isCustomExtension) {
          report.warnings.push({
            code: 'UNKNOWN_NODE_TYPE',
            message: `Node type "${nodeType}" is not a built-in type or recognized core namespace. Ensure custom node is registered.`,
            path: `nodes[?type="${nodeType}"]`,
          });
        }
      }
    }

    // Check wire connections
    for (const wire of cartridge.wires || []) {
      // Check source node exists
      if (!nodeIds.has(wire.from)) {
        report.errors.push({
          code: 'INVALID_WIRE_SOURCE',
          message: `Wire source node "${wire.from}" does not exist`,
          path: `wires[from="${wire.from}"]`,
          suggestion: `Create node with id "${wire.from}" or fix the wire connection`,
        });
      }

      // Check target node exists
      if (!nodeIds.has(wire.to)) {
        report.errors.push({
          code: 'INVALID_WIRE_TARGET',
          message: `Wire target node "${wire.to}" does not exist`,
          path: `wires[to="${wire.to}"]`,
          suggestion: `Create node with id "${wire.to}" or fix the wire connection`,
        });
      }

      // Check for self-loops
      if (wire.from === wire.to) {
        report.warnings.push({
          code: 'SELF_LOOP',
          message: `Wire connects node "${wire.from}" to itself`,
          path: `wires[from="${wire.from}"]`,
        });
      }
    }

    // Check for isolated nodes (nodes with no connections)
    const connectedNodes = new Set<string>();
    for (const wire of cartridge.wires || []) {
      connectedNodes.add(wire.from);
      connectedNodes.add(wire.to);
    }

    for (const node of cartridge.nodes || []) {
      if (!connectedNodes.has(node.id)) {
        report.warnings.push({
          code: 'ISOLATED_NODE',
          message: `Node "${node.id}" has no wire connections`,
          path: `nodes[id="${node.id}"]`,
        });
      }
    }

    // Update validity based on new errors
    if (report.errors.length > 0) {
      (report as any).valid = false;
    }
  }
}
