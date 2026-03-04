import { RemoveSignalTool } from './src/tools/architecture/removeSignal';
import * as fs from 'fs';
import * as path from 'path';

async function testRemoveSignal() {
  const tool = new RemoveSignalTool();

  const testPath = path.resolve(__dirname, 'test-registry.json');
  fs.writeFileSync(testPath, JSON.stringify({
    version: '1.0.0',
    signals: [
      { type: 'USER.LOGIN', payloadSchema: {} },
      { type: 'DATA.FETCHED', payloadSchema: {} }
    ]
  }, null, 2));

  const result = await tool.execute({
    type: 'USER.LOGIN',
    registryPath: 'test-registry.json'
  });

  console.log('--- Result ---');
  console.log(JSON.stringify(result, null, 2));
  
  if (fs.existsSync(testPath)) {
    console.log('--- Updated Registry ---');
    console.log(fs.readFileSync(testPath, 'utf8'));
  }
}

testRemoveSignal().catch(console.error);
