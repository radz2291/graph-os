/**
 * Bridge Tools - Connect architecture to real world
 * 
 * These tools bridge Graph-OS architecture to implementation:
 * - generate_ui_binding: React component generation
 * - scaffold_node_impl: Node type scaffolding
 * - refactor_semantics: Distributed semantic renaming
 * 
 * @module @graph-os/mcp-tools/bridge
 */

export { 
  GenerateUIBindingTool, 
  createGenerateUIBindingTool,
  type GenerateUIBindingInput,
  type GenerateUIBindingOutput,
  type GeneratedFile,
  type ComponentType,
  type Framework
} from './generateUIBinding';

export {
  ScaffoldNodeImplTool,
  createScaffoldNodeImplTool,
  type ScaffoldNodeImplRequest,
  type ScaffoldNodeImplResult,
  type GeneratedNodeFile,
  type NodeCategory,
  type NodeTemplateType,
} from './scaffoldNodeImpl';

export {
  RefactorSemanticsTool,
  createRefactorSemanticsTool,
  type RefactorSemanticsRequest,
  type RefactorSemanticsResult,
  type RefactorType,
  type RefactorScope,
  type FileChange,
  type Change,
  type RefactorConflict,
  type RefactorSummary,
} from './refactorSemantics';
