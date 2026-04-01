/**
 * graph-os:retry — Re-queue failed signals with configurable backoff
 *
 * Wire additions:
 *   - retry: { maxAttempts, backoff, baseDelay, maxDelay }
 *
 * Depends: graph-os:phases (uses context for retry counter)
 *
 * @module @graph-os/runtime
 */

import type {
  GraphExtension,
  RetryConfig,
  WireDefinition,
  ErrorHookContext,
  ErrorResult,
} from '@graph-os/core';
import { createSignal } from '@graph-os/core';

/**
 * Calculate backoff delay in milliseconds.
 */
export function calculateBackoff(
  baseDelay: number,
  strategy: 'none' | 'linear' | 'exponential',
  attempt: number,
  maxDelay: number,
): number {
  switch (strategy) {
    case 'none':
      return 0;
    case 'linear':
      return Math.min(baseDelay * attempt, maxDelay);
    case 'exponential':
      return Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    default:
      return Math.min(baseDelay * attempt, maxDelay);
  }
}

export const RetryExtension: GraphExtension = {
  id: 'graph-os:retry',
  name: 'Retry',
  description: 'Re-queue failed signals with configurable backoff.',
  apiVersion: '1.0.0',
  depends: ['graph-os:phases'],

  wireSchema: {
    type: 'object',
    properties: {
      retry: {
        type: 'object',
        properties: {
          maxAttempts: { type: 'number', description: 'Max retry attempts (default 3)' },
          backoff: {
            type: 'string',
            enum: ['none', 'linear', 'exponential'],
            description: 'Backoff strategy (default exponential)',
          },
          baseDelay: { type: 'number', description: 'Base delay in ms (default 1000)' },
          maxDelay: { type: 'number', description: 'Max delay cap in ms (default 30000)' },
        },
      },
    },
  },

  hooks: {
    onError: async (ctx: ErrorHookContext): Promise<ErrorResult> => {
      const wire = ctx.wire as WireDefinition & { retry?: RetryConfig };
      if (!wire.retry) return { handled: false };

      const config: Required<RetryConfig> = {
        maxAttempts: wire.retry.maxAttempts ?? 3,
        backoff: wire.retry.backoff ?? 'exponential',
        baseDelay: wire.retry.baseDelay ?? 1000,
        maxDelay: wire.retry.maxDelay ?? 30000,
      };

      const key = `retries:${wire.from}:${ctx.signal.type}`;
      const attempts = ctx.graph.increment(key);

      if (attempts >= config.maxAttempts) {
        ctx.logger.info(
          `[retry] Max attempts (${config.maxAttempts}) reached for ${wire.from}→${wire.to}, sending to DLQ`,
        );
        return { handled: false }; // give up → DLQ
      }

      const delay = calculateBackoff(config.baseDelay, config.backoff, attempts, config.maxDelay);

      ctx.logger.info(
        `[retry] Attempt ${attempts}/${config.maxAttempts} for ${wire.from}→${wire.to}, retrying in ${delay}ms`,
      );

      // Re-queue the original signal after delay
      setTimeout(() => {
        ctx.graph.requeue(ctx.signal, delay);
      }, delay);

      return { handled: true }; // retrying, don't DLQ
    },
  },

  validators: {
    wire: (wire: any): Array<{ valid: boolean; error?: string; path?: string; suggestion?: string }> => {
      const results: Array<{ valid: boolean; error?: string; path?: string; suggestion?: string }> = [];
      if (!wire.retry) return results;

      if (wire.retry.maxAttempts !== undefined && wire.retry.maxAttempts < 1) {
        results.push({
          valid: false,
          error: 'retry.maxAttempts must be >= 1',
          path: `wires[${wire.from}→${wire.to}].retry.maxAttempts`,
        });
      }

      const validBackoff = ['none', 'linear', 'exponential'];
      if (wire.retry.backoff && !validBackoff.includes(wire.retry.backoff)) {
        results.push({
          valid: false,
          error: `Invalid retry backoff: "${wire.retry.backoff}"`,
          path: `wires[${wire.from}→${wire.to}].retry.backoff`,
          suggestion: `Valid values: ${validBackoff.join(', ')}`,
        });
      }

      return results;
    },
  },
};
