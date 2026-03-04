import React, { useState, useEffect, createContext, useContext } from 'react';
import { RuntimeProvider } from './integration/RuntimeProvider';
import { useSignal, useEmitSignal } from './integration/SignalHooks';

// ============================================================================
// Types
// ============================================================================

interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly';
  createdAt: string;
  completions: string[]; // Array of dates in YYYY-MM-DD format
}

// ============================================================================
// Context for sharing habits between components
// ============================================================================

interface HabitsContextType {
  habits: Habit[];
  addHabit: (habit: Habit) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  refreshHabits: () => void;
}

const HabitsContext = createContext<HabitsContextType | null>(null);

// ============================================================================
// HabitsProvider Component
// ============================================================================

function HabitsProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);

  // Load habits from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('habits');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setHabits(parsed);
        console.log('📥 Loaded habits from localStorage:', parsed);
      } catch (e) {
        console.error('Failed to parse habits:', e);
        setHabits([]);
      }
    }
  }, []);

  const saveHabits = (updatedHabits: Habit[]) => {
    localStorage.setItem('habits', JSON.stringify(updatedHabits));
    setHabits(updatedHabits);
    console.log('💾 Saved habits to localStorage:', updatedHabits);
  };

  const addHabit = (habit: Habit) => {
    const updatedHabits = [...habits, habit];
    saveHabits(updatedHabits);
  };

  const updateHabit = (id: string, updates: Partial<Habit>) => {
    const updatedHabits = habits.map(h => 
      h.id === id ? { ...h, ...updates } : h
    );
    saveHabits(updatedHabits);
  };

  const deleteHabit = (id: string) => {
    const updatedHabits = habits.filter(h => h.id !== id);
    saveHabits(updatedHabits);
  };

  const refreshHabits = () => {
    const stored = localStorage.getItem('habits');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setHabits(parsed);
      } catch (e) {
        console.error('Failed to parse habits:', e);
      }
    }
  };

  return (
    <HabitsContext.Provider value={{ habits, addHabit, updateHabit, deleteHabit, refreshHabits }}>
      {children}
    </HabitsContext.Provider>
  );
}

function useHabits() {
  const context = useContext(HabitsContext);
  if (!context) {
    throw new Error('useHabits must be used within HabitsProvider');
  }
  return context;
}

// ============================================================================
// HabitForm Component - Create new habits
// ============================================================================

function HabitForm() {
  const { addHabit } = useHabits();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const emit = useEmitSignal();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      console.log('📤 Creating new habit:', { name: name.trim(), description: description.trim(), frequency });
      
      // Create new habit object
      const newHabit: Habit = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description.trim() || undefined,
        frequency,
        createdAt: new Date().toISOString(),
        completions: []
      };

      // Add to context (this saves to localStorage and updates all listeners)
      addHabit(newHabit);
      
      // Emit to Graph-OS (for future integration)
      emit('HABIT.CREATE', newHabit);
      
      // Clear form
      setName('');
      setDescription('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ 
      background: '#f9fafb', 
      padding: '20px', 
      borderRadius: '8px', 
      marginBottom: '24px',
      border: '1px solid #e5e7eb'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>➕ Add New Habit</h3>
      
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
          Habit Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., Exercise 30 minutes"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px'
          }}
          required
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
          Description (optional)
        </label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Additional details..."
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
          Frequency *
        </label>
        <select
          value={frequency}
          onChange={e => setFrequency(e.target.value as 'daily' | 'weekly')}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      <button 
        type="submit"
        style={{
          padding: '10px 20px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'background 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
        onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
      >
        Add Habit
      </button>
    </form>
  );
}

// ============================================================================
// HabitCard Component - Individual habit with completion tracking
// ============================================================================

function HabitCard({ habit, onComplete, onDelete }: { 
  habit: Habit; 
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const isCompletedToday = habit.completions.includes(today);
  const streak = calculateStreak(habit.completions, habit.frequency);

  const handleComplete = () => {
    if (!isCompletedToday) {
      onComplete(habit.id);
    }
  };

  const handleDelete = () => {
    if (confirm(`Delete habit "${habit.name}"?`)) {
      onDelete(habit.id);
    }
  };

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{habit.name}</h4>
        {habit.description && (
          <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>
            {habit.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7280' }}>
          <span style={{
            background: habit.frequency === 'daily' ? '#dbeafe' : '#fef3c7',
            padding: '2px 8px',
            borderRadius: '12px',
            color: habit.frequency === 'daily' ? '#1e40af' : '#92400e'
          }}>
            {habit.frequency}
          </span>
          <span>🔥 {streak} day{streak !== 1 ? 's' : ''} streak</span>
          <span>✅ {habit.completions.length} total completions</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={handleComplete}
          disabled={isCompletedToday}
          style={{
            padding: '8px 16px',
            background: isCompletedToday ? '#d1fae5' : '#3b82f6',
            color: isCompletedToday ? '#065f46' : 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: isCompletedToday ? 'default' : 'pointer',
            transition: 'background 0.2s'
          }}
        >
          {isCompletedToday ? '✓ Done Today' : 'Complete'}
        </button>
        <button
          onClick={handleDelete}
          style={{
            padding: '8px 12px',
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
          title="Delete habit"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// HabitList Component - Display all habits
// ============================================================================

function HabitList() {
  const { habits, updateHabit, deleteHabit } = useHabits();
  const emit = useEmitSignal();

  const handleComplete = (habitId: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Update habit in context
    updateHabit(habitId, (habit: Habit) => {
      // Add today's date to completions if not already there
      if (!habit.completions.includes(today)) {
        return {
          ...habit,
          completions: [...habit.completions, today]
        };
      }
      return habit;
    });
    
    // Emit to Graph-OS (even if storage doesn't use it)
    console.log('📤 Emitting HABIT.COMPLETE:', { habitId, date: today });
    emit('HABIT.COMPLETE', { habitId, date: today });
  };

  const handleDelete = (habitId: string) => {
    // Delete from context
    deleteHabit(habitId);
    
    // Emit to Graph-OS
    console.log('📤 Emitting HABIT.DELETE:', { habitId });
    emit('HABIT.DELETE', { habitId });
  };

  if (habits.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px',
        color: '#9ca3af',
        background: '#f9fafb',
        borderRadius: '8px'
      }}>
        <p style={{ fontSize: '48px', margin: '0 0 16px' }}>📝</p>
        <p style={{ margin: 0 }}>No habits yet. Add your first habit above!</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
        Your Habits ({habits.length})
      </h3>
      {habits.map(habit => (
        <HabitCard
          key={habit.id}
          habit={habit}
          onComplete={handleComplete}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function calculateStreak(completions: string[], frequency: 'daily' | 'weekly'): number {
  if (completions.length === 0) return 0;

  const sortedDates = [...completions].sort().reverse();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let checkDate = new Date(today);

  for (const dateStr of sortedDates) {
    const completionDate = new Date(dateStr);
    completionDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((checkDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (diffDays === 1 && streak > 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// ============================================================================
// Main Application
// ============================================================================

function App() {
  return (
    <RuntimeProvider cartridgeUrl="/cartridges/root.cartridge.json">
      <HabitsProvider>
        <div style={{ 
          padding: '40px', 
          maxWidth: '800px', 
          margin: '0 auto', 
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#ffffff',
          minHeight: '100vh'
        }}>
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ 
              fontSize: '32px', 
              marginBottom: '8px',
              color: '#111827',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '36px' }}>🎯</span>
              Habit Tracker
            </h1>
            <p style={{ 
              color: '#6b7280', 
              marginBottom: '0',
              fontSize: '16px'
            }}>
              Build better habits, one day at a time. Powered by Graph-OS signal-first architecture.
            </p>
          </div>

          {/* Status Banner */}
          <div style={{ 
            background: '#d1fae5', 
            border: '1px solid #10b981', 
            padding: '12px 16px', 
            borderRadius: '6px', 
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚡</span>
            <strong style={{ color: '#065f46' }}>Isomorphic Engine Running</strong>
            <span style={{ color: '#047857' }}>
              — Signal flow processing in browser
            </span>
          </div>

          {/* Main Content */}
          <HabitForm />
          <HabitList />
        </div>
      </HabitsProvider>
    </RuntimeProvider>
  );
}

export default App;
