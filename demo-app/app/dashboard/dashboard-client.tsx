'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Task = {
  id: number
  title: string
  description: string | null
  completed: boolean
  createdAt: string
  completedAt: string | null
}

function computeStats(tasks: Task[], mode: 'today' | 'alltime') {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const relevant = mode === 'today'
    ? tasks.filter((t) => new Date(t.createdAt) >= todayStart || (t.completedAt && new Date(t.completedAt) >= todayStart))
    : tasks

  const total = relevant.length
  const completed = mode === 'today'
    ? tasks.filter((t) => t.completedAt && new Date(t.completedAt) >= todayStart).length
    : tasks.filter((t) => t.completed).length

  const rate = total === 0 ? 0 : Math.round((completed / total) * 100)

  // streak: consecutive days with at least one completion
  let streak = 0
  const check = new Date(todayStart)
  while (true) {
    const dayEnd = new Date(check.getTime() + 24 * 60 * 60 * 1000)
    const hasCompletion = tasks.some(
      (t) => t.completedAt && new Date(t.completedAt) >= check && new Date(t.completedAt) < dayEnd
    )
    if (!hasCompletion) break
    streak++
    check.setDate(check.getDate() - 1)
  }

  return { total: mode === 'today' ? tasks.filter((t) => new Date(t.createdAt) >= todayStart).length : tasks.length, completed, rate, streak }
}

export default function DashboardClient({
  initialTasks,
  email,
}: {
  initialTasks: Task[]
  email: string
}) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [statsMode, setStatsMode] = useState<'today' | 'alltime'>('today')
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [, startTransition] = useTransition()

  const stats = computeStats(tasks, statsMode)

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAdding(true)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim() || null }),
    })
    if (res.ok) {
      const task = await res.json()
      setTasks((prev) => [task, ...prev])
      setNewTitle('')
      setNewDesc('')
      setShowForm(false)
    }
    setAdding(false)
  }

  async function toggleTask(task: Task) {
    const updated = { ...task, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed }),
    })
    startTransition(() => router.refresh())
  }

  async function deleteTask(id: number) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">TaskFlow</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">{email}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Stats section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Overview</h2>
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              <button
                onClick={() => setStatsMode('today')}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                  statsMode === 'today'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setStatsMode('alltime')}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                  statsMode === 'alltime'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All Time
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Tasks" value={stats.total} />
            <StatCard label={statsMode === 'today' ? 'Completed Today' : 'Completed'} value={stats.completed} />
            <StatCard label="Completion Rate" value={`${stats.rate}%`} />
            <StatCard label="Current Streak" value={`${stats.streak}d`} />
          </div>
        </div>

        {/* Task list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Tasks</h2>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {showForm ? 'Cancel' : '+ Add task'}
            </button>
          </div>

          {showForm && (
            <form
              onSubmit={addTask}
              className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-3"
            >
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Task title"
                required
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                >
                  {adding ? 'Adding…' : 'Add task'}
                </button>
              </div>
            </form>
          )}

          {tasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-400 text-sm">No tasks yet. Add your first one above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(task)}
                  onDelete={() => deleteTask(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-start gap-3 group">
      <button
        onClick={onToggle}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          task.completed
            ? 'bg-blue-500 border-blue-500'
            : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        {task.completed && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>
        )}
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all ml-2 flex-shrink-0"
        aria-label="Delete task"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}
