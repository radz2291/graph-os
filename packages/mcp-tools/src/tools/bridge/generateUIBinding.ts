/**
 * generate_ui_binding - React component generation tool
 * 
 * Generates frontend code that connects automatically to backend graph nodes.
 * Reads control.input nodes and outputs React components pre-wired
 * with the correct signal hooks.
 * 
 * @module @graph-os/mcp-tools/accelerator
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MCPToolResult, MCPToolDefinition, MCPParameterSchema } from '../../core/MCPTool';
import type { Cartridge, NodeDefinition } from '../../core/ConflictDetector';

// =============================================================================
// Types
// =============================================================================

export type ComponentType = 
  | 'control-input' 
  | 'control-display' 
  | 'logic-validator' 
  | 'generic';

export type Framework = 'react' | 'vue' | 'svelte';

export interface GenerateUIBindingInput {
  /** Path to the cartridge file */
  cartridgePath: string;
  /** Node ID to generate binding for */
  nodeId: string;
  /** Output directory for generated files */
  outputDirectory: string;
  /** Type of component to generate */
  componentType?: ComponentType;
  /** Include signal hooks */
  includeHooks?: boolean;
  /** Include TypeScript types */
  includeTypes?: boolean;
  /** Framework to generate for */
  framework?: Framework;
  /** Component name (defaults to node ID in PascalCase) */
  componentName?: string;
}

export interface GeneratedFile {
  filename: string;
  content: string;
  description: string;
}

export interface GenerateUIBindingOutput {
  success: boolean;
  componentName: string;
  nodeType: string;
  files: GeneratedFile[];
  signals: {
    inputs: string[];
    outputs: string[];
  };
  hooks: string[];
  usageExample: string;
}

// =============================================================================
// Templates
// =============================================================================

const TEMPLATES = {
  'control-input': (nodeName: string, signals: { inputs: string[]; outputs: string[] }) => `
import React, { useState } from 'react';
import { useEmitSignal } from '@graph-os/react-bridge';

interface ${nodeName}Props {
  className?: string;
  onValueChange?: (value: unknown) => void;
}

/**
 * ${nodeName} - Auto-generated input component
 * 
 * Generated from Graph-OS node: ${nodeName}
 * Emits: ${signals.outputs.join(', ') || 'none'}
 */
export function ${nodeName}({ className, onValueChange }: ${nodeName}Props) {
  const [value, setValue] = useState<string>('');
  const emitSignal = useEmitSignal();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // Emit signal through Graph-OS
    emitSignal('${signals.outputs[0] || 'VALUE.CHANGE'}', { value: newValue });
    
    // Also call optional callback
    onValueChange?.(newValue);
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      className={className}
      placeholder="Enter value..."
    />
  );
}

export default ${nodeName};
`,

  'control-display': (nodeName: string, signals: { inputs: string[]; outputs: string[] }) => `
import React from 'react';
import { useSignal } from '@graph-os/react-bridge';

interface ${nodeName}Props {
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * ${nodeName} - Auto-generated display component
 * 
 * Generated from Graph-OS node: ${nodeName}
 * Listens to: ${signals.inputs.join(', ') || 'none'}
 */
export function ${nodeName}({ className, fallback }: ${nodeName}Props) {
  const signal = useSignal('${signals.inputs[0] || 'DISPLAY.UPDATE'}');

  if (!signal) {
    return <>{fallback}</>;
  }

  return (
    <div className={className}>
      {signal.payload ? JSON.stringify(signal.payload, null, 2) : 'No data'}
    </div>
  );
}

export default ${nodeName};
`,

  'logic-validator': (nodeName: string, signals: { inputs: string[]; outputs: string[] }) => `
import React, { useEffect, useState } from 'react';
import { useSignal, useEmitSignal } from '@graph-os/react-bridge';

interface ${nodeName}Props {
  className?: string;
  rules?: Array<(value: unknown) => boolean>;
  onValid?: () => void;
  onInvalid?: (errors: string[]) => void;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * ${nodeName} - Auto-generated validator component
 * 
 * Generated from Graph-OS node: ${nodeName}
 * Listens to: ${signals.inputs.join(', ') || 'none'}
 * Emits: ${signals.outputs.join(', ') || 'none'}
 */
export function ${nodeName}({ 
  className, 
  rules = [],
  onValid,
  onInvalid 
}: ${nodeName}Props) {
  const [result, setResult] = useState<ValidationResult>({ isValid: true, errors: [] });
  const signal = useSignal('${signals.inputs[0] || 'VALIDATE.REQUEST'}');
  const emitSignal = useEmitSignal();

  useEffect(() => {
    if (!signal) return;

    const value = signal.payload;
    const errors: string[] = [];

    // Run validation rules
    rules.forEach((rule, index) => {
      if (!rule(value)) {
        errors.push(\`Rule \${index + 1} failed\`);
      }
    });

    const isValid = errors.length === 0;
    setResult({ isValid, errors });

    // Emit result signal
    if (isValid) {
      emitSignal('${signals.outputs[0] || 'VALIDATE.SUCCESS'}', { value });
      onValid?.();
    } else {
      emitSignal('${signals.outputs[1] || 'VALIDATE.FAILURE'}', { errors });
      onInvalid?.(errors);
    }
  }, [signal, rules, emitSignal, onValid, onInvalid]);

  if (!signal) return null;

  return (
    <div className={className}>
      {result.isValid ? (
        <span className="text-green-500">✓ Valid</span>
      ) : (
        <div className="text-red-500">
          {result.errors.map((error, i) => (
            <div key={i}>✗ {error}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ${nodeName};
`,

  'generic': (nodeName: string, signals: { inputs: string[]; outputs: string[] }) => `
import React from 'react';
import { useSignal, useEmitSignal } from '@graph-os/react-bridge';

interface ${nodeName}Props {
  className?: string;
  children?: React.ReactNode;
}

/**
 * ${nodeName} - Auto-generated generic signal handler component
 * 
 * Generated from Graph-OS node: ${nodeName}
 * Listens to: ${signals.inputs.join(', ') || 'none'}
 * Emits: ${signals.outputs.join(', ') || 'none'}
 */
export function ${nodeName}({ className, children }: ${nodeName}Props) {
  const signal = useSignal('${signals.inputs[0] || 'SIGNAL.INPUT'}');
  const emitSignal = useEmitSignal();

  const handleAction = (action: string, payload?: unknown) => {
    emitSignal(action, payload);
  };

  return (
    <div className={className}>
      {children}
      {signal && (
        <div className="debug-info">
          Last signal: {signal.type}
        </div>
      )}
    </div>
  );
}

export default ${nodeName};
`,
};

// =============================================================================
// GenerateUIBindingTool Class
// =============================================================================

/**
 * GenerateUIBindingTool - Generates React components from Graph-OS nodes
 * 
 * @example
 * ```typescript
 * const tool = new GenerateUIBindingTool();
 * const result = await tool.execute({
 *   cartridgePath: './cartridges/app.cartridge.json',
 *   nodeId: 'user-input',
 *   outputDirectory: './src/components',
 *   componentType: 'control-input'
 * });
 * ```
 */
export class GenerateUIBindingTool {
  readonly definition: MCPToolDefinition = {
    name: 'generate_ui_binding',
    description: 'Generates React components pre-wired with Graph-OS signal hooks. Reads node configuration and outputs ready-to-use components with proper signal emission/reception.',
    parameters: [
      {
        name: 'cartridgePath',
        type: 'string',
        required: true,
        description: 'Path to the cartridge file'
      },
      {
        name: 'nodeId',
        type: 'string',
        required: true,
        description: 'ID of the node to generate binding for'
      },
      {
        name: 'outputDirectory',
        type: 'string',
        required: true,
        description: 'Directory where generated files will be saved'
      },
      {
        name: 'componentType',
        type: 'string',
        required: false,
        description: 'Type of component: control-input, control-display, logic-validator, or generic'
      },
      {
        name: 'includeHooks',
        type: 'boolean',
        required: false,
        description: 'Include signal hooks in generated code (default: true)'
      },
      {
        name: 'includeTypes',
        type: 'boolean',
        required: false,
        description: 'Include TypeScript interface definitions (default: true)'
      },
      {
        name: 'framework',
        type: 'string',
        required: false,
        description: 'Target framework: react (default), vue, or svelte'
      },
      {
        name: 'componentName',
        type: 'string',
        required: false,
        description: 'Custom component name (defaults to PascalCase node ID)'
      }
    ],
    returnType: 'GenerateUIBindingOutput',
    category: 'accelerator',
    bestFor: ['React development', 'frontend integration', 'UI component generation', 'signal binding'],
    complexity: 'low'
  };

  async execute(input: GenerateUIBindingInput): Promise<MCPToolResult<GenerateUIBindingOutput>> {
    try {
      // Validate cartridge exists
      if (!fs.existsSync(input.cartridgePath)) {
        return {
          success: false,
          error: `Cartridge not found: ${input.cartridgePath}`
        };
      }

      // Load cartridge
      const cartridgeData = fs.readFileSync(input.cartridgePath, 'utf-8');
      const cartridge: Cartridge = JSON.parse(cartridgeData);

      // Ensure nodes array exists
      if (!cartridge.nodes || !Array.isArray(cartridge.nodes)) {
        return {
          success: false,
          error: `Invalid cartridge: missing or invalid nodes array`
        };
      }

      // Find the node - try exact match first, then partial match
      let node = cartridge.nodes.find(n => n.id === input.nodeId);
      
      // If not found, try case-insensitive and partial matches
      if (!node) {
        node = cartridge.nodes.find(n => 
          n.id.toLowerCase() === input.nodeId.toLowerCase() ||
          n.id.includes(input.nodeId) ||
          input.nodeId.includes(n.id)
        );
      }
      
      // If still not found, try matching by node name in config
      if (!node) {
        node = cartridge.nodes.find(n => {
          const config = n.config as Record<string, unknown> | undefined;
          const name = config?.name as string | undefined;
          return name && (name === input.nodeId || name.toLowerCase() === input.nodeId.toLowerCase());
        });
      }
      
      // If still not found, provide helpful error with available nodes
      if (!node) {
        const availableNodes = cartridge.nodes.map(n => n.id).join(', ');
        return {
          success: false,
          error: `Node "${input.nodeId}" not found in cartridge. Available nodes: ${availableNodes || 'none'}`
        };
      }

      // Determine component type
      const componentType = input.componentType || this.inferComponentType(node.type);

      // Determine component name
      const componentName = input.componentName || this.toPascalCase(input.nodeId);

      // Extract signal information from wires
      const signals = this.extractSignals(cartridge, input.nodeId);

      // Create output directory if needed
      if (!fs.existsSync(input.outputDirectory)) {
        fs.mkdirSync(input.outputDirectory, { recursive: true });
      }

      // Generate files
      const files: GeneratedFile[] = [];

      // Generate main component file
      const template = TEMPLATES[componentType] || TEMPLATES['generic'];
      const componentContent = template(componentName, signals);
      files.push({
        filename: `${componentName}.tsx`,
        content: componentContent.trim(),
        description: `Main component for ${input.nodeId}`
      });

      // Generate types file if requested
      if (input.includeTypes !== false) {
        const typesContent = this.generateTypesFile(componentName, signals);
        files.push({
          filename: `${componentName}.types.ts`,
          content: typesContent,
          description: `TypeScript interfaces for ${componentName}`
        });
      }

      // Generate hooks file if requested
      if (input.includeHooks !== false) {
        const hooksContent = this.generateHooksFile(componentName, signals);
        files.push({
          filename: `${componentName}.hooks.ts`,
          content: hooksContent,
          description: `Custom hooks for ${componentName}`
        });
      }

      // Generate index file
      const indexContent = this.generateIndexFile(componentName, input.includeTypes !== false, input.includeHooks !== false);
      files.push({
        filename: 'index.ts',
        content: indexContent,
        description: `Barrel export for ${componentName}`
      });

      // Write files
      for (const file of files) {
        const filePath = path.join(input.outputDirectory, file.filename);
        fs.writeFileSync(filePath, file.content);
      }

      // Generate usage example
      const usageExample = this.generateUsageExample(componentName, signals);

      return {
        success: true,
        data: {
          success: true,
          componentName,
          nodeType: node.type,
          files,
          signals,
          hooks: signals.inputs.map(s => `useSignal('${s}')`),
          usageExample,
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Infer component type from node type
   */
  private inferComponentType(nodeType: string): ComponentType {
    if (nodeType.startsWith('control.input')) return 'control-input';
    if (nodeType.startsWith('control.display')) return 'control-display';
    if (nodeType.startsWith('logic.validate')) return 'logic-validator';
    return 'generic';
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Extract input and output signals for a node
   */
  private extractSignals(cartridge: Cartridge, nodeId: string): { inputs: string[]; outputs: string[] } {
    const inputs: string[] = [];
    const outputs: string[] = [];

    for (const wire of cartridge.wires) {
      if (wire.to === nodeId && !inputs.includes(wire.signalType)) {
        inputs.push(wire.signalType);
      }
      if (wire.from === nodeId && !outputs.includes(wire.signalType)) {
        outputs.push(wire.signalType);
      }
    }

    return { inputs, outputs };
  }

  /**
   * Generate TypeScript types file
   */
  private generateTypesFile(componentName: string, signals: { inputs: string[]; outputs: string[] }): string {
    return `
/**
 * TypeScript interfaces for ${componentName}
 * Auto-generated by Graph-OS
 */

export interface ${componentName}Props {
  className?: string;
}

export interface ${componentName}Signal {
  type: string;
  payload: unknown;
  timestamp: Date;
  sourceNodeId: string;
}

export interface ${componentName}Config {
  ${signals.inputs.map(s => `on${s.replace(/\./g, '')}?: (payload: unknown) => void;`).join('\n  ')}
}
`.trim();
  }

  /**
   * Generate custom hooks file
   */
  private generateHooksFile(componentName: string, signals: { inputs: string[]; outputs: string[] }): string {
    return `
/**
 * Custom hooks for ${componentName}
 * Auto-generated by Graph-OS
 */

import { useSignal, useEmitSignal } from '@graph-os/react-bridge';

/**
 * Hook to listen to input signals for ${componentName}
 */
export function use${componentName}Signals() {
  ${signals.inputs.map((s, i) => 
    `const signal${i} = useSignal('${s}');`
  ).join('\n  ')}

  return {
    ${signals.inputs.map((s, i) => 
      `'${s}': signal${i}`
    ).join(',\n    ')}
  };
}

/**
 * Hook to emit signals from ${componentName}
 */
export function use${componentName}Emitter() {
  const emit = useEmitSignal();

  return {
    ${signals.outputs.map(s => 
      `emit${s.replace(/\./g, '')}: (payload: unknown) => emit('${s}', payload)`
    ).join(',\n    ')}
  };
}
`.trim();
  }

  /**
   * Generate index file (barrel export)
   */
  private generateIndexFile(componentName: string, includeTypes: boolean, includeHooks: boolean): string {
    const exports = [
      `export { ${componentName} } from './${componentName}';`,
      `export { default as ${componentName}Default } from './${componentName}';`,
    ];

    if (includeTypes) {
      exports.push(`export type { ${componentName}Props, ${componentName}Signal, ${componentName}Config } from './${componentName}.types';`);
    }

    if (includeHooks) {
      exports.push(`export { use${componentName}Signals, use${componentName}Emitter } from './${componentName}.hooks';`);
    }

    return exports.join('\n');
  }

  /**
   * Generate usage example
   */
  private generateUsageExample(componentName: string, signals: { inputs: string[]; outputs: string[] }): string {
    return `
import { ${componentName} } from './components/${componentName}';

function App() {
  return (
    <${componentName} 
      className="my-component"
    />
  );
}
`.trim();
  }

  validateParams(params: unknown): params is GenerateUIBindingInput {
    if (typeof params !== 'object' || params === null) return false;
    const p = params as Record<string, unknown>;
    return typeof p.cartridgePath === 'string' &&
           typeof p.nodeId === 'string' &&
           typeof p.outputDirectory === 'string';
  }
}

/**
 * Factory function to create a GenerateUIBindingTool instance
 */
export function createGenerateUIBindingTool(): GenerateUIBindingTool {
  return new GenerateUIBindingTool();
}
