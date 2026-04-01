/**
 * graph-os:phases — Phase-aware wire activation
 *
 * THE foundational extension. Without it, all wires are always active.
 * With it, wires declare a `phase` and are only routed during that phase.
 *
 * Wire additions:
 *   - phase: string        — which phase this wire belongs to
 *   - advancesTo: string   — phase to transition to on success
 *
 * @module @graph-os/runtime
 */

import type {
  GraphExtension,
  PhaseDefinition,
  RouteHookContext,
  ProcessHookContext,
  PhaseHookContext,
  GraphHookContext,
  HookResult,
  ValidationResult,
} from '@graph-os/core';

export const PhasesExtension: GraphExtension = {
  id: 'graph-os:phases',
  name: 'Phases',
  description: 'Phase-aware wire activation. Wires declare a phase and are only active during that phase.',
  apiVersion: '1.0.0',

  phaseSchema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      description: { type: 'string' },
      terminal: { type: 'boolean' },
      autoAdvance: { type: 'boolean' },
      timeout: { type: 'number' },
      timeoutTarget: { type: 'string' },
    },
    required: ['id'],
  },

  wireSchema: {
    type: 'object',
    properties: {
      phase: { type: 'string', description: 'Phase this wire belongs to' },
      advancesTo: { type: 'string', description: 'Phase to transition to on success' },
    },
  },

  cartridgeSchema: {
    type: 'object',
    properties: {
      phases: {
        type: 'array',
        items: { $ref: '#/definitions/phaseDefinition' },
        description: 'Execution phases for the graph',
      },
      initialPhase: { type: 'string', description: 'Starting phase' },
    },
  },

  hooks: {
    onRoute: async (ctx: RouteHookContext): Promise<HookResult> => {
      const wire = ctx.wire as any;

      // Wires without a phase are always active (backward compatible)
      if (!wire.phase) {
        return { proceed: true };
      }

      // Wires with a phase must match the current phase
      if (wire.phase === ctx.graph.currentPhase) {
        return { proceed: true };
      }

      // Wrong phase — cancel routing
      ctx.logger.debug(
        `[phases] Wire "${wire.from}→${wire.to}" blocked: wire phase "${wire.phase}" ≠ current "${ctx.graph.currentPhase}"`,
      );
      return { proceed: false };
    },

    onAfterProcess: async (ctx: ProcessHookContext): Promise<void> => {
      const wire = ctx.wire as any;
      const graph = ctx.graph;

      // Auto-advance phase if wire declares advancesTo
      if (wire?.advancesTo) {
        const fromPhase = graph.currentPhase;
        const toPhase = wire.advancesTo;

        if (fromPhase !== toPhase) {
          // Fire onPhaseExit for old phase
          const pipeline = (graph as any).pipeline;
          if (pipeline) {
            await pipeline.executeOnPhaseExit({
              graph,
              wire: ctx.wire,
              logger: ctx.logger,
              fromPhase,
              toPhase,
              triggerSignal: ctx.signal,
            });
          }

          graph.advanceTo(toPhase);

          // Fire onPhaseEnter for new phase
          if (pipeline) {
            await pipeline.executeOnPhaseEnter({
              graph,
              wire: ctx.wire,
              logger: ctx.logger,
              fromPhase,
              toPhase,
              triggerSignal: ctx.signal,
            });
          }

          ctx.logger.info(`[phases] Phase transition: ${fromPhase} → ${toPhase}`);
        }
      }
    },

    onGraphStart: async (ctx: GraphHookContext): Promise<void> => {
      const cartridge = ctx.cartridge as any;
      if (!cartridge?.phases || cartridge.phases.length === 0) return;

      const initialPhase = cartridge.initialPhase || cartridge.phases[0].id;
      ctx.logger.info(`[phases] Graph starting in phase: ${initialPhase}`);

      // Ensure context starts in the correct phase
      if (ctx.graph.currentPhase !== initialPhase) {
        ctx.graph.advanceTo(initialPhase);
      }
    },
  },

  validators: {
    cartridge: (cartridge: any): ValidationResult[] => {
      const results: ValidationResult[] = [];
      const c = cartridge as any;

      // If phases declared, initialPhase must exist
      if (c.phases && c.phases.length > 0) {
        if (!c.initialPhase) {
          results.push({
            valid: false,
            error: 'Cartridge declares phases but missing initialPhase',
            suggestion: 'Add "initialPhase": "receiving" (or your first phase id)',
          });
        }

        const phaseIds = c.phases.map((p: PhaseDefinition) => p.id);
        if (c.initialPhase && !phaseIds.includes(c.initialPhase)) {
          results.push({
            valid: false,
            error: `initialPhase "${c.initialPhase}" not found in phases`,
            suggestion: `Available phases: ${phaseIds.join(', ')}`,
          });
        }

        // Check for duplicate phase IDs
        const seen = new Set<string>();
        for (const p of c.phases) {
          if (seen.has(p.id)) {
            results.push({
              valid: false,
              error: `Duplicate phase ID: ${p.id}`,
            });
          }
          seen.add(p.id);
        }
      }

      return results;
    },

    wire: (wire: any, cartridge: any): ValidationResult[] => {
      const results: ValidationResult[] = [];
      const c = cartridge as any;

      // If wire declares a phase, that phase must exist in cartridge
      if (wire.phase && c.phases) {
        const phaseIds = c.phases.map((p: PhaseDefinition) => p.id);
        if (!phaseIds.includes(wire.phase)) {
          results.push({
            valid: false,
            error: `Wire phase "${wire.phase}" not found in cartridge phases`,
            path: `wires[${wire.from}→${wire.to}]`,
            suggestion: `Available phases: ${phaseIds.join(', ')}`,
          });
        }
      }

      // If wire declares advancesTo, that phase must exist
      if (wire.advancesTo && c.phases) {
        const phaseIds = c.phases.map((p: PhaseDefinition) => p.id);
        if (!phaseIds.includes(wire.advancesTo)) {
          results.push({
            valid: false,
            error: `Wire advancesTo "${wire.advancesTo}" not found in cartridge phases`,
            path: `wires[${wire.from}→${wire.to}]`,
            suggestion: `Available phases: ${phaseIds.join(', ')}`,
          });
        }
      }

      return results;
    },
  },
};
