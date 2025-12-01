'use client'

// Re-export next-auth/react functions with a workaround for Turbopack HMR
// The issue occurs when modules are dynamically loaded via require.context
// By importing here first and then re-exporting, we ensure Turbopack tracks the module
// and prevents "module factory not available" errors during HMR updates

// Import the entire module to ensure it's in the bundle
import * as NextAuthReact from 'next-auth/react'

// Re-export the functions we need
export const useSession = NextAuthReact.useSession
export const signOut = NextAuthReact.signOut
export const getSession = NextAuthReact.getSession
export const signIn = NextAuthReact.signIn
export type { Session } from 'next-auth'
