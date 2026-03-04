import React, { useState } from 'react';
import { useEmitSignal } from '@graph-os/react-bridge';

interface TaskInputProps {
  className?: string;
  onValueChange?: (value: unknown) => void;
}

/**
 * TaskInput - Auto-generated input component
 * 
 * Generated from Graph-OS node: TaskInput
 * Emits: TASK.CREATE
 */
export function TaskInput({ className, onValueChange }: TaskInputProps) {
  const [value, setValue] = useState<string>('');
  const emitSignal = useEmitSignal();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // Emit signal through Graph-OS
    emitSignal('TASK.CREATE', { value: newValue });
    
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

export default TaskInput;