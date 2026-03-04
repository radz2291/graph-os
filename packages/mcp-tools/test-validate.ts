import { ValidateCartridgeTool } from './src/tools/architecture/validateCartridge';
import * as fs from 'fs';
import * as path from 'path';

async function testValidation() {
  const tool = new ValidateCartridgeTool();

  const testPath = path.resolve(__dirname, 'test-validation.json');
  fs.writeFileSync(testPath, JSON.stringify({
    version: '2.0.0',
    name: 'test-cartridge',
    nodes: [
      { id: 'custom-email-validator', type: 'logic.email-validator', config: {} },
      { id: 'custom-data-fetcher', type: 'data.http-fetch', config: {} },
      { id: 'invalid-node', type: 'alien.invalid-type', config: {} }
    ],
    wires: [
      { from: 'custom-data-fetcher', to: 'custom-email-validator', signalType: 'DATA.FETCHED' }
    ]
  }, null, 2));

  const result = await tool.execute({
    cartridgePath: testPath
  });

  if (result.success) {
    console.log('--- Warnings ---');
    console.log(JSON.stringify(result.data.warnings, null, 2));
  } else {
    console.error(result.error);
  }
}

testValidation().then(() => console.log('Done')).catch(console.error);
