/**
 * Create Composite MCP Tool
 * 
 * Creates a composite cartridge that can be referenced by other cartridges.
 * Composables enable reusable signal flow patterns.
 * 
 * @module @graph-os/mcp-tools
 */

import { BaseMCPTool, MCPToolDefinition, MCPToolResult } from '../../core/MCPTool';

interface CompositeInput {
  /** Input signal types the composite accepts */
  signalType: string;
  /** Description of the input */
  description?: string;
}

interface CompositeOutput {
  /** Output signal types the composite emits */
  signalType: string;
  /** Description of the output */
  description?: string;
}

interface CompositeRegistry {
  version: string;
  composites: CompositeEntry[];
}

interface CompositeEntry {
  id: string;           // Pattern: composite.[name]
  name: string;         // e.g. "auth-flow"
  description: string;
  path: string;         // Relative path
  nodeCount: number;
  wireCount?: number;
  inputs?: string[];    // Extracted from params
  outputs?: string[];   // Extracted from params
  registeredAt?: string;
}

interface CreateCompositeParams {
  /** Composite name */
  name: string;
  /** Composite description */
  description: string;
  /** Output path for the composite file */
  outputPath: string;
  /** Input signal types the composite accepts */
  inputs: CompositeInput[];
  /** Output signal types the composite emits */
  outputs: CompositeOutput[];
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
  /** Optional path override for composite-registry.json */
  registryPath?: string;
}

interface CreateCompositeResult {
  /** Path to created composite */
  path: string;
  /** Composite name */
  name: string;
  /** Number of inputs */
  inputCount: number;
  /** Number of outputs */
  outputCount: number;
  /** Number of nodes */
  nodeCount: number;
  /** Number of wires */
  wireCount: number;
}

/**
 * Tool for creating composite cartridges.
 * 
 * Composites are reusable cartridges that can be referenced by other cartridges.
 * They define clear input/output signal contracts and encapsulate implementation details.
 * 
 * @example
 * ```javascript
 * // Create a validation composite
 * await registry.execute('create_composite', {
 *   name: 'auth-validation',
 *   description: 'Email and password validation',
 *   outputPath: './composites/auth-validation.cartridge.json',
 *   inputs: [
 *     { signalType: 'AUTH.LOGIN_REQUEST', description: 'Login credentials to validate' }
 *   ],
 *   outputs: [
 *     { signalType: 'VALIDATION.SUCCESS', description: 'Credentials are valid' },
 *     { signalType: 'VALIDATION.FAILURE', description: 'Validation failed' }
 *   ],
 *   nodes: [...],
 *   wires: [...]
 * });
 * ```
 */
export class CreateCompositeTool extends BaseMCPTool<CreateCompositeParams, CreateCompositeResult> {
  definition: MCPToolDefinition = {
    name: 'create_composite',
    description: 'Creates a composite cartridge that can be referenced by other cartridges. Composables enable reusable signal flow patterns.',
    parameters: [
      {
        name: 'name',
        type: 'string',
        required: true,
        description: 'Composite name in kebab-case (e.g., "auth-validation")',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        description: 'Human-readable description of the composite',
      },
      {
        name: 'outputPath',
        type: 'string',
        required: true,
        description: 'File path where composite will be saved',
      },
      {
        name: 'inputs',
        type: 'array',
        required: true,
        description: 'Input signal types the composite accepts (defines the contract)',
      },
      {
        name: 'outputs',
        type: 'array',
        required: true,
        description: 'Output signal types the composite emits (defines the contract)',
      },
      {
        name: 'nodes',
        type: 'array',
        required: false,
        description: 'Initial node definitions to include',
      },
      {
        name: 'wires',
        type: 'array',
        required: false,
        description: 'Initial wire connections to include',
      },
      {
        name: 'registryPath',
        type: 'string',
        required: false,
        description: 'Optional path override for composite-registry.json',
      }
    ],
    returnType: 'CreateCompositeResult',
    category: 'composite',
    bestFor: ['reusable components', 'modular architecture', 'encapsulation', 'pattern reuse'],
    complexity: 'medium'
  };

  async execute(params: CreateCompositeParams): Promise<MCPToolResult<CreateCompositeResult>> {
    // Validate inputs and outputs
    if (!params.inputs || params.inputs.length === 0) {
      return this.failure('Composite must have at least one input signal');
    }
    if (!params.outputs || params.outputs.length === 0) {
      return this.failure('Composite must have at least one output signal');
    }

    const composite = {
      version: '1.0.0',
      type: 'composite',
      name: params.name,
      description: params.description,
      inputs: params.inputs,
      outputs: params.outputs,
      nodes: params.nodes || [],
      wires: params.wires || [],
      metadata: {
        createdAt: new Date().toISOString(),
        graphOsVersion: '1.0.0',
      },
    };

    try {
      const fs = await import('fs');
      const path = await import('path');

      // Ensure directory exists
      const dir = path.dirname(params.outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write composite file
      fs.writeFileSync(
        params.outputPath,
        JSON.stringify(composite, null, 2)
      );

      // Post-Write Registration Step
      let registryPath = params.registryPath;
      if (!registryPath) {
        // Heuristic: 2 directories up from the composite file -> registries/
        registryPath = path.resolve(path.dirname(params.outputPath), '../../registries/composite-registry.json');
      }

      try {
        const registryDir = path.dirname(registryPath);
        if (!fs.existsSync(registryDir)) {
          fs.mkdirSync(registryDir, { recursive: true });
        }

        let registry: CompositeRegistry;
        if (fs.existsSync(registryPath)) {
          const content = fs.readFileSync(registryPath, 'utf8');
          registry = JSON.parse(content);
        } else {
          registry = { version: "1.0.0", composites: [] };
        }

        const compositeId = `composite.${params.name}`;
        let relativePath = path.relative(path.dirname(registryPath), path.resolve(params.outputPath));
        relativePath = relativePath.split(path.sep).join('/');
        if (!relativePath.startsWith('.')) {
          relativePath = './' + relativePath;
        }

        const newEntry: CompositeEntry = {
          id: compositeId,
          name: params.name,
          description: params.description,
          path: relativePath,
          nodeCount: composite.nodes.length,
          wireCount: composite.wires.length,
          inputs: params.inputs.map(i => i.signalType),
          outputs: params.outputs.map(o => o.signalType),
          registeredAt: new Date().toISOString()
        };

        const existingIndex = registry.composites.findIndex((c: CompositeEntry) => c.id === compositeId || c.name === params.name);
        if (existingIndex >= 0) {
          registry.composites[existingIndex] = { ...registry.composites[existingIndex], ...newEntry };
        } else {
          registry.composites.push(newEntry);
        }

        fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
      } catch (registryError) {
        return this.failure(`Composite created at ${params.outputPath}, but failed to update registry at ${registryPath}: ${registryError instanceof Error ? registryError.message : String(registryError)}`);
      }

      return this.success({
        path: params.outputPath,
        name: params.name,
        inputCount: params.inputs.length,
        outputCount: params.outputs.length,
        nodeCount: composite.nodes.length,
        wireCount: composite.wires.length,
      });
    } catch (error) {
      return this.failure(`Failed to create composite: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
