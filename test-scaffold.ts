import { ScaffoldProjectTool } from './packages/mcp-tools/src/tools/architecture/scaffoldProject';
import * as path from 'path';

async function run() {
    const tool = new ScaffoldProjectTool();
    const result = await tool.execute({
        projectName: 'test-app-789',
        outputPath: path.resolve(__dirname, 'test-workspace'),
        template: 'minimal',
        includeReactBridge: true
    });
    console.log(JSON.stringify(result, null, 2));
}

run().catch(console.error);
