import React, { useState, useEffect } from 'react';
import { SignalProvider } from '@graph-os/react-bridge';
import { createRuntime } from '@graph-os/runtime';
import InputForm from './components/InputForm';
import DisplayList from './components/DisplayList';
import './index.css';

function App() {
  const [runtime, setRuntime] = useState(null);
  const [inputs, setInputs] = useState([]);

  useEffect(() => {
    async function initRuntime() {
      try {
        console.log('🚀 Initializing Graph-OS Runtime...');

        // 1. Fetch cartridge JSON (Vite serves this)
        const response = await fetch('./cartridges/simple-input-display.cartridge.json');
        const cartridgeData = await response.json();

        console.log('📦 Cartridge loaded:', cartridgeData.id);
        console.log('   Nodes:', cartridgeData.nodes.length);
        console.log('   Wires:', cartridgeData.wires.length);

        // 2. Initialize Runtime with DATA (not PATH)
        // Runtime will auto-detect browser env and use BrowserStorageNode
        const rt = await createRuntime({
          cartridge: cartridgeData
        });

        console.log('✅ Runtime initialized');
        console.log('   Is browser:', typeof window !== 'undefined');
        console.log('   Methods:', {
          sendSignal: typeof rt.sendSignal,
          subscribe: typeof rt.subscribe,
          emit: typeof rt.emit
        });

        // 3. Start the runtime
        await rt.start();
        console.log('▶️  Runtime started');
        console.log('   Is running:', rt.isReady);

        setRuntime(rt);
      } catch (error) {
        console.error('❌ Failed to initialize Graph-OS Runtime:', error);
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
      }
    }

    initRuntime();
  }, []);

  const handleNewInput = (inputData) => {
    setInputs(prev => [...prev, { id: Date.now(), text: inputData }]);
    console.log('✨ Input added:', inputData);
  };

  if (!runtime) {
    return (
      <div style={{
        maxWidth: '600px',
        width: '100%',
        background: 'white',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#667eea' }}>Loading...</h2>
        <p>Initializing Graph-OS Runtime</p>
      </div>
    );
  }

  return (
    <SignalProvider runtime={runtime}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        background: 'white',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        <h1 style={{
          textAlign: 'center',
          marginBottom: '30px',
          color: '#667eea',
          fontSize: '2em'
        }}>
          Simple Input Display
        </h1>
        <div style={{
          background: '#d1fae5',
          border: '1px solid #0d6efd',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          fontSize: '14px',
          color: '#0c5460'
        }}>
          <strong>✅ Graph-OS Runtime Active</strong>
          <p style={{ margin: '8px 0 0' }}>
            Browser mode: Using BrowserStorageNode (localStorage)
          </p>
        </div>
        <InputForm onNewInput={handleNewInput} />
        <DisplayList inputs={inputs} />
      </div>
    </SignalProvider>
  );
}

export default App;
