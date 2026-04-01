/**
 * @graph-os/react-bridge
 *
 * Official standard library bridging the React DOM declarative rendering context
 * to the imperative Graph-OS runtime event structure.
 */

// Export Core Provider & Context
export { SignalProvider, SignalContext, useSignalContext } from './SignalContext';
export type { SignalContextType, SignalProviderProps } from './SignalContext';

// Export React Hooks
export { useSignal } from './hooks/useSignal';
export { useEmitSignal } from './hooks/useEmitSignal';
export type { EmitSignalFunction } from './hooks/useEmitSignal';
export { useGraphState } from './hooks/useGraphState';
export type { GraphState } from './hooks/useGraphState';
