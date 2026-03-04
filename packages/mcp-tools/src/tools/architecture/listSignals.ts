import { BaseMCPTool, MCPParameterSchema, MCPToolResult, MCPToolDefinition } from '../../core/MCPTool';
import { SignalRegistryLoader } from '@graph-os/runtime';
import * as path from 'path';

export class ListSignalsTool extends BaseMCPTool<Record<string, unknown>, unknown> {
    definition: MCPToolDefinition = {
        name: 'list_signals',
        description: 'Lists all registered signals from a signal registry.',
        returnType: 'SignalTypeDefinition[]',
        parameters: [
            {
                name: 'registryPath',
                type: 'string',
                required: true,
                description: 'Path to the signal registry JSON file (e.g., ./registries/signal-registry.json)',
            },
        ],
        category: 'architecture',
        bestFor: ['registry inspection', 'signal discovery', 'signal enumeration'],
        complexity: 'low'
    };

    async execute(params: Record<string, unknown>): Promise<MCPToolResult<unknown>> {
        const registryPath = params.registryPath as string;

        try {
            const loader = new SignalRegistryLoader();

            // Load the registry
            const resolvedPath = path.resolve(process.cwd(), registryPath);
            await loader.loadRegistry(resolvedPath);

            // Get all registered signals
            const signals = loader.getAllSignalDefinitions();

            return this.success({ signals });
        } catch (error) {
            return this.failure(error as Error);
        }
    }
}
