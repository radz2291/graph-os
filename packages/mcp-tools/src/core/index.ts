/**
 * Core Components - Shared logic for MCP tools
 * 
 * These components provide the foundation for higher-level tools:
 * - ConflictDetector: Detects conflicts between existing and patch data
 * - ConflictResolver: Resolves conflicts using configurable strategies
 * - GraphMerger: Merges cartridges with patches
 * - BoundaryDetector: Detects boundaries for composite extraction
 * 
 * @module @graph-os/mcp-tools/core
 */

// Conflict Detection
export { 
  ConflictDetector,
  default as ConflictDetectorDefault
} from './ConflictDetector';

export type {
  NodeDefinition,
  WireDefinition,
  SignalDefinition,
  CompositeDefinition,
  SignalRegistry,
  CompositeRegistry,
  Cartridge,
  TopologyPatch,
  PatchOperation,
  ConflictType,
  ConflictSeverity,
  Conflict,
  ConflictDetectionResult,
} from './ConflictDetector';

// Conflict Resolution
export { 
  ConflictResolver,
  default as ConflictResolverDefault
} from './ConflictResolver';

export type {
  ResolutionStrategy,
  ConflictResolution,
  ConflictResolutionResult,
} from './ConflictResolver';

// Graph Merging
export { 
  GraphMerger,
  default as GraphMergerDefault
} from './GraphMerger';

export type {
  MergeStrategy,
  MergeOptions,
  MergeResult,
} from './GraphMerger';

// Boundary Detection
export { 
  BoundaryDetector,
  default as BoundaryDetectorDefault
} from './BoundaryDetector';

export type {
  SignalType,
  SideEffect,
  Boundaries,
  ValidationReport,
  NodeCluster,
} from './BoundaryDetector';
