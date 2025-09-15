import 'server-only'
import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import { connectToDatabase } from '@/lib/mongodb'
import { verifyPassword, hashPassword } from '@/lib/security/password'
import { isInitialAdmin, getInitialAdminUser } from '@/lib/initial-admin'

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const { db } = await connectToDatabase()
        const users = db.collection('users')
        // Bootstrap: if no admin exists and creds match initial admin, create one
        const existingAdmin = await users.findOne({ role: 'admin' })
        if (!existingAdmin && isInitialAdmin(credentials.email, credentials.password)) {
          const initial = getInitialAdminUser()
          const passwordHash = await hashPassword(credentials.password)
          const now = new Date()
          const insert = await users.insertOne({
            name: { en: initial.name },
            username: initial.email,
            passwordHash,
            role: 'admin',
            groupAliases: [],
            blocked: false,
            createdAt: now,
            updatedAt: now,
          })
          return { id: String(insert.insertedId), name: initial.name, email: initial.email, role: 'admin' as const }
        }
        const user = await users.findOne({ username: credentials.email })
        if (!user) return null

        // Check if user is blocked
        if (user.blocked) return null

        if (!user.passwordHash) return null
        const ok = await verifyPassword(credentials.password, user.passwordHash)
        if (!ok) return null

        return {
          id: String(user._id),
          name: (user.name && (user.name.en || Object.values(user.name)[0])) || user.username,
          email: user.username,
          role: user.role || 'owner',
        } as any
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  // Note: with JWT sessions, the adapter is not required for sign-in.
  // adapter: MongoDBAdapter(async () => (await connectToDatabase()).client as any),
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Persist role and id on token
        ;(token as any).role = (user as any).role || 'owner'
        ;(token as any)._id = (user as any).id
        ;(token as any).name = (user as any).name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.sub
        ;(session.user as any)._id = (token as any)._id
        ;(session.user as any).role = (token as any).role || 'owner'
        ;(session.user as any).name = (token as any).name || session.user.name
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
