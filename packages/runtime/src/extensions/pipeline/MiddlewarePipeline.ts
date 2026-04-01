/**
 * MiddlewarePipeline — Ordered execution of extension hooks
 *
 * For each hook type (onRoute, onPhaseEnter, etc.),
 * the pipeline collects all registered hooks across loaded
 * extensions and executes them in dependency order.
 *
 * @module @graph-os/runtime
 */

import type {
  GraphExtension,
  RouteHookContext,
  ProcessHookContext,
  ErrorHookContext,
  PhaseHookContext,
  GraphHookContext,
  HookResult,
  ErrorResult,
} from '@graph-os/core';
import { Logger } from '../../utils/Logger';

type HookType =
  | 'onRoute'
  | 'onBeforeProcess'
  | 'onAfterProcess'
  | 'onError'
  | 'onPhaseEnter'
  | 'onPhaseExit'
  | 'onGraphStart'
  | 'onGraphDestroy';

interface HookEntry {
  extensionId: string;
  hook: (...args: any[]) => Promise<any>;
}

const ALL_HOOK_TYPES: HookType[] = [
  'onRoute',
  'onBeforeProcess',
  'onAfterProcess',
  'onError',
  'onPhaseEnter',
  'onPhaseExit',
  'onGraphStart',
  'onGraphDestroy',
];

export class MiddlewarePipeline {
  private hooks: Map<HookType, HookEntry[]> = new Map();
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
    for (const type of ALL_HOOK_TYPES) {
      this.hooks.set(type, []);
    }
  }

  /**
   * Register all hooks from an extension into the pipeline.
   */
  registerExtension(extension: GraphExtension): void {
    if (!extension.hooks) return;

    const entries = Object.entries(extension.hooks) as [HookType, (...args: any[]) => Promise<any>][];
    for (const [hookType, hookFn] of entries) {
      if (!this.hooks.has(hookType)) {
        this.hooks.set(hookType, []);
      }
      this.hooks.get(hookType)!.push({
        extensionId: extension.id,
        hook: hookFn,
      });
    }

    this.logger.debug(`Registered ${extension.id} hooks: ${Object.keys(extension.hooks).join(', ')}`);
  }

  /**
   * Execute all onRoute hooks in order. Returns false if any cancels.
   */
  async executeOnRoute(ctx: RouteHookContext): Promise<boolean> {
    const entries = this.hooks.get('onRoute') || [];
    for (const entry of entries) {
      try {
        const result: HookResult = await entry.hook(ctx);
        if (result && result.proceed === false) {
          this.logger.debug(`[pipeline] onRoute cancelled by ${entry.extensionId}`);
          return false;
        }
      } catch (error) {
        this.logger.error(`[pipeline] onRoute error in ${entry.extensionId}:`, error);
        return false;
      }
    }
    return true;
  }

  /**
   * Execute all onBeforeProcess hooks. Returns false if any cancels.
   */
  async executeOnBeforeProcess(ctx: ProcessHookContext): Promise<boolean> {
    const entries = this.hooks.get('onBeforeProcess') || [];
    for (const entry of entries) {
      try {
        const result: HookResult = await entry.hook(ctx);
        if (result && result.proceed === false) {
          this.logger.debug(`[pipeline] onBeforeProcess cancelled by ${entry.extensionId}`);
          return false;
        }
      } catch (error) {
        this.logger.error(`[pipeline] onBeforeProcess error in ${entry.extensionId}:`, error);
        return false;
      }
    }
    return true;
  }

  /**
   * Execute all onAfterProcess hooks.
   */
  async executeOnAfterProcess(ctx: ProcessHookContext): Promise<void> {
    const entries = this.hooks.get('onAfterProcess') || [];
    for (const entry of entries) {
      try {
        await entry.hook(ctx);
      } catch (error) {
        this.logger.error(`[pipeline] onAfterProcess error in ${entry.extensionId}:`, error);
      }
    }
  }

  /**
   * Execute all onError hooks. Returns true if any extension handled the error.
   */
  async executeOnError(ctx: ErrorHookContext): Promise<boolean> {
    const entries = this.hooks.get('onError') || [];
    for (const entry of entries) {
      try {
        const result: ErrorResult = await entry.hook(ctx);
        if (result && result.handled) {
          this.logger.debug(`[pipeline] onError handled by ${entry.extensionId}`);
          return true;
        }
      } catch (pipelineError) {
        this.logger.error(`[pipeline] onError error in ${entry.extensionId}:`, pipelineError);
      }
    }
    return false;
  }

  /**
   * Execute all onPhaseEnter hooks.
   */
  async executeOnPhaseEnter(ctx: PhaseHookContext): Promise<void> {
    const entries = this.hooks.get('onPhaseEnter') || [];
    for (const entry of entries) {
      try {
        await entry.hook(ctx);
      } catch (error) {
        this.logger.error(`[pipeline] onPhaseEnter error in ${entry.extensionId}:`, error);
      }
    }
  }

  /**
   * Execute all onPhaseExit hooks.
   */
  async executeOnPhaseExit(ctx: PhaseHookContext): Promise<void> {
    const entries = this.hooks.get('onPhaseExit') || [];
    for (const entry of entries) {
      try {
        await entry.hook(ctx);
      } catch (error) {
        this.logger.error(`[pipeline] onPhaseExit error in ${entry.extensionId}:`, error);
      }
    }
  }

  /**
   * Execute all onGraphStart hooks.
   */
  async executeOnGraphStart(ctx: GraphHookContext): Promise<void> {
    const entries = this.hooks.get('onGraphStart') || [];
    for (const entry of entries) {
      try {
        await entry.hook(ctx);
      } catch (error) {
        this.logger.error(`[pipeline] onGraphStart error in ${entry.extensionId}:`, error);
      }
    }
  }

  /**
   * Execute all onGraphDestroy hooks.
   */
  async executeOnGraphDestroy(ctx: GraphHookContext): Promise<void> {
    const entries = this.hooks.get('onGraphDestroy') || [];
    for (const entry of entries) {
      try {
        await entry.hook(ctx);
      } catch (error) {
        this.logger.error(`[pipeline] onGraphDestroy error in ${entry.extensionId}:`, error);
      }
    }
  }

  /**
   * Get registered extension IDs (for debugging).
   */
  getRegisteredExtensions(): string[] {
    const ids = new Set<string>();
    for (const entries of this.hooks.values()) {
      for (const entry of entries) {
        ids.add(entry.extensionId);
      }
    }
    return Array.from(ids);
  }

  /**
   * Clear all hooks.
   */
  clear(): void {
    for (const key of this.hooks.keys()) {
      this.hooks.set(key, []);
    }
  }
}
