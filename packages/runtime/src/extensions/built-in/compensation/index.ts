/**
 * graph-os:compensation — Structural saga pattern
 *
 * When the graph enters a compensating phase, the runtime
 * automatically walks backward through completed phases,
 * firing rollback signals.
 *
 * Cartridge additions:
 *   - compensation: { strategy, steps[] }
 *
 * Depends: graph-os:phases
 *
 * @module @graph-os/runtime
 */

import type {
  GraphExtension,
  PhaseHookContext,
  CompensationStep,
  ValidationResult,
} from '@graph-os/core';
import { createSignal } from '@graph-os/core';

export const CompensationExtension: GraphExtension = {
  id: 'graph-os:compensation',
  name: 'Compensation',
  description: 'Structural saga pattern. Walk backward through completed phases on failure.',
  apiVersion: '1.0.0',
  depends: ['graph-os:phases'],

  cartridgeSchema: {
    type: 'object',
    properties: {
      compensation: {
        type: 'object',
        properties: {
          strategy: { type: 'string', enum: ['backward', 'forward'] },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                phase: { type: 'string' },
                node: { type: 'string' },
                signal: { type: 'string' },
                requires: { type: 'array', items: { type: 'string' } },
              },
              required: ['phase', 'node', 'signal'],
            },
          },
        },
        required: ['strategy', 'steps'],
      },
    },
  },

  hooks: {
    onPhaseEnter: async (ctx: PhaseHookContext): Promise<void> => {
      // Only act when entering the compensating phase
      if (ctx.toPhase !== 'compensating') return;

      const cartridge = (ctx.graph as any).cartridge;
      if (!cartridge?.compensation) return;

      const { strategy, steps }: { strategy: 'backward' | 'forward'; steps: CompensationStep[] } =
        cartridge.compensation;
      const completedPhases = ctx.graph.completedPhases;

      ctx.logger.info(`[compensation] Starting ${strategy} saga`);
      ctx.logger.info(`[compensation] Completed phases: ${completedPhases.join(', ')}`);

      // Filter steps to only those whose phase has been completed
      const relevantSteps = steps.filter((step) => completedPhases.includes(step.phase));

      // Order steps based on strategy
      const orderedSteps = strategy === 'backward' ? [...relevantSteps].reverse() : relevantSteps;

      let firedCount = 0;
      let skippedCount = 0;

      for (const step of orderedSteps) {
        // Check that all required data fields are available
        const payload: Record<string, unknown> = {};
        let hasAllRequired = true;

        for (const key of step.requires || []) {
          const value = ctx.graph.get(key);
          if (value !== undefined && value !== null) {
            payload[key] = value;
          } else {
            ctx.logger.warn(
              `[compensation] Missing required field "${key}" for step "${step.phase}/${step.node}"`,
            );
            hasAllRequired = false;
            break;
          }
        }

        if (!hasAllRequired) {
          skippedCount++;
          continue;
        }

        try {
          ctx.logger.info(`[compensation] Firing ${step.signal} → ${step.node}`);
          ctx.graph.requeue(
            createSignal(step.signal, payload, 'compensation-orchestrator'),
          );
          firedCount++;
        } catch (err) {
          ctx.logger.warn(`[compensation] Step failed:`, err);
          skippedCount++;
        }
      }

      ctx.logger.info(
        `[compensation] Completed. ${firedCount} steps fired, ${skippedCount} skipped`,
      );
    },
  },

  validators: {
    cartridge: (cartridge: any): ValidationResult[] => {
      const results: ValidationResult[] = [];
      const c = cartridge as any;
      if (!c.compensation) return results;

      // Each step must reference valid phases and nodes
      if (c.compensation.steps) {
        for (const step of c.compensation.steps) {
          if (c.phases) {
            const phaseIds = c.phases.map((p: any) => p.id);
            if (!phaseIds.includes(step.phase)) {
              results.push({
                valid: false,
                error: `Compensation step references unknown phase "${step.phase}"`,
                suggestion: `Available phases: ${phaseIds.join(', ')}`,
              });
            }
          }

          if (c.nodes) {
            const nodeIds = c.nodes.map((n: any) => n.id);
            if (!nodeIds.includes(step.node)) {
              results.push({
                valid: false,
                error: `Compensation step references unknown node "${step.node}"`,
                suggestion: `Available nodes: ${nodeIds.join(', ')}`,
              });
            }
          }
        }
      }

      if (!['backward', 'forward'].includes(c.compensation.strategy)) {
        results.push({
          valid: false,
          error: `Invalid compensation strategy: "${c.compensation.strategy}"`,
          suggestion: 'Valid values: backward, forward',
        });
      }

      return results;
    },
  },
};
