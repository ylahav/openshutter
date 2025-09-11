'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/hooks/useI18n'

interface DeploymentConfig {
  domain: string
  port: number
  appName: string
  projectRoot: string
}

interface NotificationState {
  isOpen: boolean
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
}

export default function DeploymentPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [isLoading, setIsLoading] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  })

  const [config, setConfig] = useState<DeploymentConfig>({
    domain: 'yourdomain.com',
    port: 4000,
    appName: 'openshutter',
    projectRoot: '/var/www/yourdomain.com'
  })

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message
    })
  }

  const closeNotification = () => {
    setNotification({
      isOpen: false,
      type: 'info',
      title: '',
      message: ''
    })
  }

  const handleInputChange = (field: keyof DeploymentConfig, value: string | number) => {
    setConfig(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-update project root when domain changes
      if (field === 'domain') {
        updated.projectRoot = `/var/www/${value}`
      }
      
      return updated
    })
  }

  const validateConfig = (): string[] => {
    const errors: string[] = []
    
    if (!config.domain || config.domain === 'yourdomain.com') {
      errors.push('Please enter your actual domain name')
    }
    
    if (config.port < 1 || config.port > 65535) {
      errors.push('Port must be between 1 and 65535')
    }
    
    if (!config.appName || config.appName.trim() === '') {
      errors.push('App name is required')
    }
    
    if (!config.projectRoot || config.projectRoot.trim() === '') {
      errors.push('Project root path is required')
    }
    
    return errors
  }

  const prepareDeployment = async () => {
    const errors = validateConfig()
    if (errors.length > 0) {
      showNotification('error', 'Validation Error', errors.join(', '))
      return
    }

    setIsPreparing(true)
    
    try {
      const response = await fetch('/api/admin/deployment/prepare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to prepare deployment')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `openshutter-deployment-${config.domain}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showNotification('success', 'Deployment Ready', 'Deployment package has been prepared and downloaded successfully!')
    } catch (error) {
      console.error('Deployment preparation error:', error)
      showNotification('error', 'Preparation Failed', error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setIsPreparing(false)
    }
  }

  const downloadDeploymentScript = () => {
    const scriptContent = `#!/bin/bash

# OpenShutter PM2 Deployment Script
# Generated for ${config.domain}

set -e

# Configuration
PROJECT_ROOT="${config.projectRoot}"
PM2_APP_NAME="${config.appName}"
ZIP_FILE="openshutter-deployment-${config.domain}.zip"
BACKUP_DIR="/var/www/backups"

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Logging function
log() {
    echo -e "\${BLUE}[\$(date +'%Y-%m-%d %H:%M:%S')]\${NC} \$1"
}

error() {
    echo -e "\${RED}[ERROR]\${NC} \$1"
}

success() {
    echo -e "\${GREEN}[SUCCESS]\${NC} \$1"
}

warning() {
    echo -e "\${YELLOW}[WARNING]\${NC} \$1"
}

# Check if running as root
if [[ \$EUID -eq 0 ]]; then
   error "This script should not be run as root"
   exit 1
fi

# Check if zip file exists
if [ ! -f "\$ZIP_FILE" ]; then
    error "Deployment package '\$ZIP_FILE' not found in current directory"
    exit 1
fi

log "🚀 Starting OpenShutter PM2 deployment for ${config.domain}..."

# Create backup if application exists
if [ -d "\$PROJECT_ROOT" ] && [ -f "\$PROJECT_ROOT/package.json" ]; then
    log "📦 Creating backup of current deployment..."
    BACKUP_NAME="openshutter-backup-\$(date +%Y%m%d-%H%M%S)"
    mkdir -p "\$BACKUP_DIR"
    cp -r "\$PROJECT_ROOT" "\$BACKUP_DIR/\$BACKUP_NAME"
    success "Backup created: \$BACKUP_DIR/\$BACKUP_NAME"
fi

# Stop PM2 application if running
log "⏹️  Stopping PM2 application..."
if pm2 describe "\$PM2_APP_NAME" > /dev/null 2>&1; then
    pm2 stop "\$PM2_APP_NAME"
    success "PM2 application stopped"
else
    warning "PM2 application '\$PM2_APP_NAME' not found or not running"
fi

# Create project directory if it doesn't exist
mkdir -p "\$PROJECT_ROOT"
cd "\$PROJECT_ROOT"

# Extract deployment package
log "📁 Extracting deployment package..."
unzip -o "/tmp/\$ZIP_FILE" -d "\$PROJECT_ROOT"
success "Package extracted successfully"

# Install production dependencies
log "📦 Installing production dependencies..."
pnpm install --production --frozen-lockfile
success "Dependencies installed"

# Create logs directory
mkdir -p "\$PROJECT_ROOT/logs"

# Start PM2 application
log "🚀 Starting PM2 application..."
pm2 start ecosystem.config.js
success "PM2 application started"

# Save PM2 configuration
pm2 save
success "PM2 configuration saved"

# Show application status
log "📊 Application status:"
pm2 status

# Show logs
log "📋 Recent logs:"
pm2 logs "\$PM2_APP_NAME" --lines 10

# Cleanup
rm -f "/tmp/\$ZIP_FILE"
success "Temporary files cleaned up"

success "🎉 Deployment completed successfully!"
log "Application is running at: http://localhost:${config.port}"
log "PM2 app name: \$PM2_APP_NAME"
log "Project root: \$PROJECT_ROOT"

# Show useful commands
echo ""
log "📋 Useful PM2 commands:"
echo "  pm2 status                    # Check application status"
echo "  pm2 logs \$PM2_APP_NAME        # View application logs"
echo "  pm2 restart \$PM2_APP_NAME     # Restart application"
echo "  pm2 stop \$PM2_APP_NAME        # Stop application"
echo "  pm2 monit                     # Monitor applications"
`

    const blob = new Blob([scriptContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `deploy-to-server-${config.domain}.sh`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    showNotification('success', 'Script Downloaded', 'Deployment script has been downloaded successfully!')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              {t('admin.deploymentPreparation')}
            </h1>
            
            <div className="space-y-6">
              {/* Configuration Form */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  {t('admin.deploymentConfiguration')}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.domainName')} *
                    </label>
                    <input
                      type="text"
                      id="domain"
                      value={config.domain}
                      onChange={(e) => handleInputChange('domain', e.target.value)}
                      placeholder="example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Your domain name (without http:// or https://)
                    </p>
                  </div>

                  <div>
                    <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.port')} *
                    </label>
                    <input
                      type="number"
                      id="port"
                      value={config.port}
                      onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 4000)}
                      min="1"
                      max="65535"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Port number for the application (default: 4000)
                    </p>
                  </div>

                  <div>
                    <label htmlFor="appName" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.pm2AppName')} *
                    </label>
                    <input
                      type="text"
                      id="appName"
                      value={config.appName}
                      onChange={(e) => handleInputChange('appName', e.target.value)}
                      placeholder="openshutter"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      PM2 application name
                    </p>
                  </div>

                  <div>
                    <label htmlFor="projectRoot" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.projectRoot')} *
                    </label>
                    <input
                      type="text"
                      id="projectRoot"
                      value={config.projectRoot}
                      onChange={(e) => handleInputChange('projectRoot', e.target.value)}
                      placeholder="/var/www/yourdomain.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Server path where the application will be deployed
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-blue-900 mb-4">
                  {t('admin.deploymentPreview')}
                </h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p><strong>Domain:</strong> {config.domain}</p>
                  <p><strong>Port:</strong> {config.port}</p>
                  <p><strong>PM2 App Name:</strong> {config.appName}</p>
                  <p><strong>Project Root:</strong> {config.projectRoot}</p>
                  <p><strong>Application URL:</strong> http://localhost:{config.port}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={prepareDeployment}
                  disabled={isPreparing || isLoading}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPreparing ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('admin.preparingDeployment')}...
                    </span>
                  ) : (
                    t('admin.prepareDeploymentPackage')
                  )}
                </button>

                <button
                  onClick={downloadDeploymentScript}
                  disabled={isPreparing || isLoading}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('admin.downloadDeploymentScript')}
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-yellow-800 mb-4">
                  {t('admin.deploymentInstructions')}
                </h3>
                <div className="space-y-3 text-sm text-yellow-700">
                  <div>
                    <strong>1. Prepare Deployment Package:</strong>
                    <p>Click "Prepare Deployment Package" to build and package your application with the specified configuration.</p>
                  </div>
                  <div>
                    <strong>2. Download Deployment Script:</strong>
                    <p>Download the deployment script customized for your domain and configuration.</p>
                  </div>
                  <div>
                    <strong>3. Upload to Server:</strong>
                    <p>Upload the deployment package and script to your server.</p>
                  </div>
                  <div>
                    <strong>4. Run Deployment:</strong>
                    <p>Execute the deployment script on your server to complete the deployment.</p>
                  </div>
                </div>
              </div>

              {/* Alternative Method */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-800 mb-4">
                  Alternative: Command Line Method
                </h3>
                <div className="space-y-3 text-sm text-blue-700">
                  <p>If the web interface doesn't work, you can use the command line:</p>
                  <div className="bg-blue-100 p-3 rounded font-mono text-xs">
                    <p># Build and package for deployment</p>
                    <p>pnpm run build:deploy {config.domain} {config.port} {config.appName} {config.projectRoot}</p>
                  </div>
                  <p>This will create the same deployment package without using the web interface.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Dialog */}
      {notification.isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${
                notification.type === 'success' ? 'bg-green-100' :
                notification.type === 'error' ? 'bg-red-100' :
                notification.type === 'warning' ? 'bg-yellow-100' :
                'bg-blue-100'
              }`}>
                {notification.type === 'success' && (
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {notification.type === 'error' && (
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {notification.type === 'warning' && (
                  <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
                {notification.type === 'info' && (
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="mt-2 px-7 py-3">
                <h3 className="text-lg font-medium text-gray-900">{notification.title}</h3>
                <div className="mt-2 px-1 py-3">
                  <p className="text-sm text-gray-500">{notification.message}</p>
                </div>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={closeNotification}
                  className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
