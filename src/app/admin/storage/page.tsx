'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/templates/default/components/Header'
import Footer from '@/templates/default/components/Footer'
import AdminGuard from '@/components/AdminGuard'
import NotificationDialog from '@/components/NotificationDialog'
import { StorageConfig, StorageProviderStatus } from '@/types/storage'
import { useI18n } from '@/hooks/useI18n'

interface StorageProviderInfo {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'error'
  quota?: {
    used: string
    total: string
    percentage: number
  }
  lastSync?: string
  isEnabled: boolean
}

interface NotificationState {
  isOpen: boolean
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
}

export default function StorageSettingsPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState('google-drive')
  const [isLoading, setIsLoading] = useState(true)
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  })
  
  const [providers, setProviders] = useState<StorageProviderInfo[]>([
    {
      id: 'google-drive',
      name: t('admin.googleDrive'),
      description: t('admin.cloudStorageWithGoogleDrive'),
      status: 'inactive',
      lastSync: t('admin.never'),
      isEnabled: false
    },
    {
      id: 'aws-s3',
      name: t('admin.awsS3'),
      description: t('admin.scalableCloudObjectStorage'),
      status: 'inactive',
      lastSync: t('admin.never'),
      isEnabled: false
    },
    {
      id: 'local',
      name: t('admin.localStorage'),
      description: t('admin.fileStorageOnLocalServer'),
      status: 'inactive',
      lastSync: t('admin.never'),
      isEnabled: false
    }
  ])

  const [googleDriveConfig, setGoogleDriveConfig] = useState({
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    folderId: '',
    isEnabled: false
  })

  const [awsS3Config, setAwsS3Config] = useState({
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
    bucketName: '',
    isEnabled: false
  })

  const [localConfig, setLocalConfig] = useState({
    basePath: '/app/public/albums',
    maxFileSize: '100MB',
    isEnabled: false
  })

  const [googleAuthUrl, setGoogleAuthUrl] = useState<string | null>(null)

  useEffect(() => {
    // Load configuration from API
    loadConfiguration()
  }, [])

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message
    })
  }

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }))
  }

  const generateGoogleAuthUrl = () => {
    const clientId = googleDriveConfig.clientId;
    if (!clientId) {
      showNotification('error', 'Error', 'Google Client ID is not set. Please set it first.');
      return;
    }
    const redirectUri = `${window.location.origin}/api/auth/google/callback`;
    const scope = 'https://www.googleapis.com/auth/drive.file';
    const state = 'state_parameter_passthrough_value'; // Optional: for security

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
    setGoogleAuthUrl(authUrl);
    showNotification('info', 'Authorization URL Generated', 'Click the generated URL to authorize OpenShutter with Google Drive.');
  };

  const extractFolderId = (url: string) => {
    // Extract folder ID from Google Drive URL
    const patterns = [
      /\/folders\/([a-zA-Z0-9-_]+)/, // Standard folder URL
      /id=([a-zA-Z0-9-_]+)/, // ID parameter
      /([a-zA-Z0-9-_]{25,})/ // Long ID format
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  const handleFolderIdInput = (value: string) => {
    // Check if it's a Google Drive URL and extract the folder ID
    if (value.includes('drive.google.com') || value.includes('docs.google.com')) {
      const folderId = extractFolderId(value);
      if (folderId) {
        setGoogleDriveConfig(prev => ({ ...prev, folderId }));
        showNotification('success', 'Folder ID Extracted', `Successfully extracted folder ID: ${folderId}`);
        return;
      }
    }
    
    // Otherwise, just set the value as is
    setGoogleDriveConfig(prev => ({ ...prev, folderId: value }));
  };

  const loadConfiguration = async () => {
    try {
      const response = await fetch('/api/admin/storage')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const configs = data.data
          
          // Update Google Drive config
          if (configs['google-drive']) {
            setGoogleDriveConfig(configs['google-drive'])
            updateProviderStatus('google-drive', configs['google-drive'].isEnabled)
          }
          
          // Update AWS S3 config
          if (configs['aws-s3']) {
            setAwsS3Config(configs['aws-s3'])
            updateProviderStatus('aws-s3', configs['aws-s3'].isEnabled)
          }
          
          // Update Local Storage config
          if (configs['local']) {
            setLocalConfig(configs['local'])
            updateProviderStatus('local', configs['local'].isEnabled)
          }
        }
      } else {
        console.error('Failed to load configuration')
        showNotification('error', 'Configuration Error', 'Failed to load storage configuration')
      }
    } catch (error) {
      console.error('Failed to load configuration:', error)
      showNotification('error', 'Configuration Error', 'Failed to load storage configuration')
    } finally {
      setIsLoading(false)
    }
  }

  const updateProviderStatus = (providerId: string, enabled: boolean) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId ? { ...p, status: enabled ? 'active' : 'inactive', isEnabled: enabled } : p
    ))
  }

  const handleGoogleDriveSave = async () => {
    try {
      const response = await fetch('/api/admin/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'google-drive',
          config: googleDriveConfig
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          showNotification('success', 'Configuration Saved', 'Google Drive configuration saved successfully!')
          // Update provider status
          updateProviderStatus('google-drive', googleDriveConfig.isEnabled)
        } else {
          showNotification('error', 'Save Failed', 'Failed to save configuration: ' + data.error)
        }
      } else {
        showNotification('error', 'Save Failed', 'Failed to save Google Drive configuration')
      }
    } catch (error) {
      console.error('Failed to save Google Drive config:', error)
      showNotification('error', 'Save Failed', 'Failed to save Google Drive configuration')
    }
  }

  const handleAwsS3Save = async () => {
    try {
      const response = await fetch('/api/admin/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'aws-s3',
          config: awsS3Config
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          showNotification('success', 'Configuration Saved', 'AWS S3 configuration saved successfully!')
          // Update provider status
          updateProviderStatus('aws-s3', awsS3Config.isEnabled)
        } else {
          showNotification('error', 'Save Failed', 'Failed to save configuration: ' + data.error)
        }
      } else {
        showNotification('error', 'Save Failed', 'Failed to save AWS S3 configuration')
      }
    } catch (error) {
      console.error('Failed to save AWS S3 config:', error)
      showNotification('error', 'Save Failed', 'Failed to save AWS S3 configuration')
    }
  }

  const handleLocalSave = async () => {
    try {
      const response = await fetch('/api/admin/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'local',
          config: localConfig
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          showNotification('success', 'Configuration Saved', 'Local Storage configuration saved successfully!')
          // Update provider status
          updateProviderStatus('local', localConfig.isEnabled)
        } else {
          showNotification('error', 'Save Failed', 'Failed to save configuration: ' + data.error)
        }
      } else {
        showNotification('error', 'Save Failed', 'Failed to save Local Storage configuration')
      }
    } catch (error) {
      console.error('Failed to save Local Storage config:', error)
      showNotification('error', 'Save Failed', 'Failed to save Local Storage configuration')
    }
  }

  const testConnection = async (providerId: string) => {
    try {
      if (providerId === 'google-drive') {
        // Test Google Drive connection
        const response = await fetch('/api/storage/google-drive/test')
        if (response.ok) {
          const data = await response.json()
          showNotification('success', 'Connection Test', `Google Drive connection successful!\nQuota: ${data.quota?.used || 'Unknown'} / ${data.quota?.total || 'Unknown'}`)
        } else {
          showNotification('error', 'Connection Test', 'Google Drive connection failed. Check your configuration.')
        }
      } else {
        showNotification('info', 'Connection Test', `${providerId} connection test not implemented yet.`)
      }
    } catch (error) {
      console.error('Connection test failed:', error)
      showNotification('error', 'Connection Test', 'Connection test failed. Please try again.')
    }
  }

  const toggleProvider = async (providerId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/storage', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: providerId,
          enabled: enabled
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Update local state
          updateProviderStatus(providerId, enabled)
          
          // Update config state
          if (providerId === 'google-drive') {
            setGoogleDriveConfig(prev => ({ ...prev, isEnabled: enabled }))
          } else if (providerId === 'aws-s3') {
            setAwsS3Config(prev => ({ ...prev, isEnabled: enabled }))
          } else if (providerId === 'local') {
            setLocalConfig(prev => ({ ...prev, isEnabled: enabled }))
          }
          
          showNotification('success', 'Provider Updated', `${providerId} ${enabled ? 'enabled' : 'disabled'} successfully!`)
        } else {
          showNotification('error', 'Update Failed', 'Failed to update provider status: ' + data.error)
        }
      } else {
        showNotification('error', 'Update Failed', 'Failed to update provider status')
      }
    } catch (error) {
      console.error('Failed to toggle provider:', error)
      showNotification('error', 'Update Failed', 'Failed to update provider status')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('admin.loadingStorageConfiguration')}</p>
        </div>
      </div>
    )
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="flex-1 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{t('admin.storageSettings')}</h1>
                  <p className="mt-2 text-gray-600">
                    {t('admin.storageSettingsDescription')}
                  </p>
                </div>
                <button
                  onClick={() => router.push('/admin')}
                  className="btn-secondary"
                >
                  {t('admin.backToAdmin')}
                </button>
              </div>
            </div>

            {/* Storage Providers Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {providers.map((provider) => (
                <div key={provider.id} className="card">
                  <div className="card-body">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        provider.status === 'active' ? 'bg-green-100 text-green-800' :
                        provider.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {provider.status}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4">{provider.description}</p>
                    
                    {provider.quota && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>{t('admin.storageUsage')}</span>
                          <span>{provider.quota.used} / {provider.quota.total}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${provider.quota.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-500 mb-4">
                      {t('admin.lastSync')} {provider.lastSync}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => testConnection(provider.id)}
                        className="btn-secondary text-sm px-3 py-2"
                      >
                        {t('admin.testConnection')}
                      </button>
                      <button
                        onClick={() => toggleProvider(provider.id, !provider.isEnabled)}
                        className={`text-sm px-3 py-2 rounded-md ${
                          provider.isEnabled 
                            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {provider.isEnabled ? t('admin.disable') : t('admin.enable')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Configuration Tabs */}
            <div className="card">
              <div className="card-body">
                <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-8">
                    {[
                      { id: 'google-drive', name: t('admin.googleDrive') },
                      { id: 'aws-s3', name: t('admin.awsS3') },
                      { id: 'local', name: t('admin.localStorage') }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === tab.id
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab.name}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Google Drive Configuration */}
                {activeTab === 'google-drive' && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">{t('admin.googleDriveConfiguration')}</h3>
                        <a 
                          href="/admin/storage/google-drive-setup"
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          {t('admin.setupGuide')}
                        </a>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.clientId')}
                          </label>
                          <input
                            type="text"
                            value={googleDriveConfig.clientId}
                            onChange={(e) => setGoogleDriveConfig(prev => ({ ...prev, clientId: e.target.value }))}
                            className="input"
                            placeholder={t('admin.enterGoogleClientId')}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Client Secret
                          </label>
                          <input
                            type="password"
                            value={googleDriveConfig.clientSecret}
                            onChange={(e) => setGoogleDriveConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                            className="input"
                            placeholder="Enter Google Client Secret"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Refresh Token
                          </label>
                          <input
                            type="password"
                            value={googleDriveConfig.refreshToken}
                            onChange={(e) => setGoogleDriveConfig(prev => ({ ...prev, refreshToken: e.target.value }))}
                            className="input"
                            placeholder="Enter Refresh Token"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Folder ID
                          </label>
                          <input
                            type="text"
                            value={googleDriveConfig.folderId}
                            onChange={(e) => handleFolderIdInput(e.target.value)}
                            className="input"
                            placeholder="Enter Google Drive Folder ID or URL"
                          />
                          <div className="mt-2 text-sm text-blue-600">
                            <a href="/admin/storage/google-drive-setup" className="text-blue-600 hover:text-blue-800 underline">
                              📖 Need help setting up Google Drive? Click here for step-by-step instructions
                            </a>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6">
                        <button
                          onClick={handleGoogleDriveSave}
                          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                        >
                          {t('admin.saveGoogleDriveConfiguration')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* AWS S3 Configuration */}
                {activeTab === 'aws-s3' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">{t('admin.awsS3Configuration')}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Access Key ID
                          </label>
                          <input
                            type="text"
                            value={awsS3Config.accessKeyId}
                            onChange={(e) => setAwsS3Config(prev => ({ ...prev, accessKeyId: e.target.value }))}
                            className="input"
                            placeholder="Enter AWS Access Key ID"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Secret Access Key
                          </label>
                          <input
                            type="password"
                            value={awsS3Config.secretAccessKey}
                            onChange={(e) => setAwsS3Config(prev => ({ ...prev, secretAccessKey: e.target.value }))}
                            className="input"
                            placeholder="Enter AWS Secret Access Key"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Region
                          </label>
                          <select
                            value={awsS3Config.region}
                            onChange={(e) => setAwsS3Config(prev => ({ ...prev, region: e.target.value }))}
                            className="input"
                          >
                            <option value="us-east-1">US East (N. Virginia)</option>
                            <option value="us-west-2">US West (Oregon)</option>
                            <option value="eu-west-1">Europe (Ireland)</option>
                            <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                            <option value="eu-north-1">Europe (Stockholm)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bucket Name
                          </label>
                          <input
                            type="text"
                            value={awsS3Config.bucketName}
                            onChange={(e) => setAwsS3Config(prev => ({ ...prev, bucketName: e.target.value }))}
                            className="input"
                            placeholder="Enter S3 Bucket Name"
                          />
                        </div>
                      </div>
                      <div className="mt-6">
                        <button
                          onClick={handleAwsS3Save}
                          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                        >
                          {t('admin.saveAwsS3Configuration')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Local Storage Configuration */}
                {activeTab === 'local' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">{t('admin.localStorageConfiguration')}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Base Storage Path
                          </label>
                          <input
                            type="text"
                            value={localConfig.basePath}
                            onChange={(e) => setLocalConfig(prev => ({ ...prev, basePath: e.target.value }))}
                            className="input"
                            placeholder="/app/public/albums"
                          />
                          <p className="mt-1 text-sm text-gray-500">
                            Absolute path to the directory where photos will be stored
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Maximum File Size
                          </label>
                          <select
                            value={localConfig.maxFileSize}
                            onChange={(e) => setLocalConfig(prev => ({ ...prev, maxFileSize: e.target.value }))}
                            className="input"
                          >
                            <option value="10MB">10 MB</option>
                            <option value="50MB">50 MB</option>
                            <option value="100MB">100 MB</option>
                            <option value="500MB">500 MB</option>
                            <option value="1GB">1 GB</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-6">
                        <button
                          onClick={handleLocalSave}
                          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                        >
                          {t('admin.saveLocalStorageConfiguration')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Notification Dialog */}
      <NotificationDialog
        isOpen={notification.isOpen}
        onClose={closeNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </AdminGuard>
  )
}
