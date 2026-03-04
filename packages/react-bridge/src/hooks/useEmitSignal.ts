import { useCallback } from 'react';
import { Signal } from '@graph-os/core';
import { useSignalContext } from '../SignalContext';

/**
 * Return type definition for the `useEmitSignal` hook.
 */
export type EmitSignalFunction = (type: string, payload: unknown) => void;

/**
 * React hook to dispatch a signal into the Graph-OS Runtime event stream.
 * 
 * Automatically attaches standard metadata (timestamp, id, sourceNodeId) pointing to the UI component scope. 
 * This enables pure components to trigger imperative Graph operations (backend workflows).
 * 
 * @returns {EmitSignalFunction} A stable `emit(type, payload)` function.
 * 
 * @example
 * ```tsx
 * const emit = useEmitSignal();
 * 
 * const handleLoginClick = () => {
 *   emit('USER.LOGIN.REQUEST', { username, password });
 * };
 * ```
 */
export function useEmitSignal(): EmitSignalFunction {
    const { runtime } = useSignalContext();

    const emit = useCallback((type: string, payload: unknown) => {
        const signal: Signal = {
            type,
            sourceNodeId: 'ui-component', // Explicitly label the source as the UI component layer
            payload,
            timestamp: new Date()
        };

        // Queue the signal into the runtime engine
        runtime.sendSignal(signal);
    }, [runtime]);

    return emit;
}
