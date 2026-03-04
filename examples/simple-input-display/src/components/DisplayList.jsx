import React from 'react';

function DisplayList({ inputs }) {
  // In full implementation, would subscribe to UI.DISPLAY_UPDATE signal
  // const displayUpdate = useSignal('UI.DISPLAY_UPDATE');

  return (
    <div>
      <h2 style={{ 
        marginBottom: '15px', 
        color: '#333',
        fontSize: '1.3em'
      }}>
        Submitted Items ({inputs.length})
      </h2>
      {inputs.length === 0 ? (
        <p style={{ 
          color: '#999', 
          textAlign: 'center',
          padding: '30px',
          fontStyle: 'italic'
        }}>
          No items yet. Submit something above!
        </p>
      ) : (
        <ul style={{ 
          listStyle: 'none',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {inputs.map((item) => (
            <li
              key={item.id}
              style={{
                padding: '12px 16px',
                marginBottom: '8px',
                background: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #e9ecef',
                color: '#333',
                fontSize: '15px',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateX(4px)';
                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateX(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              {item.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DisplayList;
