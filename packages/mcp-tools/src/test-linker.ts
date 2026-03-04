import { createScaffoldNodeImplTool } from './tools/bridge/scaffoldNodeImpl';
import { createVerifyNodeTool } from './tools/testing/verifyNode';

async function main() {
    console.log('=================================');
    console.log('🚀 Testing Auto-Linker Flow...');
    console.log('=================================');

    const scaffoldTool = createScaffoldNodeImplTool();
    const verifyTool = createVerifyNodeTool();

    console.log('\n[1] Scaffolding logic.ai-sentiment node...');
    const scaffoldRes = await scaffoldTool.execute({
        nodeType: 'logic.ai-sentiment',
        outputPath: '../templates/projects/_base/src/nodes/logic/ai-sentiment',
        description: 'Analyzes text sentiment'
    });

    if (!scaffoldRes.success) {
        console.error('Failed to scaffold:', scaffoldRes.error);
        return;
    }
    console.log('✅ Scaffold Successful!');

    console.log('\n[2] Instantly running verify_node against the new node...');
    const verifyRes = await verifyTool.execute({
        nodeType: 'logic.ai-sentiment',
        inputSignal: { type: 'TEXT.INPUT', payload: { value: "I love this so much!" } },
        config: {}
    });

    if (verifyRes.success) {
        console.log('✅ Verify Successful!');
        console.log('Execution context loaded from memory! Result:');
        console.log(JSON.stringify(verifyRes.data, null, 2));
    } else {
        console.error('❌ Verify Failed:', verifyRes.error);
    }
}

main().catch(console.error);
