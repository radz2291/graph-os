import { createExtractToCompositeTool } from './src/tools/precision/extractToComposite';
import * as fs from 'fs';
import * as path from 'path';

async function testExtraction() {
  const tool = createExtractToCompositeTool();

  const parentPath = path.resolve(__dirname, 'test-parent.json');
  fs.writeFileSync(parentPath, JSON.stringify({
    version: '2.0.0',
    name: 'parent',
    nodes: [
      { id: 'keep-1', type: 'control.input', config: {} },
      { id: 'keep-2', type: 'control.output', config: {} },
      { id: 'extract-1', type: 'logic.transform', config: {} },
      { id: 'extract-2', type: 'logic.transform', config: {} }
    ],
    wires: [
      { from: 'keep-1', to: 'extract-1', signalType: 'DATA.IN' },
      { from: 'extract-1', to: 'extract-2', signalType: 'DATA.STEP' },
      { from: 'extract-2', to: 'keep-2', signalType: 'DATA.OUT' },
      { from: 'keep-1', to: 'keep-2', signalType: 'DATA.DIRECT' }
    ]
  }, null, 2));

  const result = await tool.execute({
    cartridgePath: parentPath,
    nodes: ['extract-1', 'extract-2'],
    compositeName: 'logic_processor',
    outputPath: path.resolve(__dirname, 'test-composite.json'),
    autoRegister: false,
    healParentGraph: true
  });

  console.log(JSON.stringify(result, null, 2));

  if (fs.existsSync(parentPath)) {
    console.log('--- Healed Parent Graph ---');
    console.log(fs.readFileSync(parentPath, 'utf8'));
  }
}

testExtraction().catch(console.error);
