'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface OwnerGuardProps {
  children: React.ReactNode
}

export default function OwnerGuard({ children }: OwnerGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      // User is not logged in, redirect to home page
      router.push('/')
      return
    }

    if (status === 'authenticated' && !['admin', 'owner'].includes((session?.user as any)?.role)) {
      // User is logged in but not admin or owner, redirect to home page
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

  // If not authenticated or not admin/owner, don't render anything (redirect will happen)
  if (status === 'unauthenticated' || !['admin', 'owner'].includes((session?.user as any)?.role)) {
    return null
  }

  // User is authenticated and is admin or owner, render the protected content
  return <>{children}</>
}
