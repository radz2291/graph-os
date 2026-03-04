import { useState, useEffect } from 'react';
import { SignalProvider, useEmitSignal } from '@graph-os/react-bridge';
import { createRuntime } from '@graph-os/runtime';

// Types
interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
  createdAt: string;
}

interface Habit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  streakCount: number;
  lastCheckIn: string | null;
  createdAt: string;
}

interface Goal {
  id: string;
  title: string;
  deadline: string;
  target: number;
  progress: number;
  status: 'active' | 'achieved';
  createdAt: string;
  achievedAt: string | null;
}

// Tab component
function App() {
  const [runtime, setRuntime] = useState<Awaited<ReturnType<typeof createRuntime>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'habits' | 'goals'>('tasks');

  useEffect(() => {
    async function initRuntime() {
      try {
        console.log('🚀 Initializing Life Manager with Graph-OS...');

        // ISOMORPHIC PATTERN: Fetch cartridge via HTTP
        const response = await fetch('/cartridges/root.cartridge.json');
        if (!response.ok) {
          throw new Error(`Failed to load cartridge: ${response.status}`);
        }
        const cartridgeData = await response.json();

        console.log('📦 Cartridge loaded:', cartridgeData.name);

        // Initialize runtime with DATA
        const rt = await createRuntime({
          cartridge: cartridgeData
        });

        await rt.start();
        console.log('✅ Graph-OS Runtime started');
        
        // Emit app ready signal
        rt.emit('APP.READY', { timestamp: new Date().toISOString() });
        
        setRuntime(rt);
      } catch (err) {
        console.error('❌ Failed to initialize runtime:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    initRuntime();
  }, []);

  if (error) {
    return (
      <div className="app">
        <div className="error-message">
          <h2>Error Loading Runtime</h2>
          <p>{error}</p>
          <p>Make sure the development server is running and cartridge files are accessible.</p>
        </div>
      </div>
    );
  }

  if (!runtime) {
    return (
      <div className="app">
        <div className="loading">
          <p>Loading Life Manager...</p>
          <p>Initializing Graph-OS Runtime...</p>
        </div>
      </div>
    );
  }

  return (
    <SignalProvider runtime={runtime}>
      <div className="app">
        <header className="app-header">
          <h1>🌱 Life Manager</h1>
          <p>Powered by Graph-OS Signal Architecture</p>
        </header>

        <nav className="app-nav">
          <button 
            className={activeTab === 'tasks' ? 'active' : ''} 
            onClick={() => setActiveTab('tasks')}
          >
            📋 Tasks
          </button>
          <button 
            className={activeTab === 'habits' ? 'active' : ''} 
            onClick={() => setActiveTab('habits')}
          >
            🔄 Habits
          </button>
          <button 
            className={activeTab === 'goals' ? 'active' : ''} 
            onClick={() => setActiveTab('goals')}
          >
            🎯 Goals
          </button>
        </nav>

        <main className="app-main">
          {activeTab === 'tasks' && <TasksView />}
          {activeTab === 'habits' && <HabitsView />}
          {activeTab === 'goals' && <GoalsView />}
        </main>
      </div>
    </SignalProvider>
  );
}

// Tasks View Component
function TasksView() {
  const emitSignal = useEmitSignal();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low');

  useEffect(() => {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) setTasks(JSON.parse(storedTasks));
  }, []);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      priority,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Emit signal to Graph-OS backend
    emitSignal('TASK.CREATE', newTask);

    // Store locally (simulating backend storage)
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));

    // Reset form
    setTitle('');
    setDescription('');
    setPriority('low');
  };

  const toggleComplete = (taskId: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId 
        ? { ...task, status: task.status === 'pending' ? 'completed' : 'pending' }
        : task
    );
    setTasks(updatedTasks);
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));

    const task = updatedTasks.find(t => t.id === taskId);
    if (task?.status === 'completed') {
      emitSignal('TASK.COMPLETE', { taskId });
    }
  };

  const deleteTask = (taskId: string) => {
    if (!window.confirm('Delete this task?')) return;
    
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    setTasks(updatedTasks);
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    
    emitSignal('TASK.DELETE', { taskId });
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="view">
      <div className="form-card">
        <h2>Create New Task</h2>
        <form onSubmit={handleCreateTask}>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task title..."
            className="input-field"
            required
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description..."
            className="textarea-field"
            rows={3}
          />
          <div className="priority-selector">
            {(['low', 'medium', 'high'] as const).map(p => (
              <button
                key={p}
                type="button"
                className={`priority-btn ${priority === p ? 'active' : ''}`}
                onClick={() => setPriority(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <button type="submit" className="submit-btn">Create Task</button>
        </form>
      </div>

      <div className="list-section">
        <h3>Pending ({pendingTasks.length})</h3>
        {pendingTasks.map(task => (
          <TaskCard key={task.id} task={task} onToggle={toggleComplete} onDelete={deleteTask} />
        ))}

        {completedTasks.length > 0 && (
          <>
            <h3>Completed ({completedTasks.length})</h3>
            {completedTasks.map(task => (
              <TaskCard key={task.id} task={task} onToggle={toggleComplete} onDelete={deleteTask} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// Habit View Component
function HabitsView() {
  const emitSignal = useEmitSignal();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    const storedHabits = localStorage.getItem('habits');
    if (storedHabits) setHabits(JSON.parse(storedHabits));
  }, []);

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newHabit: Habit = {
      id: Date.now().toString(),
      name: name.trim(),
      frequency,
      streakCount: 0,
      lastCheckIn: null,
      createdAt: new Date().toISOString()
    };

    emitSignal('HABIT.CREATE', newHabit);

    const updatedHabits = [...habits, newHabit];
    setHabits(updatedHabits);
    localStorage.setItem('habits', JSON.stringify(updatedHabits));

    setName('');
  };

  const handleCheckIn = (habitId: string) => {
    const updatedHabits = habits.map(habit => {
      if (habit.id !== habitId) return habit;
      
      const today = new Date().toDateString();
      const lastCheckIn = habit.lastCheckIn ? new Date(habit.lastCheckIn).toDateString() : null;
      const isConsecutive = lastCheckIn === new Date(Date.now() - 86400000).toDateString();
      
      return {
        ...habit,
        streakCount: isConsecutive ? habit.streakCount + 1 : 1,
        lastCheckIn: new Date().toISOString()
      };
    });

    setHabits(updatedHabits);
    localStorage.setItem('habits', JSON.stringify(updatedHabits));
    
    emitSignal('HABIT.CHECK_IN', { habitId });
  };

  return (
    <div className="view">
      <div className="form-card">
        <h2>Create New Habit</h2>
        <form onSubmit={handleCreateHabit}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Habit name..."
            className="input-field"
            required
          />
          <select
            value={frequency}
            onChange={e => setFrequency(e.target.value as typeof frequency)}
            className="input-field"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button type="submit" className="submit-btn">Create Habit</button>
        </form>
      </div>

      <div className="list-section">
        {habits.map(habit => (
          <div key={habit.id} className="card">
            <h4>{habit.name}</h4>
            <span className="badge">{habit.frequency}</span>
            <div className="streak-display">
              🔥 {habit.streakCount} day streak
            </div>
            <button onClick={() => handleCheckIn(habit.id)} className="check-in-btn">
              Check In
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Goal View Component
function GoalsView() {
  const emitSignal = useEmitSignal();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [target, setTarget] = useState('');

  useEffect(() => {
    const storedGoals = localStorage.getItem('goals');
    if (storedGoals) setGoals(JSON.parse(storedGoals));
  }, []);

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;

    const newGoal: Goal = {
      id: Date.now().toString(),
      title: title.trim(),
      deadline,
      target: parseInt(target) || 100,
      progress: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      achievedAt: null
    };

    emitSignal('GOAL.CREATE', newGoal);

    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    localStorage.setItem('goals', JSON.stringify(updatedGoals));

    setTitle('');
    setDeadline('');
    setTarget('');
  };

  const handleAchieve = (goalId: string) => {
    const updatedGoals = goals.map(goal =>
      goal.id === goalId
        ? { ...goal, status: 'achieved' as const, achievedAt: new Date().toISOString() }
        : goal
    );
    setGoals(updatedGoals);
    localStorage.setItem('goals', JSON.stringify(updatedGoals));
    
    emitSignal('GOAL.ACHIEVE', { goalId });
  };

  return (
    <div className="view">
      <div className="form-card">
        <h2>Create New Goal</h2>
        <form onSubmit={handleCreateGoal}>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Goal title..."
            className="input-field"
            required
          />
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="input-field"
            required
          />
          <input
            type="number"
            value={target}
            onChange={e => setTarget(e.target.value)}
            placeholder="Target (e.g., 100)..."
            className="input-field"
            required
          />
          <button type="submit" className="submit-btn">Create Goal</button>
        </form>
      </div>

      <div className="list-section">
        {goals.map(goal => (
          <div key={goal.id} className={`card ${goal.status}`}>
            <h4>{goal.title}</h4>
            <p className="goal-deadline">Deadline: {new Date(goal.deadline).toLocaleDateString()}</p>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(goal.progress / goal.target) * 100}%` }}
              />
            </div>
            <div className="goal-stats">
              <span>{goal.progress} / {goal.target}</span>
              {goal.status === 'active' && (
                <button onClick={() => handleAchieve(goal.id)} className="achieve-btn">
                  Mark Achieved
                </button>
              )}
            </div>
            {goal.status === 'achieved' && (
              <div className="achieved-badge">✅ Achieved!</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Task Card Component
function TaskCard({ task, onToggle, onDelete }: { 
  task: Task; 
  onToggle: (id: string) => void; 
  onDelete: (id: string) => void;
}) {
  const priorityColors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444'
  };

  return (
    <div className={`card ${task.status}`}>
      <h4 className={task.status === 'completed' ? 'completed-text' : ''}>
        {task.title}
      </h4>
      {task.description && <p className="description">{task.description}</p>}
      <div className="card-meta">
        <span 
          className="priority-badge" 
          style={{ background: priorityColors[task.priority] }}
        >
          {task.priority}
        </span>
        <span className="timestamp">
          {new Date(task.createdAt).toLocaleDateString()}
        </span>
      </div>
      <div className="card-actions">
        <button onClick={() => onToggle(task.id)} className="toggle-btn">
          {task.status === 'pending' ? '✓ Complete' : '↩ Undo'}
        </button>
        <button onClick={() => onDelete(task.id)} className="delete-btn">
          Delete
        </button>
      </div>
    </div>
  );
}

export default App;
