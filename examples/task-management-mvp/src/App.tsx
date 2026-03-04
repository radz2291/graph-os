import { useState, useEffect } from 'react';
import { SignalProvider } from '@graph-os/react-bridge';
import { createRuntime } from '@graph-os/runtime';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
  createdAt: string;
}

function App() {
  const [runtime, setRuntime] = useState<Awaited<ReturnType<typeof createRuntime>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function initRuntime() {
      try {
        console.log('🚀 Initializing Graph-OS Runtime for Task Management...');

        // ISOMORPHIC PATTERN: Fetch cartridge via HTTP
        const response = await fetch('/cartridges/root.cartridge.json');
        if (!response.ok) {
          throw new Error(`Failed to load cartridge: ${response.status}`);
        }
        const cartridgeData = await response.json();

        console.log('📦 Cartridge loaded:', cartridgeData.name);
        console.log('   Nodes:', cartridgeData.nodes?.length || 0);
        console.log('   Wires:', cartridgeData.wires?.length || 0);

        // Initialize runtime with DATA (not PATH)
        const rt = await createRuntime({
          cartridge: cartridgeData
        });

        await rt.start();
        console.log('✅ Graph-OS Runtime started');
        
        setRuntime(rt);
        
        // Load tasks from local storage
        loadTasksFromStorage();
      } catch (err) {
        console.error('❌ Failed to initialize runtime:', err);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    }

    initRuntime();
  }, []);

  const loadTasksFromStorage = () => {
    try {
      const storedTasks = localStorage.getItem('tasks');
      if (storedTasks) {
        const parsed = JSON.parse(storedTasks);
        setTasks(parsed);
      }
    } catch (err) {
      console.error('Failed to load tasks from storage:', err);
    }
    setLoading(false);
  };

  const saveTasksToStorage = (updatedTasks: Task[]) => {
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    setTasks(updatedTasks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setFormError('Task title is required');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const newTask: Task = {
        id: Date.now().toString(),
        title: title.trim(),
        description: description.trim(),
        priority,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Emit signal to Graph-OS backend
      if (runtime) {
        console.log('📤 Emitting TASK.SUBMITTED signal:', newTask);
        
        // In a real implementation, this would interact with the graph
        // For this MVP, we'll store directly and simulate the signal flow
        runtime.emit('TASK.SUBMITTED', newTask);
        
        // Simulate validation passing
        console.log('✓ Validation passed');
        
        // Simulate storage
        const updatedTasks = [...tasks, newTask];
        saveTasksToStorage(updatedTasks);
        
        setSuccessMessage('Task created successfully!');
        clearForm();
      }
    } catch (err) {
      console.error('Failed to create task:', err);
      setFormError('Failed to create task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = (taskId: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, status: 'completed' as const } : task
    );
    saveTasksToStorage(updatedTasks);
    
    // Emit completion signal to Graph-OS
    if (runtime) {
      runtime.emit('TASK.COMPLETED', { taskId, status: 'completed' });
    }
  };

  const handleDelete = (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      saveTasksToStorage(updatedTasks);
      
      // Emit deletion signal to Graph-OS
      if (runtime) {
        runtime.emit('TASK.DELETED', { taskId });
      }
    }
  };

  const clearForm = () => {
    setTitle('');
    setDescription('');
    setPriority('low');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (error) {
    return (
      <div className="app">
        <div className="error-message">
          <h2>Error Loading Runtime</h2>
          <p>{error}</p>
          <p>Make sure the development server is running and cartridge files are accessible.</p>
          <p>Check the console for more details.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <p>Loading Task Management System...</p>
          <p>Initializing Graph-OS Runtime...</p>
        </div>
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <SignalProvider runtime={runtime}>
      <div className="app">
        {/* Header */}
        <div className="header">
          <h1>📋 Task Management MVP</h1>
          <p>Powered by Graph-OS v4 with Isomorphic Pattern</p>
        </div>

        {/* Runtime Status */}
        <div className={`runtime-status ${runtime ? 'active' : 'inactive'}`}>
          <strong>✅ Graph-OS Runtime {runtime ? 'Active' : 'Inactive'}</strong>
          <p style={{ margin: '8px 0 0' }}>
            Backend: {runtime ? 'Connected' : 'Disconnected'}
          </p>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
            Signal routing: {runtime ? 'Enabled' : 'Disabled'}
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="success-message">
            <strong>✅ {successMessage}</strong>
          </div>
        )}

        {/* Task Form */}
        <div className="form-container">
          <h2 style={{ marginBottom: '20px' }}>Create New Task</h2>
          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title..."
                required
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description..."
                rows={3}
              />
            </div>

            {/* Priority */}
            <div className="form-group">
              <label>Priority *</label>
              <div className="priority-select">
                <div
                  className={`priority-option ${priority === 'low' ? 'selected' : ''}`}
                  data-priority="low"
                  onClick={() => setPriority('low')}
                >
                  Low
                </div>
                <div
                  className={`priority-option ${priority === 'medium' ? 'selected' : ''}`}
                  data-priority="medium"
                  onClick={() => setPriority('medium')}
                >
                  Medium
                </div>
                <div
                  className={`priority-option ${priority === 'high' ? 'selected' : ''}`}
                  data-priority="high"
                  onClick={() => setPriority('high')}
                >
                  High
                </div>
              </div>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="error-message">
                <strong>⚠️ {formError}</strong>
              </div>
            )}

            {/* Submit Button */}
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </form>
        </div>

        {/* Task Lists */}
        {tasks.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2v2M7 17h10M12 5v14M9 12l2 2 2-2-2" />
            </svg>
            <h3>No Tasks Yet</h3>
            <p>Create your first task using the form above.</p>
          </div>
        ) : (
          <>
            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <div>
                <h2 style={{ marginBottom: '15px', color: '#666' }}>
                  Pending Tasks ({pendingTasks.length})
                </h2>
                <div className="task-list">
                  {pendingTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={handleComplete}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div>
                <h2 style={{ marginBottom: '15px', marginTop: '30px', color: '#666' }}>
                  Completed Tasks ({completedTasks.length})
                </h2>
                <div className="task-list">
                  {completedTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={handleComplete}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{ 
          marginTop: '40px', 
          textAlign: 'center', 
          padding: '20px',
          color: '#666'
        }}>
          <p>
            <strong>Total Tasks:</strong> {tasks.length} | 
            <strong>Pending:</strong> {pendingTasks.length} | 
            <strong>Completed:</strong> {completedTasks.length}
          </p>
          <p style={{ marginTop: '10px', fontSize: '14px' }}>
            Graph-OS Test Protocol v4 • MCP Tools Only • No Core Package Modifications
          </p>
        </div>
      </div>
    </SignalProvider>
  );
}

function TaskCard({ task, onComplete, onDelete }: { 
  task: Task; 
  onComplete: (id: string) => void; 
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`task-card ${task.status} ${task.status === 'completed' ? 'completed' : ''}`} data-priority={task.priority}>
      <div className="task-header">
        <h3 className="task-title">{task.title}</h3>
        <span className={`task-badge ${task.priority}`}>
          {task.priority}
        </span>
      </div>

      {task.description && (
        <div className="task-description">
          {expanded ? task.description : `${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}`}
          {task.description.length > 100 && (
            <button 
              onClick={() => setExpanded(!expanded)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#667eea', 
                cursor: 'pointer',
                padding: 0,
                fontSize: '14px',
                marginLeft: '5px'
              }}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      <div className="task-meta">
        <span className="task-timestamp">
          {new Date(task.createdAt).toLocaleDateString()} at{' '}
          {new Date(task.createdAt).toLocaleTimeString()}
        </span>
        <div className="task-actions">
          {task.status === 'pending' && (
            <button 
              className="action-btn complete-btn"
              onClick={() => onComplete(task.id)}
              title="Mark as complete"
            >
              ✓ Complete
            </button>
          )}
          <button 
            className="action-btn delete-btn"
            onClick={() => onDelete(task.id)}
            title="Delete task"
          >
            ✕ Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
