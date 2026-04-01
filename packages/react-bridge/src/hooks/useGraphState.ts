import { useState, useEffect, useCallback } from 'react';
import { useSignalContext } from '../SignalContext';
import type { RuntimeEventHandler } from '@graph-os/core';

/**
 * Reactive snapshot of the graph execution state.
 */
export interface GraphState {
  /** Current phase ID */
  currentPhase: string;
  /** Phases that have been completed, in order */
  completedPhases: string[];
  /** Arbitrary data store (from GraphContext) */
  data: Record<string, unknown>;
  /** Number of signals processed */
  signalsProcessed: number;
  /** Number of signals emitted */
  signalsEmitted: number;
  /** Number of errors */
  errorCount: number;
  /** Runtime state */
  state: string;
  /** Full raw snapshot */
  snapshot: Record<string, unknown>;
}

/**
 * React hook to reactively track the full graph execution state.
 *
 * Re-renders the component whenever:
 * - Phase changes (phase:enter / phase:exit events)
 * - Signals are received or emitted
 * - Errors occur
 * - Runtime state changes
 *
 * @param updateInterval - Polling interval in ms for snapshot refresh (default 100ms).
 *                          Set to 0 to disable polling and rely only on events.
 *
 * @example
 * ```tsx
 * const graphState = useGraphState();
 *
 * return (
 *   <div>
 *     <p>Current phase: {graphState.currentPhase}</p>
 *     <p>Completed: {graphState.completedPhases.join(' → ')}</p>
 *     <p>Signals processed: {graphState.signalsProcessed}</p>
 *   </div>
 * );
 * ```
 */
export function useGraphState(updateInterval: number = 100): GraphState {
  const { runtime } = useSignalContext();
  const [state, setState] = useState<GraphState>(() => captureState(runtime));

  // Refresh function
  const refresh = useCallback(() => {
    setState(captureState(runtime));
  }, [runtime]);

  // Subscribe to all runtime events for reactive updates
  useEffect(() => {
    // Subscribe to wildcard signals (catches all signal events)
    const unsubSignal = runtime.subscribe('*', () => {
      refresh();
    });

    // Subscribe to runtime events via on/off
    const eventTypes = [
      'phase:enter',
      'phase:exit',
      'runtime:start',
      'runtime:stop',
      'runtime:error',
      'runtime:ready',
      'signal:received',
      'signal:emitted',
      'node:error',
      'extension:action',
    ] as const;

    const handler: RuntimeEventHandler = () => refresh();

    for (const eventType of eventTypes) {
      runtime.on(eventType, handler);
    }

    // Optional polling for high-frequency state updates
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (updateInterval > 0) {
      intervalId = setInterval(refresh, updateInterval);
    }

    return () => {
      unsubSignal();
      for (const eventType of eventTypes) {
        runtime.off(eventType, handler);
      }
      if (intervalId) clearInterval(intervalId);
    };
  }, [runtime, refresh, updateInterval]);

  return state;
}

/**
 * Capture the current graph state from the runtime.
 */
function captureState(runtime: any): GraphState {
  try {
    const stats = runtime.getStats();
    const snapshot = runtime.getSnapshot ? runtime.getSnapshot() : {};
    const ctx = runtime.getGraphContext ? runtime.getGraphContext() : null;

    return {
      currentPhase: ctx?.currentPhase || 'default',
      completedPhases: ctx?.completedPhases ? [...ctx.completedPhases] : [],
      data: (snapshot?.data as Record<string, unknown>) || {},
      signalsProcessed: stats.signalsProcessed || 0,
      signalsEmitted: stats.signalsEmitted || 0,
      errorCount: stats.errorCount || 0,
      state: runtime.getState ? runtime.getState() : 'idle',
      snapshot,
    };
  } catch {
    return {
      currentPhase: 'default',
      completedPhases: [],
      data: {},
      signalsProcessed: 0,
      signalsEmitted: 0,
      errorCount: 0,
      state: 'idle',
      snapshot: {},
    };
  }
}
