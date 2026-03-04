/**
 * lint_and_fix - Automatic linting and error correction
 *
 * This tool provides auto-healing capabilities by:
 * - Detecting common issues (unregistered signals, duplicate nodes, etc.)
 * - Auto-registering missing signals
 * - Deduplicating nodes, wires, and signals
 * - Providing fix suggestions with explanations
 *
 * @module @graph-os/mcp-tools/safety
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MCPToolResult, MCPToolDefinition, MCPParameterSchema } from '../../core/MCPTool';
import type { Cartridge, SignalRegistry, NodeDefinition, WireDefinition } from '../../core/ConflictDetector';

// =============================================================================
// Types
// =============================================================================

export type LintCategory = 
  | 'signals' 
  | 'wires' 
  | 'nodes' 
  | 'composites' 
  | 'registry' 
  | 'all';

export type FixCategory = 'safe' | 'aggressive' | 'conservative';

export interface LintIssue {
  category: LintCategory;
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  location: {
    file?: string;
    nodeId?: string;
    wireIndex?: number;
    signalType?: string;
  };
  autoFixable: boolean;
  suggestion?: string;
}

export interface LintAndFixRequest {
  /** Path to the cartridge file to lint */
  cartridgePath: string;
  /** Path to signal registry */
  signalRegistryPath?: string;
  /** Path to composite registry */
  compositeRegistryPath?: string;
  /** Categories to check */
  checkCategories?: LintCategory[];
  /** Enable auto-fix */
  autoFix?: boolean;
  /** Fix strategy */
  fixCategory?: FixCategory;
  /** Auto-register missing signals */
  autoRegisterSignals?: boolean;
  /** Auto-update signal schemas */
  autoUpdateSignalSchemas?: boolean;
  /** Deduplicate nodes */
  deduplicateNodes?: boolean;
  /** Deduplicate wires */
  deduplicateWires?: boolean;
  /** Deduplicate signals */
  deduplicateSignals?: boolean;
  /** Include suggestions in result */
  includeSuggestions?: boolean;
  /** Explain fixes in result */
  explainFixes?: boolean;
}

export interface FixApplied {
  type: string;
  description: string;
  location: string;
  before?: unknown;
  after?: unknown;
  explanation?: string;
}

export interface LintAndFixResult {
  success: boolean;
  lintPassed: boolean;
  issues: LintIssue[];
  fixesApplied: FixApplied[];
  stats: {
    issuesFound: number;
    errorsFound: number;
    warningsFound: number;
    fixesApplied: number;
    signalsRegistered: number;
    nodesDeduplicated: number;
    wiresDeduplicated: number;
  };
  modifiedFiles: string[];
  suggestions: string[];
  summary: string;
}

// =============================================================================
// LintAndFixTool Class
// =============================================================================

/**
 * LintAndFixTool - Automatic linting and error correction
 *
 * @example
 * ```typescript
 * const tool = new LintAndFixTool();
 * const result = await tool.execute({
 *   cartridgePath: './cartridges/app.cartridge.json',
 *   signalRegistryPath: './registries/signals.json',
 *   autoFix: true,
 *   fixCategory: 'safe'
 * });
 * ```
 */
export class LintAndFixTool {
  readonly definition: MCPToolDefinition = {
    name: 'lint_and_fix',
    description: 'Automatic linting and error correction for Graph-OS cartridges. Detects common issues like unregistered signals, duplicate nodes, circular dependencies, and provides auto-fix capabilities with safe, aggressive, or conservative strategies.',
    parameters: [
      {
        name: 'cartridgePath',
        type: 'string',
        required: true,
        description: 'Path to the cartridge file to lint'
      },
      {
        name: 'signalRegistryPath',
        type: 'string',
        required: false,
        description: 'Path to signal registry for validation'
      },
      {
        name: 'compositeRegistryPath',
        type: 'string',
        required: false,
        description: 'Path to composite registry for validation'
      },
      {
        name: 'checkCategories',
        type: 'array',
        required: false,
        description: 'Categories to check: signals, wires, nodes, composites, registry, all'
      },
      {
        name: 'autoFix',
        type: 'boolean',
        required: false,
        description: 'Enable auto-fix (default: true)'
      },
      {
        name: 'fixCategory',
        type: 'string',
        required: false,
        description: 'Fix strategy: safe (minimal), aggressive (maximum), conservative (additions only)'
      },
      {
        name: 'autoRegisterSignals',
        type: 'boolean',
        required: false,
        description: 'Auto-register missing signals (default: true)'
      },
      {
        name: 'deduplicateNodes',
        type: 'boolean',
        required: false,
        description: 'Deduplicate nodes (default: true for aggressive)'
      },
      {
        name: 'deduplicateWires',
        type: 'boolean',
        required: false,
        description: 'Deduplicate wires (default: true)'
      },
      {
        name: 'includeSuggestions',
        type: 'boolean',
        required: false,
        description: 'Include suggestions in result (default: true)'
      },
      {
        name: 'explainFixes',
        type: 'boolean',
        required: false,
        description: 'Explain fixes in result (default: true)'
      }
    ],
    returnType: 'LintAndFixResult',
    category: 'safety',
    bestFor: ['code quality', 'auto-fix', 'validation', 'cleanup', 'maintainability'],
    complexity: 'medium'
  };

  async execute(input: LintAndFixRequest): Promise<MCPToolResult<LintAndFixResult>> {
    const issues: LintIssue[] = [];
    const fixesApplied: FixApplied[] = [];
    const suggestions: string[] = [];
    const modifiedFiles: string[] = [];

    const stats = {
      issuesFound: 0,
      errorsFound: 0,
      warningsFound: 0,
      fixesApplied: 0,
      signalsRegistered: 0,
      nodesDeduplicated: 0,
      wiresDeduplicated: 0,
    };

    try {
      // Validate cartridge exists
      if (!fs.existsSync(input.cartridgePath)) {
        return {
          success: false,
          error: `Cartridge not found: ${input.cartridgePath}`,
          data: {
            success: false,
            lintPassed: false,
            issues: [],
            fixesApplied: [],
            stats,
            modifiedFiles: [],
            suggestions: [],
            summary: 'Lint failed: cartridge file not found'
          }
        };
      }

      // Load cartridge
      const cartridgeData = fs.readFileSync(input.cartridgePath, 'utf-8');
      const cartridge: Cartridge = JSON.parse(cartridgeData);

      // Load signal registry if provided
      let signalRegistry: SignalRegistry | undefined;
      if (input.signalRegistryPath && fs.existsSync(input.signalRegistryPath)) {
        signalRegistry = JSON.parse(fs.readFileSync(input.signalRegistryPath, 'utf-8'));
      }

      // Determine categories to check
      const categories = input.checkCategories || ['all'];
      const checkAll = categories.includes('all');

      // Determine fix strategy
      const fixCategory = input.fixCategory || 'safe';
      const autoFix = input.autoFix !== false;

      // Lint signals
      if (checkAll || categories.includes('signals')) {
        const signalIssues = this.lintSignals(cartridge, signalRegistry);
        issues.push(...signalIssues);

        // Auto-register missing signals
        if (autoFix && (input.autoRegisterSignals !== false)) {
          const missingSignals = signalIssues.filter(
            i => i.type === 'UNREGISTERED_SIGNAL' && i.autoFixable
          );

          for (const issue of missingSignals) {
            if (issue.location.signalType && signalRegistry && input.signalRegistryPath) {
              // Register the signal
              if (!signalRegistry.signals) {
                signalRegistry.signals = [];
              }

              const newSignal = {
                type: issue.location.signalType,
                description: `Auto-registered from ${path.basename(input.cartridgePath)}`,
                payloadType: 'object' as const,
              };

              signalRegistry.signals.push(newSignal);
              stats.signalsRegistered++;

              fixesApplied.push({
                type: 'SIGNAL_REGISTERED',
                description: `Registered signal: ${issue.location.signalType}`,
                location: input.signalRegistryPath,
                after: newSignal,
                explanation: 'Signal was used in cartridge but not registered in signal registry',
              });

              // Remove the issue
              const idx = issues.indexOf(issue);
              if (idx >= 0) {
                issues.splice(idx, 1);
              }
            }
          }
        }
      }

      // Lint wires
      if (checkAll || categories.includes('wires')) {
        const wireIssues = this.lintWires(cartridge);
        issues.push(...wireIssues);

        // Deduplicate wires
        if (autoFix && (input.deduplicateWires !== false) && fixCategory !== 'conservative') {
          const dedupResult = this.deduplicateWires(cartridge);
          if (dedupResult.duplicatesRemoved > 0) {
            stats.wiresDeduplicated = dedupResult.duplicatesRemoved;
            fixesApplied.push({
              type: 'WIRES_DEDUPLICATED',
              description: `Removed ${dedupResult.duplicatesRemoved} duplicate wire(s)`,
              location: input.cartridgePath,
              explanation: 'Duplicate wires create unnecessary signal routing',
            });
          }
        }
      }

      // Lint nodes
      if (checkAll || categories.includes('nodes')) {
        const nodeIssues = this.lintNodes(cartridge);
        issues.push(...nodeIssues);

        // Deduplicate nodes (aggressive only)
        if (autoFix && input.deduplicateNodes && fixCategory === 'aggressive') {
          const dedupResult = this.deduplicateNodes(cartridge);
          if (dedupResult.duplicatesRemoved > 0) {
            stats.nodesDeduplicated = dedupResult.duplicatesRemoved;
            fixesApplied.push({
              type: 'NODES_DEDUPLICATED',
              description: `Removed ${dedupResult.duplicatesRemoved} duplicate node(s)`,
              location: input.cartridgePath,
              explanation: 'Duplicate nodes with same type and config were merged',
            });
          }
        }
      }

      // Lint composites
      if (checkAll || categories.includes('composites')) {
        const compositeIssues = await this.lintComposites(cartridge, input.compositeRegistryPath);
        issues.push(...compositeIssues);
      }

      // Lint registry
      if (checkAll || categories.includes('registry')) {
        if (signalRegistry) {
          const registryIssues = this.lintRegistry(signalRegistry);
          issues.push(...registryIssues);

          // Deduplicate signals in registry
          if (autoFix && input.deduplicateSignals && fixCategory === 'aggressive') {
            const dedupResult = this.deduplicateSignals(signalRegistry);
            if (dedupResult.duplicatesRemoved > 0) {
              fixesApplied.push({
                type: 'SIGNALS_DEDUPLICATED',
                description: `Removed ${dedupResult.duplicatesRemoved} duplicate signal definition(s)`,
                location: input.signalRegistryPath || 'registry',
                explanation: 'Duplicate signal definitions were merged',
              });
            }
          }
        }
      }

      // Update stats
      stats.issuesFound = issues.length;
      stats.errorsFound = issues.filter(i => i.severity === 'error').length;
      stats.warningsFound = issues.filter(i => i.severity === 'warning').length;
      stats.fixesApplied = fixesApplied.length;

      // Generate suggestions
      if (input.includeSuggestions !== false) {
        for (const issue of issues) {
          if (issue.suggestion) {
            suggestions.push(`${issue.type}: ${issue.suggestion}`);
          }
        }
      }

      // Save modified files
      if (fixesApplied.length > 0) {
        // Save cartridge
        fs.writeFileSync(input.cartridgePath, JSON.stringify(cartridge, null, 2));
        modifiedFiles.push(input.cartridgePath);

        // Save signal registry if modified
        if (stats.signalsRegistered > 0 && signalRegistry && input.signalRegistryPath) {
          fs.writeFileSync(input.signalRegistryPath, JSON.stringify(signalRegistry, null, 2));
          modifiedFiles.push(input.signalRegistryPath);
        }
      }

      // Build summary
      const lintPassed = stats.errorsFound === 0;
      const summary = this.buildSummary(lintPassed, stats, fixesApplied);

      return {
        success: true,
        data: {
          success: true,
          lintPassed,
          issues,
          fixesApplied,
          stats,
          modifiedFiles,
          suggestions,
          summary,
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: {
          success: false,
          lintPassed: false,
          issues,
          fixesApplied,
          stats,
          modifiedFiles,
          suggestions,
          summary: `Lint failed: ${error instanceof Error ? error.message : String(error)}`,
        }
      };
    }
  }

  // ===========================================================================
  // Lint Methods
  // ===========================================================================

  /**
   * Lint signals in the cartridge
   */
  private lintSignals(cartridge: Cartridge, registry?: SignalRegistry): LintIssue[] {
    const issues: LintIssue[] = [];

    // Collect all signal types used in wires
    const usedSignals = new Set<string>();
    for (const wire of cartridge.wires) {
      usedSignals.add(wire.signalType);
    }

    // Check each signal against registry
    if (registry) {
      const registeredSignals = new Set((registry.signals || []).map(s => s.type));

      for (const signalType of usedSignals) {
        if (!registeredSignals.has(signalType)) {
          issues.push({
            category: 'signals',
            type: 'UNREGISTERED_SIGNAL',
            severity: 'warning',
            message: `Signal "${signalType}" is not registered in the signal registry`,
            location: { signalType },
            autoFixable: true,
            suggestion: 'Register the signal in the signal registry or use autoRegisterSignals option',
          });
        }
      }

      // Check for missing signal schemas
      for (const signal of registry.signals || []) {
        if (!signal.payloadSchema) {
          issues.push({
            category: 'signals',
            type: 'MISSING_SIGNAL_SCHEMA',
            severity: 'info',
            message: `Signal "${signal.type}" has no payload schema defined`,
            location: { signalType: signal.type },
            autoFixable: false,
            suggestion: 'Define payloadSchema for better type safety',
          });
        }
      }
    }

    // Check for signal naming convention (NAMESPACE.ACTION)
    for (const signalType of usedSignals) {
      if (!signalType.includes('.') || signalType.startsWith('.') || signalType.endsWith('.')) {
        issues.push({
          category: 'signals',
          type: 'INVALID_SIGNAL_FORMAT',
          severity: 'warning',
          message: `Signal "${signalType}" does not follow NAMESPACE.ACTION format`,
          location: { signalType },
          autoFixable: false,
          suggestion: 'Use NAMESPACE.ACTION format (e.g., USER.LOGIN, AUTH.LOGOUT)',
        });
      }
    }

    return issues;
  }

  /**
   * Lint wires in the cartridge
   */
  private lintWires(cartridge: Cartridge): LintIssue[] {
    const issues: LintIssue[] = [];
    const nodeIds = new Set(cartridge.nodes.map(n => n.id));
    const seenWires = new Map<string, number>();

    for (let i = 0; i < cartridge.wires.length; i++) {
      const wire = cartridge.wires[i];
      const wireKey = `${wire.from}->${wire.to}:${wire.signalType}`;

      // Check for duplicate wires
      if (seenWires.has(wireKey)) {
        issues.push({
          category: 'wires',
          type: 'DUPLICATE_WIRE',
          severity: 'warning',
          message: `Duplicate wire found: ${wireKey}`,
          location: { wireIndex: i },
          autoFixable: true,
          suggestion: 'Remove duplicate wire to clean up the graph',
        });
      }
      seenWires.set(wireKey, i);

      // Check for missing source node
      if (!nodeIds.has(wire.from)) {
        issues.push({
          category: 'wires',
          type: 'WIRE_SOURCE_MISSING',
          severity: 'error',
          message: `Wire ${i} references missing source node: ${wire.from}`,
          location: { wireIndex: i },
          autoFixable: fixCategory === 'aggressive',
          suggestion: 'Remove the wire or create the missing node',
        });
      }

      // Check for missing target node
      if (!nodeIds.has(wire.to)) {
        issues.push({
          category: 'wires',
          type: 'WIRE_TARGET_MISSING',
          severity: 'error',
          message: `Wire ${i} references missing target node: ${wire.to}`,
          location: { wireIndex: i },
          autoFixable: fixCategory === 'aggressive',
          suggestion: 'Remove the wire or create the missing node',
        });
      }

      // Check for self-loops
      if (wire.from === wire.to) {
        issues.push({
          category: 'wires',
          type: 'SELF_LOOP',
          severity: 'warning',
          message: `Wire ${i} creates a self-loop on node: ${wire.from}`,
          location: { wireIndex: i },
          autoFixable: true,
          suggestion: 'Self-loops may cause infinite signal propagation',
        });
      }
    }

    // Check for circular dependencies
    const cycles = this.detectCycles(cartridge);
    for (const cycle of cycles) {
      issues.push({
        category: 'wires',
        type: 'CIRCULAR_DEPENDENCY',
        severity: 'warning',
        message: `Circular dependency detected: ${cycle.join(' -> ')}`,
        location: {},
        autoFixable: false,
        suggestion: 'Consider breaking the cycle by removing a wire',
      });
    }

    return issues;
  }

  /**
   * Lint nodes in the cartridge
   */
  private lintNodes(cartridge: Cartridge): LintIssue[] {
    const issues: LintIssue[] = [];
    const seenIds = new Map<string, number>();

    for (let i = 0; i < cartridge.nodes.length; i++) {
      const node = cartridge.nodes[i];

      // Check for duplicate node IDs
      if (seenIds.has(node.id)) {
        issues.push({
          category: 'nodes',
          type: 'DUPLICATE_NODE_ID',
          severity: 'error',
          message: `Duplicate node ID: ${node.id}`,
          location: { nodeId: node.id },
          autoFixable: true,
          suggestion: 'Rename one of the duplicate nodes',
        });
      }
      seenIds.set(node.id, i);

      // Check for valid node type format
      if (!node.type.includes('.') || node.type.startsWith('.') || node.type.endsWith('.')) {
        issues.push({
          category: 'nodes',
          type: 'INVALID_NODE_TYPE_FORMAT',
          severity: 'warning',
          message: `Node "${node.id}" has invalid type format: ${node.type}`,
          location: { nodeId: node.id },
          autoFixable: false,
          suggestion: 'Use CATEGORY.SUBTYPE format (e.g., logic.transform, control.input)',
        });
      }

      // Check for missing configuration
      if (!node.config || Object.keys(node.config).length === 0) {
        // Only warn for node types that typically need config
        const configRequired = ['logic.validate', 'logic.transform', 'api.request'];
        if (configRequired.some(t => node.type.startsWith(t))) {
          issues.push({
            category: 'nodes',
            type: 'MISSING_NODE_CONFIG',
            severity: 'info',
            message: `Node "${node.id}" has no configuration`,
            location: { nodeId: node.id },
            autoFixable: false,
            suggestion: 'Add appropriate configuration for this node type',
          });
        }
      }
    }

    // Check for orphaned nodes
    const connectedNodes = new Set<string>();
    for (const wire of cartridge.wires) {
      connectedNodes.add(wire.from);
      connectedNodes.add(wire.to);
    }

    for (const node of cartridge.nodes) {
      if (!connectedNodes.has(node.id)) {
        issues.push({
          category: 'nodes',
          type: 'ORPHANED_NODE',
          severity: 'info',
          message: `Node "${node.id}" is not connected to any wires`,
          location: { nodeId: node.id },
          autoFixable: fixCategory === 'aggressive',
          suggestion: 'Connect the node or remove it if not needed',
        });
      }
    }

    return issues;
  }

  /**
   * Lint composite references in the cartridge
   */
  private async lintComposites(cartridge: Cartridge, compositeRegistryPath?: string): Promise<LintIssue[]> {
    const issues: LintIssue[] = [];

    if (!cartridge.composites || cartridge.composites.length === 0) {
      return issues;
    }

    // Load composite registry if available
    let compositeRegistry: { composites: Array<{ name: string; path: string }> } | undefined;
    if (compositeRegistryPath && fs.existsSync(compositeRegistryPath)) {
      compositeRegistry = JSON.parse(fs.readFileSync(compositeRegistryPath, 'utf-8'));
    }

    for (const composite of cartridge.composites) {
      // Check for missing composite reference
      if (compositeRegistry) {
        const registered = compositeRegistry.composites.some(c => c.name === composite.name);
        if (!registered) {
          issues.push({
            category: 'composites',
            type: 'UNREGISTERED_COMPOSITE',
            severity: 'warning',
            message: `Composite "${composite.name}" is not registered`,
            location: {},
            autoFixable: false,
            suggestion: 'Register the composite in the composite registry',
          });
        }
      }

      // Check for missing path
      if (!composite.path) {
        issues.push({
          category: 'composites',
          type: 'MISSING_COMPOSITE_PATH',
          severity: 'error',
          message: `Composite "${composite.name}" has no path defined`,
          location: {},
          autoFixable: false,
          suggestion: 'Specify the path to the composite cartridge file',
        });
      }
    }

    return issues;
  }

  /**
   * Lint signal registry
   */
  private lintRegistry(registry: SignalRegistry): LintIssue[] {
    const issues: LintIssue[] = [];
    const seenTypes = new Map<string, number>();

    const signals = registry.signals || [];

    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i];

      // Check for duplicate signal types
      if (seenTypes.has(signal.type)) {
        issues.push({
          category: 'registry',
          type: 'DUPLICATE_SIGNAL_TYPE',
          severity: 'warning',
          message: `Duplicate signal type in registry: ${signal.type}`,
          location: { signalType: signal.type },
          autoFixable: true,
          suggestion: 'Remove duplicate signal definition',
        });
      }
      seenTypes.set(signal.type, i);

      // Check for conflicting schemas
      const duplicates = signals.filter(s => s.type === signal.type);
      if (duplicates.length > 1) {
        const hasConflict = duplicates.some(d => 
          JSON.stringify(d.payloadSchema) !== JSON.stringify(signal.payloadSchema)
        );
        if (hasConflict) {
          issues.push({
            category: 'registry',
            type: 'SCHEMA_CONFLICT',
            severity: 'error',
            message: `Schema conflict for signal: ${signal.type}`,
            location: { signalType: signal.type },
            autoFixable: false,
            suggestion: 'Resolve schema conflicts by merging or removing duplicates',
          });
        }
      }
    }

    return issues;
  }

  // ===========================================================================
  // Fix Methods
  // ===========================================================================

  /**
   * Deduplicate wires in the cartridge
   */
  private deduplicateWires(cartridge: Cartridge): { duplicatesRemoved: number } {
    const seen = new Set<string>();
    const uniqueWires: WireDefinition[] = [];
    let duplicatesRemoved = 0;

    for (const wire of cartridge.wires) {
      const key = `${wire.from}->${wire.to}:${wire.signalType}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueWires.push(wire);
      } else {
        duplicatesRemoved++;
      }
    }

    cartridge.wires = uniqueWires;
    return { duplicatesRemoved };
  }

  /**
   * Deduplicate nodes in the cartridge (by type and config)
   */
  private deduplicateNodes(cartridge: Cartridge): { duplicatesRemoved: number } {
    const seen = new Map<string, NodeDefinition>();
    const uniqueNodes: NodeDefinition[] = [];
    const idMapping = new Map<string, string>();
    let duplicatesRemoved = 0;

    for (const node of cartridge.nodes) {
      const key = `${node.type}:${JSON.stringify(node.config || {})}`;
      const existing = seen.get(key);

      if (existing && existing.id !== node.id) {
        // This is a duplicate
        idMapping.set(node.id, existing.id);
        duplicatesRemoved++;
      } else {
        seen.set(key, node);
        uniqueNodes.push(node);
      }
    }

    // Update wires to point to kept nodes
    cartridge.wires = cartridge.wires.map(wire => ({
      ...wire,
      from: idMapping.get(wire.from) || wire.from,
      to: idMapping.get(wire.to) || wire.to,
    }));

    // Remove self-loop wires created by deduplication
    cartridge.wires = cartridge.wires.filter(w => w.from !== w.to);

    cartridge.nodes = uniqueNodes;
    return { duplicatesRemoved };
  }

  /**
   * Deduplicate signals in the registry
   */
  private deduplicateSignals(registry: SignalRegistry): { duplicatesRemoved: number } {
    const seen = new Map<string, typeof registry.signals[0]>();
    const uniqueSignals: typeof registry.signals = [];
    let duplicatesRemoved = 0;

    for (const signal of registry.signals || []) {
      if (!seen.has(signal.type)) {
        seen.set(signal.type, signal);
        uniqueSignals.push(signal);
      } else {
        duplicatesRemoved++;
      }
    }

    registry.signals = uniqueSignals;
    return { duplicatesRemoved };
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Detect cycles in the graph
   */
  private detectCycles(cartridge: Cartridge): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const adjacency = new Map<string, string[]>();
    for (const node of cartridge.nodes) {
      adjacency.set(node.id, []);
    }
    for (const wire of cartridge.wires) {
      const targets = adjacency.get(wire.from) || [];
      targets.push(wire.to);
      adjacency.set(wire.from, targets);
    }

    const dfs = (nodeId: string): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      for (const neighbor of adjacency.get(nodeId) || []) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart >= 0) {
            cycles.push([...path.slice(cycleStart), neighbor]);
          }
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
    };

    for (const node of cartridge.nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    return cycles;
  }

  /**
   * Build summary string
   */
  private buildSummary(
    lintPassed: boolean,
    stats: LintAndFixResult['stats'],
    fixes: FixApplied[]
  ): string {
    const parts: string[] = [];

    if (lintPassed) {
      parts.push('Lint passed');
    } else {
      parts.push(`Lint failed with ${stats.errorsFound} error(s)`);
    }

    if (stats.warningsFound > 0) {
      parts.push(`${stats.warningsFound} warning(s)`);
    }

    if (fixes.length > 0) {
      parts.push(`${fixes.length} fix(es) applied`);
    }

    return parts.join('. ') + '.';
  }

  validateParams(params: unknown): params is LintAndFixRequest {
    if (typeof params !== 'object' || params === null) return false;
    const p = params as Record<string, unknown>;
    return typeof p.cartridgePath === 'string';
  }
}

// Need to track fixCategory for use in lint methods
let fixCategory: FixCategory = 'safe';

/**
 * Factory function to create a LintAndFixTool instance
 */
export function createLintAndFixTool(): LintAndFixTool {
  return new LintAndFixTool();
}
