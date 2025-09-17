import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import archiver from 'archiver'

interface DeploymentConfig {
  domain: string
  port: number
  appName: string
  projectRoot: string
}

export async function POST(request: NextRequest) {
  try {
    const config: DeploymentConfig = await request.json()

    // Validate configuration
    if (!config.domain || config.domain === 'yourdomain.com') {
      return NextResponse.json({ error: 'Please provide a valid domain name' }, { status: 400 })
    }

    if (!config.port || config.port < 1 || config.port > 65535) {
      return NextResponse.json({ error: 'Please provide a valid port number' }, { status: 400 })
    }

    if (!config.appName || config.appName.trim() === '') {
      return NextResponse.json({ error: 'Please provide a valid app name' }, { status: 400 })
    }

    if (!config.projectRoot || config.projectRoot.trim() === '') {
      return NextResponse.json({ error: 'Please provide a valid project root path' }, { status: 400 })
    }

    // Check if .next directory exists, if not build it
    const nextDir = join(process.cwd(), '.next')
    if (!existsSync(nextDir)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Building Next.js application...')
      }
      try {
        execSync('pnpm build', { stdio: 'inherit', cwd: process.cwd() })
        if (process.env.NODE_ENV === 'development') {
          console.log('Build completed successfully')
        }
      } catch (error) {
        console.error('Build failed:', error)
        return NextResponse.json({ error: 'Build failed. Please run "pnpm build" manually first.' }, { status: 500 })
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('Using existing .next directory')
      }
    }

    // Create custom ecosystem.config.js
    const ecosystemConfig = `module.exports = {
    apps: [{
      name: '${config.appName}',
      script: 'node_modules/.bin/next',
      args: 'start -p ${config.port}',
      cwd: '${config.projectRoot}',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: ${config.port}
      },
      env_file: '${config.projectRoot}/.env',
      
      // Logging
      log_file: '${config.projectRoot}/logs/combined.log',
      out_file: '${config.projectRoot}/logs/out.log',
      error_file: '${config.projectRoot}/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Auto restart settings
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 4000,
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Process management
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }]
  }`

    // Write custom ecosystem.config.js
    try {
      writeFileSync('ecosystem.config.js', ecosystemConfig)
      if (process.env.NODE_ENV === 'development') {
        console.log('Custom ecosystem.config.js created')
      }
    } catch (error) {
      console.error('Failed to write ecosystem.config.js:', error)
      return NextResponse.json({ error: 'Failed to create ecosystem configuration' }, { status: 500 })
    }

    // Create deployment package
    const output = require('fs').createWriteStream(`openshutter-deployment-${config.domain}.zip`)
    const archive = archiver('zip', { zlib: { level: 9 } })

    return new Promise<NextResponse>((resolve, reject) => {
      output.on('close', () => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Deployment package created: ${archive.pointer()} bytes`)
        }
        
        // Read the zip file and send as response
        const zipBuffer = readFileSync(`openshutter-deployment-${config.domain}.zip`)
        
        // Clean up temporary files
        try {
          require('fs').unlinkSync(`openshutter-deployment-${config.domain}.zip`)
        } catch (error) {
          console.warn('Could not delete temporary zip file:', error)
        }

        resolve(new NextResponse(zipBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="openshutter-deployment-${config.domain}.zip"`,
            'Content-Length': zipBuffer.length.toString()
          }
        }))
      })

      archive.on('error', (err) => {
        console.error('Error creating deployment package:', err)
        reject(NextResponse.json({ error: 'Failed to create deployment package' }, { status: 500 }))
      })

      archive.pipe(output)

      // Add files to archive
      const filesToInclude = [
        '.next',
        'public',
        'package.json',
        'pnpm-lock.yaml',
        'next.config.js',
        'ecosystem.config.js'
      ]

      filesToInclude.forEach(file => {
        const filePath = join(process.cwd(), file)
        if (existsSync(filePath)) {
          try {
            const stat = require('fs').statSync(filePath)
            if (stat.isDirectory()) {
              archive.directory(filePath, file)
              if (process.env.NODE_ENV === 'development') {
                console.log(`Added directory: ${file}`)
              }
            } else {
              archive.file(filePath, { name: file })
              if (process.env.NODE_ENV === 'development') {
                console.log(`Added file: ${file}`)
              }
            }
          } catch (error) {
            console.error(`Error adding ${file} to archive:`, error)
          }
        } else {
          console.warn(`File/directory not found: ${file}`)
        }
      })

      archive.finalize()
    })

  } catch (error) {
    console.error('Deployment preparation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}
