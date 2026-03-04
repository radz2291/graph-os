/**
 * Add Composite Reference MCP Tool
 * 
 * Adds a reference to a composite cartridge from a root cartridge.
 * 
 * @module @graph-os/mcp-tools
 */

import { BaseMCPTool, MCPToolDefinition, MCPToolResult } from '../../core/MCPTool';

interface SignalMapping {
  /** Signal type in parent cartridge */
  parentSignal: string;
  /** Signal type in composite */
  compositeSignal: string;
}

interface AddCompositeRefParams {
  /** Path to cartridge file */
  cartridgePath: string;
  /** Name of the composite to reference */
  compositeName: string;
  /** Path to the composite cartridge file */
  compositePath: string;
  /** Unique instance ID for this composite reference */
  instanceId?: string;
  /** Mapping of signals between parent and composite */
  signalMappings?: SignalMapping[];
}

interface AddCompositeRefResult {
  /** Cartridge path */
  cartridgePath: string;
  /** Composite name */
  compositeName: string;
  /** Instance ID */
  instanceId: string;
  /** Number of signal mappings */
  mappingCount: number;
}

/**
 * Tool for adding composite references to cartridges.
 * 
 * This tool enables composition - a core Graph-OS pattern where complex cartridges
 * are built from smaller, reusable composite cartridges.
 * 
 * @example
 * ```javascript
 * // Add a composite reference to the auth-validation composite
 * await registry.execute('add_composite_ref', {
 *   cartridgePath: './cartridges/root.cartridge.json',
 *   compositeName: 'auth-validation',
 *   compositePath: './composites/auth-validation.cartridge.json',
 *   instanceId: 'login-validation',
 *   signalMappings: [
 *     { parentSignal: 'UI.FORM_SUBMITTED', compositeSignal: 'AUTH.LOGIN_REQUEST' },
 *     { parentSignal: 'VALIDATION.SUCCESS', compositeSignal: 'AUTH.LOGIN_REQUEST' }
 *   ]
 * });
 * ```
 */
export class AddCompositeRefTool extends BaseMCPTool<AddCompositeRefParams, AddCompositeRefResult> {
  definition: MCPToolDefinition = {
    name: 'add_composite_ref',
    description: 'Adds a reference to a composite cartridge from a root cartridge, enabling composition of complex signal flows.',
    parameters: [
      {
        name: 'cartridgePath',
        type: 'string',
        required: true,
        description: 'Path to the cartridge file to modify',
      },
      {
        name: 'compositeName',
        type: 'string',
        required: true,
        description: 'Name of the composite to reference',
      },
      {
        name: 'compositePath',
        type: 'string',
        required: true,
        description: 'Path to the composite cartridge file',
      },
      {
        name: 'instanceId',
        type: 'string',
        required: false,
        description: 'Unique instance ID for this composite reference (auto-generated if not provided)',
      },
      {
        name: 'signalMappings',
        type: 'array',
        required: false,
        description: 'Mapping of signals between parent and composite',
      },
    ],
    returnType: 'AddCompositeRefResult',
  };

  async execute(params: AddCompositeRefParams): Promise<MCPToolResult<AddCompositeRefResult>> {
    try {
      const fs = await import('fs');
      
      // Check cartridge file exists
      if (!fs.existsSync(params.cartridgePath)) {
        return this.failure(`Cartridge file not found: ${params.cartridgePath}`);
      }

      // Check composite file exists
      if (!fs.existsSync(params.compositePath)) {
        return this.failure(`Composite file not found: ${params.compositePath}`);
      }

      // Load cartridge
      const cartridgeContent = fs.readFileSync(params.cartridgePath, 'utf-8');
      const cartridge = JSON.parse(cartridgeContent);

      // Load composite to validate
      const compositeContent = fs.readFileSync(params.compositePath, 'utf-8');
      const composite = JSON.parse(compositeContent);

      // Validate composite type
      if (composite.type !== 'composite') {
        return this.failure(`File is not a composite cartridge: ${params.compositePath}`);
      }

      // Generate instance ID if not provided
      const instanceId = params.instanceId || `${params.compositeName}-${Date.now()}`;

      // Initialize composites array if not exists
      if (!cartridge.composites) {
        cartridge.composites = [];
      }

      // Check for duplicate instance ID
      if (cartridge.composites.some((c: { instanceId: string }) => c.instanceId === instanceId)) {
        return this.failure(`Composite instance with ID "${instanceId}" already exists in cartridge`);
      }

      // Add composite reference
      const compositeRef = {
        instanceId,
        name: params.compositeName,
        path: params.compositePath,
        signalMappings: params.signalMappings || [],
        addedAt: new Date().toISOString(),
      };

      cartridge.composites.push(compositeRef);

      // Write back
      fs.writeFileSync(params.cartridgePath, JSON.stringify(cartridge, null, 2));

      return this.success({
        cartridgePath: params.cartridgePath,
        compositeName: params.compositeName,
        instanceId,
        mappingCount: params.signalMappings?.length || 0,
      });

    } catch (error) {
      return this.failure(`Failed to add composite reference: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
