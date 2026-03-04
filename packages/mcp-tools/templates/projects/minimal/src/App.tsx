import React, { useState } from 'react';
import { RuntimeProvider } from './integration/RuntimeProvider';
import { useSignal, useEmitSignal } from './integration/SignalHooks';

// ----------------------------------------------------------------------------
// Presentation Components
// ----------------------------------------------------------------------------

function InputForm() {
    const [text, setText] = useState('');
    const emit = useEmitSignal();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            // Emit the signal the Cartridge transform node expects
            emit('INPUT.SUBMITTED', { value: text, timestamp: new Date().toISOString() });
            setText('');
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
            <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Enter text to transform..."
                style={{ padding: '8px', marginRight: '8px', width: '250px' }}
            />
            <button type="submit" style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}>
                Send Signal
            </button>
        </form>
    );
}

function DataDisplay() {
    const latestData = useSignal('DATA.TRANSFORMED');

    return (
        <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px', minHeight: '100px' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Latest Signal (DATA.TRANSFORMED)</h3>
            {latestData ? (
                <pre style={{ margin: 0 }}>{JSON.stringify(latestData, null, 2)}</pre>
            ) : (
                <p style={{ color: '#6b7280', margin: 0 }}>Waiting for signals...</p>
            )}
        </div>
    );
}

// ----------------------------------------------------------------------------
// Main Application Map
// ----------------------------------------------------------------------------

function App() {
    return (
        // Wrap the entire app in RuntimeProvider to fetch the Cartridge via HTTP!
        <RuntimeProvider cartridgeUrl="/cartridges/root.cartridge.json">
            <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
                <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>⚡ {{ projectName }}</h1>
                <p style={{ color: '#4b5563', marginBottom: '32px' }}>
                    {{ description }} (Minimal Template)
                </p>

                <div style={{ background: '#d1fae5', border: '1px solid #10b981', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                    <strong>✅ Isomorphic Engine Running</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#065f46' }}>
                        The backend execution graph was fetched from your \`/public\` directory and is running natively in your browser!
                    </p>
                </div>

                <InputForm />
                <DataDisplay />

            </div>
        </RuntimeProvider>
    );
}

export default App;
