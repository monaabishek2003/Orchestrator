import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  await prisma.task.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('password123', 10)
  const user = await prisma.user.create({
    data: { email: 'demo@example.com', passwordHash },
  })

  const now = new Date()
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)

  await prisma.task.createMany({
    data: [
      {
        title: 'Set up project repository',
        description: 'Initialize git repo, configure CI, add README',
        completed: true,
        completedAt: twoDaysAgo,
        userId: user.id,
        createdAt: twoDaysAgo,
      },
      {
        title: 'Design database schema',
        description: 'Define models for users, tasks, and relations',
        completed: true,
        completedAt: oneDayAgo,
        userId: user.id,
        createdAt: twoDaysAgo,
      },
      {
        title: 'Implement authentication',
        description: 'JWT-based login and registration with bcrypt',
        completed: true,
        completedAt: now,
        userId: user.id,
        createdAt: oneDayAgo,
      },
      {
        title: 'Build task management UI',
        description: 'CRUD interface for tasks with real-time updates',
        completed: false,
        userId: user.id,
        createdAt: oneDayAgo,
      },
      {
        title: 'Add stats dashboard',
        description: 'Completion rate, streak tracking, today vs all-time toggle',
        completed: false,
        userId: user.id,
        createdAt: now,
      },
    ],
  })

  console.log('Seeded: demo@example.com / password123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
