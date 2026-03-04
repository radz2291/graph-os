/**
 * Patch Builder - Test utility for creating topology patches
 * 
 * @module test/utils
 */

import type { NodeDefinition, WireDefinition, SignalDefinition } from '../../src/core/ConflictDetector';
import type { PatchOperation } from '../../src/tools/accelerator/applyTopologyPatch';

export class PatchBuilder {
  private nodesToAdd: NodeDefinition[] = [];
  private nodesToRemove: string[] = [];
  private wiresToAdd: WireDefinition[] = [];
  private wiresToRemove: WireDefinition[] = [];
  private signalsToAdd: SignalDefinition[] = [];

  /**
   * Add a node to the patch
   */
  addNode(node: NodeDefinition): this {
    this.nodesToAdd.push(node);
    return this;
  }

  /**
   * Add multiple nodes to the patch
   */
  addNodes(nodes: NodeDefinition[]): this {
    this.nodesToAdd.push(...nodes);
    return this;
  }

  /**
   * Remove a node by ID
   */
  removeNode(nodeId: string): this {
    this.nodesToRemove.push(nodeId);
    return this;
  }

  /**
   * Add a wire to the patch
   */
  addWire(wire: WireDefinition): this {
    this.wiresToAdd.push(wire);
    return this;
  }

  /**
   * Add multiple wires to the patch
   */
  addWires(wires: WireDefinition[]): this {
    this.wiresToAdd.push(...wires);
    return this;
  }

  /**
   * Remove a wire
   */
  removeWire(wire: WireDefinition): this {
    this.wiresToRemove.push(wire);
    return this;
  }

  /**
   * Add a signal definition
   */
  addSignal(signal: SignalDefinition): this {
    this.signalsToAdd.push(signal);
    return this;
  }

  /**
   * Add a simple input node
   */
  addInputNode(id: string, outputSignalType: string): this {
    return this.addNode({
      id,
      type: 'control.input',
      description: `Input: ${id}`,
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
      description: `Display: ${id}`,
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
      description: `Validator: ${id}`,
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
      description: `Transformer: ${id}`,
      config: { outputSignalType }
    });
  }

  /**
   * Connect two nodes
   */
  connect(from: string, to: string, signalType: string): this {
    return this.addWire({ from, to, signalType });
  }

  /**
   * Build the patch object for apply_topology_patch
   */
  build(): {
    nodes: NodeDefinition[];
    wires: WireDefinition[];
    signals: SignalDefinition[];
  } {
    return {
      nodes: this.nodesToAdd,
      wires: this.wiresToAdd,
      signals: this.signalsToAdd
    };
  }

  /**
   * Build operations array
   */
  buildOperations(): PatchOperation[] {
    const operations: PatchOperation[] = [];

    // Add nodes
    for (const node of this.nodesToAdd) {
      operations.push({
        type: 'add',
        target: 'node',
        data: node
      });
    }

    // Remove nodes
    for (const nodeId of this.nodesToRemove) {
      operations.push({
        type: 'remove',
        target: 'node',
        id: nodeId
      });
    }

    // Add wires
    for (const wire of this.wiresToAdd) {
      operations.push({
        type: 'add',
        target: 'wire',
        data: wire
      });
    }

    // Remove wires
    for (const wire of this.wiresToRemove) {
      operations.push({
        type: 'remove',
        target: 'wire',
        data: wire
      });
    }

    return operations;
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.nodesToAdd = [];
    this.nodesToRemove = [];
    this.wiresToAdd = [];
    this.wiresToRemove = [];
    this.signalsToAdd = [];
    return this;
  }
}

/**
 * Create a feature patch with multiple nodes and wires
 */
export function createFeaturePatch(
  featureName: string,
  nodeCount: number
): PatchBuilder {
  const builder = new PatchBuilder();

  for (let i = 0; i < nodeCount; i++) {
    const nodeId = `${featureName}-node-${i}`;
    const signalType = `${featureName.toUpperCase()}.STEP_${i}`;

    if (i === 0) {
      builder.addInputNode(nodeId, signalType);
    } else if (i === nodeCount - 1) {
      builder.addDisplayNode(nodeId);
    } else {
      builder.addTransformerNode(nodeId, signalType);
    }
  }

  for (let i = 0; i < nodeCount - 1; i++) {
    const signalType = `${featureName.toUpperCase()}.STEP_${i}`;
    builder.connect(
      `${featureName}-node-${i}`,
      `${featureName}-node-${i + 1}`,
      signalType
    );
  }

  return builder;
}
