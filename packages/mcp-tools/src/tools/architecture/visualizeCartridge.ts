/**
 * Visualize Cartridge MCP Tool
 * 
 * Generates Mermaid.js diagrams from Cartridge definitions.
 */

import { BaseMCPTool, MCPToolDefinition, MCPToolResult } from '../../core/MCPTool';
import type { Cartridge } from '@graph-os/core';

interface VisualizeCartridgeParams {
    /** Path to cartridge file */
    cartridgePath: string;
}

interface VisualizeCartridgeResult {
    /** Generated Mermaid.js markdown string */
    markdown: string;
}

/**
 * Tool for visualizing a cartridge as a Mermaid diagram.
 */
export class VisualizeCartridgeTool extends BaseMCPTool<VisualizeCartridgeParams, VisualizeCartridgeResult> {
    definition: MCPToolDefinition = {
        name: 'visualize_cartridge',
        description: 'Generates a Mermaid.js flowchart diagram representing a Graph-OS cartridge\'s nodes and wires. Use this to visually understand architecture flow.',
        parameters: [
            {
                name: 'cartridgePath',
                type: 'string',
                required: true,
                description: 'Path to the cartridge file to visualize',
            },
        ],
        returnType: 'VisualizeCartridgeResult',
        category: 'architecture',
        bestFor: ['visualization', 'documentation', 'understanding', 'architecture review'],
        complexity: 'low'
    };

    async execute(params: VisualizeCartridgeParams): Promise<MCPToolResult<VisualizeCartridgeResult>> {
        try {
            const fs = await import('fs');

            if (!fs.existsSync(params.cartridgePath)) {
                return this.failure(`Cartridge file not found: ${params.cartridgePath}`);
            }

            const cartridgeContent = fs.readFileSync(params.cartridgePath, 'utf-8');
            const cartridge: Cartridge = JSON.parse(cartridgeContent);

            let mermaid = '```mermaid\ngraph TD\n';

            const nodes = cartridge.nodes || [];
            const wires = cartridge.wires || [];

            // Keep track of connections for cycle detection
            const adjList = new Map<string, string[]>();
            nodes.forEach(n => adjList.set(n.id, []));

            // Emit node definitions
            if (nodes.length > 0) {
                mermaid += '  %% Nodes\n';
                for (const node of nodes) {
                    // Determine shape based on type pattern
                    let leftBracket = '[';
                    let rightBracket = ']';
                    let quotes = '"';

                    if (node.type.startsWith('infra.storage')) {
                        leftBracket = '[(';
                        rightBracket = ')]';
                    } else if (node.type.startsWith('logic.')) {
                        leftBracket = '{{';
                        rightBracket = '}}';
                    }

                    mermaid += `  ${node.id}${leftBracket}${quotes}${node.id}<br/>(${node.type})${quotes}${rightBracket}\n`;
                }
                mermaid += '\n';
            }

            // Emit wire definitions
            if (wires.length > 0) {
                mermaid += '  %% Wires\n';
                for (const wire of wires) {
                    mermaid += `  ${wire.from} -->|${wire.signalType}| ${wire.to}\n`;

                    if (adjList.has(wire.from)) {
                        adjList.get(wire.from)!.push(wire.to);
                    }
                }
            }

            // Simple DFS for cycle detection
            const visited = new Set<string>();
            const recStack = new Set<string>();
            let hasCycle = false;

            const detectCycle = (nodeId: string): boolean => {
                if (!visited.has(nodeId)) {
                    visited.add(nodeId);
                    recStack.add(nodeId);

                    const neighbors = adjList.get(nodeId) || [];
                    for (const neighbor of neighbors) {
                        if (!visited.has(neighbor) && detectCycle(neighbor)) {
                            return true;
                        } else if (recStack.has(neighbor)) {
                            return true;
                        }
                    }
                }
                recStack.delete(nodeId);
                return false;
            };

            for (const node of nodes) {
                if (detectCycle(node.id)) {
                    hasCycle = true;
                    break;
                }
            }

            if (hasCycle) {
                mermaid += '\n  %% WARNING: A cycle was detected in this graph flow!\n';
            }

            mermaid += '```';

            return this.success({ markdown: mermaid });
        } catch (error) {
            return this.failure(`Visualization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
