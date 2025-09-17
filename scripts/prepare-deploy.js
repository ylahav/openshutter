/*
  Prepare a deployment zip for the Next.js standalone build.
  Contents:
  - .next/standalone/
  - .next/static/
  - public/
  - server-standalone.js
  - package.json
  - ecosystem.config.js (if exists)
  - .env.production (if exists)

  Usage:
    node scripts/prepare-deploy.js
*/

const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
const { execSync } = require('child_process')

function fileExists(p) {
  try { return fs.existsSync(p) } catch { return false }
}

function ensureBuild(projectRoot) {
  const standaloneDir = path.join(projectRoot, '.next', 'standalone')
  const staticDir = path.join(projectRoot, '.next', 'static')
  if (!fileExists(standaloneDir) || !fileExists(staticDir)) {
    console.log('No standalone build found. Running "pnpm build"...')
    execSync('pnpm build', { stdio: 'inherit', cwd: projectRoot })
  }
}

function createZip(projectRoot) {
  const now = new Date()
  const stamp = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
  const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD format
  const outName = `openshutter-standalone-${dateStr}-${stamp}.zip`
  const outPath = path.join(projectRoot, outName)
  const output = fs.createWriteStream(outPath)
  const archive = archiver('zip', { zlib: { level: 9 } })

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`Created ${outName} (${archive.pointer()} bytes)`) 
      resolve(outPath)
    })
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn(err.message)
      } else {
        reject(err)
      }
    })
    archive.on('error', reject)
    archive.pipe(output)

    // Add required directories/files, preserving layout (FULL .next copy)
    const entries = [
      { type: 'dir', src: path.join(projectRoot, '.next'), dest: '.next' },
      { type: 'dir', src: path.join(projectRoot, 'public'), dest: 'public', optional: true },
      { type: 'file', src: path.join(projectRoot, 'server-standalone.js'), dest: 'server-standalone.js', optional: true },
      { type: 'file', src: path.join(projectRoot, 'package.json'), dest: 'package.json' },
      { type: 'file', src: path.join(projectRoot, 'pnpm-lock.yaml'), dest: 'pnpm-lock.yaml', optional: true },
      { type: 'file', src: path.join(projectRoot, 'ecosystem.config.js'), dest: 'ecosystem.config.js', optional: true },
      { type: 'file', src: path.join(projectRoot, '.env.production'), dest: '.env.production', optional: true },
      { type: 'file', src: path.join(projectRoot, '.env'), dest: '.env', optional: true },
    ]

    // When copying full .next, we don't need to bundle node_modules

    for (const entry of entries) {
      if (entry.type === 'dir') {
        if (fileExists(entry.src)) {
          if (entry.exclude && entry.exclude.length > 0) {
            // Add directory with exclusions using glob pattern
            const globPattern = entry.exclude.map(excludeDir => `!**/${excludeDir}/**`).join(' ')
            archive.glob('**/*', { cwd: entry.src, ignore: entry.exclude.map(excludeDir => `**/${excludeDir}/**`) }, { prefix: entry.dest })
            console.log(`Added dir: ${entry.dest} (excluding: ${entry.exclude.join(', ')})`)
          } else {
            archive.directory(entry.src, entry.dest)
            console.log(`Added dir: ${entry.dest}`)
          }
        } else if (!entry.optional) {
          archive.destroy()
          return reject(new Error(`Missing required directory: ${entry.src}`))
        }
      } else {
        if (fileExists(entry.src)) {
          archive.file(entry.src, { name: entry.dest })
          console.log(`Added file: ${entry.dest}`)
        } else if (!entry.optional) {
          archive.destroy()
          return reject(new Error(`Missing required file: ${entry.src}`))
        }
      }
    }

    archive.finalize()
  })
}

async function main() {
  const projectRoot = process.cwd()
  ensureBuild(projectRoot)
  await createZip(projectRoot)
}

main().catch((err) => {
  console.error('Failed to prepare deployment zip:', err)
  process.exit(1)
})
