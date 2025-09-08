import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      _id: string
      name: string
      email: string
      role: string
    }
  }

  interface User {
    _id: string
    name: string
    email: string
    role: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    _id: string
    role: string
  }
}
