'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AdminGuardProps {
  children: React.ReactNode
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      // User is not logged in, redirect to home page
      router.push('/')
      return
    }

    if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      // User is logged in but not admin, redirect to home page
      router.push('/')
      return
    }
  }, [status, session, router])

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // If not authenticated or not admin, don't render anything (redirect will happen)
  if (status === 'unauthenticated' || (session?.user as any)?.role !== 'admin') {
    return null
  }

  // User is authenticated and is admin, render the protected content
  return <>{children}</>
}
