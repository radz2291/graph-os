import React, { createContext, useContext, ReactNode } from 'react';
import { GraphRuntime } from '@graph-os/runtime';

/**
 * The Context definition storing the GraphRuntime instance.
 */
export interface SignalContextType {
    runtime: GraphRuntime;
}

export const SignalContext = createContext<SignalContextType | null>(null);

/**
 * Props for the SignalProvider component.
 */
export interface SignalProviderProps {
    runtime: GraphRuntime;
    children: ReactNode;
}

/**
 * SignalProvider - The root component for the React Bridge.
 * 
 * Wraps the React application and provides the GraphRuntime connection to 
 * all downstream hooks (`useSignal`, `useEmitSignal`).
 * 
 * @example
 * ```tsx
 * const runtime = await createRuntime({ ... });
 * 
 * return (
 *   <SignalProvider runtime={runtime}>
 *     <App />
 *   </SignalProvider>
 * );
 * ```
 */
export const SignalProvider: React.FC<SignalProviderProps> = ({ runtime, children }) => {
    return (
        <SignalContext.Provider value={{ runtime }}>
            {children}
        </SignalContext.Provider>
    );
};

/**
 * Internal helper hook to securely access the SignalContext.
 * Throws an explicit error if a developer uses a Bridge hook outside the Provider.
 */
export const useSignalContext = (): SignalContextType => {
    const context = useContext(SignalContext);
    if (!context) {
        throw new Error(
            '[@graph-os/react-bridge] Hook must be used within a SignalProvider. ' +
            'Ensure your application is wrapped with <SignalProvider runtime={runtime}>.'
        );
    }
    return context;
};
