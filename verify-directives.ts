import { TransformNodeImplementation } from './packages/runtime/src/registry/NodeImplementationRegistry';
import { VerifyNodeTool } from './packages/mcp-tools/src/tools/testing/verifyNode';

async function verify() {
    console.log('--- DIRECTIVE 2 & 3: SUBSET & TRANSFORMER FALLBACK VERIFICATION ---');

    // Verify Directive 3: Root payload transformations
    const transformer = new TransformNodeImplementation();

    const result = await transformer.process(
        {
            type: 'TEST.SIGNAL',
            payload: 10 as any, // Emulating the primitive payload sent by AI
            sourceNodeId: 'node-1',
            timestamp: new Date()
        },
        {
            type: 'logic.transform',
            rules: [
                { from: '', transform: 'multiply', factor: 5 }, // 50
                { from: '', transform: 'add', factor: 100 }     // 150
            ],
            outputSignalType: 'NUMBER.OUTPUT',
            includeUnmatched: false
        },
        'transformer-node'
    );

    console.log('Root Override Transformer Payload:', (result as any).payload);
    console.log('Math result parsed successfully:', ((result as any).payload as any).value === 150 ? '✅ PASS' : '❌ FAIL');

    // Verify Directive 2: isSubset Matching
    const verifyTool = new VerifyNodeTool();

    const output = await verifyTool.execute({
        nodeType: 'logic.transform',
        config: {
            rules: [
                { from: 'nested.x', to: 'y' }
            ],
            outputSignalType: 'TEST.OUT'
        },
        inputSignal: {
            type: 'TEST.IN',
            payload: { nested: { x: 'payload-data' } }
        },
        // Expected lacks the dynamically generated validation/timestamp metadata
        expectedOutput: {
            type: 'TEST.OUT',
            payload: {
                y: 'payload-data'
            }
        }
    });

    console.log('\nSubset Output Validated:', output.success ? '✅ PASS' : '❌ FAIL');
}

verify().catch(console.error);
