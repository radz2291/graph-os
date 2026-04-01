/**
 * graph-os:timeout — Per-wire and per-phase timeouts
 *
 * Automatically emits a timeout signal when a wire's processing
 * exceeds the configured duration. The timeout is cancelled
 * on success.
 *
 * Wire additions:
 *   - timeout: number          — max ms to wait
 *   - timeoutSignal: string    — signal type to emit on timeout
 *
 * @module @graph-os/runtime
 */

import type {
  GraphExtension,
  WireDefinition,
  ProcessHookContext,
} from '@graph-os/core';
import { createSignal } from '@graph-os/core';

export const TimeoutExtension: GraphExtension = {
  id: 'graph-os:timeout',
  name: 'Timeout',
  description: 'Per-wire and per-phase timeout with auto-emitting failure signals',
  apiVersion: '1.0.0',

  wireSchema: {
    type: 'object',
    properties: {
      timeout: { type: 'number', description: 'Max milliseconds to wait before timing out' },
      timeoutSignal: {
        type: 'string',
        description: 'Signal type to emit on timeout (default: <signalType>.TIMEOUT)',
      },
    },
  },

  phaseSchema: {
    type: 'object',
    properties: {
      timeout: { type: 'number', description: 'Max time allowed in this phase' },
      timeoutTarget: { type: 'string', description: 'Phase to transition to on timeout' },
    },
  },

  hooks: {
    onBeforeProcess: async (ctx: ProcessHookContext): Promise<{ proceed: boolean }> => {
      const wire = ctx.wire as WireDefinition & { timeout?: number; timeoutSignal?: string };
      if (!wire?.timeout) return { proceed: true };

      const timeoutMs = wire.timeout;
      const timeoutType = wire.timeoutSignal || `${ctx.signal.type}.TIMEOUT`;
      const key = `timeout:${wire.from}:${ctx.signal.type}`;

      // Start a timer that will fire a timeout signal if not cleared
      const timer = setTimeout(() => {
        ctx.logger.warn(
          `[timeout] Wire "${wire.from}→${wire.to}" timed out after ${timeoutMs}ms, emitting ${timeoutType}`,
        );

        ctx.graph.requeue(
          createSignal(timeoutType, {
            originalSignal: ctx.signal,
            reason: 'timeout',
            wireFrom: wire.from,
            wireTo: wire.to,
          }, wire.from),
        );
      }, timeoutMs);

      // Store timer reference so onAfterProcess can clear it
      ctx.graph.set(key, timer);

      return { proceed: true };
    },

    onAfterProcess: async (ctx: ProcessHookContext): Promise<void> => {
      const wire = ctx.wire as WireDefinition & { timeout?: number };
      if (!wire?.timeout) return;

      const key = `timeout:${wire.from}:${ctx.signal.type}`;
      const timer = ctx.graph.get<ReturnType<typeof setTimeout> | undefined>(key);
      if (timer !== undefined && timer !== null) {
        clearTimeout(timer as unknown as number);
        ctx.graph.set(key, undefined);
        ctx.logger.debug(`[timeout] Cleared timer for "${wire.from}→${wire.to}"`);
      }
    },
  },

  validators: {
    wire: (wire: any): Array<{ valid: boolean; error?: string; path?: string }> => {
      const results: Array<{ valid: boolean; error?: string; path?: string }> = [];
      if (wire.timeout !== undefined && wire.timeout < 0) {
        results.push({
          valid: false,
          error: 'timeout must be a positive number',
          path: `wires[${wire.from}→${wire.to}].timeout`,
        });
      }
      return results;
    },
  },
};
