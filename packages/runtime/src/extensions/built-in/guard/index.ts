/**
 * graph-os:guard — Conditional routing based on context data
 *
 * Wires declare guard conditions that must pass
 * before the signal is routed. If the guard fails,
 * the wire is skipped.
 *
 * Wire additions:
 *   - guard: { field, operator, value }   — condition to evaluate
 *
 * @module @graph-os/runtime
 */

import type {
  GraphExtension,
  GuardCondition,
  RouteHookContext,
  HookResult,
  ValidationResult,
} from '@graph-os/core';

function evaluateGuard(
  guard: GuardCondition,
  getFieldValue: (key: string, defaultValue?: unknown) => unknown
): boolean {
  const fieldValue = getFieldValue(guard.field);

  switch (guard.operator) {
    case 'eq':
      return fieldValue === guard.value;
    case 'neq':
      return fieldValue !== guard.value;
    case 'lt':
      return typeof fieldValue === 'number' && fieldValue < (guard.value as number);
    case 'lte':
      return typeof fieldValue === 'number' && fieldValue <= (guard.value as number);
    case 'gt':
      return typeof fieldValue === 'number' && fieldValue > (guard.value as number);
    case 'gte':
      return typeof fieldValue === 'number' && fieldValue >= (guard.value as number);
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;
    case 'notExists':
      return fieldValue === undefined || fieldValue === null;
    case 'in':
      return Array.isArray(guard.values) && guard.values.includes(fieldValue);
    case 'notIn':
      return Array.isArray(guard.values) && !guard.values.includes(fieldValue);
    case 'matches':
      if (typeof fieldValue !== 'string') return false;
      try {
        return new RegExp(guard.pattern || '').test(fieldValue);
      } catch {
        return false;
      }
    default:
      return true;
  }
}

export const GuardExtension: GraphExtension = {
  id: 'graph-os:guard',
  name: 'Guard',
  description: 'Conditional routing based on context data. Wires declare guard conditions that must pass before routing.',
  apiVersion: '1.0.0',

  wireSchema: {
    type: 'object',
    properties: {
      guard: {
        type: 'object',
        properties: {
          field: { type: 'string', description: 'Context data field to check' },
          operator: {
            type: 'string',
            enum: ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'exists', 'notExists', 'in', 'notIn', 'matches'],
            description: 'Comparison operator',
          },
          value: { description: 'Value to compare against' },
          values: { type: 'array', description: 'Array of values for in/notIn' },
          pattern: { type: 'string', description: 'Regex pattern for matches' },
        },
        required: ['field', 'operator'],
        description: 'Guard condition for conditional routing',
      },
    },
  },

  hooks: {
    onRoute: async (ctx: RouteHookContext): Promise<HookResult> => {
      const wire = ctx.wire as any;

      // No guard = always proceed
      if (!wire.guard) {
        return { proceed: true };
      }

      const guard = wire.guard as GuardCondition;
      const getFieldValue = (key: string, defaultValue?: unknown) =>
        ctx.graph.get(key, defaultValue);

      const passed = evaluateGuard(guard, getFieldValue);

      if (!passed) {
        ctx.logger.debug(
          `[guard] Wire "${wire.from}→${wire.to}" blocked: guard(${guard.field} ${guard.operator} ${guard.value}) failed`
        );
      }

      return { proceed: passed };
    },
  },

  validators: {
    wire: (wire: any, _cartridge: any): ValidationResult[] => {
      const results: ValidationResult[] = [];

      if (wire.guard) {
        const validOperators = ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'exists', 'notExists', 'in', 'notIn', 'matches'];

        if (!validOperators.includes(wire.guard.operator)) {
          results.push({
            valid: false,
            error: `Invalid guard operator: "${wire.guard.operator}"`,
            path: `wires[${wire.from}→${wire.to}].guard.operator`,
            suggestion: `Valid operators: ${validOperators.join(', ')}`,
          });
        }

        if (!wire.guard.field || typeof wire.guard.field !== 'string') {
          results.push({
            valid: false,
            error: 'Guard must have a "field" property',
            path: `wires[${wire.from}→${wire.to}].guard.field`,
          });
        }
      }

      return results;
    },
  },
};
