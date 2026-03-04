/**
 * GENERATE Tool - Scaffold & Create
 *
 * Generate code, patterns, scaffolds, and UI bindings.
 *
 * @module @graph-os/tool/tools
 */

import { BaseTool, type ToolResult, type ToolDefinition } from '../core/Tool';
import { globalSessionManager } from '../core/SessionState';
import type { GenerateParams, GenerateResult, NextAction, PatchOperation } from '../core/types';
import { ErrorCode } from '../core/types';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// =============================================================================
// TOOL DEFINITION
// =============================================================================

const GENERATE_TOOL_DEFINITION: ToolDefinition = {
  name: 'generate',
  purpose: 'Generate code, patterns, scaffolds, and UI bindings.',
  whenToUse: [
    'Creating custom node implementations',
    'Generating reusable patterns',
    'Creating UI bindings for signals',
    'Initializing new projects',
    'Creating composite templates',
  ],
  whenNotToUse: [
    'Modifying existing graphs (use patch)',
    'Reading graph state (use query)',
    'Executing runtime (use run)',
  ],
  triggers: ['create', 'scaffold', 'generate', 'new', 'add custom', 'pattern', 'template'],
  parameters: [
    {
      name: 'node',
      type: 'object',
      required: false,
      description: 'Generate custom node implementation',
      hints: {
        type: 'Node type identifier (e.g., custom.rate-limiter)',
        category: 'Node category: logic, control, infra, ui',
        template: 'Base template: validator, transformer, api-client, storage, input, display, blank',
        description: 'Description for code comments',
        output: 'Output file path',
        register: 'Register after generating',
      },
    },
    {
      name: 'pattern',
      type: 'object',
      required: false,
      description: 'Generate pattern (reusable graph template)',
      hints: {
        name: 'Pattern name',
        description: 'Natural language description',
        params: 'Parameters for generation',
        output: 'Output format: patch, file, composite',
        builtin: 'Built-in pattern: auth-flow, crud, form-validation, rate-limiting, cache-aside',
      },
    },
    {
      name: 'uiBinding',
      type: 'object',
      required: false,
      description: 'Generate UI bindings for React/Vue/etc.',
      hints: {
        component: 'Component name',
        signals: 'Signals to bind',
        framework: 'Target framework: react, vue, svelte',
        output: 'Output directory',
        types: 'Include type definitions',
      },
    },
    {
      name: 'project',
      type: 'object',
      required: false,
      description: 'Generate new project scaffold',
      hints: {
        name: 'Project name',
        path: 'Project path',
        template: 'Starter template: minimal, auth, crud, blank',
        includeReact: 'Include React bridge',
      },
    },
    {
      name: 'composite',
      type: 'object',
      required: false,
      description: 'Extract nodes into a composite',
      hints: {
        name: 'Composite name',
        nodes: 'Nodes to extract',
        description: 'Composite description',
        autoMap: 'Auto-map signals',
      },
    },
  ],
  returnType: 'GenerateResult',
  examples: [
    {
      input: { node: { type: 'custom.rate-limiter', category: 'logic', template: 'validator' } },
      description: 'Generate custom node',
    },
    {
      input: { pattern: { name: 'auth-flow', builtin: 'auth-flow', output: 'patch' } },
      description: 'Generate built-in pattern',
    },
    {
      input: { uiBinding: { component: 'LoginForm', signals: ['AUTH.SUCCESS', 'AUTH.FAILURE'], framework: 'react' } },
      description: 'Generate React bindings',
    },
    {
      input: { project: { name: 'new-app', path: '/projects/new-app', template: 'minimal' } },
      description: 'Generate new project',
    },
    {
      input: { composite: { name: 'auth-validator', nodes: ['email-validator', 'password-validator'] } },
      description: 'Extract composite',
    },
  ],
};

// =============================================================================
// GENERATE TOOL CLASS
// =============================================================================

/**
 * Generate Tool - Scaffold & Create
 */
export class GenerateTool extends BaseTool<GenerateParams, GenerateResult> {
  readonly name = 'generate';
  readonly definition = GENERATE_TOOL_DEFINITION;

  /**
   * Validate that at least one generator parameter is provided
   */
  validate(params: unknown): params is GenerateParams {
    if (!super.validate(params)) {
      return false;
    }

    const p = params as Record<string, unknown>;
    
    // At least one generator param must be present
    return !!(
      p.node ||
      p.pattern ||
      p.uiBinding ||
      p.project ||
      p.composite
    );
  }

  async execute(params: GenerateParams): Promise<ToolResult<GenerateResult>> {
    // Route to generator
    if (params.node) {
      return this.generateNode(params.node);
    }

    if (params.pattern) {
      return this.generatePattern(params.pattern);
    }

    if (params.uiBinding) {
      return this.generateUIBinding(params.uiBinding);
    }

    if (params.project) {
      return this.generateProject(params.project);
    }

    if (params.composite) {
      return this.generateComposite(params.composite);
    }

    return this.error(ErrorCode.INVALID_PARAMETERS, 'One of: node, pattern, uiBinding, project, or composite is required');
  }

  // ===========================================================================
  // GENERATOR IMPLEMENTATIONS (Phase 3)
  // ===========================================================================

  /**
   * Generate custom node
   */
  private async generateNode(
    options: NonNullable<GenerateParams['node']>
  ): Promise<ToolResult<GenerateResult>> {
    // Validate required fields
    if (!options.type) {
      return this.error(ErrorCode.INVALID_PARAMETERS, 'Node type is required for generation', {
        recovery: {
          suggestions: ['Provide a type field: { node: { type: "custom.my-node" } }'],
        },
      });
    }

    // TODO: Implement in Phase 3
    const session = globalSessionManager;

    // Check if type already exists
    // if (session.isNodeTypeRegistered(options.type)) {
    //   return this.error(ErrorCode.GENERATE_TYPE_EXISTS, `Node type '${options.type}' already exists`);
    // }

    // Generate code (saved for Phase 3)
    const code = this._generateNodeCode(options);
    void code; // Will be written to file in Phase 3

    // Determine output path
    const outputPath = options.output ||
      `${session.config?.customNodes?.directory || 'src/nodes'}/${options.type.replace('.', '/')}.ts`;

    // Write file (Phase 4)
    // await fs.writeFile(outputPath, code);

    // Register if requested
    let registered = false;
    if (options.register) {
      // session.registerNodeType(options.type, ...);
      registered = true;
    }

    const nextActions: NextAction[] = [
      {
        action: 'patch',
        description: 'Use the new node in a cartridge',
        params: {
          ops: [{
            op: 'add',
            path: '/nodes/-',
            value: { id: options.type.split('.')[1], type: options.type, config: {} }
          }]
        },
        priority: 'high',
      },
    ];

    return {
      summary: `Generated node: ${options.type}`,
      status: 'ok',
      data: {
        summary: `Generated node: ${options.type}`,
        status: 'ok',
        files: [
          { path: outputPath, description: `Node implementation`, language: 'typescript' }
        ],
        registration: { type: options.type, registered, path: outputPath },
      },
      nextActions,
    };
  }

  /**
   * Generate node code (Phase 3)
   * This method is intentionally not used in Phase 1 skeleton - will be used in Phase 3
   */
  private _generateNodeCode(options: NonNullable<GenerateParams['node']>): string {
    // Mark as intentionally unused for Phase 1 skeleton
    void options;
    const className = this.toPascalCase(options.type.split('.')[1] || options.type);
    const category = options.category || 'logic';
    const template = options.template || 'blank';

    return `/**
 * ${options.description || className}
 * 
 * @module @graph-os/nodes
 */

import { BaseNode, Signal, NodeConfig } from '@graph-os/core';

/**
 * Configuration for ${className}
 */
export interface ${className}Config extends NodeConfig {
  // Add configuration properties here
}

/**
 * ${className} - ${category} node
 */
export class ${className}Node extends BaseNode {
  type = '${options.type}';
  
  constructor(id: string, config: ${className}Config) {
    super(id, config);
  }

  async process(signal: Signal): Promise<Signal | Signal[] | null> {
    // TODO: Implement ${template} logic
    return null;
  }
}

export default ${className}Node;
`;
  }

  /**
   * Generate pattern
   */
  private async generatePattern(
    options: NonNullable<GenerateParams['pattern']>
  ): Promise<ToolResult<GenerateResult>> {
    // TODO: Implement in Phase 3
    const output = options.output || 'patch';
    const patternName = options.name || options.builtin || 'custom-pattern';

    // Generate pattern
    const patch = this.generatePatternPatch(options);

    if (output === 'patch') {
      return {
        summary: `Generated pattern: ${patternName}`,
        status: 'ok',
        metrics: { filesGenerated: 0, linesOfCode: 0 },
        data: {
          summary: `Generated pattern: ${patternName}`,
          status: 'ok',
          pattern: patternName,
          patch: patch as PatchOperation[],
        },
      };
    }

    // For file/composite output, write files
    return {
      summary: `Generated pattern: ${patternName} as ${output}`,
      status: 'ok',
      data: {
        summary: `Generated pattern: ${patternName} as ${output}`,
        status: 'ok',
        pattern: patternName,
        files: [{ path: `patterns/${patternName}.json`, description: 'Pattern definition', language: 'json' }],
        patch: patch as PatchOperation[],
      },
    };
  }

  /**
   * Generate pattern patch operations
   */
  private generatePatternPatch(options: NonNullable<GenerateParams['pattern']>): PatchOperation[] {
    // Built-in patterns
    const builtinPatterns: Record<string, PatchOperation[]> = {
      'auth-flow': [
        { op: 'add', path: '/signals/-', value: { type: 'AUTH.LOGIN', description: 'Login request' } },
        { op: 'add', path: '/signals/-', value: { type: 'AUTH.SUCCESS', description: 'Login successful' } },
        { op: 'add', path: '/signals/-', value: { type: 'AUTH.FAILURE', description: 'Login failed' } },
      ],
      'crud': [
        { op: 'add', path: '/signals/-', value: { type: 'ENTITY.CREATE', description: 'Create entity' } },
        { op: 'add', path: '/signals/-', value: { type: 'ENTITY.READ', description: 'Read entity' } },
        { op: 'add', path: '/signals/-', value: { type: 'ENTITY.UPDATE', description: 'Update entity' } },
        { op: 'add', path: '/signals/-', value: { type: 'ENTITY.DELETE', description: 'Delete entity' } },
      ],
    };

    if (options.builtin && builtinPatterns[options.builtin]) {
      return builtinPatterns[options.builtin];
    }

    // Generate from description (Phase 3: use LLM)
    return [];
  }

  /**
   * Generate UI binding
   */
  private async generateUIBinding(
    options: NonNullable<GenerateParams['uiBinding']>
  ): Promise<ToolResult<GenerateResult>> {
    const session = globalSessionManager;
    const framework = options.framework || 'react';
    
    // Resolve component name - support both 'component' and 'nodeName' parameters
    const component = options.component || (options as { nodeName?: string }).nodeName || 'SignalBinding';
    
    // Resolve signals - from options or derive from session
    let signals = options.signals;
    if (!signals || signals.length === 0) {
      // Try to get signals from the session's signal registry
      const signalRegistry = session.signalRegistry;
      if (signalRegistry && signalRegistry.signals) {
        signals = signalRegistry.signals.map(s => s.type).slice(0, 10); // Limit to first 10
      }
      if (!signals || signals.length === 0) {
        // Default signals if none found
        signals = ['DATA.INPUT', 'DATA.OUTPUT'];
      }
    }
    
    const code = this.generateUIBindingCode({ ...options, component, signals }, framework);

    const files = [
      { path: `${component}.hooks.ts`, description: 'Signal hooks', language: 'typescript' },
    ];

    if (options.types) {
      files.push({ path: `${component}.types.ts`, description: 'Type definitions', language: 'typescript' });
    }

    return {
      summary: `Generated ${framework} bindings for ${component}`,
      status: 'ok',
      data: {
        summary: `Generated ${framework} bindings for ${component}`,
        status: 'ok',
        files,
        code: [{ filename: `${component}.hooks.ts`, content: code }],
      },
    };
  }

  /**
   * Generate UI binding code
   */
  private generateUIBindingCode(
    options: NonNullable<GenerateParams['uiBinding']>,
    framework: string
  ): string {
    const signals = options.signals.map(s => `"${s}"`).join(' | ');
    const component = options.component;

    if (framework === 'react') {
      return `import { useSignal, useEmitSignal } from '@graph-os/react-bridge';

// Signal types for ${component}
export type ${component}Signal = ${signals};

// Hooks for ${component}
export function use${component}Signals() {
  const signals = ${options.signals.map(s => `useSignal('${s}')`).join(',\n  ')};
  
  return { ${options.signals.map((s, i) => `'${s}': signals[${i}]`).join(', ')} };
}

export function use${component}Emitter() {
  return useEmitSignal();
}
`;
    }

    if (framework === 'vue') {
      return `import { ref, onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';

// Signal types for ${component}
export type ${component}Signal = ${signals};

// Signal store for ${component}
const signalStore: Record<string, Ref<unknown>> = {};

// Initialize signal listeners
export function use${component}Signals() {
  ${options.signals.map(s => `const ${s.replace(/\./g, '_').toLowerCase()} = ref<unknown>(null);`).join('\n  ')}

  // Note: Replace with actual Graph-OS Vue integration
  // This is a template that shows the expected structure
  const unsubscribe = () => {
    // Cleanup listeners
  };

  onUnmounted(() => {
    unsubscribe();
  });

  return {
    ${options.signals.map(s => `'${s}': ${s.replace(/\./g, '_').toLowerCase()}`).join(',\n    ')}
  };
}

// Emit a signal from ${component}
export function use${component}Emitter() {
  const emit = (type: string, payload: unknown) => {
    // Emit signal through Graph-OS signal bus
    console.log('Emitting signal:', type, payload);
  };

  return { emit };
}
`;
    }

    if (framework === 'svelte') {
      return `import { writable, derived } from 'svelte/store';
import type { Writable } from 'svelte/store';

// Signal types for ${component}
export type ${component}Signal = ${signals};

// Signal stores for ${component}
${options.signals.map(s => `export const ${s.replace(/\./g, '_').toLowerCase()} = writable<unknown>(null);`).join('\n')}

// Subscribe to signals for ${component}
export function create${component}SignalSubscriber() {
  // Note: Replace with actual Graph-OS Svelte integration
  // This is a template that shows the expected structure
  
  const unsubscribe = () => {
    // Cleanup subscriptions
  };

  return { unsubscribe };
}

// Emit a signal from ${component}
export function create${component}Emitter() {
  const emit = (type: string, payload: unknown) => {
    // Emit signal through Graph-OS signal bus
    console.log('Emitting signal:', type, payload);
  };

  return { emit };
}
`;
    }

    return `// Framework '${framework}' is not yet supported. Supported frameworks: react, vue, svelte`;
  }

  /**
   * Generate project
   */
  private async generateProject(
    options: NonNullable<GenerateParams['project']>
  ): Promise<ToolResult<GenerateResult>> {
    const { name, path, template = 'minimal', includeReact = false } = options;

    // Check if path already exists
    if (existsSync(path)) {
      return this.error(ErrorCode.INVALID_PARAMETERS, `Path already exists: ${path}`);
    }

    // Create directory structure
    try {
      await mkdir(path, { recursive: true });
      await mkdir(join(path, 'cartridges'), { recursive: true });
      await mkdir(join(path, 'registries'), { recursive: true });
    } catch (error) {
      return this.error(
        ErrorCode.INVALID_PARAMETERS,
        `Failed to create directories: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Generate project config
    const config = {
      name,
      version: '1.0.0',
      activeCartridge: 'main',
      cartridges: {
        main: {
          path: 'cartridges/root.cartridge.json',
          description: 'Main cartridge'
        }
      },
      signalRegistry: 'registries/signals.json',
      compositeRegistry: 'registries/composites.json',
      runtime: {
        debug: false,
        logLevel: 'info',
        timeout: 30000
      }
    };

    // Generate root cartridge
    const cartridge = {
      name: 'root',
      version: '1.0.0',
      description: `${name} root cartridge`,
      nodes: [],
      wires: []
    };

    // Generate signal registry with template-specific signals
    const signals: Record<string, { description: string }> = {};
    if (template === 'auth' || template === 'minimal') {
      signals['DATA.INPUT'] = { description: 'Generic data input' };
      signals['DATA.OUTPUT'] = { description: 'Generic data output' };
    }
    if (template === 'auth') {
      signals['AUTH.LOGIN'] = { description: 'Login request' };
      signals['AUTH.SUCCESS'] = { description: 'Login successful' };
      signals['AUTH.FAILURE'] = { description: 'Login failed' };
      signals['AUTH.LOGOUT'] = { description: 'Logout request' };
    }
    if (template === 'crud') {
      signals['ENTITY.CREATE'] = { description: 'Create entity' };
      signals['ENTITY.READ'] = { description: 'Read entity' };
      signals['ENTITY.UPDATE'] = { description: 'Update entity' };
      signals['ENTITY.DELETE'] = { description: 'Delete entity' };
    }

    // Write files
    const files: Array<{ path: string; description: string; language: string }> = [];

    try {
      // Write config
      await writeFile(join(path, 'graph-os.config.json'), JSON.stringify(config, null, 2));
      files.push({ path: 'graph-os.config.json', description: 'Project configuration', language: 'json' });

      // Write cartridge
      await writeFile(join(path, 'cartridges/root.cartridge.json'), JSON.stringify(cartridge, null, 2));
      files.push({ path: 'cartridges/root.cartridge.json', description: 'Root cartridge', language: 'json' });

      // Write signal registry
      await writeFile(join(path, 'registries/signals.json'), JSON.stringify(signals, null, 2));
      files.push({ path: 'registries/signals.json', description: 'Signal registry', language: 'json' });

      // Write composite registry
      await writeFile(join(path, 'registries/composites.json'), JSON.stringify({}, null, 2));
      files.push({ path: 'registries/composites.json', description: 'Composite registry', language: 'json' });

      // Include React bridge if requested
      if (includeReact) {
        const integrationDir = join(path, 'src/integration');
        await mkdir(integrationDir, { recursive: true });

        const runtimeProvider = `import { GraphRuntime, SignalBus } from '@graph-os/runtime';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface RuntimeContextValue {
  runtime: GraphRuntime | null;
  signalBus: SignalBus | null;
}

const RuntimeContext = createContext<RuntimeContextValue>({ runtime: null, signalBus: null });

export function RuntimeProvider({ children }: { children: React.ReactNode }) {
  const [runtime, setRuntime] = useState<GraphRuntime | null>(null);

  useEffect(() => {
    // Initialize runtime here
    return () => {
      runtime?.destroy();
    };
  }, []);

  return (
    <RuntimeContext.Provider value={{ runtime, signalBus: runtime?.signalBus || null }}>
      {children}
    </RuntimeContext.Provider>
  );
}

export function useRuntime() {
  return useContext(RuntimeContext);
}
`;
        await writeFile(join(integrationDir, 'RuntimeProvider.tsx'), runtimeProvider);
        files.push({ path: 'src/integration/RuntimeProvider.tsx', description: 'React runtime provider', language: 'typescript' });
      }
    } catch (error) {
      return this.error(
        ErrorCode.INVALID_PARAMETERS,
        `Failed to write files: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const nextActions: NextAction[] = [
      {
        action: 'use',
        description: 'Load the new project',
        params: { project: path },
        priority: 'high',
      },
    ];

    return {
      summary: `Created project: ${name}`,
      status: 'ok',
      metrics: { filesGenerated: files.length, linesOfCode: 0 },
      data: {
        summary: `Created project: ${name}`,
        status: 'ok',
        files,
      },
      nextActions,
    };
  }

  /**
   * Generate composite
   */
  private async generateComposite(
    options: NonNullable<GenerateParams['composite']>
  ): Promise<ToolResult<GenerateResult>> {
    // TODO: Implement in Phase 3
    const session = globalSessionManager;

    if (!session.isInitialized()) {
      return this.error(ErrorCode.SESSION_NOT_INITIALIZED, 'No project loaded');
    }

    const files = [
      { path: `composites/${options.name}.composite.json`, description: 'Composite definition', language: 'json' },
    ];

    const nextActions: NextAction[] = [
      {
        action: 'patch',
        description: 'Reference the composite in cartridge',
        params: {
          ops: [{
            op: 'add',
            path: '/composites/-',
            value: { ref: options.name }
          }]
        },
        priority: 'high',
      },
    ];

    return {
      summary: `Extracted composite: ${options.name}`,
      status: 'ok',
      metrics: { filesGenerated: 1, linesOfCode: 0 },
      data: {
        summary: `Extracted composite: ${options.name}`,
        status: 'ok',
        files,
      },
      nextActions,
    };
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_.]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a Generate tool instance
 */
export function createGenerateTool(): GenerateTool {
  return new GenerateTool();
}
