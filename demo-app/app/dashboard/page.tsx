import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const token = cookies().get('auth')?.value
  if (!token) redirect('/login')

  let userId: number
  let email: string
  try {
    const payload = await verifyToken(token)
    userId = payload.userId
    email = payload.email
  } catch {
    redirect('/login')
  }

  const tasks = await prisma.task.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  return <DashboardClient initialTasks={tasks} email={email} />
}
