import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { code, clientId, clientSecret, redirectUri } = await request.json()

    if (!code || !clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Google OAuth token exchange failed:', tokenData)
      return NextResponse.json(
        { 
          success: false, 
          error: tokenData.error_description || tokenData.error || 'Failed to exchange authorization code for tokens' 
        },
        { status: 400 }
      )
    }

    // Return the refresh token
    return NextResponse.json({
      success: true,
      refreshToken: tokenData.refresh_token,
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in,
    })

  } catch (error) {
    console.error('Error exchanging authorization code for tokens:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
