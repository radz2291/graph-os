/**
 * MCP Tool Interface - Base interface for all MCP tools
 * 
 * MCP (Model Context Protocol) tools allow AI to interact with Graph-OS
 * as a "software operator" rather than a text generator.
 * 
 * @module @graph-os/mcp-tools
 */

/**
 * Validation error with detailed information.
 */
export interface ValidationError {
  /** Parameter name that failed validation */
  parameter: string;
  /** Error message */
  message: string;
  /** Expected type or format */
  expected?: string;
  /** Actual value received */
  actual?: string;
  /** Suggestion for fixing the error */
  suggestion?: string;
}

/**
 * Result of MCP tool execution.
 */
export interface MCPToolResult<T = unknown> {
  /** Whether the tool execution was successful */
  success: boolean;
  /** The result data */
  data?: T;
  /** Error message if execution failed */
  error?: string;
  /** Detailed validation errors */
  validationErrors?: ValidationError[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Suggestions for fixing the error */
  suggestions?: string[];
}

/**
 * Parameter schema for MCP tools.
 */
export interface MCPParameterSchema {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** Whether the parameter is required */
  required: boolean;
  /** Description of the parameter */
  description: string;
  /** Default value */
  default?: unknown;
  /** Enum values if applicable */
  enum?: unknown[];
  /** Pattern for string validation (regex) */
  pattern?: string;
  /** Minimum value for numbers or minimum length for strings/arrays */
  min?: number;
  /** Maximum value for numbers or maximum length for strings/arrays */
  max?: number;
}

/**
 * MCP Tool definition.
 */
export interface MCPToolDefinition {
  /** Tool name (e.g., 'create_cartridge') */
  name: string;
  /** Tool description */
  description: string;
  /** Parameter schemas */
  parameters: MCPParameterSchema[];
  /** Return type description */
  returnType: string;
  /** Category for grouping tools */
  category?: 'accelerator' | 'precision' | 'safety' | 'bridge' | 'architecture' | 'composite' | 'testing';
  /** Recommended use cases for this tool */
  bestFor?: string[];
  /** Names of deprecated tools this tool supersedes */
  deprecates?: string[];
  /** Complexity level for using this tool */
  complexity?: 'low' | 'medium' | 'high';
  /** Prerequisites for using this tool */
  requires?: string[];
}

/**
 * Base interface for MCP tools.
 */
export interface MCPTool<TParams = Record<string, unknown>, TResult = unknown> {
  /** Tool definition */
  definition: MCPToolDefinition;

  /**
   * Executes the tool with the given parameters.
   * 
   * @param params - Tool parameters
   * @returns Tool execution result
   */
  execute(params: TParams): Promise<MCPToolResult<TResult>>;

  /**
   * Validates tool parameters.
   * 
   * @param params - Parameters to validate
   * @returns Whether parameters are valid
   */
  validateParams(params: unknown): params is TParams;

  /**
   * Gets detailed validation errors.
   * 
   * @param params - Parameters to validate
   * @returns Array of validation errors
   */
  getValidationErrors?(params: unknown): ValidationError[];
}

import { SessionState } from './SessionState';

/**
 * Base class for MCP tools.
 * 
 * Provides common functionality for all MCP tools including:
 * - Parameter validation with detailed error messages
 * - Success/failure result creation
 * - Error message formatting with suggestions
 * - Automatic relative path resolution (Parameter Hydration)
 */
export abstract class BaseMCPTool<TParams = Record<string, unknown>, TResult = unknown>
  implements MCPTool<TParams, TResult> {
  abstract definition: MCPToolDefinition;

  /**
   * Internal wrapper that provides Parameter Hydration before calling the subclass execute.
   */
  async executeWrapper(params: TParams): Promise<MCPToolResult<TResult>> {
    const session = SessionState.getInstance();

    // Parameter Hydration for the Velocity Protocol
    if (session.isActive()) {
      const hydratableParams = params as Record<string, unknown>;
      for (const key of Object.keys(hydratableParams)) {
        const value = hydratableParams[key];

        // Heuristic: Key ends in 'Path' or 'Directory' and value is a string
        if (typeof value === 'string' && (key.endsWith('Path') || key.endsWith('Directory'))) {
          hydratableParams[key] = session.resolvePath(value);
        }
      }
    }

    return this.execute(params);
  }

  abstract execute(params: TParams): Promise<MCPToolResult<TResult>>;

  validateParams(params: unknown): params is TParams {
    const errors = this.getValidationErrors(params);
    return errors.length === 0;
  }

  /**
   * Gets detailed validation errors for the given parameters.
   * 
   * @param params - Parameters to validate
   * @returns Array of validation errors with suggestions
   */
  getValidationErrors(params: unknown): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof params !== 'object' || params === null) {
      errors.push({
        parameter: '',
        message: 'Parameters must be an object',
        expected: 'object',
        actual: typeof params,
        suggestion: 'Pass an object with the required parameters',
      });
      return errors;
    }

    const paramObj = params as Record<string, unknown>;

    for (const schema of this.definition.parameters) {
      // Check required parameters
      if (schema.required && !(schema.name in paramObj)) {
        errors.push({
          parameter: schema.name,
          message: `Required parameter '${schema.name}' is missing`,
          expected: schema.type,
          actual: 'undefined',
          suggestion: this.getParameterSuggestion(schema.name),
        });
        continue;
      }

      // Skip validation if parameter is not provided and not required
      if (!(schema.name in paramObj)) {
        continue;
      }

      const value = paramObj[schema.name];

      // Type validation
      const typeError = this.validateType(schema, value);
      if (typeError) {
        errors.push(typeError);
      }

      // Pattern validation for strings
      if (schema.pattern && typeof value === 'string') {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push({
            parameter: schema.name,
            message: `Parameter '${schema.name}' does not match required pattern`,
            expected: schema.pattern,
            actual: value,
            suggestion: `Ensure the value matches the pattern: ${schema.pattern}`,
          });
        }
      }

      // Min/max validation
      if (schema.min !== undefined) {
        if (typeof value === 'number' && value < schema.min) {
          errors.push({
            parameter: schema.name,
            message: `Parameter '${schema.name}' is below minimum value`,
            expected: `>= ${schema.min}`,
            actual: String(value),
          });
        }
        if (typeof value === 'string' && value.length < schema.min) {
          errors.push({
            parameter: schema.name,
            message: `Parameter '${schema.name}' is too short`,
            expected: `at least ${schema.min} characters`,
            actual: `${value.length} characters`,
          });
        }
        if (Array.isArray(value) && value.length < schema.min) {
          errors.push({
            parameter: schema.name,
            message: `Parameter '${schema.name}' has too few items`,
            expected: `at least ${schema.min} items`,
            actual: `${value.length} items`,
          });
        }
      }

      if (schema.max !== undefined) {
        if (typeof value === 'number' && value > schema.max) {
          errors.push({
            parameter: schema.name,
            message: `Parameter '${schema.name}' exceeds maximum value`,
            expected: `<= ${schema.max}`,
            actual: String(value),
          });
        }
        if (typeof value === 'string' && value.length > schema.max) {
          errors.push({
            parameter: schema.name,
            message: `Parameter '${schema.name}' is too long`,
            expected: `at most ${schema.max} characters`,
            actual: `${value.length} characters`,
          });
        }
        if (Array.isArray(value) && value.length > schema.max) {
          errors.push({
            parameter: schema.name,
            message: `Parameter '${schema.name}' has too many items`,
            expected: `at most ${schema.max} items`,
            actual: `${value.length} items`,
          });
        }
      }

      // Enum validation
      if (schema.enum && !schema.enum.includes(value)) {
        errors.push({
          parameter: schema.name,
          message: `Parameter '${schema.name}' has invalid value`,
          expected: `one of: ${schema.enum.join(', ')}`,
          actual: String(value),
          suggestion: `Choose one of the allowed values: ${schema.enum.join(', ')}`,
        });
      }
    }

    return errors;
  }

  /**
   * Validates the type of a parameter value.
   */
  private validateType(schema: MCPParameterSchema, value: unknown): ValidationError | null {
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (actualType !== schema.type) {
      // Allow null for optional parameters
      if (value === null && !schema.required) {
        return null;
      }

      return {
        parameter: schema.name,
        message: `Parameter '${schema.name}' has wrong type`,
        expected: schema.type,
        actual: actualType,
        suggestion: this.getTypeSuggestion(schema.type),
      };
    }

    return null;
  }

  /**
   * Gets a suggestion for a missing parameter.
   */
  private getParameterSuggestion(paramName: string): string {
    const suggestions: Record<string, string> = {
      name: 'Provide a descriptive name in kebab-case (e.g., "auth-flow", "user-validation")',
      description: 'Add a human-readable description of what this represents',
      outputPath: 'Specify the file path where the output should be saved (e.g., "./cartridges/my-app.cartridge.json")',
      cartridgePath: 'Provide the path to an existing cartridge file (e.g., "./cartridges/root.cartridge.json")',
      nodeType: 'Use a valid node type: logic.validate, logic.transform, control.input, control.display, infra.api.client, infra.storage.local',
      signalType: 'Use NAMESPACE.ACTION format (e.g., AUTH.LOGIN_REQUEST, USER.UPDATED)',
      registryPath: 'Provide the path to a signal registry file (e.g., "./registries/signal-registry.json")',
      type: 'Use NAMESPACE.ACTION format (e.g., AUTH.LOGIN_REQUEST, USER.UPDATED)',
    };

    return suggestions[paramName] || `Provide a valid value for '${paramName}'`;
  }

  /**
   * Gets a suggestion for type conversion.
   */
  private getTypeSuggestion(expectedType: string): string {
    const suggestions: Record<string, string> = {
      string: 'Wrap the value in quotes or convert to string using String()',
      number: 'Provide a numeric value without quotes (e.g., 42, 3.14)',
      boolean: 'Use true or false (without quotes)',
      object: 'Provide an object with curly braces (e.g., { "key": "value" })',
      array: 'Provide an array with square brackets (e.g., ["item1", "item2"])',
    };

    return suggestions[expectedType] || `Convert the value to ${expectedType}`;
  }

  /**
   * Creates a successful result.
   */
  protected success(data: TResult, metadata?: Record<string, unknown>): MCPToolResult<TResult> {
    return {
      success: true,
      data,
      metadata,
    };
  }

  /**
   * Creates a failure result with detailed error message.
   * 
   * @param error - Error message or Error object
   * @param suggestions - Optional suggestions for fixing the error
   */
  protected failure(error: string | Error, suggestions?: string[]): MCPToolResult<TResult> {
    const errorMessage = error instanceof Error ? error.message : error;

    return {
      success: false,
      error: errorMessage,
      suggestions,
    };
  }

  /**
   * Creates a failure result with validation errors.
   */
  protected validationFailure(errors: ValidationError[]): MCPToolResult<TResult> {
    const errorMessage = errors.map(e =>
      e.suggestion ? `${e.message}. ${e.suggestion}` : e.message
    ).join('; ');

    return {
      success: false,
      error: errorMessage,
      validationErrors: errors,
      suggestions: errors.map(e => e.suggestion).filter(Boolean) as string[],
    };
  }

  /**
   * Gets a human-readable description of the tool.
   */
  getToolDescription(): string {
    const params = this.definition.parameters
      .map(p => `${p.name}${p.required ? '' : '?'}: ${p.type}`)
      .join(', ');
    return `${this.definition.name}(${params}) -> ${this.definition.returnType}\n  ${this.definition.description}`;
  }
}
