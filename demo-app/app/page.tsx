import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export default async function Home() {
  const token = cookies().get('auth')?.value
  if (token) {
    try {
      await verifyToken(token)
      redirect('/dashboard')
    } catch {
      // fall through to login
    }
  }
  redirect('/login')
}
