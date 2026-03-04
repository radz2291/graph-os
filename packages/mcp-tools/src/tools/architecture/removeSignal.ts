import { BaseMCPTool, MCPParameterSchema, MCPToolResult, MCPToolDefinition } from '../../core/MCPTool';
import * as fs from 'fs';
import * as path from 'path';

// Using local definition to match the actual file structure
interface LocalSignalRegistryData {
    version: string;
    signals: Array<any>;
}

export class RemoveSignalTool extends BaseMCPTool<Record<string, unknown>, unknown> {
    definition: MCPToolDefinition = {
        name: 'remove_signal',
        description: 'Removes a signal type from the signal registry.',
        returnType: 'object',
        parameters: [
            {
                name: 'type',
                type: 'string',
                required: true,
                description: 'Signal type to remove (e.g., "USER.LOGIN")',
            },
            {
                name: 'registryPath',
                type: 'string',
                required: true,
                description: 'Path to the signal registry JSON file',
            },
        ],
        category: 'architecture',
        bestFor: ['signal cleanup', 'registry management', 'signal removal'],
        complexity: 'low'
    };

    async execute(params: Record<string, unknown>): Promise<MCPToolResult<unknown>> {
        const type = params.type as string;
        const registryPath = params.registryPath as string;

        try {
            const resolvedPath = path.resolve(process.cwd(), registryPath);

            if (!fs.existsSync(resolvedPath)) {
                throw new Error(`Registry file not found at ${resolvedPath}`);
            }

            const fileContent = await fs.promises.readFile(resolvedPath, 'utf-8');
            const registry = JSON.parse(fileContent) as LocalSignalRegistryData;

            if (!Array.isArray(registry.signals)) {
                return this.failure(`Invalid registry format: signals must be an array.`);
            }

            const index = registry.signals.findIndex((s: any) => s.type === type);
            if (index === -1) {
                return this.failure(`Signal type '${type}' not found in registry.`);
            }

            // Remove the signal
            registry.signals.splice(index, 1);

            // Save back to file
            await fs.promises.writeFile(
                resolvedPath,
                JSON.stringify(registry, null, 2),
                'utf-8'
            );

            return this.success({ message: `Signal '${type}' successfully removed from registry.` });
        } catch (error) {
            return this.failure(error as Error);
        }
    }
}
