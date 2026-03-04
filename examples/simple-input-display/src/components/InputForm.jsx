import React, { useState } from 'react';
import { useEmitSignal } from '@graph-os/react-bridge';

function InputForm({ onNewInput }) {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emit = useEmitSignal();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsSubmitting(true);

    try {
      // Emit signal to Graph-OS backend
      emit('INPUT.SUBMIT', { userInput: input });
      console.log('📤 Signal emitted:', { type: 'INPUT.SUBMIT', payload: { userInput: input } });

      // Update local state
      onNewInput(input);

      // Clear input
      setInput('');
    } catch (error) {
      console.error('❌ Error submitting input:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }}>
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter anything..."
          disabled={isSubmitting}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.3s',
            disabled: isSubmitting ? 'opacity: 0.6' : ''
          }}
          onFocus={(e) => e.target.style.borderColor = '#667eea'}
          onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
        />
        <button
          type="submit"
          disabled={isSubmitting || !input.trim()}
          style={{
            padding: '12px 24px',
            background: isSubmitting ? '#ccc' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isSubmitting || !input.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.3s',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting && input.trim()) {
              e.target.style.background = '#5568d3';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.background = isSubmitting ? '#ccc' : '#667eea';
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  );
}

export default InputForm;
