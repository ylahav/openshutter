'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AdminGuard from '@/components/AdminGuard'

export default function GoogleDriveSetupPage() {
  const router = useRouter()
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [authUrl, setAuthUrl] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [refreshToken, setRefreshToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true)

  // Load existing credentials from database and check for auth code in URL
  useEffect(() => {
    loadExistingCredentials()
  }, [])

  // Check for auth code in URL after credentials are loaded
  useEffect(() => {
    if (!isLoadingCredentials && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      if (code) {
        setAuthCode(code)
        // Auto-generate auth URL if we have credentials
        if (clientId) {
          generateAuthUrl()
        }
      }
    }
  }, [isLoadingCredentials, clientId])

  const loadExistingCredentials = async () => {
    try {
      const response = await fetch('/api/admin/storage')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data['google-drive']) {
          const config = data.data['google-drive']
          setClientId(config.clientId || '')
          setClientSecret(config.clientSecret || '')
        }
      }
    } catch (error) {
      console.error('Failed to load existing credentials:', error)
    } finally {
      setIsLoadingCredentials(false)
    }
  }

  const generateAuthUrl = () => {
    if (!clientId) {
      alert('Please enter your Google Client ID first')
      return
    }
    
    if (typeof window === 'undefined') return
    
    const redirectUri = `${window.location.origin}/api/auth/google/callback`
    const scope = 'https://www.googleapis.com/auth/drive.file'
    const state = 'state_parameter_passthrough_value'
    
    // Build URL with all required parameters for refresh token
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope,
      state: state,
      access_type: 'offline', // Required for refresh tokens
      prompt: 'consent' // Ensures refresh token is returned
    })
    
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    setAuthUrl(url)
  }

  const exchangeCodeForToken = async () => {
    if (!authCode || !clientId || !clientSecret) {
      alert('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/google/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: authCode,
          clientId,
          clientSecret,
          redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/api/auth/google/callback` : ''
        })
      })

      const data = await response.json()
      if (data.success) {
        setRefreshToken(data.refreshToken)
        
        // Auto-save the refresh token to database if we have existing config
        if (clientId && clientSecret) {
          try {
            const saveResponse = await fetch('/api/admin/storage', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                provider: 'google-drive',
                config: {
                  clientId,
                  clientSecret,
                  refreshToken: data.refreshToken,
                  folderId: '', // User will need to set this
                  isEnabled: false // Start disabled until folder ID is set
                }
              })
            })
            
            if (saveResponse.ok) {
              alert('✅ Refresh token obtained and saved to database! You can now go back to Storage Settings to complete the setup.')
            } else {
              alert('✅ Refresh token obtained! Please copy it and save it manually in Storage Settings.')
            }
          } catch (saveError) {
            console.error('Failed to auto-save refresh token:', saveError)
            alert('✅ Refresh token obtained! Please copy it and save it manually in Storage Settings.')
          }
        } else {
          alert('✅ Refresh token obtained successfully! Please copy it and save it in Storage Settings.')
        }
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to exchange code for token:', error)
      alert('Failed to exchange authorization code for refresh token')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="flex-1 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Google Drive Setup Guide</h1>
                  <p className="mt-2 text-gray-600">
                    Complete step-by-step instructions to set up Google Drive integration
                  </p>
                </div>
                <button
                  onClick={() => router.push('/admin/storage')}
                  className="btn-secondary"
                >
                  Back to Storage Settings
                </button>
              </div>
            </div>

            <div className="space-y-8">
              {/* Step 1: Google Cloud Console */}
              <div className="card">
                <div className="card-body">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Create Google Cloud Project</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">1.1 Go to Google Cloud Console</h3>
                      <p className="text-gray-600 mb-3">
                        Visit the Google Cloud Console to create a new project or use an existing one.
                      </p>
                      <a 
                        href="https://console.cloud.google.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Open Google Cloud Console
                      </a>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">1.2 Enable Google Drive API</h3>
                      <ol className="list-decimal list-inside text-gray-600 space-y-1">
                        <li>In your Google Cloud project, go to "APIs & Services" → "Library"</li>
                        <li>Search for "Google Drive API"</li>
                        <li>Click on it and press "Enable"</li>
                      </ol>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">1.3 Create OAuth 2.0 Credentials</h3>
                      <ol className="list-decimal list-inside text-gray-600 space-y-1">
                        <li>Go to "APIs & Services" → "Credentials"</li>
                        <li>Click "Create Credentials" → "OAuth 2.0 Client IDs"</li>
                        <li>Choose "Web application" as the application type</li>
                        <li>Add authorized redirect URIs: <code className="bg-gray-100 px-2 py-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'your-domain'}/api/auth/google/callback</code></li>
                        <li>Copy the Client ID and Client Secret</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Get Authorization Code */}
              <div className="card">
                <div className="card-body">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 2: Get Authorization Code</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">2.1 Your Credentials</h3>
                      {isLoadingCredentials ? (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span>Loading existing credentials...</span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Client ID
                              </label>
                              <input
                                type="text"
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                className="input"
                                placeholder="Enter your Google Client ID"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Client Secret
                              </label>
                              <input
                                type="password"
                                value={clientSecret}
                                onChange={(e) => setClientSecret(e.target.value)}
                                className="input"
                                placeholder="Enter your Google Client Secret"
                              />
                            </div>
                          </div>
                          {clientId && clientSecret ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex items-center">
                                <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-green-800 text-sm font-medium">
                                  Credentials loaded from existing configuration
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="flex items-center">
                                <svg className="h-5 w-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <span className="text-blue-800 text-sm">
                                  No existing credentials found. Please enter your Google Cloud credentials.
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">2.2 Generate Authorization URL</h3>
                      <button
                        onClick={generateAuthUrl}
                        className="btn-primary"
                        disabled={!clientId}
                      >
                        Generate Authorization URL
                      </button>
                    </div>

                    {authUrl && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">2.3 Complete Authorization</h3>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-blue-800 mb-3">
                            Click the link below to authorize OpenShutter with your Google Drive:
                          </p>
                          <a 
                            href={authUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Authorize OpenShutter
                          </a>
                          <div className="mt-3 p-3 bg-white border border-blue-300 rounded">
                            <p className="text-xs text-gray-600 mb-2 font-medium">Debug Info:</p>
                            <p className="text-xs text-gray-600">Redirect URI: <code className="bg-gray-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'your-domain'}/api/auth/google/callback</code></p>
                            <p className="text-xs text-gray-600">Make sure this exact URI is added to your Google Cloud Console OAuth 2.0 credentials.</p>
                          </div>
                          <p className="text-blue-800 mt-3 text-sm">
                            After authorization, you'll be redirected to a page with an authorization code. Copy that code and paste it below.
                          </p>
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-yellow-800 text-sm">
                              <strong>⚠️ If you get "Access blocked" error:</strong>
                            </p>
                            <ul className="text-yellow-700 text-sm mt-1 list-disc list-inside">
                              <li>Make sure the redirect URI is exactly: <code className="bg-yellow-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'your-domain'}/api/auth/google/callback</code></li>
                              <li>Check that your OAuth 2.0 client is configured for "Web application"</li>
                              <li>Verify the Client ID is correct</li>
                              <li>Ensure Google Drive API is enabled in your project</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3: Exchange Code for Token */}
              <div className="card">
                <div className="card-body">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 3: Get Refresh Token</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">3.1 Enter Authorization Code</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Authorization Code
                        </label>
                        <input
                          type="text"
                          value={authCode}
                          onChange={(e) => setAuthCode(e.target.value)}
                          className="input"
                          placeholder="Paste the authorization code from Step 2"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          This is the code you received after completing the authorization in Step 2
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">3.2 Exchange for Refresh Token</h3>
                      <button
                        onClick={exchangeCodeForToken}
                        className="btn-primary"
                        disabled={!authCode || !clientId || !clientSecret || isLoading}
                      >
                        {isLoading ? 'Exchanging...' : 'Get Refresh Token'}
                      </button>
                    </div>

                    {refreshToken && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">3.3 Your Refresh Token</h3>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-green-800 mb-3">
                            ✅ Success! Your refresh token has been generated:
                          </p>
                          <div className="bg-white border border-green-300 rounded p-3">
                            <code className="text-sm text-gray-800 break-all">{refreshToken}</code>
                          </div>
                          <div className="flex space-x-3 mt-3">
                            <button
                              onClick={() => copyToClipboard(refreshToken)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              Copy to Clipboard
                            </button>
                            <button
                              onClick={() => router.push('/admin/storage')}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Go to Storage Settings
                            </button>
                          </div>
                          <p className="text-green-800 mt-3 text-sm">
                            🔒 Keep this token secure! It provides long-term access to your Google Drive.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 4: Complete Setup */}
              <div className="card">
                <div className="card-body">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 4: Complete Setup</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">4.1 Configure Storage Settings</h3>
                      <ol className="list-decimal list-inside text-gray-600 space-y-1">
                        <li>Go back to the Storage Settings page</li>
                        <li>Enter your Client ID and Client Secret</li>
                        <li>Paste your Refresh Token</li>
                        <li>Enter your Google Drive folder ID or URL</li>
                        <li>Click "Save Google Drive Configuration"</li>
                      </ol>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">4.2 Test Upload</h3>
                      <ol className="list-decimal list-inside text-gray-600 space-y-1">
                        <li>Create a new album with Google Drive as the storage provider</li>
                        <li>Try uploading a photo</li>
                        <li>Verify the photo appears in your Google Drive folder</li>
                      </ol>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => router.push('/admin/storage')}
                        className="btn-primary"
                      >
                        Go to Storage Settings
                      </button>
                      <button
                        onClick={() => router.push('/albums/new')}
                        className="btn-secondary"
                      >
                        Create Test Album
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Troubleshooting */}
              <div className="card">
                <div className="card-body">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Troubleshooting</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Common Issues</h3>
                      <div className="space-y-3">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <h4 className="font-medium text-yellow-800">"invalid_grant" Error</h4>
                          <p className="text-yellow-700 text-sm mt-1">
                            This means your refresh token has expired. Follow these steps again to get a new one.
                          </p>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <h4 className="font-medium text-yellow-800">"redirect_uri_mismatch" Error</h4>
                          <p className="text-yellow-700 text-sm mt-1">
                            Make sure the redirect URI in your Google Cloud Console matches exactly: <code className="bg-yellow-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'your-domain'}/api/auth/google/callback</code>
                          </p>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <h4 className="font-medium text-yellow-800">Photos Upload to Wrong Storage</h4>
                          <p className="text-yellow-700 text-sm mt-1">
                            Make sure you create albums with "Google Drive" as the storage provider, not "Local Storage".
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </AdminGuard>
  )
}
