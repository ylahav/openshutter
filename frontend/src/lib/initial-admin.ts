// Initial admin user configuration
// This should be changed after first login in production

export const INITIAL_ADMIN_CREDENTIALS = {
  email: 'admin@openshutter.org',
  password: 'admin123!',
  name: 'System Administrator',
  role: 'admin' as const
}

export const INITIAL_ADMIN_USER = {
  _id: 'initial-admin',
  email: INITIAL_ADMIN_CREDENTIALS.email,
  name: INITIAL_ADMIN_CREDENTIALS.name,
  role: INITIAL_ADMIN_CREDENTIALS.role,
  avatar: undefined,
  createdAt: new Date(),
  updatedAt: new Date()
}

// Function to check if credentials match initial admin
export function isInitialAdmin(email: string, password: string): boolean {
  return email === INITIAL_ADMIN_CREDENTIALS.email && 
         password === INITIAL_ADMIN_CREDENTIALS.password
}

// Function to get initial admin user data
export function getInitialAdminUser() {
  return INITIAL_ADMIN_USER
}

// Check if this is the first time running the system
export function isFirstRun(): boolean {
  // NOTE: Currently always returns true to allow initial admin access.
  // Future enhancement: Query backend API to check if any users exist in database.
  // This would require a GET /api/admin/users/count endpoint or similar.
  return true
}
