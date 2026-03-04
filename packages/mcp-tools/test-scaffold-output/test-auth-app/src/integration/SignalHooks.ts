import { useSignal as baseUseSignal, useEmitSignal as baseUseEmitSignal } from '@graph-os/react-bridge';

/**
 * Custom hooks wrapping the low-level @graph-os/react-bridge hooks.
 * This provides a centralized place if you ever need to inject strongly-typed
 * Signal generic parameters based on your registry, or log telemetry
 * across the entire application interface.
 */

export function useSignal<TData = any>(signalType: string) {
    return baseUseSignal<TData>(signalType);
}

export function useEmitSignal() {
    const emit = baseUseEmitSignal();

    // Custom wrapper to allow future telemetry tracking or validation
    return (signalType: string, payload: Record<string, unknown>) => {
        // console.log(\`[User Emit] -> \${signalType}\`, payload);
        emit(signalType, payload);
    };
}
