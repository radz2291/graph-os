import { useState, useEffect } from 'react';
import { Signal } from '@graph-os/core';
import { useSignalContext } from '../SignalContext';

/**
 * React hook to subscribe to a specific signal emitted by the Graph-OS Runtime.
 * 
 * Automatically manages local React state based on incoming signals from the
 * SignalBus and guarantees secure unsubscribe on component unmount.
 * 
 * @param signalType - The string identifier of the signal (e.g. 'USER.LOGIN.SUCCESS'). Use '*' to subscribe to all signals.
 * @returns {Signal | null} The latest emitted signal payload matching the type, or null if no signal has been received.
 * 
 * @example
 * ```tsx
 * const latestSignal = useSignal('AUTH.TOKEN_UPDATED');
 * 
 * if (latestSignal) {
 *   console.log('Received payload:', latestSignal.payload);
 * }
 * ```
 */
export function useSignal(signalType: string): Signal | null {
    const { runtime } = useSignalContext();
    const [latestSignal, setLatestSignal] = useState<Signal | null>(null);

    useEffect(() => {
        // Register the subscription to the Graph-OS Runtime SignalBus
        const unsubscribe = runtime.subscribe(signalType, (signal: Signal) => {
            setLatestSignal(signal);
        });

        // Cleanup the subscription when the component unmounts
        return () => {
            unsubscribe();
        };
    }, [runtime, signalType]);

    return latestSignal;
}
