import { BaseMCPTool, MCPParameterSchema, MCPToolResult, MCPToolDefinition } from '../../core/MCPTool';
import { SignalRegistryLoader } from '@graph-os/runtime';
import * as path from 'path';

export class GetSignalTool extends BaseMCPTool<Record<string, unknown>, unknown> {
    definition: MCPToolDefinition = {
        name: 'get_signal',
        description: 'Gets detailed information and schema for a specific signal type.',
        returnType: 'SignalTypeDefinition',
        parameters: [
            {
                name: 'type',
                type: 'string',
                required: true,
                description: 'Signal type to query (e.g., "USER.LOGIN")',
            },
            {
                name: 'registryPath',
                type: 'string',
                required: true,
                description: 'Path to the signal registry JSON file',
            },
        ],
        category: 'architecture',
        bestFor: ['signal details', 'schema inspection', 'signal lookup'],
        complexity: 'low'
    };

    async execute(params: Record<string, unknown>): Promise<MCPToolResult<unknown>> {
        const type = params.type as string;
        const registryPath = params.registryPath as string;

        try {
            const loader = new SignalRegistryLoader();

            const resolvedPath = path.resolve(process.cwd(), registryPath);
            await loader.loadRegistry(resolvedPath);

            const signalDef = loader.getSignalDefinition(type);

            if (!signalDef) {
                return this.failure(`Signal type '${type}' not found in registry.`);
            }

            return this.success({ signal: signalDef });
        } catch (error) {
            return this.failure(error as Error);
        }
    }
}
