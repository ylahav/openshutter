import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { siteConfigService } from './site-config';
import { productDisplayNameFromSiteConfig } from '../common/utils/product-display-name-from-site-config';

export interface WelcomeEmailContext {
  name: string;
  username: string;
  loginUrl: string;
  siteTitle?: string;
  /** Optional. Initial password set at user creation; only present when sending welcome email at creation. */
  password?: string;
}

export class MailService {
  private readonly logger = new Logger(MailService.name);

  /**
   * Get login URL for emails (e.g. welcome). Uses EMAIL_BASE_URL env (fallback to FRONTEND_URL) or default.
   */
  getLoginUrl(): string {
    // EMAIL_BASE_URL takes precedence, fallback to FRONTEND_URL for backward compatibility
    const base = process.env.EMAIL_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:4000';
    // Handle comma-separated URLs (take first one for emails)
    const baseUrl = base.split(',')[0].trim();
    return baseUrl.replace(/\/$/, '') + '/login';
  }

  /**
   * Get Google OAuth callback base URL. Uses GOOGLE_OAUTH_CALLBACK_BASE_URL env (fallback to FRONTEND_URL) or default.
   * Used to construct redirect URI for Google Drive OAuth.
   */
  static getGoogleOAuthCallbackBaseUrl(): string {
    const base = process.env.GOOGLE_OAUTH_CALLBACK_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:4000';
    // Handle comma-separated URLs (take first one)
    const baseUrl = base.split(',')[0].trim();
    return baseUrl.replace(/\/$/, '');
  }

  /**
   * Get Google OAuth callback URL (full redirect URI).
   */
  static getGoogleOAuthCallbackUrl(): string {
    return `${MailService.getGoogleOAuthCallbackBaseUrl()}/api/auth/google/callback`;
  }

  /**
   * Replace placeholders in a string. Supports {{name}}, {{username}}, {{loginUrl}}, {{siteTitle}}, {{password}}.
   * {{password}} is only set when sending welcome email at user creation (initial password).
   */
  replacePlaceholders(text: string, ctx: WelcomeEmailContext): string {
    let out = text;
    out = out.replace(/\{\{name\}\}/g, ctx.name || '');
    out = out.replace(/\{\{username\}\}/g, ctx.username || '');
    out = out.replace(/\{\{loginUrl\}\}/g, ctx.loginUrl || '');
    out = out.replace(/\{\{siteTitle\}\}/g, ctx.siteTitle || '');
    out = out.replace(/\{\{password\}\}/g, ctx.password ?? '');
    return out;
  }

  /**
   * Send welcome email to a newly created user. Uses site config (mail + welcomeEmail).
   * Does not throw; logs errors. Call after user is created; failure to send does not fail user creation.
   * @param toUsername - Recipient (login) email/username
   * @param displayName - Display name for greeting
   * @param initialPassword - Optional. Plain password set at creation; included only for {{password}} placeholder.
   */
  async sendWelcomeEmail(toUsername: string, displayName: string, initialPassword?: string): Promise<void> {
    try {
      const config = await siteConfigService.getConfig();
      const welcome = config.welcomeEmail;
      const mail = config.mail;

      if (!welcome?.enabled || !mail?.host?.trim()) {
        this.logger.debug('Welcome email skipped: disabled or mail not configured');
        return;
      }

      const loginUrl = this.getLoginUrl();
      const siteTitle = productDisplayNameFromSiteConfig(config, 'en');
      const ctx: WelcomeEmailContext = {
        name: displayName || toUsername,
        username: toUsername,
        loginUrl,
        siteTitle,
        password: initialPassword,
      };

      const subject = this.replacePlaceholders(welcome.subject || 'Welcome to {{siteTitle}}', ctx);
      const body = this.replacePlaceholders(
        welcome.body || 'Hi {{name}},\n\nWelcome to {{siteTitle}}.\n\nYou can log in here: {{loginUrl}}',
        ctx,
      );

      const port = mail.port ?? 587;
      const transporter = nodemailer.createTransport({
        host: mail.host,
        port,
        secure: port === 465,
        auth:
          mail.user && mail.password
            ? { user: mail.user, pass: mail.password }
            : undefined,
      });

      const from = mail.from?.trim() || mail.user || 'noreply@localhost';
      await transporter.sendMail({
        from,
        to: toUsername,
        subject,
        text: body,
      });

      this.logger.log(`Welcome email sent to ${toUsername}`);
    } catch (err) {
      this.logger.error(
        `Failed to send welcome email to ${toUsername}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Send a test email using current site config SMTP. Returns success or error message.
   */
  async sendTestEmail(to: string, subject: string, body: string): Promise<{ success: boolean; error?: string }> {
    try {
      const config = await siteConfigService.getConfig();
      const mail = config.mail;

      if (!mail?.host?.trim()) {
        return { success: false, error: 'Mail server is not configured. Set SMTP host and save first.' };
      }

      const port = mail.port ?? 587;
      const transporter = nodemailer.createTransport({
        host: mail.host,
        port,
        secure: port === 465,
        auth:
          mail.user && mail.password
            ? { user: mail.user, pass: mail.password }
            : undefined,
      });

      const from = mail.from?.trim() || mail.user || 'noreply@localhost';
      await transporter.sendMail({
        from,
        to: to.trim(),
        subject: subject.trim() || 'Test email',
        text: body.trim() || 'This is a test email.',
      });

      this.logger.log(`Test email sent to ${to}`);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Test email failed: ${message}`);
      return { success: false, error: message };
    }
  }
}

export const mailService = new MailService();
