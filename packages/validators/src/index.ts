/**
 * @graph-os/validators
 * 
 * Validation libraries for Graph-OS cartridges.
 * 
 * This package provides comprehensive validation for:
 * - Cartridge structure (JSON schema)
 * - Size constraints (node/wire counts)
 * - Hierarchy validation (cycles, depth)
 * - Registry validation (signals, composites)
 * - Signal naming conventions
 * - UI component validation (NEW)
 * - MCP tool validation (NEW)
 * 
 * @module @graph-os/validators
 * @version 1.0.0
 */

// Cartridge validators
export { SchemaValidator, SchemaValidationResult } from './cartridge/SchemaValidator';
export { SizeValidator, SizeValidationResult, SIZE_LIMITS } from './cartridge/SizeValidator';
export { HierarchyValidator, HierarchyValidationResult } from './cartridge/HierarchyValidator';

// Registry validators
export { RegistryValidator, RegistryValidationResult } from './registry/RegistryValidator';

// Signal validators
export { SignalValidator, SignalValidationResult, FORBIDDEN_PREFIXES, RESERVED_NAMESPACES } from './signal/SignalValidator';

// UI validators (NEW)
export { UIComponentValidator, UIComponentValidationResult } from './ui/UIComponentValidator';

// MCP validators (NEW)
export { MCPToolValidator, MCPToolValidationResult } from './mcp/MCPToolValidator';

// Pipeline
export { ValidationPipeline, ValidationReport, ValidationPipelineOptions } from './ValidationPipeline';

// Re-export types from core
export { 
  Cartridge, 
  CartridgeValidationError, 
  CartridgeValidationWarning 
} from '@graph-os/core';
