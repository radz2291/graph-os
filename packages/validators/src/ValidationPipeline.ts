/**
 * ValidationPipeline - Runs all validators in sequence
 * 
 * Provides a unified interface for running all cartridge validations
 * and generating comprehensive reports.
 * 
 * @module @graph-os/validators
 */

import { Cartridge, CartridgeValidationError, CartridgeValidationWarning } from '@graph-os/core';
import { SchemaValidator } from './cartridge/SchemaValidator';
import { SizeValidator, SIZE_LIMITS } from './cartridge/SizeValidator';
import { HierarchyValidator } from './cartridge/HierarchyValidator';
import { RegistryValidator } from './registry/RegistryValidator';
import { SignalValidator } from './signal/SignalValidator';

/** Schema validation result type */
type SchemaValidationResult = ReturnType<SchemaValidator['validate']>;
/** Size validation result type */
type SizeValidationResult = ReturnType<SizeValidator['validate']>;
/** Hierarchy validation result type */
type HierarchyValidationResult = ReturnType<HierarchyValidator['validate']>;
/** Registry validation result type */
type RegistryValidationResult = ReturnType<RegistryValidator['validate']>;
/** Signal validation result type */
type SignalValidationResult = ReturnType<SignalValidator['validate']>;

/**
 * Results from individual validators.
 */
interface ValidationResults {
  schema: SchemaValidationResult;
  size: SizeValidationResult;
  hierarchy: HierarchyValidationResult;
  registry: RegistryValidationResult;
  signal: SignalValidationResult;
}

/**
 * Complete validation report.
 */
export interface ValidationReport {
  /** Whether the cartridge is valid */
  valid: boolean;
  
  /** All errors from all validators */
  errors: CartridgeValidationError[];
  
  /** All warnings from all validators */
  warnings: CartridgeValidationWarning[];
  
  /** Results from individual validators */
  schema: SchemaValidationResult;
  size: SizeValidationResult;
  hierarchy: HierarchyValidationResult;
  registry: RegistryValidationResult;
  signal: SignalValidationResult;
  
  /** Summary statistics */
  summary: {
    errorCount: number;
    warningCount: number;
    nodeCount: number;
    wireCount: number;
    signalTypeCount: number;
  };
}

/**
 * Options for validation pipeline.
 */
export interface ValidationPipelineOptions {
  /** Skip schema validation */
  skipSchema?: boolean;
  /** Skip size validation */
  skipSize?: boolean;
  /** Skip hierarchy validation */
  skipHierarchy?: boolean;
  /** Skip registry validation */
  skipRegistry?: boolean;
  /** Skip signal validation */
  skipSignal?: boolean;
  /** Stop on first error */
  failFast?: boolean;
}

/**
 * ValidationPipeline orchestrates all validators.
 */
export class ValidationPipeline {
  private schemaValidator = new SchemaValidator();
  private sizeValidator = new SizeValidator();
  private hierarchyValidator = new HierarchyValidator();
  private registryValidator = new RegistryValidator();
  private signalValidator = new SignalValidator();

  /**
   * Loads signal registry data.
   */
  loadSignalRegistry(registry: Array<{
    type: string;
    namespace: string;
    action: string;
    description: string;
  }>): void {
    this.registryValidator.loadSignalRegistry(registry);
  }

  /**
   * Loads composite registry data.
   */
  loadCompositeRegistry(registry: Array<{
    id: string;
    name: string;
    description: string;
    path: string;
    nodeCount: number;
  }>): void {
    this.registryValidator.loadCompositeRegistry(registry);
  }

  /**
   * Runs all validations on a cartridge.
   * 
   * @param cartridge - The cartridge to validate
   * @param options - Validation options
   * @returns Complete validation report
   */
  validate(cartridge: Cartridge, options: ValidationPipelineOptions = {}): ValidationReport {
    const allErrors: CartridgeValidationError[] = [];
    const allWarnings: CartridgeValidationWarning[] = [];

    // Run schema validation
    const schemaResult = options.skipSchema 
      ? { valid: true, errors: [], warnings: [] }
      : this.schemaValidator.validate(cartridge);
    allErrors.push(...schemaResult.errors);
    allWarnings.push(...schemaResult.warnings);

    // If fail-fast and schema errors, stop
    if (options.failFast && allErrors.length > 0) {
      return this.createReport(cartridge, allErrors, allWarnings, {
        schema: schemaResult,
        size: { valid: true, errors: [], warnings: [], stats: { nodeCount: 0, wireCount: 0, signalTypeCount: 0 } },
        hierarchy: { valid: true, errors: [], warnings: [], cycles: [], depth: 0 },
        registry: { valid: true, errors: [], warnings: [], missingSignals: [], missingComposites: [] },
        signal: { valid: true, errors: [], warnings: [], signalTypes: [], namespaces: [] },
      });
    }

    // Run size validation
    const sizeResult = options.skipSize
      ? { valid: true, errors: [], warnings: [], stats: { nodeCount: 0, wireCount: 0, signalTypeCount: 0 } }
      : this.sizeValidator.validate(cartridge);
    allErrors.push(...sizeResult.errors);
    allWarnings.push(...sizeResult.warnings);

    // Run hierarchy validation
    const hierarchyResult = options.skipHierarchy
      ? { valid: true, errors: [], warnings: [], cycles: [], depth: 0 }
      : this.hierarchyValidator.validate(cartridge);
    allErrors.push(...hierarchyResult.errors);
    allWarnings.push(...hierarchyResult.warnings);

    // Run registry validation
    const registryResult = options.skipRegistry
      ? { valid: true, errors: [], warnings: [], missingSignals: [], missingComposites: [] }
      : this.registryValidator.validate(cartridge);
    allErrors.push(...registryResult.errors);
    allWarnings.push(...registryResult.warnings);

    // Run signal validation
    const signalResult = options.skipSignal
      ? { valid: true, errors: [], warnings: [], signalTypes: [], namespaces: [] }
      : this.signalValidator.validate(cartridge);
    allErrors.push(...signalResult.errors);
    allWarnings.push(...signalResult.warnings);

    return this.createReport(cartridge, allErrors, allWarnings, {
      schema: schemaResult,
      size: sizeResult,
      hierarchy: hierarchyResult,
      registry: registryResult,
      signal: signalResult,
    });
  }

  /**
   * Creates the validation report.
   */
  private createReport(
    cartridge: Cartridge,
    errors: CartridgeValidationError[],
    warnings: CartridgeValidationWarning[],
    results: ValidationResults
  ): ValidationReport {
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      schema: results.schema,
      size: results.size,
      hierarchy: results.hierarchy,
      registry: results.registry,
      signal: results.signal,
      summary: {
        errorCount: errors.length,
        warningCount: warnings.length,
        nodeCount: cartridge.nodes?.length || 0,
        wireCount: cartridge.wires?.length || 0,
        signalTypeCount: results.signal.signalTypes.length,
      },
    };
  }

  /**
   * Validates a cartridge and returns a formatted report.
   */
  validateAndReport(cartridge: Cartridge, options: ValidationPipelineOptions = {}): string {
    const report = this.validate(cartridge, options);
    return this.formatReport(report);
  }

  /**
   * Formats a validation report for display.
   */
  formatReport(report: ValidationReport): string {
    const lines: string[] = [];

    lines.push('═'.repeat(60));
    lines.push('Graph-OS Cartridge Validation Report');
    lines.push('═'.repeat(60));
    lines.push('');

    // Summary
    lines.push('📋 Summary:');
    lines.push(`   Nodes: ${report.summary.nodeCount}`);
    lines.push(`   Wires: ${report.summary.wireCount}`);
    lines.push(`   Signal Types: ${report.summary.signalTypeCount}`);
    lines.push(`   Errors: ${report.summary.errorCount}`);
    lines.push(`   Warnings: ${report.summary.warningCount}`);
    lines.push('');

    // Errors
    if (report.errors.length > 0) {
      lines.push('❌ Errors:');
      for (const error of report.errors) {
        lines.push(`   [${error.code}] ${error.message}`);
        if (error.path) {
          lines.push(`      Path: ${error.path}`);
        }
        if (error.suggestion) {
          lines.push(`      Suggestion: ${error.suggestion}`);
        }
      }
      lines.push('');
    }

    // Warnings
    if (report.warnings.length > 0) {
      lines.push('⚠️  Warnings:');
      for (const warning of report.warnings) {
        lines.push(`   [${warning.code}] ${warning.message}`);
        if (warning.path) {
          lines.push(`      Path: ${warning.path}`);
        }
      }
      lines.push('');
    }

    // Status
    if (report.valid) {
      lines.push('✅ Cartridge is valid!');
    } else {
      lines.push('❌ Cartridge validation failed.');
    }

    lines.push('═'.repeat(60));

    return lines.join('\n');
  }
}

// Re-export SIZE_LIMITS
export { SIZE_LIMITS };
