/**
 * refactor_semantics - Distributed semantic renaming
 *
 * This tool enables safe renaming of signals, nodes, and composites
 * across multiple cartridges and registries with conflict detection.
 * 
 * v2.0.1 - Added syntax validation to prevent "Shotgun Surgery" risks.
 *
 * @module @graph-os/mcp-tools/bridge
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MCPToolResult, MCPToolDefinition } from '../../core/MCPTool';
import type { Cartridge, SignalRegistry, CompositeRegistry } from '../../core/ConflictDetector';

// =============================================================================
// Types
// =============================================================================

export type RefactorType = 'rename-signal' | 'rename-node' | 'rename-composite';
export type RefactorScope = 'local' | 'global' | 'distributed';

export interface RefactorSemanticsRequest {
  /** Type of refactoring operation */
  refactorType: RefactorType;
  /** Current name to replace */
  oldName: string;
  /** New name to use */
  newName: string;
  /** Scope of refactoring */
  scope?: RefactorScope;
  /** Primary cartridge path (required for local scope) */
  cartridgePath?: string;
  /** Additional cartridge paths (for global/distributed scope) */
  cartridgePaths?: string[];
  /** Signal registry path */
  signalRegistryPath?: string;
  /** Composite registry path */
  compositeRegistryPath?: string;
  /** Preview changes without applying */
  dryRun?: boolean;
  /** Include documentation files in refactoring */
  includeDocumentation?: boolean;
  /** Generate detailed diff */
  includeDiff?: boolean;
}

export interface Change {
  line: number;
  oldContent: string;
  newContent: string;
  context?: string;
}

export interface FileChange {
  filePath: string;
  fileType: 'cartridge' | 'signal-registry' | 'composite-registry' | 'documentation';
  changes: Change[];
  diff?: string;
  modified: boolean;
  syntaxValid: boolean;
  syntaxError?: string;
}

export interface RefactorConflict {
  type: 'name-collision' | 'circular-dependency' | 'orphaned-reference' | 'broken-wire';
  message: string;
  location: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface RefactorSummary {
  totalFiles: number;
  modifiedFiles: number;
  totalChanges: number;
  signalsRenamed: number;
  nodesRenamed: number;
  compositesRenamed: number;
  wiresUpdated: number;
  syntaxErrors: number;
}

export interface RefactorSemanticsResult {
  success: boolean;
  dryRun: boolean;
  syntaxValid: boolean;
  changes: FileChange[];
  conflicts: RefactorConflict[];
  warnings: string[];
  summary: RefactorSummary;
  rollbackInfo?: {
    backupPaths: string[];
    command: string;
  };
}

// =============================================================================
// Syntax Validation
// =============================================================================

interface SyntaxValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate JSON syntax for cartridge and registry files
 */
function validateJsonSyntax(content: string, filePath: string): SyntaxValidationResult {
  try {
    JSON.parse(content);
    return { valid: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { valid: false, error: `JSON syntax error in ${filePath}: ${error}` };
  }
}

/**
 * Validate cartridge structure after modification
 */
function validateCartridgeStructure(content: string, filePath: string): SyntaxValidationResult {
  // First validate JSON syntax
  const jsonResult = validateJsonSyntax(content, filePath);
  if (!jsonResult.valid) return jsonResult;
  
  try {
    const cartridge = JSON.parse(content);
    
    // Check required fields
    if (!cartridge.nodes || !Array.isArray(cartridge.nodes)) {
      return { valid: false, error: `Invalid cartridge structure in ${filePath}: missing or invalid 'nodes' array` };
    }
    
    if (cartridge.wires && !Array.isArray(cartridge.wires)) {
      return { valid: false, error: `Invalid cartridge structure in ${filePath}: 'wires' must be an array` };
    }
    
    // Validate each node has required fields
    for (let i = 0; i < cartridge.nodes.length; i++) {
      const node = cartridge.nodes[i];
      if (!node.id || typeof node.id !== 'string') {
        return { valid: false, error: `Invalid node at index ${i} in ${filePath}: missing or invalid 'id'` };
      }
      if (!node.type || typeof node.type !== 'string') {
        return { valid: false, error: `Invalid node '${node.id}' in ${filePath}: missing or invalid 'type'` };
      }
    }
    
    // Validate wire references
    const nodeIds = new Set(cartridge.nodes.map((n: { id: string }) => n.id));
    if (cartridge.wires) {
      for (let i = 0; i < cartridge.wires.length; i++) {
        const wire = cartridge.wires[i];
        if (!wire.from || !wire.to) {
          return { valid: false, error: `Invalid wire at index ${i} in ${filePath}: missing 'from' or 'to'` };
        }
        // Note: We don't check if wire references exist since we might be in the middle of renaming
      }
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: `Structure validation error in ${filePath}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/**
 * Validate signal registry structure
 */
function validateSignalRegistryStructure(content: string, filePath: string): SyntaxValidationResult {
  const jsonResult = validateJsonSyntax(content, filePath);
  if (!jsonResult.valid) return jsonResult;
  
  try {
    const registry = JSON.parse(content);
    
    if (!registry.signals || !Array.isArray(registry.signals)) {
      return { valid: false, error: `Invalid signal registry structure in ${filePath}: missing or invalid 'signals' array` };
    }
    
    for (let i = 0; i < registry.signals.length; i++) {
      const signal = registry.signals[i];
      if (!signal.type || typeof signal.type !== 'string') {
        return { valid: false, error: `Invalid signal at index ${i} in ${filePath}: missing or invalid 'type'` };
      }
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: `Signal registry validation error in ${filePath}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/**
 * Validate composite registry structure
 */
function validateCompositeRegistryStructure(content: string, filePath: string): SyntaxValidationResult {
  const jsonResult = validateJsonSyntax(content, filePath);
  if (!jsonResult.valid) return jsonResult;
  
  try {
    const registry = JSON.parse(content);
    
    if (!registry.composites || !Array.isArray(registry.composites)) {
      return { valid: false, error: `Invalid composite registry structure in ${filePath}: missing or invalid 'composites' array` };
    }
    
    for (let i = 0; i < registry.composites.length; i++) {
      const composite = registry.composites[i];
      if (!composite.name || typeof composite.name !== 'string') {
        return { valid: false, error: `Invalid composite at index ${i} in ${filePath}: missing or invalid 'name'` };
      }
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: `Composite registry validation error in ${filePath}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// =============================================================================
// RefactorSemanticsTool Class
// =============================================================================

export class RefactorSemanticsTool {
  readonly definition: MCPToolDefinition = {
    name: 'refactor_semantics',
    description: 'Performs distributed semantic renaming across cartridges and registries. Safely renames signals, nodes, and composites with conflict detection, syntax validation, and preview mode.',
    parameters: [
      {
        name: 'refactorType',
        type: 'string',
        required: true,
        description: 'Type of refactoring: rename-signal, rename-node, or rename-composite'
      },
      {
        name: 'oldName',
        type: 'string',
        required: true,
        description: 'Current name to replace'
      },
      {
        name: 'newName',
        type: 'string',
        required: true,
        description: 'New name to use'
      },
      {
        name: 'scope',
        type: 'string',
        required: false,
        description: 'Scope: local (single cartridge), global (multiple cartridges), distributed (with registries)'
      },
      {
        name: 'cartridgePath',
        type: 'string',
        required: false,
        description: 'Primary cartridge path (required for local scope)'
      },
      {
        name: 'cartridgePaths',
        type: 'array',
        required: false,
        description: 'Additional cartridge paths for global/distributed scope'
      },
      {
        name: 'signalRegistryPath',
        type: 'string',
        required: false,
        description: 'Path to signal registry'
      },
      {
        name: 'compositeRegistryPath',
        type: 'string',
        required: false,
        description: 'Path to composite registry'
      },
      {
        name: 'dryRun',
        type: 'boolean',
        required: false,
        description: 'Preview changes without applying (default: false)'
      },
      {
        name: 'includeDiff',
        type: 'boolean',
        required: false,
        description: 'Generate detailed diff for each file'
      }
    ],
    returnType: 'RefactorSemanticsResult',
    category: 'bridge',
    bestFor: ['renaming', 'refactoring', 'migration', 'semantic changes'],
    complexity: 'high'
  };

  async execute(input: RefactorSemanticsRequest): Promise<MCPToolResult<RefactorSemanticsResult>> {
    const changes: FileChange[] = [];
    const conflicts: RefactorConflict[] = [];
    const warnings: string[] = [];
    const backupPaths: string[] = [];

    const summary: RefactorSummary = {
      totalFiles: 0,
      modifiedFiles: 0,
      totalChanges: 0,
      signalsRenamed: 0,
      nodesRenamed: 0,
      compositesRenamed: 0,
      wiresUpdated: 0,
      syntaxErrors: 0,
    };

    try {
      // Validate input
      if (input.oldName === input.newName) {
        return {
          success: false,
          error: 'Old name and new name are identical'
        };
      }

      const scope = input.scope || 'local';
      const dryRun = input.dryRun || false;

      // Collect all files to process
      const filesToProcess: string[] = [];
      
      if (input.cartridgePath) {
        filesToProcess.push(input.cartridgePath);
      }
      if (input.cartridgePaths) {
        filesToProcess.push(...input.cartridgePaths);
      }

      if (filesToProcess.length === 0) {
        return {
          success: false,
          error: 'No cartridge paths provided'
        };
      }

      summary.totalFiles = filesToProcess.length;

      // Check for name collisions before making changes
      const collisionCheck = await this.detectNameCollisions(
        input.refactorType,
        input.oldName,
        input.newName,
        filesToProcess,
        input.signalRegistryPath,
        input.compositeRegistryPath
      );
      conflicts.push(...collisionCheck);

      // Stop if there are error-level conflicts
      if (conflicts.some(c => c.severity === 'error')) {
        return {
          success: false,
          error: 'Conflicts detected that prevent refactoring',
          data: {
            success: false,
            dryRun,
            syntaxValid: false,
            changes,
            conflicts,
            warnings,
            summary,
          }
        };
      }

      // Process each file
      for (const filePath of filesToProcess) {
        if (!fs.existsSync(filePath)) {
          warnings.push(`File not found: ${filePath}`);
          continue;
        }

        const fileChange = await this.processFile(
          filePath,
          input.refactorType,
          input.oldName,
          input.newName,
          dryRun,
          input.includeDiff
        );

        if (fileChange) {
          changes.push(fileChange);
          
          if (fileChange.modified) {
            summary.modifiedFiles++;
            summary.totalChanges += fileChange.changes.length;
          }
          
          if (!fileChange.syntaxValid) {
            summary.syntaxErrors++;
          }
        }
      }

      // Process signal registry if renaming signals
      if (input.refactorType === 'rename-signal' && input.signalRegistryPath) {
        const registryChange = await this.processSignalRegistry(
          input.signalRegistryPath,
          input.oldName,
          input.newName,
          dryRun,
          input.includeDiff
        );

        if (registryChange) {
          changes.push(registryChange);
          if (registryChange.modified) {
            summary.modifiedFiles++;
            summary.totalChanges += registryChange.changes.length;
            summary.signalsRenamed++;
          }
          if (!registryChange.syntaxValid) {
            summary.syntaxErrors++;
          }
        }
      }

      // Process composite registry if renaming composites
      if (input.refactorType === 'rename-composite' && input.compositeRegistryPath) {
        const registryChange = await this.processCompositeRegistry(
          input.compositeRegistryPath,
          input.oldName,
          input.newName,
          dryRun,
          input.includeDiff
        );

        if (registryChange) {
          changes.push(registryChange);
          if (registryChange.modified) {
            summary.modifiedFiles++;
            summary.totalChanges += registryChange.changes.length;
            summary.compositesRenamed++;
          }
          if (!registryChange.syntaxValid) {
            summary.syntaxErrors++;
          }
        }
      }

      // Check for syntax errors - ABORT if any found
      const filesWithSyntaxErrors = changes.filter(c => !c.syntaxValid);
      if (filesWithSyntaxErrors.length > 0) {
        return {
          success: false,
          error: `Syntax validation failed for ${filesWithSyntaxErrors.length} file(s). Operation aborted to prevent broken code.`,
          data: {
            success: false,
            dryRun,
            syntaxValid: false,
            changes,
            conflicts,
            warnings,
            summary,
          }
        };
      }

      // Update summary based on refactor type
      for (const change of changes) {
        if (change.fileType === 'cartridge') {
          if (input.refactorType === 'rename-node') {
            summary.nodesRenamed += change.changes.filter(c => 
              c.oldContent.includes('"id"') || c.oldContent.includes("'id'")
            ).length;
          }
          summary.wiresUpdated += change.changes.filter(c =>
            c.oldContent.includes('"from"') || c.oldContent.includes('"to"') ||
            c.oldContent.includes("'from'") || c.oldContent.includes("'to'")
          ).length;
        }
      }

      // Generate rollback info
      let rollbackInfo: { backupPaths: string[]; command: string } | undefined;
      if (!dryRun && backupPaths.length > 0) {
        rollbackInfo = {
          backupPaths,
          command: `Restore backups from .snapshots directory`,
        };
      }

      return {
        success: true,
        data: {
          success: true,
          dryRun,
          syntaxValid: true,
          changes,
          conflicts,
          warnings,
          summary,
          rollbackInfo,
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: {
          success: false,
          dryRun: input.dryRun || false,
          syntaxValid: false,
          changes,
          conflicts,
          warnings,
          summary,
        }
      };
    }
  }

  // ===========================================================================
  // File Processing Methods
  // ===========================================================================

  private async processFile(
    filePath: string,
    refactorType: RefactorType,
    oldName: string,
    newName: string,
    dryRun: boolean,
    includeDiff?: boolean
  ): Promise<FileChange | null> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const changes: Change[] = [];
    let newContent = content;

    switch (refactorType) {
      case 'rename-signal':
        // Rename signal type in wires - use more precise matching
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes('"signalType"') || line.includes("'signalType'")) {
            const oldLine = line;
            // Use more precise regex to avoid partial matches
            const newLine = line.replace(
              new RegExp(`"signalType"\\s*:\\s*"${oldName.replace(/\./g, '\\.')}"`, 'g'),
              `"signalType": "${newName}"`
            ).replace(
              new RegExp(`'signalType'\\s*:\\s*'${oldName.replace(/\./g, '\\.')}'`, 'g'),
              `'signalType': '${newName}'`
            );
            
            if (oldLine !== newLine) {
              changes.push({
                line: i + 1,
                oldContent: oldLine,
                newContent: newLine,
                context: 'wire signal type',
              });
              lines[i] = newLine;
            }
          }
        }
        break;

      case 'rename-node':
        // Rename node ID and update wire connections - more precise matching
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let newLine = line;

          // Update node ID - match exact "id": "nodename" pattern
          if (line.includes('"id"') || line.includes("'id'")) {
            newLine = line.replace(
              new RegExp(`"id"\\s*:\\s*"${oldName}"`, 'g'),
              `"id": "${newName}"`
            ).replace(
              new RegExp(`'id'\\s*:\\s*'${oldName}'`, 'g'),
              `'id': '${newName}'`
            );
          }

          // Update wire from/to - match exact "from"/"to" patterns
          if (line.includes('"from"') || line.includes('"to"') ||
              line.includes("'from'") || line.includes("'to'")) {
            newLine = line.replace(
              new RegExp(`"from"\\s*:\\s*"${oldName}"`, 'g'),
              `"from": "${newName}"`
            ).replace(
              new RegExp(`"to"\\s*:\\s*"${oldName}"`, 'g'),
              `"to": "${newName}"`
            ).replace(
              new RegExp(`'from'\\s*:\\s*'${oldName}'`, 'g'),
              `'from': '${newName}'`
            ).replace(
              new RegExp(`'to'\\s*:\\s*'${oldName}'`, 'g'),
              `'to': '${newName}'`
            );
          }

          if (line !== newLine) {
            changes.push({
              line: i + 1,
              oldContent: line,
              newContent: newLine,
              context: 'node reference',
            });
            lines[i] = newLine;
          }
        }
        break;

      case 'rename-composite':
        // Rename composite references - more precise matching
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes('"composite"') || line.includes("'composite'") ||
              line.includes('"name"') || line.includes("'name'")) {
            const oldLine = line;
            const newLine = line.replace(
              new RegExp(`"composite"\\s*:\\s*"${oldName}"`, 'g'),
              `"composite": "${newName}"`
            ).replace(
              new RegExp(`"name"\\s*:\\s*"${oldName}"`, 'g'),
              `"name": "${newName}"`
            ).replace(
              new RegExp(`'composite'\\s*:\\s*'${oldName}'`, 'g'),
              `'composite': '${newName}'`
            ).replace(
              new RegExp(`'name'\\s*:\\s*'${oldName}'`, 'g'),
              `'name': '${newName}'`
            );

            if (oldLine !== newLine) {
              changes.push({
                line: i + 1,
                oldContent: oldLine,
                newContent: newLine,
                context: 'composite reference',
              });
              lines[i] = newLine;
            }
          }
        }
        break;
    }

    newContent = lines.join('\n');
    const modified = changes.length > 0 && content !== newContent;

    // SYNTAX VALIDATION - Check before writing
    let syntaxValid = true;
    let syntaxError: string | undefined;
    
    if (modified) {
      const validationResult = validateCartridgeStructure(newContent, filePath);
      syntaxValid = validationResult.valid;
      syntaxError = validationResult.error;
    }

    // Only write file if syntax is valid (or no changes made)
    if (!dryRun && modified && syntaxValid) {
      // Create backup
      const backupPath = this.createBackup(filePath);
      
      // Write new content
      fs.writeFileSync(filePath, newContent);
    }

    // Generate diff if requested
    let diff: string | undefined;
    if (includeDiff && modified) {
      diff = this.generateDiff(content, newContent);
    }

    return {
      filePath,
      fileType: 'cartridge',
      changes,
      diff,
      modified,
      syntaxValid,
      syntaxError,
    };
  }

  private async processSignalRegistry(
    registryPath: string,
    oldName: string,
    newName: string,
    dryRun: boolean,
    includeDiff?: boolean
  ): Promise<FileChange | null> {
    if (!fs.existsSync(registryPath)) {
      return null;
    }

    const content = fs.readFileSync(registryPath, 'utf-8');
    const lines = content.split('\n');
    const changes: Change[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('"type"') || line.includes("'type'")) {
        const oldLine = line;
        // More precise matching for signal type
        const newLine = line.replace(
          new RegExp(`"type"\\s*:\\s*"${oldName.replace(/\./g, '\\.')}"`, 'g'),
          `"type": "${newName}"`
        ).replace(
          new RegExp(`'type'\\s*:\\s*'${oldName.replace(/\./g, '\\.')}'`, 'g'),
          `'type': '${newName}'`
        );

        if (oldLine !== newLine) {
          changes.push({
            line: i + 1,
            oldContent: oldLine,
            newContent: newLine,
            context: 'signal type definition',
          });
          lines[i] = newLine;
        }
      }
    }

    const newContent = lines.join('\n');
    const modified = changes.length > 0 && content !== newContent;

    // SYNTAX VALIDATION
    let syntaxValid = true;
    let syntaxError: string | undefined;
    
    if (modified) {
      const validationResult = validateSignalRegistryStructure(newContent, registryPath);
      syntaxValid = validationResult.valid;
      syntaxError = validationResult.error;
    }

    if (!dryRun && modified && syntaxValid) {
      this.createBackup(registryPath);
      fs.writeFileSync(registryPath, newContent);
    }

    return {
      filePath: registryPath,
      fileType: 'signal-registry',
      changes,
      diff: includeDiff && modified ? this.generateDiff(content, newContent) : undefined,
      modified,
      syntaxValid,
      syntaxError,
    };
  }

  private async processCompositeRegistry(
    registryPath: string,
    oldName: string,
    newName: string,
    dryRun: boolean,
    includeDiff?: boolean
  ): Promise<FileChange | null> {
    if (!fs.existsSync(registryPath)) {
      return null;
    }

    const content = fs.readFileSync(registryPath, 'utf-8');
    const lines = content.split('\n');
    const changes: Change[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('"name"') || line.includes("'name'")) {
        const oldLine = line;
        // More precise matching
        const newLine = line.replace(
          new RegExp(`"name"\\s*:\\s*"${oldName}"`, 'g'),
          `"name": "${newName}"`
        ).replace(
          new RegExp(`'name'\\s*:\\s*'${oldName}'`, 'g'),
          `'name': '${newName}'`
        );

        if (oldLine !== newLine) {
          changes.push({
            line: i + 1,
            oldContent: oldLine,
            newContent: newLine,
            context: 'composite name definition',
          });
          lines[i] = newLine;
        }
      }
    }

    const newContent = lines.join('\n');
    const modified = changes.length > 0 && content !== newContent;

    // SYNTAX VALIDATION
    let syntaxValid = true;
    let syntaxError: string | undefined;
    
    if (modified) {
      const validationResult = validateCompositeRegistryStructure(newContent, registryPath);
      syntaxValid = validationResult.valid;
      syntaxError = validationResult.error;
    }

    if (!dryRun && modified && syntaxValid) {
      this.createBackup(registryPath);
      fs.writeFileSync(registryPath, newContent);
    }

    return {
      filePath: registryPath,
      fileType: 'composite-registry',
      changes,
      diff: includeDiff && modified ? this.generateDiff(content, newContent) : undefined,
      modified,
      syntaxValid,
      syntaxError,
    };
  }

  // ===========================================================================
  // Conflict Detection Methods
  // ===========================================================================

  private async detectNameCollisions(
    refactorType: RefactorType,
    oldName: string,
    newName: string,
    cartridgePaths: string[],
    signalRegistryPath?: string,
    compositeRegistryPath?: string
  ): Promise<RefactorConflict[]> {
    const conflicts: RefactorConflict[] = [];

    // Check if new name already exists
    switch (refactorType) {
      case 'rename-signal':
        if (signalRegistryPath && fs.existsSync(signalRegistryPath)) {
          const registry: SignalRegistry = JSON.parse(fs.readFileSync(signalRegistryPath, 'utf-8'));
          const exists = registry.signals?.some(s => s.type === newName);
          if (exists) {
            conflicts.push({
              type: 'name-collision',
              message: `Signal "${newName}" already exists in signal registry`,
              location: signalRegistryPath,
              severity: 'error',
              suggestion: 'Choose a different name or remove the existing signal first',
            });
          }
        }
        break;

      case 'rename-node':
        for (const cartridgePath of cartridgePaths) {
          if (!fs.existsSync(cartridgePath)) continue;
          
          const cartridge: Cartridge = JSON.parse(fs.readFileSync(cartridgePath, 'utf-8'));
          const exists = cartridge.nodes.some(n => n.id === newName);
          if (exists) {
            conflicts.push({
              type: 'name-collision',
              message: `Node "${newName}" already exists in ${cartridgePath}`,
              location: cartridgePath,
              severity: 'error',
              suggestion: 'Choose a different name or remove the existing node first',
            });
          }
        }
        break;

      case 'rename-composite':
        if (compositeRegistryPath && fs.existsSync(compositeRegistryPath)) {
          const registry: CompositeRegistry = JSON.parse(fs.readFileSync(compositeRegistryPath, 'utf-8'));
          const exists = registry.composites?.some(c => c.name === newName);
          if (exists) {
            conflicts.push({
              type: 'name-collision',
              message: `Composite "${newName}" already exists in composite registry`,
              location: compositeRegistryPath,
              severity: 'error',
              suggestion: 'Choose a different name or remove the existing composite first',
            });
          }
        }
        break;
    }

    return conflicts;
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  private createBackup(filePath: string): string {
    const dir = path.dirname(filePath);
    const backupDir = path.join(dir, '.snapshots');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const basename = path.basename(filePath);
    const backupPath = path.join(backupDir, `${basename}.${timestamp}.backup`);

    fs.copyFileSync(filePath, backupPath);

    return backupPath;
  }

  private generateDiff(oldContent: string, newContent: string): string {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const diffLines: string[] = [];

    const maxLines = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine !== newLine) {
        if (oldLine !== undefined) {
          diffLines.push(`- ${oldLine}`);
        }
        if (newLine !== undefined) {
          diffLines.push(`+ ${newLine}`);
        }
      }
    }

    return diffLines.join('\n');
  }

  validateParams(params: unknown): params is RefactorSemanticsRequest {
    if (typeof params !== 'object' || params === null) return false;
    const p = params as Record<string, unknown>;
    return typeof p.refactorType === 'string' &&
           typeof p.oldName === 'string' &&
           typeof p.newName === 'string';
  }
}

/**
 * Factory function to create a RefactorSemanticsTool instance
 */
export function createRefactorSemanticsTool(): RefactorSemanticsTool {
  return new RefactorSemanticsTool();
}
