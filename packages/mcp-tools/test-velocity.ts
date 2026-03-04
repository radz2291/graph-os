import { MCPServer } from './src/servers/MCPServer';
import * as path from 'path';
import * as fs from 'fs';

async function runTests() {
    const server = new MCPServer();
    console.log("=== Testing Velocity Protocol ===\n");

    // 1. Auto-Detection Test
    console.log("1. Testing project_context autodetect...");
    const autoDetectResult = await server.callTool({
        name: 'project_context',
        arguments: { autoDetect: true }
    });
    console.log(JSON.stringify(autoDetectResult, null, 2));

    // 2. Persistence Test
    console.log("\n2. Testing project_context persistence...");
    const persistResult = await server.callTool({
        name: 'project_context',
        arguments: {}
    });
    console.log(JSON.stringify(persistResult, null, 2));

    // 3. Resolution (Hydration) Test
    console.log("\n3. Testing Parameter Hydration with create_cartridge...");
    // Use a relative path!
    const relativeOutputPath = './cartridges/velocity-test.json';
    const hydrateResult = await server.callTool({
        name: 'create_cartridge',
        arguments: {
            name: 'velocity-test',
            description: 'Testing the velocity protocol',
            outputPath: relativeOutputPath
        }
    });
    console.log(JSON.stringify(hydrateResult, null, 2));

    // Verify the file was actually created at the ROOT relative path
    if (!hydrateResult.isError) {
        const parsedContent = JSON.parse(persistResult.content[0].text);
        const projectRoot = parsedContent.data.activePath;
        const expectedPath = path.resolve(projectRoot, relativeOutputPath);

        if (fs.existsSync(expectedPath)) {
            console.log(`\nSUCCESS: File found at correctly hydrated path: ${expectedPath}`);
            // Clean up
            fs.unlinkSync(expectedPath);
        } else {
            console.error(`\nFAILURE: File not found at expected path: ${expectedPath}`);
        }
    }

}

runTests().catch(console.error);
