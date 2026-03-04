/**
 * Cartridge Builder - Test utility for creating test cartridges
 * 
 * @module test/utils
 */

import * as fs from 'fs';
import * as path from 'path';
import type { NodeDefinition, WireDefinition } from '../../src/core/ConflictDetector';

export interface CartridgeBuilderOptions {
  name?: string;
  description?: string;
  version?: string;
}

export class CartridgeBuilder {
  private name: string;
  private description: string;
  private version: string;
  private nodes: NodeDefinition[] = [];
  private wires: WireDefinition[] = [];

  constructor(options: CartridgeBuilderOptions = {}) {
    this.name = options.name || 'test-cartridge';
    this.description = options.description || 'Test cartridge';
    this.version = options.version || '2.0.0';
  }

  /**
   * Add a node to the cartridge
   */
  addNode(node: NodeDefinition): this {
    this.nodes.push(node);
    return this;
  }

  /**
   * Add multiple nodes to the cartridge
   */
  addNodes(nodes: NodeDefinition[]): this {
    this.nodes.push(...nodes);
    return this;
  }

  /**
   * Add a wire to the cartridge
   */
  addWire(wire: WireDefinition): this {
    this.wires.push(wire);
    return this;
  }

  /**
   * Add multiple wires to the cartridge
   */
  addWires(wires: WireDefinition[]): this {
    this.wires.push(...wires);
    return this;
  }

  /**
   * Add a simple input node
   */
  addInputNode(id: string, outputSignalType: string): this {
    return this.addNode({
      id,
      type: 'control.input',
      description: `Input node: ${id}`,
      config: { outputSignalType }
    });
  }

  /**
   * Add a simple display node
   */
  addDisplayNode(id: string): this {
    return this.addNode({
      id,
      type: 'control.display',
      description: `Display node: ${id}`,
      config: { format: 'json' }
    });
  }

  /**
   * Add a validator node
   */
  addValidatorNode(id: string, successSignal: string, failureSignal: string): this {
    return this.addNode({
      id,
      type: 'logic.validate',
      description: `Validator node: ${id}`,
      config: {
        schema: { type: 'object' },
        successSignalType: successSignal,
        failureSignalType: failureSignal
      }
    });
  }

  /**
   * Add a transformer node
   */
  addTransformerNode(id: string, outputSignalType: string): this {
    return this.addNode({
      id,
      type: 'logic.transform',
      description: `Transformer node: ${id}`,
      config: { outputSignalType }
    });
  }

  /**
   * Connect two nodes with a wire
   */
  connect(from: string, to: string, signalType: string): this {
    return this.addWire({ from, to, signalType });
  }

  /**
   * Build the cartridge object
   */
  build(): object {
    return {
      version: this.version,
      name: this.name,
      description: this.description,
      inputs: [],
      outputs: [],
      nodes: this.nodes,
      wires: this.wires
    };
  }

  /**
   * Write the cartridge to a file
   */
  writeTo(filePath: string): string {
    const cartridge = this.build();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(cartridge, null, 2));
    return filePath;
  }

  /**
   * Write to a temp file and return the path
   */
  writeToTemp(): string {
    const tempDir = '/tmp/graph-os-test';
    const filePath = path.join(tempDir, `${this.name}-${Date.now()}.json`);
    return this.writeTo(filePath);
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.nodes = [];
    this.wires = [];
    return this;
  }
}

/**
 * Create a simple linear flow cartridge
 */
export function createLinearFlowCartridge(
  name: string,
  nodeCount: number,
  signalPrefix: string = 'SIGNAL'
): CartridgeBuilder {
  const builder = new CartridgeBuilder({ name });

  for (let i = 0; i < nodeCount; i++) {
    if (i === 0) {
      builder.addInputNode(`node-${i}`, `${signalPrefix}.STEP_0`);
    } else if (i === nodeCount - 1) {
      builder.addDisplayNode(`node-${i}`);
    } else {
      builder.addTransformerNode(`node-${i}`, `${signalPrefix}.STEP_${i + 1}`);
    }
  }

  for (let i = 0; i < nodeCount - 1; i++) {
    const signalType = i === 0 ? `${signalPrefix}.STEP_0` : `${signalPrefix}.STEP_${i + 1}`;
    builder.connect(`node-${i}`, `node-${i + 1}`, signalType);
  }

  return builder;
}

/**
 * Create a clustered cartridge for composite extraction testing
 */
export function createClusteredCartridge(
  name: string,
  clusterSize: number,
  clusterCount: number
): CartridgeBuilder {
  const builder = new CartridgeBuilder({ name });

  // Create input node
  builder.addInputNode('input', 'CLUSTER.ENTRY');

  let currentNode = 'input';
  let currentSignal = 'CLUSTER.ENTRY';

  for (let c = 0; c < clusterCount; c++) {
    // Create cluster nodes
    for (let n = 0; n < clusterSize; n++) {
      const nodeId = `cluster-${c}-node-${n}`;
      const nextSignal = `CLUSTER.${c}_STEP_${n + 1}`;
      
      if (n === clusterSize - 1) {
        builder.addTransformerNode(nodeId, `CLUSTER.${c}_EXIT`);
      } else {
        builder.addTransformerNode(nodeId, nextSignal);
      }
      
      builder.connect(currentNode, nodeId, currentSignal);
      currentNode = nodeId;
      currentSignal = n === clusterSize - 1 ? `CLUSTER.${c}_EXIT` : nextSignal;
    }
  }

  // Create output node
  builder.addDisplayNode('output');
  builder.connect(currentNode, 'output', currentSignal);

  return builder;
}
