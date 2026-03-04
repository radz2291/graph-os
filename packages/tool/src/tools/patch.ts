/**
 * PATCH Tool - Modify Graph
 *
 * Modify graph topology using JSON Patch operations (RFC 6902).
 *
 * @module @graph-os/tool/tools
 */

import { BaseTool, type ToolResult, type ToolDefinition } from '../core/Tool';
import { globalSessionManager } from '../core/SessionState';
import { globalCacheManager, CACHE_TAGS } from '../core/CacheManager';
import type { PatchParams, PatchResult, PatchOperation, NextAction, ValidationError } from '../core/types';
import { ErrorCode } from '../core/types';

// =============================================================================
// TOOL DEFINITION
// =============================================================================

const PATCH_TOOL_DEFINITION: ToolDefinition = {
  name: 'patch',
  purpose: 'Modify graph topology using JSON Patch operations (RFC 6902).',
  whenToUse: [
    'Adding/removing nodes',
    'Adding/removing wires',
    'Modifying node configuration',
    'Registering new signals',
    'Creating composites',
    'Any graph modification',
  ],
  whenNotToUse: [
    'Reading graph state (use query)',
    'Executing runtime (use run)',
    'Generating code/scaffolds (use generate)',
  ],
  triggers: ['add', 'remove', 'update', 'modify', 'change', 'create', 'delete', 'connect', 'disconnect'],
  parameters: [
    {
      name: 'ops',
      type: 'array',
      required: true,
      description: 'JSON Patch operations (RFC 6902)',
      hints: {
        add: 'Add value at path (use /nodes/- to append node)',
        remove: 'Remove value at path (requires confirm)',
        replace: 'Replace value at path (requires confirm)',
        move: 'Move from one path to another',
        copy: 'Copy from one path to another',
        test: 'Test if value exists at path',
      },
    },
    {
      name: 'dryRun',
      type: 'boolean',
      required: false,
      description: 'Preview changes without applying',
      default: false,
    },
    {
      name: 'confirm',
      type: 'boolean',
      required: false,
      description: 'Required for destructive operations (remove, replace)',
      default: false,
    },
    {
      name: 'skipValidation',
      type: 'boolean',
      required: false,
      description: 'Skip validation (dangerous)',
      default: false,
    },
    {
      name: 'checkpoint',
      type: 'string | boolean',
      required: false,
      description: 'Create named checkpoint before applying',
      default: true,
    },
    {
      name: 'cartridge',
      type: 'string',
      required: false,
      description: 'Override active cartridge',
    },
    {
      name: 'target',
      type: 'string',
      required: false,
      description: 'Target: cartridge, signals, or composites',
      enum: ['cartridge', 'signals', 'composites'],
      default: 'cartridge',
    },
    {
      name: 'explain',
      type: 'boolean',
      required: false,
      description: 'Return step-by-step execution trace',
      default: false,
    },
  ],
  returnType: 'PatchResult',
  examples: [
    {
      input: { ops: [{ op: 'add', path: '/nodes/-', value: { id: 'validator', type: 'logic.validate', config: {} } }] },
      description: 'Add a new node',
    },
    {
      input: { ops: [{ op: 'add', path: '/wires/-', value: { from: 'input', to: 'validator', signalType: 'DATA.INPUT' } }] },
      description: 'Add a wire',
    },
    {
      input: { ops: [{ op: 'remove', path: '/nodes/5' }], confirm: true },
      description: 'Remove node at index 5',
    },
    {
      input: { ops: [{ op: 'replace', path: '/nodes/0/config', value: { schema: {} } }], confirm: true },
      description: 'Replace node config',
    },
    {
      input: { ops: [{ op: 'add', path: '/test', value: {} }], dryRun: true },
      description: 'Preview changes without applying',
    },
    {
      input: { ops: [{ op: 'add', path: '/test', value: {} }], explain: true },
      description: 'Get execution trace',
    },
  ],
};

// =============================================================================
// PATCH TOOL CLASS
// =============================================================================

/**
 * Patch Tool - Modify Graph
 */
export class PatchTool extends BaseTool<PatchParams, PatchResult> {
  readonly name = 'patch';
  readonly definition = PATCH_TOOL_DEFINITION;

  // Track destructive operations
  private static readonly DESTRUCTIVE_OPS = ['remove', 'replace'];

  async execute(params: PatchParams): Promise<ToolResult<PatchResult>> {
    const session = globalSessionManager;

    // Dry run mode - skip session check
    if (params.dryRun) {
      return this.dryRun(params);
    }

    // Check session
    if (!session.isInitialized()) {
      return this.error(ErrorCode.SESSION_NOT_INITIALIZED, 'No project loaded. Run use({ project: "path" }) first.', {
        recovery: {
          suggestions: ['Load a project with use({ project: "path" }) or use({ detect: true })'],
        },
      });
    }

    // Validate params
    if (!params.ops || !Array.isArray(params.ops) || params.ops.length === 0) {
      return this.error(ErrorCode.INVALID_PARAMETERS, 'ops must be a non-empty array of patch operations');
    }

    // Check for destructive operations
    const hasDestructiveOps = params.ops.some(op => PatchTool.DESTRUCTIVE_OPS.includes(op.op));
    if (hasDestructiveOps && !params.confirm) {
      const destructiveOpsList = params.ops
        .filter(op => PatchTool.DESTRUCTIVE_OPS.includes(op.op))
        .map(op => `${op.op} ${op.path}`);

      return this.error(ErrorCode.PATCH_REQUIRES_CONFIRM, 'Destructive operations require confirmation', {
        details: {
          destructiveOperations: destructiveOpsList,
          impact: 'These operations cannot be automatically undone',
        },
        recovery: {
          suggestions: [
            'Add confirm: true to proceed',
            'Use dryRun: true to preview changes first',
          ],
        },
      });
    }

    // Create checkpoint
    let checkpoint = undefined;
    if (params.checkpoint !== false && session.config?.history?.enabled !== false) {
      checkpoint = session.createCheckpoint(
        typeof params.checkpoint === 'string' ? params.checkpoint : undefined,
        params.ops
      );
    }

    // Get target data
    const target = params.target || 'cartridge';
    const targetData = this.getTargetData(target);

    if (!targetData) {
      return this.error(ErrorCode.TARGET_NOT_FOUND, `Target '${target}' not found or not loaded`);
    }

    // Execute trace (if explain mode)
    const trace: PatchResult['trace'] = [];

    // Apply operations
    const changes: PatchResult['changes'] = [];
    let applied = 0;
    let failed = 0;
    const validationErrors: ValidationError[] = [];
    const validationWarnings: ValidationError[] = [];

    // Deep clone target data for modifications
    const modifiedData = JSON.parse(JSON.stringify(targetData));

    for (let i = 0; i < params.ops.length; i++) {
      // Normalize path for signals/composites targets
      let op = params.ops[i];
      if (target === 'signals' || target === 'composites') {
        op = this.normalizePathForTarget(op, target);
      }
      
      const startTime = Date.now();
      
      type TraceStatus = 'pending' | 'validating' | 'applying' | 'complete' | 'failed';
      const stepTrace: {
        step: number;
        op: PatchOperation;
        status: TraceStatus;
        duration: number;
        message?: string;
      } = {
        step: i + 1,
        op,
        status: 'pending',
        duration: 0,
        message: undefined,
      };

      try {
        // Validate operation structure
        stepTrace.status = 'validating';
        const structureValidation = this.validateOperationStructure(op);
        if (!structureValidation.valid) {
          stepTrace.status = 'failed';
          stepTrace.message = structureValidation.error;
          stepTrace.duration = Date.now() - startTime;
          trace.push(stepTrace);

          changes.push({
            op: op.op,
            path: 'path' in op ? op.path : '',
            description: this.describeOperation(op),
            status: 'failed',
          });
          failed++;

          validationErrors.push({
            code: 'INVALID_OPERATION',
            message: structureValidation.error || 'Invalid operation',
            path: 'path' in op ? op.path : '',
            severity: 'error',
          });

          continue;
        }

        // Validate against graph rules
        if (!params.skipValidation) {
          const graphValidation = this.validateOperationAgainstGraph(op, modifiedData, target);
          if (!graphValidation.valid) {
            stepTrace.status = 'failed';
            stepTrace.message = graphValidation.error;
            stepTrace.duration = Date.now() - startTime;
            trace.push(stepTrace);

            changes.push({
              op: op.op,
              path: 'path' in op ? op.path : '',
              description: this.describeOperation(op),
              status: 'failed',
            });
            failed++;

            validationErrors.push({
              code: graphValidation.code || 'VALIDATION_FAILED',
              message: graphValidation.error || 'Validation failed',
              path: 'path' in op ? op.path : '',
              severity: 'error',
              suggestion: graphValidation.suggestion,
            });

            continue;
          }

          // Collect warnings
          if (graphValidation.warnings) {
            validationWarnings.push(...graphValidation.warnings);
          }
        }

        // Apply operation
        stepTrace.status = 'applying';
        const applyResult = this.applyOperation(op, modifiedData);

        if (!applyResult.success) {
          stepTrace.status = 'failed';
          stepTrace.message = applyResult.error;
          stepTrace.duration = Date.now() - startTime;
          trace.push(stepTrace);

          changes.push({
            op: op.op,
            path: 'path' in op ? op.path : '',
            description: this.describeOperation(op),
            status: 'failed',
          });
          failed++;

          validationErrors.push({
            code: 'APPLY_FAILED',
            message: applyResult.error || 'Failed to apply operation',
            path: 'path' in op ? op.path : '',
            severity: 'error',
          });

          continue;
        }

        stepTrace.status = 'complete';
        stepTrace.duration = Date.now() - startTime;
        trace.push(stepTrace);

        changes.push({
          op: op.op,
          path: 'path' in op ? op.path : '',
          description: this.describeOperation(op),
          status: 'applied',
        });
        applied++;

      } catch (error) {
        stepTrace.status = 'failed';
        stepTrace.message = error instanceof Error ? error.message : String(error);
        stepTrace.duration = Date.now() - startTime;
        trace.push(stepTrace);

        changes.push({
          op: op.op,
          path: 'path' in op ? op.path : '',
          description: this.describeOperation(op),
          status: 'failed',
        });
        failed++;
      }
    }

    // If any operations succeeded, update the target data
    if (applied > 0) {
      this.setTargetData(target, modifiedData);

      // Save to file
      try {
        await session.saveCartridge();
      } catch (error) {
        // Non-fatal: data is updated in memory
        validationWarnings.push({
          code: 'SAVE_FAILED',
          message: `Failed to save changes to file: ${error instanceof Error ? error.message : String(error)}`,
          path: '',
          severity: 'warning',
        });
      }

      // Invalidate cache
      globalCacheManager.invalidate([CACHE_TAGS.CARTRIDGE, CACHE_TAGS.NODES, CACHE_TAGS.WIRES]);
    }

    // Build result
    const summary = failed === 0
      ? `Applied ${applied} operation(s)`
      : `Applied ${applied}/${params.ops.length} operation(s), ${failed} failed`;

    const status = failed > 0 ? (applied > 0 ? 'partial' : 'error') : 'ok';

    const nextActions: NextAction[] = [];

    if (applied > 0 && failed === 0) {
      nextActions.push({
        action: 'query',
        description: 'Verify changes',
        params: { from: 'cartridge', select: 'validation' },
        priority: 'high',
      });
    }

    if (checkpoint && applied > 0) {
      nextActions.push({
        action: 'use',
        description: 'Rollback if needed',
        params: {},
        priority: 'low',
      });
    }

    // Build recovery info if there were failures
    let recovery: PatchResult['recovery'] | undefined;
    if (failed > 0) {
      recovery = {
        rollback: [],
        retry: params.ops.filter((_, i) => changes[i]?.status === 'failed'),
        suggestions: validationErrors.map(e => e.suggestion).filter(Boolean) as string[],
      };
    }

    return {
      summary,
      status,
      metrics: {
        applied,
        failed,
        nodes: this.countNodes(modifiedData),
        wires: this.countWires(modifiedData),
      },
      data: {
        summary,
        status,
        changes,
        checkpoint: checkpoint ? {
          id: checkpoint.id,
          name: checkpoint.name,
          timestamp: checkpoint.timestamp,
        } : undefined,
        validation: {
          valid: validationErrors.length === 0,
          errors: validationErrors,
          warnings: validationWarnings,
        },
        recovery,
        trace: params.explain ? trace : undefined,
      } as PatchResult,
      nextActions,
    };
  }

  // ===========================================================================
  // TARGET DATA MANAGEMENT
  // ===========================================================================

  /**
   * Normalize path for signals/composites targets
   * Converts /- to /signals/- or /composites/-
   */
  private normalizePathForTarget(op: PatchOperation, target: string): PatchOperation {
    const targetKey = target === 'signals' ? 'signals' : 'composites';
    const path = 'path' in op ? op.path : '';
    
    // If path starts with /- or /, prepend the target key
    if (path === '/-' || path === '/') {
      return {
        ...op,
        path: `/${targetKey}/-`,
      } as PatchOperation;
    }
    
    // If path doesn't start with /targetKey, prepend it
    if (!path.startsWith(`/${targetKey}`)) {
      return {
        ...op,
        path: `/${targetKey}${path.startsWith('/') ? path : '/' + path}`,
      } as PatchOperation;
    }
    
    return op;
  }

  /**
   * Get target data based on target type
   */
  private getTargetData(target: string): Record<string, unknown> | null {
    const session = globalSessionManager;

    switch (target) {
      case 'cartridge':
        return session.cartridgeData as Record<string, unknown> | null;
      case 'signals':
        // Return the signals array directly for easier patching
        // The path format should be /- for appending
        const signalRegistry = session.signalRegistry;
        if (signalRegistry) {
          return { signals: signalRegistry.signals || [] };
        }
        return { signals: [] };
      case 'composites':
        const compositeRegistry = session.getState().compositeRegistry;
        if (compositeRegistry) {
          return { composites: compositeRegistry.composites || [] };
        }
        return { composites: [] };
      default:
        return null;
    }
  }

  /**
   * Set target data after modifications
   */
  private setTargetData(target: string, data: Record<string, unknown>): void {
    const session = globalSessionManager;

    switch (target) {
      case 'cartridge':
        session.setActiveCartridge(
          session.activeCartridge!,
          data,
          session.cartridgePath!
        );
        break;
      case 'signals':
        if (data.signals) {
          session.setSignalRegistry({ signals: data.signals as SignalRegistry['signals'] });
        }
        break;
      case 'composites':
        if (data.composites) {
          session.setCompositeRegistry({ composites: data.composites as CompositeRegistry['composites'] });
        }
        break;
    }
  }

  // ===========================================================================
  // VALIDATION HELPERS
  // ===========================================================================

  /**
   * Validate operation structure (RFC 6902)
   */
  private validateOperationStructure(op: PatchOperation): { valid: boolean; error?: string } {
    if (!op.op) {
      return { valid: false, error: 'Operation missing required field "op"' };
    }

    const validOps = ['add', 'remove', 'replace', 'move', 'copy', 'test'];
    if (!validOps.includes(op.op)) {
      return { valid: false, error: `Invalid operation type: ${op.op}` };
    }

    if (!('path' in op) || typeof op.path !== 'string') {
      return { valid: false, error: 'Operation missing required field "path"' };
    }

    // Check op-specific requirements
    const opType = op.op;
    switch (opType) {
      case 'add':
      case 'replace':
      case 'test':
        if (!('value' in op)) {
          return { valid: false, error: `Operation '${opType}' requires 'value' field` };
        }
        break;
      case 'move':
      case 'copy':
        if (!('from' in op) || typeof op.from !== 'string') {
          return { valid: false, error: `Operation '${opType}' requires 'from' field` };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Validate operation against graph rules
   */
  private validateOperationAgainstGraph(
    op: PatchOperation,
    data: Record<string, unknown>,
    _target: string
  ): {
    valid: boolean;
    error?: string;
    code?: string;
    suggestion?: string;
    warnings?: ValidationError[];
  } {
    const warnings: ValidationError[] = [];

    // Parse path
    const pathParts = this.parsePath('path' in op ? op.path : '');
    if (pathParts.length === 0 && op.op !== 'add') {
      return { valid: false, error: 'Invalid path', code: 'INVALID_PATH' };
    }

    // Graph-specific validation
    if (pathParts[0] === 'nodes') {
      return this.validateNodeOperation(op, data, pathParts);
    }

    if (pathParts[0] === 'wires') {
      return this.validateWireOperation(op, data, pathParts, warnings);
    }

    return { valid: true, warnings };
  }

  /**
   * Validate node-related operations
   */
  private validateNodeOperation(
    op: PatchOperation,
    data: Record<string, unknown>,
    pathParts: string[]
  ): { valid: boolean; error?: string; code?: string; suggestion?: string } {
    const nodes = (data.nodes as Array<Record<string, unknown>>) || [];

    if (op.op === 'add') {
      const nodeValue = 'value' in op ? op.value as Record<string, unknown> : {};

      // Check required fields
      if (!nodeValue.id) {
        return {
          valid: false,
          error: 'Node must have an "id" field',
          code: 'PATCH_NODE_INVALID',
          suggestion: 'Add an "id" field to the node value',
        };
      }

      if (!nodeValue.type) {
        return {
          valid: false,
          error: 'Node must have a "type" field',
          code: 'PATCH_NODE_INVALID',
          suggestion: 'Add a "type" field to the node value',
        };
      }

      // Check for duplicate ID
      if (nodes.some(n => n.id === nodeValue.id)) {
        return {
          valid: false,
          error: `Node with id '${String(nodeValue.id)}' already exists`,
          code: 'PATCH_NODE_EXISTS',
          suggestion: 'Use a different node ID or use replace to modify existing node',
        };
      }

      return { valid: true };
    }

    if (op.op === 'remove') {
      // Check if node has connected wires
      // Support both numeric index and node ID
      const nodes = (data.nodes as Array<Record<string, unknown>>) || [];
      let nodeIndex = -1;
      let nodeId: string | undefined;

      const pathKey = pathParts[1];
      if (pathKey) {
        const numericIndex = parseInt(pathKey, 10);
        if (isNaN(numericIndex)) {
          // Path contains a node ID, find the index
          nodeIndex = nodes.findIndex(n => n.id === pathKey);
          if (nodeIndex === -1) {
            return {
              valid: false,
              error: `Node with id '${pathKey}' not found`,
              code: 'PATCH_NODE_NOT_FOUND',
            };
          }
          nodeId = pathKey;
        } else {
          nodeIndex = numericIndex;
          if (nodeIndex < 0 || nodeIndex >= nodes.length) {
            return {
              valid: false,
              error: `Node index ${nodeIndex} out of bounds`,
              code: 'PATCH_NODE_NOT_FOUND',
            };
          }
          nodeId = nodes[nodeIndex]?.id as string | undefined;
        }
      }

      if (!nodeId) {
        return {
          valid: false,
          error: 'Invalid node path',
          code: 'PATCH_NODE_NOT_FOUND',
        };
      }

      const wires = (data.wires as Array<Record<string, unknown>>) || [];
      const connectedWires = wires.filter(
        w => w.from === nodeId || w.to === nodeId
      );

      if (connectedWires.length > 0) {
        return {
          valid: false,
          error: `Cannot remove node '${nodeId}': ${connectedWires.length} wire(s) connected`,
          code: 'PATCH_NODE_HAS_WIRES',
          suggestion: 'Remove connected wires first, or use replace to modify the node instead',
        };
      }

      return { valid: true };
    }

    return { valid: true };
  }

  /**
   * Validate wire-related operations
   */
  private validateWireOperation(
    op: PatchOperation,
    data: Record<string, unknown>,
    _pathParts: string[],
    warnings: ValidationError[]
  ): { valid: boolean; error?: string; code?: string; suggestion?: string; warnings?: ValidationError[] } {
    const nodes = (data.nodes as Array<Record<string, unknown>>) || [];

    if (op.op === 'add') {
      const wireValue = 'value' in op ? op.value as Record<string, unknown> : {};

      // Check required fields
      if (!wireValue.from || !wireValue.to || !wireValue.signalType) {
        return {
          valid: false,
          error: 'Wire must have "from", "to", and "signalType" fields',
          code: 'PATCH_WIRE_INVALID',
          suggestion: 'Add missing fields to the wire value',
        };
      }

      // Check if nodes exist
      const fromExists = nodes.some(n => n.id === wireValue.from);
      const toExists = nodes.some(n => n.id === wireValue.to);

      if (!fromExists) {
        return {
          valid: false,
          error: `Source node '${String(wireValue.from)}' not found`,
          code: 'PATCH_NODE_NOT_FOUND',
          suggestion: `Create node '${String(wireValue.from)}' first or use an existing node`,
        };
      }

      if (!toExists) {
        return {
          valid: false,
          error: `Target node '${String(wireValue.to)}' not found`,
          code: 'PATCH_NODE_NOT_FOUND',
          suggestion: `Create node '${String(wireValue.to)}' first or use an existing node`,
        };
      }

      // Check signal type is registered (warning only)
      const session = globalSessionManager;
      const signalRegistry = session.signalRegistry;
      if (signalRegistry) {
        const signalExists = signalRegistry.signals.some(
          s => s.type === wireValue.signalType ||
               (wireValue.signalType as string).startsWith(s.type.replace('*', ''))
        );
        if (!signalExists) {
          warnings.push({
            code: 'PATCH_SIGNAL_NOT_REGISTERED',
            message: `Signal type '${String(wireValue.signalType)}' not registered`,
            path: '',
            severity: 'warning',
            suggestion: `Register the signal type in the signal registry`,
          });
        }
      }

      return { valid: true, warnings };
    }

    return { valid: true, warnings };
  }

  // ===========================================================================
  // APPLY OPERATIONS
  // ===========================================================================

  /**
   * Apply a single JSON Patch operation
   */
  private applyOperation(
    op: PatchOperation,
    data: Record<string, unknown>
  ): { success: boolean; error?: string } {
    try {
      const opType = op.op;
      switch (opType) {
        case 'add':
          return this.applyAdd(op, data);
        case 'remove':
          return this.applyRemove(op, data);
        case 'replace':
          return this.applyReplace(op, data);
        case 'move':
          return this.applyMove(op, data);
        case 'copy':
          return this.applyCopy(op, data);
        case 'test':
          return this.applyTest(op, data);
        default:
          return { success: false, error: `Unknown operation: ${opType}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Apply add operation
   */
  private applyAdd(op: PatchOperation, data: Record<string, unknown>): { success: boolean; error?: string } {
    if (op.op !== 'add') return { success: false, error: 'Invalid operation' };

    const path = op.path;
    const value = op.value;

    // Handle special case: append to array
    if (path.endsWith('/-')) {
      const arrayPath = path.slice(0, -2);
      const array = this.getValueAtPath(data, arrayPath);

      if (!Array.isArray(array)) {
        return { success: false, error: `Path '${arrayPath}' is not an array` };
      }

      array.push(value);
      return { success: true };
    }

    // Handle regular add
    const parentPath = path.substring(0, path.lastIndexOf('/')) || '';
    const key = path.substring(path.lastIndexOf('/') + 1);
    const parent = parentPath ? this.getValueAtPath(data, parentPath) : data;

    if (parent === undefined) {
      return { success: false, error: `Parent path '${parentPath}' not found` };
    }

    if (Array.isArray(parent)) {
      const index = parseInt(key, 10);
      if (isNaN(index)) {
        return { success: false, error: `Invalid array index: ${key}` };
      }
      parent.splice(index, 0, value);
    } else if (typeof parent === 'object' && parent !== null) {
      (parent as Record<string, unknown>)[key] = value;
    } else {
      return { success: false, error: `Cannot add to non-object/array at '${parentPath}'` };
    }

    return { success: true };
  }

  /**
   * Apply remove operation
   */
  private applyRemove(op: PatchOperation, data: Record<string, unknown>): { success: boolean; error?: string } {
    if (op.op !== 'remove') return { success: false, error: 'Invalid operation' };

    const path = op.path;
    const parentPath = path.substring(0, path.lastIndexOf('/')) || '';
    const key = path.substring(path.lastIndexOf('/') + 1);
    const parent = parentPath ? this.getValueAtPath(data, parentPath) : data;

    if (parent === undefined) {
      return { success: false, error: `Parent path '${parentPath}' not found` };
    }

    if (Array.isArray(parent)) {
      // Try to resolve as node ID if parent is nodes/wires array
      let index = parseInt(key, 10);
      if (isNaN(index)) {
        // Key is not numeric, try to find by ID
        index = this.findIndexById(parent, key, parentPath);
        if (index === -1) {
          return { success: false, error: `Item with id '${key}' not found in ${parentPath}` };
        }
      }
      if (index < 0 || index >= parent.length) {
        return { success: false, error: `Array index out of bounds: ${index}` };
      }
      parent.splice(index, 1);
    } else if (typeof parent === 'object' && parent !== null) {
      if (!(key in parent)) {
        return { success: false, error: `Key '${key}' not found` };
      }
      delete (parent as Record<string, unknown>)[key];
    } else {
      return { success: false, error: `Cannot remove from non-object/array at '${parentPath}'` };
    }

    return { success: true };
  }

  /**
   * Find index of item by ID in an array
   * Supports both 'id' field and node-specific lookup
   */
  private findIndexById(array: unknown[], id: string, _parentPath: string): number {
    for (let i = 0; i < array.length; i++) {
      const item = array[i] as Record<string, unknown>;
      if (item && item.id === id) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Apply replace operation
   */
  private applyReplace(op: PatchOperation, data: Record<string, unknown>): { success: boolean; error?: string } {
    if (op.op !== 'replace') return { success: false, error: 'Invalid operation' };

    const path = op.path;
    const parentPath = path.substring(0, path.lastIndexOf('/')) || '';
    const key = path.substring(path.lastIndexOf('/') + 1);
    const parent = parentPath ? this.getValueAtPath(data, parentPath) : data;

    if (parent === undefined) {
      return { success: false, error: `Parent path '${parentPath}' not found` };
    }

    if (Array.isArray(parent)) {
      // Try to resolve as node ID if parent is nodes/wires array
      let index = parseInt(key, 10);
      if (isNaN(index)) {
        // Key is not numeric, try to find by ID
        index = this.findIndexById(parent, key, parentPath);
        if (index === -1) {
          return { success: false, error: `Item with id '${key}' not found in ${parentPath}` };
        }
      }
      if (index < 0 || index >= parent.length) {
        return { success: false, error: `Array index out of bounds: ${index}` };
      }
      parent[index] = op.value;
    } else if (typeof parent === 'object' && parent !== null) {
      if (!(key in parent)) {
        return { success: false, error: `Key '${key}' not found` };
      }
      (parent as Record<string, unknown>)[key] = op.value;
    } else {
      return { success: false, error: `Cannot replace in non-object/array at '${parentPath}'` };
    }

    return { success: true };
  }

  /**
   * Apply move operation
   */
  private applyMove(op: PatchOperation, data: Record<string, unknown>): { success: boolean; error?: string } {
    if (op.op !== 'move') return { success: false, error: 'Invalid operation' };

    const fromPath = op.from;
    const value = this.getValueAtPath(data, fromPath);

    if (value === undefined) {
      return { success: false, error: `Source path '${fromPath}' not found` };
    }

    // Remove from source
    const removeResult = this.applyRemove(
      { op: 'remove', path: fromPath },
      data
    );

    if (!removeResult.success) {
      return removeResult;
    }

    // Add to destination
    return this.applyAdd({ op: 'add', path: op.path, value }, data);
  }

  /**
   * Apply copy operation
   */
  private applyCopy(op: PatchOperation, data: Record<string, unknown>): { success: boolean; error?: string } {
    if (op.op !== 'copy') return { success: false, error: 'Invalid operation' };

    const fromPath = op.from;
    const value = this.getValueAtPath(data, fromPath);

    if (value === undefined) {
      return { success: false, error: `Source path '${fromPath}' not found` };
    }

    return this.applyAdd({ op: 'add', path: op.path, value }, data);
  }

  /**
   * Apply test operation
   */
  private applyTest(op: PatchOperation, data: Record<string, unknown>): { success: boolean; error?: string } {
    if (op.op !== 'test') return { success: false, error: 'Invalid operation' };

    const path = op.path;
    const value = this.getValueAtPath(data, path);

    if (JSON.stringify(value) !== JSON.stringify(op.value)) {
      return { success: false, error: `Test failed at '${path}': value does not match` };
    }

    return { success: true };
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Parse JSON Pointer path
   */
  private parsePath(path: string): string[] {
    if (!path || path === '/') return [];
    return path.split('/').slice(1).map(p => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  }

  /**
   * Get value at JSON Pointer path
   * Supports both numeric indices and node ID lookups for arrays
   */
  private getValueAtPath(data: unknown, path: string): unknown {
    if (!path || path === '/') return data;

    const parts = this.parsePath(path);
    let current = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (Array.isArray(current)) {
        const index = parseInt(part, 10);
        if (!isNaN(index)) {
          current = current[index];
        } else {
          // Try to find by ID for arrays of objects
          const found = current.find(item => 
            item && typeof item === 'object' && 'id' in item && (item as { id: string }).id === part
          );
          current = found;
        }
      } else if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Describe operation for human-readable output
   */
  private describeOperation(op: PatchOperation): string {
    const opPath = 'path' in op ? op.path : '';
    switch (op.op) {
      case 'add':
        return `Add at ${opPath}`;
      case 'remove':
        return `Remove at ${opPath}`;
      case 'replace':
        return `Replace at ${opPath}`;
      case 'move':
        return `Move from ${'from' in op ? op.from : ''} to ${opPath}`;
      case 'copy':
        return `Copy from ${'from' in op ? op.from : ''} to ${opPath}`;
      case 'test':
        return `Test at ${opPath}`;
      default:
        return `Unknown operation at ${opPath}`;
    }
  }

  /**
   * Count nodes in data
   */
  private countNodes(data: Record<string, unknown>): number {
    const nodes = data.nodes;
    return Array.isArray(nodes) ? nodes.length : 0;
  }

  /**
   * Count wires in data
   */
  private countWires(data: Record<string, unknown>): number {
    const wires = data.wires;
    return Array.isArray(wires) ? wires.length : 0;
  }

  /**
   * Dry run - preview without applying
   */
  private dryRun(params: PatchParams): ToolResult<PatchResult> {
    const changes = params.ops.map(op => ({
      op: op.op,
      path: 'path' in op ? op.path : '',
      description: this.describeOperation(op),
      status: 'skipped' as const,
    }));

    return {
      summary: `[DRY RUN] Would apply ${params.ops.length} operation(s)`,
      status: 'dry_run',
      metrics: {
        applied: 0,
        failed: 0,
        nodes: 0,
        wires: 0,
      },
      data: {
        summary: `[DRY RUN] Would apply ${params.ops.length} operation(s)`,
        status: 'dry_run',
        changes,
      } as PatchResult,
      nextActions: [
        {
          action: 'patch',
          description: 'Apply these changes',
          params: { ...params, dryRun: false },
          priority: 'high',
        },
      ],
    };
  }
}

// =============================================================================
// IMPORTS FOR TYPES
// =============================================================================

import type { SignalRegistry, CompositeRegistry } from '../core/SessionState';

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a Patch tool instance
 */
export function createPatchTool(): PatchTool {
  return new PatchTool();
}
