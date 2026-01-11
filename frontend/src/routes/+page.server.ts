import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ fetch, url }) => {
  // Skip redirect check if already on setup page or other special routes
  if (url.pathname === '/setup' || url.pathname.startsWith('/login') || url.pathname.startsWith('/admin') || url.pathname.startsWith('/api')) {
    // Continue with normal page load - return empty object to let client-side load handle it
    return {};
  }

  // Check if we should redirect to setup page
  try {
    const BACKEND_URL = env.BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${BACKEND_URL}/api/init/check-default-password`);
    
    if (response.ok) {
      const setupData = await response.json();
      
      if (setupData.showLandingPage) {
        throw redirect(302, '/setup');
      }
    }
  } catch (err) {
    // If it's a redirect, re-throw it
    if (err && typeof err === 'object' && 'status' in err && err.status === 302) {
      throw err;
    }
    // Otherwise, continue with normal page load
    console.warn('Failed to check setup status, continuing with normal load:', err);
  }

  // Return empty object to let client-side load handle the rest
  return {};
};
