/**
 * Centralized logging utility
 * 
 * Provides consistent logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - Production filtering (debug/info logs disabled in production)
 * - Easy integration with error tracking services
 * - Consistent log format
 */

const isDev = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

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
	 * TODO: Integrate with error tracking service (e.g., Sentry)
	 */
	error: (...args: any[]) => {
		if (shouldLog(LogLevel.ERROR)) {
			console.error(...formatMessage('ERROR', ...args));
			
			// In production, you might want to send to error tracking service
			if (isProduction) {
				// Example: Sentry.captureException(args[0]);
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
