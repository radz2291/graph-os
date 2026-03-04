import { createScaffoldNodeImplTool } from './tools/bridge/scaffoldNodeImpl';
import { RunCartridgeTool } from './tools/architecture/runCartridge';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log('=================================');
    console.log('🚀 Testing run_cartridge Flow...');
    console.log('=================================');

    const scaffoldTool = createScaffoldNodeImplTool();
    const runTool = new RunCartridgeTool();

    console.log('\n[1] Scaffolding logic.custom-test node...');
    const scaffoldRes = await scaffoldTool.execute({
        nodeType: 'logic.custom-test',
        outputPath: '../templates/projects/_base/src/nodes/logic/custom-test',
        description: 'Test node for run_cartridge integration'
    });

    if (!scaffoldRes.success) {
        console.error('Failed to scaffold:', scaffoldRes.error);
        return;
    }
    console.log('✅ Scaffold Successful!');

    console.log('\n[2] Creating temporary cartridge...');
    const cartridgePath = path.join(__dirname, 'test.cartridge.json');
    const cartridge = {
        name: "Test Cartridge",
        version: "1.0.0",
        description: "A test cartridge",
        nodes: [
            {
                id: "input-node",
                type: "control.input",
                config: { outputSignalType: "START" }
            },
            {
                id: "custom-node",
                type: "logic.custom-test",
                config: { mappings: { "value": "value" } }
            }
        ],
        wires: [
            {
                id: "wire-1",
                sourceNodeId: "input-node",
                targetNodeId: "custom-node",
                signalType: "CONTROL_INPUT.CHANGE"
            }
        ]
    };
    fs.writeFileSync(cartridgePath, JSON.stringify(cartridge, null, 2));

    console.log('\n[3] Running cartridge...');
    const runRes = await runTool.execute({
        cartridgePath,
        inputSignal: { type: 'CONTROL_INPUT.CHANGE', payload: { value: 42 } },
        debug: true
    });

    if (runRes.success) {
        console.log('✅ Run Cartridge Successful!');

        const data = runRes.data as any;
        console.log('Execution stats:');
        console.log(`Nodes initialized: ${data.nodeCount}`);
        console.log(`Signals processed: ${data.signalsProcessed}`);
        console.log(`Types used: ${data.nodeTypesUsed.join(', ')}`);
        if (data.unknownNodeTypes && data.unknownNodeTypes.length > 0) {
            console.warn(`Unknown types: ${data.unknownNodeTypes.join(', ')}`);
        }

        console.log('\n--- Trace Log ---');
        console.log(data.debugLog);

        fs.writeFileSync('output.json', JSON.stringify(data, null, 2));

        // Clean up
        fs.unlinkSync(cartridgePath);
    } else {
        console.error('❌ Run Cartridge Failed:', runRes.error);
        const data = runRes.data as any;
        if (data && data.errors) {
            console.error(data.errors);
        }

        // Clean up
        if (fs.existsSync(cartridgePath)) {
            fs.unlinkSync(cartridgePath);
        }
    }
}

main().catch(console.error);
