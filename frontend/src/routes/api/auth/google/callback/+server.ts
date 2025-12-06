import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request }) => {
	try {
		const searchParams = url.searchParams;
		const code = searchParams.get('code');
		const error = searchParams.get('error');
		const state = searchParams.get('state');

		if (error) {
			return text(`Authorization failed: ${error}`, { status: 400 });
		}

		if (!code) {
			return text('Authorization code not received', { status: 400 });
		}

		// Redirect back to the setup page with the authorization code
		const origin = url.origin;
		const setupUrl = `${origin}/admin/storage/google-drive-setup?code=${encodeURIComponent(code)}`;

		const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Drive Authorization - OpenShutter</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .success { color: #059669; }
          .info { color: #3b82f6; }
          .warning { color: #d97706; }
          .code { background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace; word-break: break-all; }
          .step { margin: 20px 0; padding: 15px; border-left: 4px solid #3b82f6; background: #eff6ff; }
          .btn { display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
          .btn:hover { background: #2563eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔐 Google Drive Authorization Successful!</h1>
          
          <div class="step">
            <h3>✅ Authorization Complete</h3>
            <p>You have successfully authorized OpenShutter to access your Google Drive.</p>
            <p><strong>Authorization Code:</strong></p>
            <div class="code">${code}</div>
          </div>

          <div class="step">
            <h3>🚀 Automatic Token Exchange</h3>
            <p>We'll now automatically exchange this authorization code for a refresh token.</p>
            <p>Click the button below to continue with the automated setup:</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${setupUrl}" class="btn">🔄 Continue to Setup</a>
            <a href="/admin/storage" class="btn">← Back to Storage Settings</a>
          </div>

          <div style="margin-top: 30px; padding: 15px; background: #fef3c7; border-radius: 4px;">
            <p><strong>🔒 Security Note:</strong> This authorization code is valid for a short time only. Please complete the setup process now.</p>
          </div>
        </div>
      </body>
      </html>
    `;

		return new Response(html, {
			headers: {
				'Content-Type': 'text/html'
			}
		});
	} catch (error) {
		console.error('Google OAuth callback error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return text(`Failed to process authorization callback: ${errorMessage}`, { status: 500 });
	}
};
