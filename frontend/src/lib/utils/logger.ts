/**
 * Centralized logging utility
 * 
 * Provides consistent logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - Production filtering (debug/info logs disabled in production)
 * - Easy integration with error tracking services (Sentry)
 * - Consistent log format
 */

const isDev = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

/**
 * Get Sentry instance if available
 * Sentry is optional and may not be configured
 */
function getSentry(): any {
	if (typeof window === 'undefined') {
		return null; // Server-side: Sentry should be initialized in hooks.server.ts
	}
	
	// Try to get Sentry from window (initialized by @sentry/sveltekit)
	const sentry = (window as any).Sentry;
	if (sentry && (sentry.captureException || sentry.captureMessage)) {
		return sentry;
	}
	
	return null;
}

/**
 * Log levels
 */
export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

/**
 * Logger configuration
 */
interface LoggerConfig {
	/** Minimum log level to output (default: DEBUG in dev, WARN in production) */
	minLevel: LogLevel;
	/** Whether to include timestamps */
	includeTimestamp: boolean;
	/** Custom prefix for all logs */
	prefix?: string;
}

const defaultConfig: LoggerConfig = {
	minLevel: isDev ? LogLevel.DEBUG : LogLevel.WARN,
	includeTimestamp: isDev,
	prefix: undefined,
};

let config: LoggerConfig = { ...defaultConfig };

/**
 * Configure logger settings
 */
export function configureLogger(newConfig: Partial<LoggerConfig>) {
	config = { ...config, ...newConfig };
}

/**
 * Format log message with prefix and timestamp
 */
function formatMessage(level: string, ...args: any[]): any[] {
	const parts: any[] = [];
	
	if (config.prefix) {
		parts.push(`[${config.prefix}]`);
	}
	
	if (config.includeTimestamp) {
		const timestamp = new Date().toISOString();
		parts.push(`[${timestamp}]`);
	}
	
	parts.push(`[${level}]`);
	parts.push(...args);
	
	return parts;
}

/**
 * Check if log level should be output
 */
function shouldLog(level: LogLevel): boolean {
	return level >= config.minLevel;
}

/**
 * Logger interface
 */
export const logger = {
	/**
	 * Debug logs - only shown in development
	 * Use for detailed debugging information
	 */
	debug: (...args: any[]) => {
		if (shouldLog(LogLevel.DEBUG)) {
			console.log(...formatMessage('DEBUG', ...args));
		}
	},

	/**
	 * Info logs - shown in development, can be enabled in production
	 * Use for general informational messages
	 */
	info: (...args: any[]) => {
		if (shouldLog(LogLevel.INFO)) {
			console.info(...formatMessage('INFO', ...args));
		}
	},

	/**
	 * Warning logs - shown in all environments
	 * Use for warnings that don't break functionality
	 */
	warn: (...args: any[]) => {
		if (shouldLog(LogLevel.WARN)) {
			console.warn(...formatMessage('WARN', ...args));
		}
	},

	/**
	 * Error logs - always shown
	 * Use for errors that need attention
	 * 
	 * Automatically sends errors to Sentry if configured
	 */
	error: (...args: any[]) => {
		if (shouldLog(LogLevel.ERROR)) {
			console.error(...formatMessage('ERROR', ...args));
			
			// Send to Sentry if available and configured
			const sentry = getSentry();
			if (sentry) {
				try {
					// Extract error from args
					const errorArg = args.find(arg => arg instanceof Error);
					if (errorArg) {
						// Send Error object to Sentry
						if (sentry.captureException) {
							sentry.captureException(errorArg, {
								extra: args.filter(arg => !(arg instanceof Error)),
								tags: {
									source: 'logger'
								}
							});
						}
					} else if (args.length > 0) {
						// If no Error object, create a message from args
						const message = args.map(arg => {
							if (arg instanceof Error) {
								return arg.message;
							}
							if (typeof arg === 'object') {
								try {
									return JSON.stringify(arg);
								} catch {
									return String(arg);
								}
							}
							return String(arg);
						}).join(' ');
						
						if (sentry.captureMessage) {
							sentry.captureMessage(message, {
								level: 'error',
								extra: args,
								tags: {
									source: 'logger'
								}
							});
						}
					}
				} catch (sentryError) {
					// Don't let Sentry errors break logging
					console.warn('Failed to send error to Sentry:', sentryError);
				}
			}
		}
	},

	/**
	 * Group logs together (useful for debugging)
	 */
	group: (label: string) => {
		if (isDev) {
			console.group(label);
		}
	},

	/**
	 * End log group
	 */
	groupEnd: () => {
		if (isDev) {
			console.groupEnd();
		}
	},

	/**
	 * Group collapsed logs together
	 */
	groupCollapsed: (label: string) => {
		if (isDev) {
			console.groupCollapsed(label);
		}
	},

	/**
	 * Table output (useful for debugging objects/arrays)
	 */
	table: (data: any) => {
		if (isDev) {
			console.table(data);
		}
	},
};

/**
 * Legacy support - allows gradual migration
 * Use logger.debug() instead
 */
export const log = logger.debug;

/**
 * Export default logger
 */
export default logger;
