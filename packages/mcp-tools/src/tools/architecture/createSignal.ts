/**
 * Create Signal MCP Tool
 * 
 * Registers a new signal in the signal registry.
 * 
 * @module @graph-os/mcp-tools
 */

import { BaseMCPTool, MCPToolDefinition, MCPToolResult } from '../../core/MCPTool';

interface CreateSignalParams {
  /** Signal type (NAMESPACE.ACTION) */
  type: string;
  /** Signal description */
  description: string;
  /** Path to signal registry file */
  registryPath: string;
  /** Payload schema (optional) */
  payloadSchema?: Record<string, unknown>;
  /** Node types that emit this signal (optional) */
  emittedBy?: string[];
  /** Node types that consume this signal (optional) */
  consumedBy?: string[];
}

interface CreateSignalResult {
  /** Signal type */
  type: string;
  /** Namespace */
  namespace: string;
  /** Action */
  action: string;
  /** Registry path */
  registryPath: string;
}

/**
 * Tool for creating signals.
 */
export class CreateSignalTool extends BaseMCPTool<CreateSignalParams, CreateSignalResult> {
  definition: MCPToolDefinition = {
    name: 'create_signal',
    description: 'Registers a new signal in the signal registry',
    parameters: [
      {
        name: 'type',
        type: 'string',
        required: true,
        description: 'Signal type in NAMESPACE.ACTION format',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        description: 'Signal description',
      },
      {
        name: 'registryPath',
        type: 'string',
        required: true,
        description: 'Path to signal registry file',
      },
      {
        name: 'payloadSchema',
        type: 'object',
        required: false,
        description: 'JSON schema for signal payload',
      },
      {
        name: 'emittedBy',
        type: 'array',
        required: false,
        description: 'Node types that emit this signal',
      },
      {
        name: 'consumedBy',
        type: 'array',
        required: false,
        description: 'Node types that consume this signal',
      },
    ],
    returnType: 'CreateSignalResult',
    category: 'architecture',
    bestFor: ['signal registration', 'type definition', 'message contract'],
    complexity: 'low'
  };

  validateParams(params: unknown): params is CreateSignalParams {
    if (!super.validateParams(params)) return false;

    const p = params as CreateSignalParams;
    
    // Validate signal type format
    if (!/^[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]*$/.test(p.type)) {
      return false;
    }

    return true;
  }

  async execute(params: CreateSignalParams): Promise<MCPToolResult<CreateSignalResult>> {
    const [namespace, action] = params.type.split('.');

    const signalEntry = {
      type: params.type,
      namespace,
      action,
      description: params.description,
      payloadSchema: params.payloadSchema || {},
      emittedBy: params.emittedBy || [],
      consumedBy: params.consumedBy || [],
      registeredAt: new Date().toISOString(),
    };

    try {
      const fs = await import('fs');
      
      // Read existing registry or create new
      let registry = { version: '1.0.0', signals: [] as unknown[] };
      if (fs.existsSync(params.registryPath)) {
        const content = fs.readFileSync(params.registryPath, 'utf-8');
        registry = JSON.parse(content);
      }

      // Check if signal already exists
      const existingSignals = registry.signals as Array<{ type: string }>;
      if (existingSignals.some((s) => s.type === params.type)) {
        return this.failure(`Signal already exists: ${params.type}`);
      }

      // Add new signal
      registry.signals.push(signalEntry);

      // Write registry
      fs.writeFileSync(params.registryPath, JSON.stringify(registry, null, 2));

      return this.success({
        type: params.type,
        namespace,
        action,
        registryPath: params.registryPath,
      });
    } catch (error) {
      return this.failure(`Failed to create signal: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
