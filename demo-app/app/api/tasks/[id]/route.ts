import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getUserId() {
  const token = cookies().get('auth')?.value
  if (!token) return null
  try {
    const payload = await verifyToken(token)
    return payload.userId
  } catch {
    return null
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const task = await prisma.task.findFirst({ where: { id: Number(params.id), userId } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      ...('completed' in body
        ? {
            completed: body.completed,
            completedAt: body.completed ? new Date() : null,
          }
        : {}),
      ...('title' in body ? { title: body.title } : {}),
      ...('description' in body ? { description: body.description } : {}),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const task = await prisma.task.findFirst({ where: { id: Number(params.id), userId } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.task.delete({ where: { id: task.id } })
  return NextResponse.json({ ok: true })
}
