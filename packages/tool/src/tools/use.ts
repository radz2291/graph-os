/**
 * USE Tool - Context & Config Management
 *
 * The entry point for all Graph-OS sessions. Handles project loading,
 * cartridge switching, configuration, and project initialization.
 *
 * @module @graph-os/tool/tools
 */

import { BaseTool, type ToolResult, type ToolDefinition } from '../core/Tool';
import { globalSessionManager } from '../core/SessionState';
import type { UseParams, UseResult, NextAction, GraphOSProjectConfig } from '../core/types';
import { ErrorCode } from '../core/types';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve } from 'path';

// =============================================================================
// TOOL DEFINITION
// =============================================================================

const USE_TOOL_DEFINITION: ToolDefinition = {
  name: 'use',
  purpose: 'Establish and manage project context. Entry point for all Graph-OS sessions.',
  whenToUse: [
    'Starting a new session',
    'Loading a project',
    'Switching between cartridges',
    'Checking current context/state',
    'Modifying project configuration',
    'Creating a new project',
  ],
  whenNotToUse: [
    'Querying graph data (use query)',
    'Modifying the graph (use patch)',
    'Executing runtime (use run)',
  ],
  triggers: ['start', 'load', 'switch', 'where', 'current', 'config', 'init', 'create project', 'rollback', 'undo'],
  parameters: [
    {
      name: 'project',
      type: 'string',
      required: false,
      description: 'Path to project root or config file',
      examples: ['/projects/my-app', './my-app', './graph-os.config.json'],
    },
    {
      name: 'detect',
      type: 'boolean',
      required: false,
      description: 'Auto-detect project from current directory (walks up looking for graph-os.config.json)',
      default: false,
    },
    {
      name: 'cartridge',
      type: 'string',
      required: false,
      description: 'Switch active cartridge by alias',
      examples: ['auth', 'payment', 'user'],
    },
    {
      name: 'config',
      type: 'object',
      required: false,
      description: 'Configuration modifications',
      hints: {
        set: 'Update specific config values (merges with existing)',
        addCartridge: 'Add a new cartridge to the project',
        removeCartridge: 'Remove a cartridge from the project',
      },
    },
    {
      name: 'init',
      type: 'object',
      required: false,
      description: 'Initialize a new project',
      hints: {
        name: 'Project name (required)',
        path: 'Project path (required)',
        template: 'Starter template: minimal, auth, crud, blank',
      },
    },
    {
      name: 'rollback',
      type: 'string',
      required: false,
      description: 'Rollback to checkpoint by ID. Use query({ from: "checkpoints" }) to list available checkpoints.',
      examples: ['ckpt-1234567890-abc123'],
    },
  ],
  returnType: 'UseResult',
  examples: [
    {
      input: { project: '/projects/my-app' },
      description: 'Load project by explicit path',
    },
    {
      input: { detect: true },
      description: 'Auto-detect project from current directory',
    },
    {
      input: {},
      description: 'Get current session state',
    },
    {
      input: { cartridge: 'payment' },
      description: 'Switch to payment cartridge',
    },
    {
      input: { config: { addCartridge: { alias: 'notifications', path: 'cartridges/notif.json' } } },
      description: 'Add a new cartridge to project',
    },
    {
      input: { init: { name: 'new-app', path: '/projects/new-app', template: 'minimal' } },
      description: 'Create new project with minimal template',
    },
    {
      input: { rollback: 'ckpt-1234567890-abc123' },
      description: 'Rollback to a specific checkpoint',
    },
  ],
};

// =============================================================================
// USE TOOL CLASS
// =============================================================================

/**
 * Use Tool - Context & Config Management
 */
export class UseTool extends BaseTool<UseParams, UseResult> {
  readonly name = 'use';
  readonly definition = USE_TOOL_DEFINITION;

  async execute(params: UseParams): Promise<ToolResult<UseResult>> {
    // Mode 1: Get current state (no params)
    if (!params.project && !params.detect && !params.cartridge && !params.config && !params.init && !params.rollback) {
      return this.getCurrentState();
    }

    // Mode 2: Load project
    if (params.project || params.detect) {
      return this.loadProject(params);
    }

    // Mode 3: Switch cartridge
    if (params.cartridge) {
      return this.switchCartridge(params.cartridge);
    }

    // Mode 4: Modify config
    if (params.config) {
      return this.modifyConfig(params.config);
    }

    // Mode 5: Init project
    if (params.init) {
      return this.initProject(params.init);
    }

    // Mode 6: Rollback to checkpoint
    if (params.rollback) {
      return this.rollbackToCheckpoint(params.rollback);
    }

    return this.error(ErrorCode.INVALID_PARAMETERS, 'Invalid combination of parameters');
  }

  // ===========================================================================
  // MODE IMPLEMENTATIONS
  // ===========================================================================

  /**
   * Get current session state
   */
  private getCurrentState(): ToolResult<UseResult> {
    const session = globalSessionManager;
    const state = session.getState();

    if (!session.isInitialized()) {
      return this.success('No project loaded. Use use({ project: "path" }) or use({ detect: true }) to load a project.', {
        state: {
          activeCartridge: '',
          runtimeStatus: 'stopped',
          checkpointsAvailable: 0,
        },
      });
    }

    // Map runtime status to valid UseResult status
    const runtimeStatus = state.runtimeStatus === 'starting' || state.runtimeStatus === 'stopping'
      ? 'stopped'
      : state.runtimeStatus === 'error' ? 'error' : state.runtimeStatus as 'stopped' | 'running' | 'error';

    const cartridgeData = state.cartridgeData as Record<string, unknown> | null;
    const nodes = (cartridgeData?.nodes as unknown[]) || [];
    const wires = (cartridgeData?.wires as unknown[]) || [];

    return this.success(
      `Project: ${state.config?.name} | Cartridge: ${state.activeCartridge} | Nodes: ${nodes.length} | Wires: ${wires.length} | Runtime: ${state.runtimeStatus}`,
      {
        config: state.config ?? undefined,
        state: {
          activeCartridge: state.activeCartridge ?? '',
          runtimeStatus,
          checkpointsAvailable: state.checkpoints.length,
        },
        metrics: {
          cartridges: Object.keys(state.config?.cartridges || {}).length,
          nodes: nodes.length,
          wires: wires.length,
        },
      }
    );
  }

  /**
   * Load project from path or auto-detect
   */
  private async loadProject(params: UseParams): Promise<ReturnType<BaseTool<UseParams, UseResult>['execute']>> {
    const session = globalSessionManager;

    try {
      if (params.project) {
        await session.loadProject(params.project);
      } else if (params.detect) {
        await session.detectProject();
      }

      const config = session.config;
      if (!config) {
        return this.error(ErrorCode.PROJECT_NOT_FOUND, 'Project not found', {
          recovery: {
            suggestions: [
              'Check the path is correct',
              'Ensure graph-os.config.json exists in the project root',
              'Use use({ detect: true }) to auto-detect from current directory',
            ],
          },
        });
      }

      const cartridgeData = session.cartridgeData as Record<string, unknown>;
      const nodes = (cartridgeData?.nodes as unknown[]) || [];
      const wires = (cartridgeData?.wires as unknown[]) || [];

      const nextActions: NextAction[] = [
        {
          action: 'query',
          description: 'Explore the cartridge topology',
          params: { from: 'topology', select: 'mermaid' },
          priority: 'high',
        },
        {
          action: 'query',
          description: 'View all nodes',
          params: { from: 'nodes', select: 'compact' },
          priority: 'medium',
        },
      ];

      return this.success(
        `Loaded project: ${config.name} (${session.activeCartridge} cartridge, ${nodes.length} nodes, ${wires.length} wires)`,
        {
          config,
          state: {
            activeCartridge: session.activeCartridge ?? '',
            runtimeStatus: 'stopped',
            checkpointsAvailable: session.getCheckpoints().length,
          },
          metrics: {
            cartridges: Object.keys(config.cartridges).length,
            nodes: nodes.length,
            wires: wires.length,
          },
        },
        { nextActions }
      );
    } catch (error) {
      return this.error(
        ErrorCode.PROJECT_NOT_FOUND,
        error instanceof Error ? error.message : 'Failed to load project',
        {
          recovery: {
            suggestions: [
              'Check the path is correct',
              'Ensure graph-os.config.json exists',
              'Run use({ init: {...} }) to create a new project',
            ],
          },
        }
      );
    }
  }

  /**
   * Switch active cartridge
   */
  private async switchCartridge(alias: string): Promise<ReturnType<BaseTool<UseParams, UseResult>['execute']>> {
    const session = globalSessionManager;

    if (!session.isInitialized()) {
      return this.error(ErrorCode.SESSION_NOT_INITIALIZED, 'No project loaded. Load a project first.', {
        recovery: {
          suggestions: ['Run use({ project: "path" }) or use({ detect: true }) first'],
        },
      });
    }

    const config = session.config;
    if (!config?.cartridges[alias]) {
      const available = Object.keys(config?.cartridges ?? {});
      return this.error(ErrorCode.CARTRIDGE_NOT_FOUND, `Cartridge '${alias}' not found. Available: ${available.join(', ')}`, {
        details: { alias, available },
        recovery: {
          suggestions: [`Use one of: ${available.join(', ')}`],
        },
      });
    }

    try {
      await session.switchCartridge(alias);

      const cartridgeData = session.cartridgeData as Record<string, unknown>;
      const nodes = (cartridgeData?.nodes as unknown[]) || [];
      const wires = (cartridgeData?.wires as unknown[]) || [];

      return this.success(
        `Switched to cartridge: ${alias} (${nodes.length} nodes, ${wires.length} wires)`,
        {
          config: session.config ?? undefined,
          state: {
            activeCartridge: alias,
            runtimeStatus: 'stopped',
            checkpointsAvailable: session.getCheckpoints().length,
          },
          metrics: {
            nodes: nodes.length,
            wires: wires.length,
          },
        }
      );
    } catch (error) {
      return this.error(
        ErrorCode.CARTRIDGE_NOT_FOUND,
        error instanceof Error ? error.message : 'Failed to switch cartridge',
        {
          recovery: {
            suggestions: ['Check that the cartridge file exists and is valid JSON'],
          },
        }
      );
    }
  }

  /**
   * Modify project configuration
   */
  private async modifyConfig(
    changes: NonNullable<UseParams['config']>
  ): Promise<ReturnType<BaseTool<UseParams, UseResult>['execute']>> {
    const session = globalSessionManager;

    if (!session.isInitialized()) {
      return this.error(ErrorCode.SESSION_NOT_INITIALIZED, 'No project loaded. Load a project first.');
    }

    const config = { ...session.config } as GraphOSProjectConfig;
    let modified = false;
    const messages: string[] = [];

    // Apply set changes
    if (changes.set) {
      Object.assign(config, changes.set);
      modified = true;
      messages.push('Updated config values');
    }

    // Add cartridge
    if (changes.addCartridge) {
      const { alias, path, description } = changes.addCartridge;
      if (config.cartridges[alias]) {
        return this.error(ErrorCode.CARTRIDGE_NOT_FOUND, `Cartridge '${alias}' already exists`, {
          recovery: {
            suggestions: ['Use a different alias or remove the existing cartridge first'],
          },
        });
      }
      config.cartridges[alias] = { path, description };
      modified = true;
      messages.push(`Added cartridge '${alias}'`);
    }

    // Remove cartridge
    if (changes.removeCartridge) {
      const alias = changes.removeCartridge;
      if (!config.cartridges[alias]) {
        return this.error(ErrorCode.CARTRIDGE_NOT_FOUND, `Cartridge '${alias}' not found`);
      }
      if (config.activeCartridge === alias) {
        return this.error(ErrorCode.CARTRIDGE_NOT_FOUND, `Cannot remove active cartridge '${alias}'`, {
          recovery: {
            suggestions: ['Switch to another cartridge first'],
          },
        });
      }
      delete config.cartridges[alias];
      modified = true;
      messages.push(`Removed cartridge '${alias}'`);
    }

    if (modified) {
      session.setConfig(config, session.getState().configPath!);
      await session.saveConfig();
    }

    return this.success(
      modified ? messages.join(', ') : 'No changes made',
      {
        config: session.config ?? undefined,
        state: {
          activeCartridge: session.activeCartridge ?? '',
          runtimeStatus: session.runtimeStatus === 'running' ? 'running' : 
                         session.runtimeStatus === 'error' ? 'error' : 'stopped',
          checkpointsAvailable: session.getCheckpoints().length,
        },
      }
    );
  }

  /**
   * Initialize new project
   */
  private async initProject(
    options: NonNullable<UseParams['init']>
  ): Promise<ReturnType<BaseTool<UseParams, UseResult>['execute']>> {
    const projectPath = resolve(options.path);
    const projectName = options.name;

    // Check if project already exists
    if (existsSync(join(projectPath, 'graph-os.config.json'))) {
      return this.error(ErrorCode.PROJECT_NOT_FOUND, `Project already exists at ${projectPath}`, {
        recovery: {
          suggestions: ['Choose a different path or load the existing project'],
        },
      });
    }

    try {
      // Create directory structure
      await mkdir(projectPath, { recursive: true });
      await mkdir(join(projectPath, 'cartridges'), { recursive: true });
      await mkdir(join(projectPath, 'registries'), { recursive: true });

      if (options.includeReact) {
        await mkdir(join(projectPath, 'src', 'nodes'), { recursive: true });
      }

      // Create config
      const config: GraphOSProjectConfig = {
        name: projectName,
        version: '1.0.0',
        root: projectPath,
        activeCartridge: 'main',
        cartridges: {
          main: {
            path: 'cartridges/root.cartridge.json',
            description: 'Main cartridge',
          },
        },
        signalRegistry: 'registries/signals.json',
        compositeRegistry: 'registries/composites.json',
        runtime: {
          debug: false,
          logLevel: 'info',
          maxQueueSize: 1000,
          timeout: 30000,
        },
        history: {
          enabled: true,
          maxCheckpoints: 10,
          autoCheckpoint: true,
        },
      };

      // Create default cartridge
      const defaultCartridge = this.createDefaultCartridge(options.template, projectName);

      // Create signal registry
      const signalRegistry = {
        signals: this.getDefaultSignals(options.template),
      };

      // Create composite registry
      const compositeRegistry = {
        composites: [],
      };

      // Write files
      await writeFile(
        join(projectPath, 'graph-os.config.json'),
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      await writeFile(
        join(projectPath, 'cartridges', 'root.cartridge.json'),
        JSON.stringify(defaultCartridge, null, 2),
        'utf-8'
      );

      await writeFile(
        join(projectPath, 'registries', 'signals.json'),
        JSON.stringify(signalRegistry, null, 2),
        'utf-8'
      );

      await writeFile(
        join(projectPath, 'registries', 'composites.json'),
        JSON.stringify(compositeRegistry, null, 2),
        'utf-8'
      );

      // Load the new project
      await globalSessionManager.loadProject(projectPath);

      const nextActions: NextAction[] = [
        {
          action: 'query',
          description: 'View the initial topology',
          params: { from: 'topology', select: 'mermaid' },
          priority: 'high',
        },
        {
          action: 'patch',
          description: 'Add your first node',
          params: {
            ops: [{
              op: 'add',
              path: '/nodes/-',
              value: { id: 'my-first-node', type: 'logic.transform', config: {} },
            }],
          },
          priority: 'medium',
        },
      ];

      return this.success(
        `Created project: ${projectName} at ${projectPath}${options.template ? ` (${options.template} template)` : ''}`,
        {
          config: globalSessionManager.config ?? undefined,
          state: {
            activeCartridge: 'main',
            runtimeStatus: 'stopped',
            checkpointsAvailable: 0,
          },
          metrics: {
            cartridges: 1,
            nodes: defaultCartridge.nodes.length,
            wires: defaultCartridge.wires.length,
          },
        },
        { nextActions }
      );
    } catch (error) {
      return this.error(
        ErrorCode.UNKNOWN_ERROR,
        `Failed to create project: ${error instanceof Error ? error.message : String(error)}`,
        {
          recovery: {
            suggestions: [
              'Check that you have write permissions',
              'Ensure the parent directory exists',
            ],
          },
        }
      );
    }
  }

  /**
   * Rollback to a checkpoint
   */
  private async rollbackToCheckpoint(checkpointId: string): Promise<ReturnType<BaseTool<UseParams, UseResult>['execute']>> {
    const session = globalSessionManager;

    if (!session.isInitialized()) {
      return this.error(ErrorCode.SESSION_NOT_INITIALIZED, 'No project loaded. Load a project first.', {
        recovery: {
          suggestions: ['Run use({ project: "path" }) or use({ detect: true }) first'],
        },
      });
    }

    try {
      // Get checkpoint info before rollback
      const checkpoints = session.getCheckpoints();
      const checkpoint = checkpoints.find(c => c.id === checkpointId);

      if (!checkpoint) {
        return this.error(ErrorCode.CHECKPOINT_NOT_FOUND, `Checkpoint not found: ${checkpointId}`, {
          recovery: {
            suggestions: [
              'Use query({ from: "checkpoints" }) to list available checkpoints',
              'Check the checkpoint ID is correct',
            ],
          },
        });
      }

      const checkpointName = checkpoint.name;
      const checkpointTime = checkpoint.timestamp;

      // Perform rollback
      await session.rollback(checkpointId);

      const cartridgeData = session.cartridgeData as Record<string, unknown>;
      const nodes = (cartridgeData?.nodes as unknown[]) || [];
      const wires = (cartridgeData?.wires as unknown[]) || [];

      return this.success(
        `Rolled back to checkpoint: ${checkpointName} (${checkpointTime})`,
        {
          config: session.config ?? undefined,
          state: {
            activeCartridge: session.activeCartridge ?? '',
            runtimeStatus: 'stopped',
            checkpointsAvailable: session.getCheckpoints().length,
          },
          metrics: {
            nodes: nodes.length,
            wires: wires.length,
          },
        },
        {
          nextActions: [
            {
              action: 'query',
              description: 'View current topology after rollback',
              params: { from: 'topology', select: 'mermaid' },
              priority: 'high',
            },
          ],
        }
      );
    } catch (error) {
      return this.error(
        ErrorCode.UNKNOWN_ERROR,
        error instanceof Error ? error.message : 'Failed to rollback',
        {
          recovery: {
            suggestions: [
              'Check that the checkpoint ID is valid',
              'Use query({ from: "checkpoints" }) to list available checkpoints',
            ],
          },
        }
      );
    }
  }

  // ===========================================================================
  // TEMPLATE HELPERS
  // ===========================================================================

  /**
   * Create default cartridge based on template
   */
  private createDefaultCartridge(template?: string, name?: string): {
    name: string;
    version: string;
    description: string;
    nodes: unknown[];
    wires: unknown[];
    inputs: unknown[];
    outputs: unknown[];
  } {
    const baseCartridge = {
      name: name || 'main',
      version: '1.0.0',
      description: 'Main cartridge',
      nodes: [] as unknown[],
      wires: [] as unknown[],
      inputs: [],
      outputs: [],
    };

    switch (template) {
      case 'auth':
        return {
          ...baseCartridge,
          description: 'Authentication flow cartridge',
          nodes: [
            { id: 'input', type: 'control.input', config: { signalType: 'AUTH.LOGIN' } },
            { id: 'validator', type: 'logic.validate', config: {} },
            { id: 'output', type: 'control.display', config: {} },
          ],
          wires: [
            { from: 'input', to: 'validator', signalType: 'AUTH.LOGIN' },
            { from: 'validator', to: 'output', signalType: 'AUTH.SUCCESS' },
            { from: 'validator', to: 'output', signalType: 'AUTH.FAILURE' },
          ],
        };

      case 'crud':
        return {
          ...baseCartridge,
          description: 'CRUD operations cartridge',
          nodes: [
            { id: 'create', type: 'logic.transform', config: { operation: 'create' } },
            { id: 'read', type: 'logic.transform', config: { operation: 'read' } },
            { id: 'update', type: 'logic.transform', config: { operation: 'update' } },
            { id: 'delete', type: 'logic.transform', config: { operation: 'delete' } },
          ],
          wires: [],
        };

      case 'blank':
        return baseCartridge;

      case 'minimal':
      default:
        return {
          ...baseCartridge,
          nodes: [
            { id: 'input', type: 'control.input', config: {} },
            { id: 'output', type: 'control.display', config: {} },
          ],
          wires: [],
        };
    }
  }

  /**
   * Get default signals for template
   */
  private getDefaultSignals(template?: string): unknown[] {
    const baseSignals = [
      { type: 'SYSTEM.INIT', description: 'System initialization' },
      { type: 'SYSTEM.ERROR', description: 'System error' },
    ];

    switch (template) {
      case 'auth':
        return [
          ...baseSignals,
          { type: 'AUTH.LOGIN', description: 'Login request' },
          { type: 'AUTH.SUCCESS', description: 'Login successful' },
          { type: 'AUTH.FAILURE', description: 'Login failed' },
          { type: 'AUTH.LOGOUT', description: 'Logout request' },
        ];

      case 'crud':
        return [
          ...baseSignals,
          { type: 'ENTITY.CREATE', description: 'Create entity' },
          { type: 'ENTITY.READ', description: 'Read entity' },
          { type: 'ENTITY.UPDATE', description: 'Update entity' },
          { type: 'ENTITY.DELETE', description: 'Delete entity' },
          { type: 'ENTITY.RESULT', description: 'Operation result' },
        ];

      default:
        return baseSignals;
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a Use tool instance
 */
export function createUseTool(): UseTool {
  return new UseTool();
}
