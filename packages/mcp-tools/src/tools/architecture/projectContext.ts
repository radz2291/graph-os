/**
 * Project Context MCP Tool
 * 
 * Manages the active project context for relative path resolution.
 * 
 * @module @graph-os/mcp-tools
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseMCPTool, MCPToolDefinition, MCPToolResult } from '../../core/MCPTool';
import { SessionState } from '../../core/SessionState';

interface ProjectContextParams {
    /** Optional absolute path to set as the active context */
    projectPath?: string;
    /** Automatically detect context by walking up from the current working directory */
    autoDetect?: boolean;
}

interface ProjectContextResult {
    /** Status message */
    message: string;
    /** Active project path */
    activePath?: string | null;
}

/**
 * Tool for managing the active project context.
 * 
 * Call with arguments to SET context. Call without arguments to GET context.
 */
export class ProjectContextTool extends BaseMCPTool<ProjectContextParams, ProjectContextResult> {
    definition: MCPToolDefinition = {
        name: 'project_context',
        description: 'Manages the active project context. Call with arguments to SET context. Call without arguments to GET context.',
        parameters: [
            {
                name: 'projectPath',
                type: 'string',
                required: false,
                description: 'Absolute path to set as the active context',
            },
            {
                name: 'autoDetect',
                type: 'boolean',
                required: false,
                description: 'Automatically detect context by walking up from the current working directory',
            }
        ],
        returnType: 'ProjectContextResult',
        category: 'architecture',
        bestFor: ['setting working directory', 'resolving relative paths'],
        complexity: 'low'
    };

    private findProjectRoot(currentDir: string): string | null {
        let dir = currentDir;
        while (true) {
            if (
                fs.existsSync(path.join(dir, 'graph-os.config.json')) ||
                fs.existsSync(path.join(dir, 'package.json'))
            ) {
                return dir;
            }
            const parent = path.dirname(dir);
            if (parent === dir) { // Reached filesystem root
                return null;
            }
            dir = parent;
        }
    }

    async execute(params: ProjectContextParams): Promise<MCPToolResult<ProjectContextResult>> {
        const session = SessionState.getInstance();

        // GET Mode
        if (Object.keys(params).length === 0 || (!params.projectPath && !params.autoDetect)) {
            const activePath = session.getContext();
            if (activePath) {
                return this.success({
                    message: `Context active: ${activePath}`,
                    activePath
                });
            } else {
                return this.success({
                    message: 'No active context set.',
                    activePath: null
                });
            }
        }

        // SET Mode
        let targetPath: string | null = null;

        if (params.projectPath) {
            targetPath = path.resolve(params.projectPath);
            if (!fs.existsSync(targetPath)) {
                return this.failure(`Provided path does not exist: ${targetPath}`);
            }
            if (!fs.existsSync(path.join(targetPath, 'graph-os.config.json'))) {
                // Proceed even without config, just issue a warning
                // Depending on strictness, we might return failure here, but for now allow it.
            }
        } else if (params.autoDetect) {
            targetPath = this.findProjectRoot(process.cwd());
            if (!targetPath) {
                return this.failure('Could not auto-detect project root. No graph-os.config.json or package.json found in directory tree.');
            }
        }

        if (targetPath) {
            session.setContext(targetPath);
            return this.success({
                message: `Context active: ${targetPath}`,
                activePath: targetPath
            });
        }

        return this.failure('Invalid parameters. Provide either projectPath or autoDetect=true.');
    }
}
