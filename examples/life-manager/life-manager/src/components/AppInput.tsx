import React, { useState } from 'react';
import { useEmitSignal } from '@graph-os/react-bridge';

interface AppInputProps {
  className?: string;
  onValueChange?: (value: unknown) => void;
}

/**
 * AppInput - Auto-generated input component
 * 
 * Generated from Graph-OS node: AppInput
 * Emits: APP.READY
 */
export function AppInput({ className, onValueChange }: AppInputProps) {
  const [value, setValue] = useState<string>('');
  const emitSignal = useEmitSignal();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // Emit signal through Graph-OS
    emitSignal('APP.READY', { value: newValue });
    
    // Also call optional callback
    onValueChange?.(newValue);
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      className={className}
      placeholder="Enter value..."
    />
  );
}

export default AppInput;