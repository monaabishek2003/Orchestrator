export type TicketScript = {
  role: 'backend' | 'frontend';
  agentName: string;
  steps: string[];
  needsInput?: {
    question: string;
    afterAnswer: string[];
  };
};

export const DEMO_SCRIPTS: Record<number, TicketScript> = {
  1: {
    role: 'backend',
    agentName: 'Backend Agent',
    steps: [
      'Reading PRD requirements for authentication...',
      'Designing User table schema: id, email, passwordHash, createdAt',
      'Setting up Prisma schema with User model and unique email constraint',
      'Generating migration: 20240101_add_users_table',
      'Adding bcrypt dependency for password hashing',
      'Creating seed script with test user: demo@example.com',
      'Auth data model complete. User table ready.',
    ],
  },

  2: {
    role: 'backend',
    agentName: 'Backend Agent',
    steps: [
      'Scaffolding Express router for /api/auth and /api/tasks...',
      'Implementing POST /api/auth/register — validate email, hash password, create user',
      'Implementing POST /api/auth/login — verify credentials, return JWT token',
      'Implementing GET /api/tasks — fetch tasks for authenticated user',
      'Implementing POST /api/tasks — create task with title, description, userId',
      'Implementing PATCH /api/tasks/:id — toggle completion status',
      'Implementing DELETE /api/tasks/:id — soft delete with ownership check',
      'Adding JWT middleware for protected routes. All API routes complete.',
    ],
  },

  3: {
    role: 'frontend',
    agentName: 'Frontend Agent',
    steps: [
      'Creating Next.js app layout with Tailwind configuration...',
      'Building LoginForm component: email + password fields, submit handler',
      'Building RegisterForm component: email + password + confirm password',
      'Adding client-side validation: email format, password minimum 8 chars',
      'Implementing auth context provider with JWT token storage',
      'Adding protected route wrapper — redirect to /login if no token',
      'Auth UI complete. Login and register pages ready.',
    ],
  },

  4: {
    role: 'frontend',
    agentName: 'Frontend Agent',
    steps: [
      'Analyzing PRD for dashboard requirements...',
      'Setting up dashboard page layout with stat cards grid',
      'Building StatCard component with label, value, and trend icon',
      'Implementing API call to fetch task statistics...',
    ],
    needsInput: {
      question:
        "The PRD mentions a 'stats dashboard' but doesn't specify the time range. Should the dashboard show stats for today only, all-time totals, or both? This affects the API query and the UI layout.",
      afterAnswer: [
        'Got it — building toggle between daily and all-time views',
        'Adding date filter logic to stats API query',
        'Rendering stat cards: Total Tasks, Completed Today, Completion Rate, Streak',
        'Stats dashboard complete with daily/all-time toggle.',
      ],
    },
  },

  5: {
    role: 'frontend',
    agentName: 'Frontend Agent',
    steps: [
      'Creating TaskList component with real-time task display...',
      'Building AddTaskForm: title input, description textarea, submit button',
      'Implementing optimistic UI updates on task creation',
      'Adding checkbox toggle for task completion with strikethrough animation',
      'Implementing swipe-to-delete with confirmation dialog',
      "Adding empty state: illustration + 'Create your first task' prompt",
      'Task CRUD UI complete. All interactions wired to API.',
    ],
  },

  6: {
    role: 'backend',
    agentName: 'Backend Agent',
    steps: [
      'Running integration tests across all endpoints...',
      'Fixing CORS configuration for frontend-backend communication',
      'Adding error handling middleware for consistent API responses',
      'Connecting frontend build to Express static serving',
      'Running final smoke test: register → login → create task → complete → view stats',
      'All tests passing. Application ready for deployment.',
    ],
  },
};
