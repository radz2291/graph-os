import React, { useState } from 'react';
import { RuntimeProvider } from './integration/RuntimeProvider';
import { useSignal, useEmitSignal } from './integration/SignalHooks';

// ----------------------------------------------------------------------------
// Presentation Components
// ----------------------------------------------------------------------------

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const emit = useEmitSignal();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (email && password) {
            emit('AUTH.LOGIN_REQUEST', { email, password });
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '0 auto', background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', textAlign: 'center' }}>System Login</h2>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>Email Address</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                        required
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>Password (Min 8 chars)</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                        required
                    />
                </div>
                <button
                    type="submit"
                    style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}
                >
                    Authenticate (Emit Signal)
                </button>
            </form>
        </div>
    );
}

function SignalListener() {
    const successData = useSignal('AUTH.SUCCESS');
    const emailError = useSignal('VALIDATION.EMAIL_ERROR');
    const passwordError = useSignal('VALIDATION.PASSWORD_ERROR');

    return (
        <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase' }}>Graph Engine Response</h3>

            {successData && (
                <div style={{ color: '#047857', background: '#d1fae5', padding: '12px', borderRadius: '4px', border: '1px solid #34d399' }}>
                    <strong>Authentication Successful</strong>
                    <pre style={{ margin: '8px 0 0', fontSize: '12px' }}>{JSON.stringify(successData, null, 2)}</pre>
                </div>
            )}

            {(emailError || passwordError) && (
                <div style={{ color: '#b91c1c', background: '#fee2e2', padding: '12px', borderRadius: '4px', border: '1px solid #f87171' }}>
                    <strong>Validation Failed</strong>
                    {emailError && <pre style={{ margin: '4px 0 0', fontSize: '12px' }}>{JSON.stringify(emailError, null, 2)}</pre>}
                    {passwordError && <pre style={{ margin: '4px 0 0', fontSize: '12px' }}>{JSON.stringify(passwordError, null, 2)}</pre>}
                </div>
            )}

            {!successData && !emailError && !passwordError && (
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>Waiting for authentication signals...</p>
            )}
        </div>
    );
}

// ----------------------------------------------------------------------------
// Main Application Map
// ----------------------------------------------------------------------------

function App() {
    return (
        <RuntimeProvider cartridgeUrl="/cartridges/root.cartridge.json">
            <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>

                    <h1 style={{ fontSize: '28px', marginBottom: '8px', textAlign: 'center', color: '#0f172a' }}>🔒 test-auth-app</h1>
                    <p style={{ color: '#64748b', marginBottom: '40px', textAlign: 'center' }}>
                        A test generating auth app (Auth Scaffold)
                    </p>

                    <LoginForm />
                    <SignalListener />

                </div>
            </div>
        </RuntimeProvider>
    );
}

export default App;
