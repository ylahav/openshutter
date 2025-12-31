// Type declarations for next-auth (import not needed for type-only declarations)
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
