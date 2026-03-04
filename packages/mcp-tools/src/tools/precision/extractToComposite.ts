/**
 * extract_to_composite - Automatic composite extraction from node clusters
 *
 * This tool enables automatic refactoring by extracting node clusters
 * into reusable composite cartridges:
 * - Boundary detection (input/output signals, side effects)
 * - Composite generation and validation
 * - Parent graph healing
 * - Dry run mode for preview
 * - Conflict detection
 *
 * @module @graph-os/mcp-tools/precision
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MCPToolResult, MCPToolDefinition } from '../../core/MCPTool';
import type {
  Cartridge,
  SignalRegistry,
  CompositeRegistry,
  NodeDefinition,
  WireDefinition,
  SignalDefinition,
  CompositeDefinition
} from '../../core/ConflictDetector';

// =============================================================================
// Types
// =============================================================================

export type SignalType = string;

export interface SideEffect {
  signalType: SignalType;
  fromNode: string;
  toNode: string;
  reason: string;
}

export interface Boundaries {
  inputSignals: SignalType[];
  outputSignals: SignalType[];
  internalSignals: SignalType[];
  sideEffects: SideEffect[];
}

export interface ExtractCompositeRequest {
  /** Path to the cartridge file */
  cartridgePath: string;
  /** Node IDs to extract into composite */
  nodes: string[];
  /** Name for the new composite */
  compositeName: string;
  /** Output path for the composite file */
  outputPath?: string;
  /** Auto-register composite in registry */
  autoRegister?: boolean;
  /** Path to composite registry */
  compositeRegistryPath?: string;
  /** Heal parent graph after extraction */
  healParentGraph?: boolean;
  /** Include side effects in composite */
  includeSideEffects?: boolean;
  /** Description for the composite */
  description?: string;
  /** Dry run mode - preview without writing */
  dryRun?: boolean;
  /** Signal registry path for validation */
  signalRegistryPath?: string;
}

export interface ExtractedComposite {
  name: string;
  path: string;
  description?: string;
  nodes: NodeDefinition[];
  wires: WireDefinition[];
  inputs: SignalType[];
  outputs: SignalType[];
  internalSignals: SignalType[];
  sideEffects: SideEffect[];
}

export interface ParentGraphChanges {
  removedNodes: string[];
  removedWires: WireDefinition[];
  addedNode: NodeDefinition;
  addedWires: WireDefinition[];
  modifiedWires: WireDefinition[];
}

export interface ExtractCompositeResult {
  success: boolean;
  composite?: ExtractedComposite;
  parentChanges?: ParentGraphChanges;
  boundaries?: Boundaries;
  warnings: string[];
  errors: string[];
  dryRun: boolean;
  preview?: {
    compositeCartridge: string;
    parentCartridgeBefore: string;
    parentCartridgeAfter: string;
  };
}

export interface NameCollision {
  type: 'composite' | 'node' | 'signal';
  name: string;
  location: string;
}

export interface CircularDependency {
  path: string[];
  signal: string;
}

// =============================================================================
// ExtractToCompositeTool Class
// =============================================================================

export class ExtractToCompositeTool {
  readonly definition: MCPToolDefinition = {
    name: 'extract_to_composite',
    description: 'Extracts a cluster of nodes from a cartridge into a reusable composite. Automatically detects boundaries, generates composite definition, and heals parent graph.',
    parameters: [
      {
        name: 'cartridgePath',
        type: 'string',
        required: true,
        description: 'Path to the cartridge file to extract from'
      },
      {
        name: 'nodes',
        type: 'array',
        required: true,
        description: 'Array of node IDs to extract into the composite'
      },
      {
        name: 'compositeName',
        type: 'string',
        required: true,
        description: 'Name for the new composite (kebab-case)'
      },
      {
        name: 'outputPath',
        type: 'string',
        required: false,
        description: 'Output path for the composite file (default: ./composites/<name>.json)'
      },
      {
        name: 'autoRegister',
        type: 'boolean',
        required: false,
        description: 'Auto-register composite in registry (default: true)'
      },
      {
        name: 'compositeRegistryPath',
        type: 'string',
        required: false,
        description: 'Path to composite registry for auto-registration'
      },
      {
        name: 'healParentGraph',
        type: 'boolean',
        required: false,
        description: 'Heal parent graph after extraction (default: true)'
      },
      {
        name: 'includeSideEffects',
        type: 'boolean',
        required: false,
        description: 'Include side effect signals in composite (default: false)'
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        description: 'Description for the composite'
      },
      {
        name: 'dryRun',
        type: 'boolean',
        required: false,
        description: 'Preview changes without writing (default: false)'
      },
      {
        name: 'signalRegistryPath',
        type: 'string',
        required: false,
        description: 'Path to signal registry for validation'
      }
    ],
    returnType: 'ExtractCompositeResult',
    category: 'precision',
    bestFor: ['refactoring', 'code organization', 'reusability', 'modularization'],
    deprecates: ['create_composite', 'add_composite_ref'],
    complexity: 'high'
  };

  async execute(input: ExtractCompositeRequest): Promise<MCPToolResult<ExtractCompositeResult>> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Validate input
      if (!input.nodes || input.nodes.length === 0) {
        return {
          success: false,
          error: 'No nodes specified for extraction',
          data: {
            success: false,
            warnings,
            errors: ['No nodes specified for extraction'],
            dryRun: input.dryRun || false
          }
        };
      }

      // Load cartridge
      if (!fs.existsSync(input.cartridgePath)) {
        return {
          success: false,
          error: `Cartridge not found: ${input.cartridgePath}`,
          data: {
            success: false,
            warnings,
            errors: [`Cartridge not found: ${input.cartridgePath}`],
            dryRun: input.dryRun || false
          }
        };
      }

      const cartridge: Cartridge = JSON.parse(fs.readFileSync(input.cartridgePath, 'utf-8'));
      const parentCartridgeBefore = JSON.stringify(cartridge, null, 2);

      // Validate nodes exist
      const missingNodes = input.nodes.filter(nodeId =>
        !cartridge.nodes.find(n => n.id === nodeId)
      );

      if (missingNodes.length > 0) {
        return {
          success: false,
          error: `Nodes not found: ${missingNodes.join(', ')}`,
          data: {
            success: false,
            warnings,
            errors: [`Nodes not found: ${missingNodes.join(', ')}`],
            dryRun: input.dryRun || false
          }
        };
      }

      // Detect boundaries
      const boundaries = this.detectBoundaries(cartridge, input.nodes);

      // Check for side effects
      if (boundaries.sideEffects.length > 0 && !input.includeSideEffects) {
        warnings.push(
          `Found ${boundaries.sideEffects.length} side effect(s). ` +
          `Set includeSideEffects=true to include them.`
        );
      }

      // Check for name collisions
      const collisions = await this.detectNameCollisions(
        input.compositeName,
        input.compositeRegistryPath,
        cartridge
      );

      if (collisions.length > 0) {
        for (const collision of collisions) {
          errors.push(
            `Name collision: '${collision.name}' already exists as ${collision.type} in ${collision.location}`
          );
        }
      }

      // Check for circular dependencies
      const circularDeps = this.detectCircularDependencies(cartridge, input.nodes, boundaries);

      if (circularDeps.length > 0) {
        for (const dep of circularDeps) {
          warnings.push(
            `Potential circular dependency via signal '${dep.signal}' on path: ${dep.path.join(' -> ')}`
          );
        }
      }

      // If errors, return failure
      if (errors.length > 0) {
        return {
          success: false,
          error: errors.join('; '),
          data: {
            success: false,
            boundaries,
            warnings,
            errors,
            dryRun: input.dryRun || false
          }
        };
      }

      // Generate composite
      const composite = this.generateComposite(
        cartridge,
        input.nodes,
        boundaries,
        input.compositeName,
        input.description
      );

      // Calculate parent graph changes
      const parentChanges = this.calculateParentChanges(
        cartridge,
        input.nodes,
        boundaries,
        input.compositeName,
        input.outputPath
      );

      // Dry run mode - return preview
      if (input.dryRun) {
        const healedCartridge = this.applyParentChanges(cartridge, parentChanges);

        return {
          success: true,
          data: {
            success: true,
            composite,
            parentChanges,
            boundaries,
            warnings,
            errors,
            dryRun: true,
            preview: {
              compositeCartridge: JSON.stringify(composite, null, 2),
              parentCartridgeBefore,
              parentCartridgeAfter: JSON.stringify(healedCartridge, null, 2)
            }
          }
        };
      }

      // Determine output path
      const outputPath = input.outputPath ||
        path.join(path.dirname(input.cartridgePath), 'composites', `${input.compositeName}.json`);

      // Ensure directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write composite file
      const compositeCartridge: Cartridge = {
        version: '2.0.0',
        name: composite.name,
        description: composite.description,
        nodes: composite.nodes,
        wires: composite.wires
      };

      fs.writeFileSync(outputPath, JSON.stringify(compositeCartridge, null, 2));
      composite.path = outputPath;

      // Auto-register composite
      if (input.autoRegister !== false && input.compositeRegistryPath) {
        await this.registerComposite(
          composite,
          input.compositeRegistryPath
        );
      }

      // Heal parent graph
      if (input.healParentGraph !== false) {
        const healedCartridge = this.applyParentChanges(cartridge, parentChanges);
        fs.writeFileSync(input.cartridgePath, JSON.stringify(healedCartridge, null, 2));
      }

      return {
        success: true,
        data: {
          success: true,
          composite,
          parentChanges,
          boundaries,
          warnings,
          errors,
          dryRun: false
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: {
          success: false,
          warnings,
          errors: [error instanceof Error ? error.message : String(error)],
          dryRun: input.dryRun || false
        }
      };
    }
  }

  // ===========================================================================
  // Boundary Detection
  // ===========================================================================

  private detectBoundaries(cartridge: Cartridge, nodeIds: string[]): Boundaries {
    const nodeSet = new Set(nodeIds);

    const inputSignals: SignalType[] = [];
    const outputSignals: SignalType[] = [];
    const internalSignals: SignalType[] = [];
    const sideEffects: SideEffect[] = [];

    // Analyze all wires
    for (const wire of cartridge.wires) {
      const fromInside = nodeSet.has(wire.from);
      const toInside = nodeSet.has(wire.to);

      if (fromInside && toInside) {
        // Internal wire
        if (!internalSignals.includes(wire.signalType)) {
          internalSignals.push(wire.signalType);
        }
      } else if (!fromInside && toInside) {
        // Input wire (from outside to inside)
        if (!inputSignals.includes(wire.signalType)) {
          inputSignals.push(wire.signalType);
        }
      } else if (fromInside && !toInside) {
        // Wire from inside to outside - could be output or side effect
        // Output signals go to specific output nodes
        // Side effects go to nodes that are not part of the normal output flow

        // Check if this is a side effect
        const targetNode = cartridge.nodes.find(n => n.id === wire.to);
        const isSideEffect = this.isSideEffectNode(targetNode?.type);

        if (isSideEffect) {
          sideEffects.push({
            signalType: wire.signalType,
            fromNode: wire.from,
            toNode: wire.to,
            reason: `Target node type '${targetNode?.type}' indicates side effect`
          });
        } else {
          if (!outputSignals.includes(wire.signalType)) {
            outputSignals.push(wire.signalType);
          }
        }
      }
    }

    return {
      inputSignals,
      outputSignals,
      internalSignals,
      sideEffects
    };
  }

  private isSideEffectNode(nodeType?: string): boolean {
    if (!nodeType) return false;
    // Nodes that typically indicate side effects
    const sideEffectTypes = [
      'io.log',
      'io.http',
      'io.database',
      'io.file',
      'io.email',
      'io.notification',
      'effect.side'
    ];
    return sideEffectTypes.some(type => nodeType.startsWith(type) || nodeType === type);
  }

  // ===========================================================================
  // Composite Generation
  // ===========================================================================

  private generateComposite(
    cartridge: Cartridge,
    nodeIds: string[],
    boundaries: Boundaries,
    name: string,
    description?: string
  ): ExtractedComposite {
    const nodeSet = new Set(nodeIds);

    // Extract nodes
    const nodes = cartridge.nodes.filter(n => nodeSet.has(n.id));

    // Extract internal wires
    const wires = cartridge.wires.filter(w =>
      nodeSet.has(w.from) && nodeSet.has(w.to)
    );

    // Determine output path
    const outputPath = `./composites/${name}.json`;

    return {
      name,
      path: outputPath,
      description: description || `Extracted composite from ${cartridge.name}`,
      nodes,
      wires,
      inputs: boundaries.inputSignals,
      outputs: boundaries.outputSignals,
      internalSignals: boundaries.internalSignals,
      sideEffects: boundaries.sideEffects
    };
  }

  // ===========================================================================
  // Parent Graph Healing
  // ===========================================================================

  private calculateParentChanges(
    cartridge: Cartridge,
    nodeIds: string[],
    boundaries: Boundaries,
    compositeName: string,
    compositePath?: string
  ): ParentGraphChanges {
    const nodeSet = new Set(nodeIds);
    const removedNodes = [...nodeIds];

    // Find wires to remove (internal to cluster)
    const removedWires = cartridge.wires.filter(w =>
      nodeSet.has(w.from) && nodeSet.has(w.to)
    );

    // Create composite node
    const compositeNodeId = `composite-${compositeName.replace(/_/g, '-')}`;
    const addedNode: NodeDefinition = {
      id: compositeNodeId,
      type: 'ui.composite',
      config: {
        ref: compositePath || `./composites/${compositeName}.json`,
        inputs: boundaries.inputSignals,
        outputs: boundaries.outputSignals
      }
    };

    // Create new wires to connect composite node
    const addedWires: WireDefinition[] = [];
    const modifiedWires: WireDefinition[] = [];

    // Find input wires (from outside to cluster nodes)
    for (const wire of cartridge.wires) {
      if (!nodeSet.has(wire.from) && nodeSet.has(wire.to)) {
        // Redirect to composite node
        addedWires.push({
          from: wire.from,
          to: compositeNodeId,
          signalType: wire.signalType
        });
      }
    }

    // Find output wires (from cluster nodes to outside)
    for (const wire of cartridge.wires) {
      if (nodeSet.has(wire.from) && !nodeSet.has(wire.to)) {
        // Redirect from composite node
        addedWires.push({
          from: compositeNodeId,
          to: wire.to,
          signalType: wire.signalType
        });
      }
    }

    return {
      removedNodes,
      removedWires,
      addedNode,
      addedWires,
      modifiedWires
    };
  }

  private applyParentChanges(
    cartridge: Cartridge,
    changes: ParentGraphChanges
  ): Cartridge {
    const removedNodeSet = new Set(changes.removedNodes);

    // Remove cluster nodes
    const nodes = cartridge.nodes.filter(n => !removedNodeSet.has(n.id));

    // Add composite node
    nodes.push(changes.addedNode);

    // Keep wires that do NOT connect TO or FROM an extracted node
    // AND then append the gracefully re-routed `addedWires`.
    let wires = cartridge.wires.filter(w => {
      // If the wire is completely external to the extracted nodes, keep it
      if (!removedNodeSet.has(w.from) && !removedNodeSet.has(w.to)) {
        return true;
      }
      return false; // Otherwise it's either purely internal, or crossed a boundary. Boundary crossing wires are handled by `addedWires`.
    });

    // Add new wires connecting to composite
    wires = [...wires, ...changes.addedWires];

    return {
      ...cartridge,
      nodes,
      wires
    };
  }

  // ===========================================================================
  // Conflict Detection
  // ===========================================================================

  private async detectNameCollisions(
    compositeName: string,
    compositeRegistryPath?: string,
    cartridge?: Cartridge
  ): Promise<NameCollision[]> {
    const collisions: NameCollision[] = [];

    // Check composite registry
    if (compositeRegistryPath && fs.existsSync(compositeRegistryPath)) {
      try {
        const registry: CompositeRegistry = JSON.parse(
          fs.readFileSync(compositeRegistryPath, 'utf-8')
        );
        if (registry.composites?.find(c => c.name === compositeName)) {
          collisions.push({
            type: 'composite',
            name: compositeName,
            location: compositeRegistryPath
          });
        }
      } catch {
        // Ignore registry read errors
      }
    }

    // Check cartridge nodes
    if (cartridge) {
      const kebabName = compositeName.replace(/_/g, '-');
      if (cartridge.nodes.find(n => n.id === `composite-${kebabName}`)) {
        collisions.push({
          type: 'node',
          name: `composite-${kebabName}`,
          location: 'cartridge nodes'
        });
      }
    }

    return collisions;
  }

  private detectCircularDependencies(
    cartridge: Cartridge,
    nodeIds: string[],
    boundaries: Boundaries
  ): CircularDependency[] {
    const circularDeps: CircularDependency[] = [];
    const nodeSet = new Set(nodeIds);

    // Check if any output signals loop back as inputs
    for (const output of boundaries.outputSignals) {
      for (const input of boundaries.inputSignals) {
        if (output === input) {
          // Potential circular dependency
          circularDeps.push({
            path: nodeIds,
            signal: output
          });
        }
      }
    }

    return circularDeps;
  }

  // ===========================================================================
  // Registry Registration
  // ===========================================================================

  private async registerComposite(
    composite: ExtractedComposite,
    registryPath: string
  ): Promise<void> {
    let registry: CompositeRegistry = { composites: [] };

    // Load existing registry
    if (fs.existsSync(registryPath)) {
      try {
        registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      } catch {
        // Start with empty registry
      }
    }

    // Ensure composites array exists
    if (!registry.composites) {
      registry.composites = [];
    }

    // Check if composite already exists
    const existingIndex = registry.composites.findIndex(c => c.name === composite.name);

    const compositeDef: CompositeDefinition = {
      name: composite.name,
      path: composite.path,
      inputs: composite.inputs,
      outputs: composite.outputs,
      nodes: composite.nodes,
      wires: composite.wires
    };

    if (existingIndex >= 0) {
      // Update existing
      registry.composites[existingIndex] = compositeDef;
    } else {
      // Add new
      registry.composites.push(compositeDef);
    }

    // Write registry
    const registryDir = path.dirname(registryPath);
    if (!fs.existsSync(registryDir)) {
      fs.mkdirSync(registryDir, { recursive: true });
    }

    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  }

  validateParams(params: unknown): params is ExtractCompositeRequest {
    if (typeof params !== 'object' || params === null) return false;
    const p = params as Record<string, unknown>;
    return (
      typeof p.cartridgePath === 'string' &&
      Array.isArray(p.nodes) &&
      typeof p.compositeName === 'string'
    );
  }
}

/**
 * Factory function to create an ExtractToCompositeTool instance
 */
export function createExtractToCompositeTool(): ExtractToCompositeTool {
  return new ExtractToCompositeTool();
}
