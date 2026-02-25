import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ url, request }) => {
	try {
		const searchParams = url.searchParams;
		const code = searchParams.get('code');
		const error = searchParams.get('error');
		const errorDescription = searchParams.get('error_description') || '';
		const state = searchParams.get('state');

		if (error) {
			// Build user-facing message (Google often sends error_description with the real reason)
			const rawMessage = errorDescription ? `${error}: ${errorDescription}` : error;
			const safeForHtml = (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
			let hint = '';
			if (error === 'deleted_client' || error === 'invalid_client') {
				hint =
					'<strong>Fix:</strong> The OAuth client (Client ID/Secret) was deleted or is invalid. ' +
					'In <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Google Cloud Console → APIs &amp; Services → Credentials</a>, ' +
					'create a new <strong>OAuth 2.0 Client ID</strong> (Web application), add your redirect URI (e.g. ' +
					safeForHtml(url.origin + '/api/auth/google/callback') +
					'), then in Admin → Storage → Google Drive replace the Client ID and Client Secret and click <strong>Generate New Token</strong>.';
			} else if (error === 'access_denied' || error === 'access_blocked') {
				hint =
					'If the app is in Testing mode, add your Google account as a Test user in Google Cloud Console (APIs &amp; Services → OAuth consent screen → Test users). ' +
					'Ensure the Redirect URI in storage config exactly matches the Authorized redirect URI in the OAuth client.';
			}

			const errorHtml = `
				<!DOCTYPE html>
				<html>
				<head>
					<title>Google Drive Authorization - Error</title>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<style>
						body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
						.box { max-width: 560px; margin: 20px auto; background: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
						h1 { margin: 0 0 12px 0; font-size: 1.25rem; color: #b91c1c; }
						p { margin: 0 0 8px 0; color: #374151; line-height: 1.5; }
						.hint { margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 6px; font-size: 0.875rem; color: #92400e; }
						.hint a { color: #b45309; font-weight: 600; }
					</style>
				</head>
				<body>
					<div class="box">
						<h1>Authorization failed</h1>
						<p>${safeForHtml(rawMessage)}</p>
						${hint ? `<div class="hint">${hint}</div>` : ''}
						<p style="margin-top:16px;">You can close this window. Fix the issue above, then try again from <strong>Admin → Storage → Google Drive</strong>.</p>
					</div>
					<script>
						if (window.opener) {
							window.opener.postMessage({
								type: 'GOOGLE_OAUTH_ERROR',
								error: ${JSON.stringify('Authorization failed: ' + rawMessage)}
							}, window.location.origin);
							window.close();
						}
					</script>
				</body>
				</html>
			`;
			return new Response(errorHtml, {
				headers: { 'Content-Type': 'text/html' }
			});
		}

		if (!code) {
			const noCodeHtml = `
				<!DOCTYPE html>
				<html>
				<head>
					<title>Google Drive Authorization - Error</title>
					<meta charset="utf-8">
				</head>
				<body>
					<script>
						if (window.opener) {
							window.opener.postMessage({
								type: 'GOOGLE_OAUTH_ERROR',
								error: 'Authorization code not received'
							}, window.location.origin);
							window.close();
						} else {
							document.body.innerHTML = '<h1>Error</h1><p>Authorization code not received</p><p>You can close this window.</p>';
						}
					</script>
				</body>
				</html>
			`;
			return new Response(noCodeHtml, {
				headers: { 'Content-Type': 'text/html' }
			});
		}

		// Send the authorization code to the parent window
		// The parent window will exchange it for a refresh token
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Google Drive Authorization - OpenShutter</title>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1">
				<style>
					body { 
						font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
						margin: 0; 
						padding: 20px; 
						background: #f5f5f5; 
						display: flex;
						align-items: center;
						justify-content: center;
						min-height: 100vh;
					}
					.container { 
						max-width: 500px; 
						background: white; 
						padding: 30px; 
						border-radius: 8px; 
						box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
						text-align: center;
					}
					.spinner {
						border: 3px solid #f3f3f3;
						border-top: 3px solid #3b82f6;
						border-radius: 50%;
						width: 40px;
						height: 40px;
						animation: spin 1s linear infinite;
						margin: 20px auto;
					}
					@keyframes spin {
						0% { transform: rotate(0deg); }
						100% { transform: rotate(360deg); }
					}
					.success { color: #059669; }
					.error { color: #dc2626; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="spinner"></div>
					<h2>Processing Authorization...</h2>
					<p>Please wait while we complete the setup.</p>
				</div>
				<script>
					// Send the authorization code to the parent window
					if (window.opener) {
						window.opener.postMessage({
							type: 'GOOGLE_OAUTH_CODE',
							code: '${code.replace(/'/g, "\\'")}'
						}, window.location.origin);
						
						// Close the window after a short delay
						setTimeout(() => {
							window.close();
						}, 1000);
					} else {
						// If no opener, show a message
						document.querySelector('.container').innerHTML = 
							'<h2 class="error">Error</h2><p>This window should be opened from the storage settings page.</p><p>You can close this window.</p>';
					}
				</script>
			</body>
			</html>
		`;

		return new Response(html, {
			headers: {
				'Content-Type': 'text/html'
			}
		});
	} catch (error) {
		logger.error('Google OAuth callback error:', error);
		const parsed = parseError(error);
		const errorMessage = parsed.userMessage || parsed.message;
		const errorHtml = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Google Drive Authorization - Error</title>
				<meta charset="utf-8">
			</head>
			<body>
				<script>
					if (window.opener) {
						window.opener.postMessage({
							type: 'GOOGLE_OAUTH_ERROR',
							error: 'Failed to process authorization callback: ${errorMessage.replace(/'/g, "\\'")}'
						}, window.location.origin);
						window.close();
					} else {
						document.body.innerHTML = '<h1>Error</h1><p>${errorMessage}</p><p>You can close this window.</p>';
					}
				</script>
			</body>
			</html>
		`;
		return new Response(errorHtml, {
			headers: { 'Content-Type': 'text/html' }
		});
	}
};
