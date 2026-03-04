/**
 * Composite Node Types
 * 
 * Types for composite cartridges and composite nodes.
 * 
 * @module @graph-os/core
 */

import { NodeDefinition, WireDefinition, InputDefinition, OutputDefinition } from '../cartridge/Cartridge';

/**
 * A composite cartridge is a reusable graph that can be
 * referenced by other cartridges as a single node.
 */
export interface CompositeCartridge {
  /** 
   * Must be "composite" to distinguish from regular cartridges
   */
  type: 'composite';
  
  /** 
   * Cartridge format version
   */
  version: string;
  
  /** 
   * Human-readable name for this composite
   */
  name: string;
  
  /** 
   * Detailed description of what this composite does
   */
  description: string;
  
  /** 
   * Input ports for receiving external signals
   */
  inputs: InputDefinition[];
  
  /** 
   * Output ports for emitting signals externally
   */
  outputs: OutputDefinition[];
  
  /** 
   * Node definitions within the composite
   */
  nodes: NodeDefinition[];
  
  /** 
   * Wire connections between nodes
   */
  wires: WireDefinition[];
  
  /** 
   * Maximum constraints (enforced by Graph-OS Constitution)
   */
  constraints?: {
    maxNodes?: number;
    maxWires?: number;
    maxSignals?: number;
  };
}

/**
 * Configuration for a CompositeNode.
 */
export interface CompositeConfig {
  /** 
   * Path to composite cartridge file
   */
  compositePath?: string;
  
  /** 
   * Composite cartridge data (alternative to path)
   */
  composite?: CompositeCartridge;
  
  /** 
   * Whether to inline composite nodes into parent graph
   */
  inline?: boolean;
  
  /** 
   * Namespace prefix for composite signals (optional)
   */
  signalNamespace?: string;
  
  /** 
   * Signal mappings between parent and composite
   */
  signalMappings?: SignalMapping[];
}

/**
 * Maps external signal types to internal signal types.
 */
export interface SignalMapping {
  /** 
   * External signal type (parent cartridge)
   */
  externalSignal: string;
  
  /** 
   * Internal signal type (composite cartridge)
   */
  internalSignal: string;
  
  /** 
   * Whether to transform the signal
   */
  transform?: boolean;
}
