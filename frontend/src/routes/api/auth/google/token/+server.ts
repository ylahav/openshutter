import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { code, clientId, clientSecret, redirectUri } = await request.json();

		if (!code || !clientId || !clientSecret || !redirectUri) {
			return json({ success: false, error: 'Missing required parameters' }, { status: 400 });
		}

		// Exchange authorization code for tokens
		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: redirectUri,
				grant_type: 'authorization_code'
			})
		});

		const tokenData = await tokenResponse.json();

		if (!tokenResponse.ok) {
			console.error('Google OAuth token exchange failed:', tokenData);
			return json(
				{
					success: false,
					error: tokenData.error_description || tokenData.error || 'Failed to exchange authorization code for tokens'
				},
				{ status: 400 }
			);
		}

		// Return the refresh token
		return json({
			success: true,
			refreshToken: tokenData.refresh_token,
			accessToken: tokenData.access_token,
			expiresIn: tokenData.expires_in
		});
	} catch (error) {
		console.error('Error exchanging authorization code for tokens:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Internal server error: ${errorMessage}` }, { status: 500 });
	}
};

