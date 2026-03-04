import React, { useState, useEffect } from 'react';
import { SignalProvider } from '@graph-os/react-bridge';
import { createRuntime, NodeFactoryImpl, registerBuiltInNodes } from '@graph-os/runtime';
import { registerCustomNodes } from './CustomNodes';

interface RuntimeProviderProps {
  children: React.ReactNode;
  cartridgeUrl?: string;
  onRuntimeError?: (error: string) => void;
}

/**
 * The RuntimeProvider encapsulates the complex Isomorphic fetch logic to
 * cleanly load the backend execution graph inside the browser.
 */
export function RuntimeProvider({
  children,
  cartridgeUrl = '/cartridges/root.cartridge.json',
  onRuntimeError
}: RuntimeProviderProps) {
  const [runtime, setRuntime] = useState<Awaited<ReturnType<typeof createRuntime>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initRuntime() {
      try {
        console.log('🚀 Initializing Graph-OS Runtime Isomorphically...');

        // 1. Fetch Cartridge configuration
        const response = await fetch(cartridgeUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch ${cartridgeUrl}`);
        }
        const cartridgeData = await response.json();

        console.log(`📦 Loaded Cartridge[${cartridgeData.name}]v${cartridgeData.version}`);

        // 2. Hydrate the execution engine
        const factory = new NodeFactoryImpl();
        registerBuiltInNodes(factory);
        registerCustomNodes(factory);

        const rt = await createRuntime({ cartridge: cartridgeData, nodeFactory: factory });
        await rt.start();

        setRuntime(rt);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        setError(errMsg);
        onRuntimeError?.(errMsg);
      }
    }

    initRuntime();

    return () => {
      // Optional: Clean up sequence if needed in the future
    };
  }, [cartridgeUrl, onRuntimeError]);

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#b91c1c', background: '#fee2e2', borderRadius: '8px' }}>
        <h3>Graph-OS Initialization Error</h3>
        <p>{error}</p>
        <p>Ensure your development server is running and `{cartridgeUrl}` is accessible in the ` / public` directory.</p>
      </div>
    );
  }

  if (!runtime) {
    return (
      <div style={{ padding: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{ width: '16px', height: '16px', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span>Loading execution graph...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } `}</style>
      </div>
    );
  }

  return (
    <SignalProvider runtime={runtime}>
      {children}
    </SignalProvider>
  );
}
