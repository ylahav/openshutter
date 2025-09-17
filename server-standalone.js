// Lightweight launcher to run Next.js standalone with correct working directory
// Ensures _next/static and public resolve correctly relative to server process
const path = require('path')
const fs = require('fs')
const Module = require('module')

// Load environment variables from common files at project root
function loadEnvFile(fileName) {
  try {
    const p = path.join(__dirname, fileName)
    if (!fs.existsSync(p)) return false
    const content = fs.readFileSync(p, 'utf8')
    content.split('\n').forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) return
      const key = trimmed.slice(0, eqIndex)
      const value = trimmed.slice(eqIndex + 1)
      if (key && process.env[key] == null) {
        process.env[key] = value
      }
    })
    console.log(`Loaded env file: ${fileName}`)
    return true
  } catch (_e) {
    return false
  }
}

// Priority: .env.production, .env, env.production (no dot), .env.local
loadEnvFile('.env.production') ||
  loadEnvFile('.env') ||
  loadEnvFile('env.production') ||
  loadEnvFile('.env.local')

// Default to port 4000 if not provided
if (!process.env.PORT) {
  process.env.PORT = '4000'
}

// Ensure NEXTAUTH_URL is set for proper logout redirects
if (!process.env.NEXTAUTH_URL) {
  // Try to detect the domain from the request or use a default
  process.env.NEXTAUTH_URL = 'https://yairl.com'
  console.log('Set default NEXTAUTH_URL to:', process.env.NEXTAUTH_URL)
}

// Define paths
const standaloneDir = path.join(__dirname, '.next', 'standalone')
const staticSource = path.join(__dirname, '.next', 'static')
const standaloneNextDir = path.join(standaloneDir, '.next')
const staticLink = path.join(standaloneNextDir, 'static')
const publicSource = path.join(__dirname, 'public')
const publicLink = path.join(standaloneDir, 'public')

// Set Next.js environment variables for standalone
process.env.NEXT_RUNTIME = 'nodejs'
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = '1'

// Debug: Check if build exists
const buildIdPath = path.join(standaloneDir, '.next', 'BUILD_ID')
if (fs.existsSync(buildIdPath)) {
  const buildId = fs.readFileSync(buildIdPath, 'utf8').trim()
  console.log('Found build ID:', buildId)
} else {
  console.warn('No BUILD_ID found in standalone directory')
}

// Ensure static and public are accessible from inside standalone dir
try {
  // Add project root node_modules as a resolution fallback for standalone server
  const rootNodeModules = path.join(__dirname, 'node_modules')
  if (fs.existsSync(rootNodeModules)) {
    if (!process.env.NODE_PATH) {
      process.env.NODE_PATH = rootNodeModules
    } else if (!process.env.NODE_PATH.includes(rootNodeModules)) {
      process.env.NODE_PATH = `${rootNodeModules}${path.delimiter}${process.env.NODE_PATH}`
    }
    Module._initPaths()
  }

  // Ensure standalone/.next exists
  if (!fs.existsSync(standaloneNextDir)) {
    fs.mkdirSync(standaloneNextDir, { recursive: true })
  }
  if (fs.existsSync(staticSource) && !fs.existsSync(staticLink)) {
    try {
      // Use junction on Windows for directories; symlink for others
      fs.symlinkSync(staticSource, staticLink, process.platform === 'win32' ? 'junction' : 'dir')
    } catch (e) {
      // Fallback: copy the directory if symlink fails (e.g., no elevation on Windows)
      if (fs.cpSync) {
        fs.cpSync(staticSource, staticLink, { recursive: true })
      }
    }
  }
} catch (e) {
  // Non-fatal; server may still resolve via relative paths
}

try {
  if (fs.existsSync(publicSource)) {
    // Remove existing link/directory if it exists
    if (fs.existsSync(publicLink)) {
      const stat = fs.lstatSync(publicLink)
      if (stat.isSymbolicLink() || stat.isDirectory()) {
        fs.rmSync(publicLink, { recursive: true, force: true })
      }
    }
    
    try {
      // Try symlink first
      fs.symlinkSync(publicSource, publicLink, process.platform === 'win32' ? 'junction' : 'dir')
      console.log(`Created symlink: ${publicSource} -> ${publicLink}`)
    } catch (e) {
      console.warn(`Symlink failed: ${e.message}. Copying directory instead.`)
      if (fs.cpSync) {
        fs.cpSync(publicSource, publicLink, { recursive: true, dereference: true })
        console.log(`Copied directory: ${publicSource} -> ${publicLink}`)
      } else {
        console.error(`fs.cpSync not available. Cannot copy ${publicSource}`)
      }
    }
  } else {
    console.warn(`Public source not found: ${publicSource}`)
  }
} catch (e) {
  console.error(`Failed to setup public directory: ${e.message}`)
}
// Change to standalone directory and start the server
process.chdir(standaloneDir)

// Start the standalone server
require(path.join(standaloneDir, 'server.js'))
