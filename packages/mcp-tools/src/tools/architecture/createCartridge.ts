/**
 * Create Cartridge MCP Tool
 * 
 * Creates a new cartridge file with proper structure.
 * 
 * @module @graph-os/mcp-tools
 */

import { BaseMCPTool, MCPToolDefinition, MCPToolResult } from '../../core/MCPTool';

interface Cartridge {
  version: string;
  name: string;
  description: string;
  inputs: unknown[];
  outputs: unknown[];
  nodes: unknown[];
  wires: unknown[];
}

interface CreateCartridgeParams {
  /** Cartridge name */
  name: string;
  /** Cartridge description */
  description: string;
  /** Output path for the cartridge file */
  outputPath: string;
  /** Initial nodes (optional) */
  nodes?: Array<{
    id: string;
    type: string;
    description: string;
    config: Record<string, unknown>;
  }>;
  /** Initial wires (optional) */
  wires?: Array<{
    from: string;
    to: string;
    signalType: string;
  }>;
}

interface CreateCartridgeResult {
  /** Path to created cartridge */
  path: string;
  /** Cartridge name */
  name: string;
  /** Number of nodes */
  nodeCount: number;
  /** Number of wires */
  wireCount: number;
}

/**
 * Tool for creating cartridges.
 */
export class CreateCartridgeTool extends BaseMCPTool<CreateCartridgeParams, CreateCartridgeResult> {
  definition: MCPToolDefinition = {
    name: 'create_cartridge',
    description: 'Creates a new Graph-OS cartridge file with proper structure',
    parameters: [
      {
        name: 'name',
        type: 'string',
        required: true,
        description: 'Cartridge name (kebab-case)',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        description: 'Cartridge description',
      },
      {
        name: 'outputPath',
        type: 'string',
        required: true,
        description: 'Output path for the cartridge file',
      },
      {
        name: 'nodes',
        type: 'array',
        required: false,
        description: 'Initial node definitions',
      },
      {
        name: 'wires',
        type: 'array',
        required: false,
        description: 'Initial wire definitions',
      },
    ],
    returnType: 'CreateCartridgeResult',
    category: 'architecture',
    bestFor: ['cartridge initialization', 'project setup', 'application scaffolding'],
    complexity: 'low'
  };

  async execute(params: CreateCartridgeParams): Promise<MCPToolResult<CreateCartridgeResult>> {
    const cartridge: Cartridge = {
      version: '1.0.0',
      name: params.name,
      description: params.description,
      inputs: [],
      outputs: [],
      nodes: params.nodes || [],
      wires: params.wires || [],
    };

    try {
      const fs = await import('fs');
      const path = await import('path');
      
      // Ensure directory exists
      const dir = path.dirname(params.outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write cartridge file
      fs.writeFileSync(
        params.outputPath,
        JSON.stringify(cartridge, null, 2)
      );

      return this.success({
        path: params.outputPath,
        name: params.name,
        nodeCount: cartridge.nodes.length,
        wireCount: cartridge.wires.length,
      });
    } catch (error) {
      return this.failure(`Failed to create cartridge: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
