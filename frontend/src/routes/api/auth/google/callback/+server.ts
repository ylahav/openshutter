import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ url, request }) => {
	try {
		const searchParams = url.searchParams;
		const code = searchParams.get('code');
		const error = searchParams.get('error');
		const state = searchParams.get('state');

		if (error) {
			// Send error message to parent window
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
								error: 'Authorization failed: ${error.replace(/'/g, "\\'")}'
							}, window.location.origin);
							window.close();
						} else {
							document.body.innerHTML = '<h1>Authorization Failed</h1><p>${error}</p><p>You can close this window.</p>';
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
