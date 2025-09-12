module.exports = {
    apps: [{
      name: 'openshutter',
      script: 'pnpm',
      args: 'start',
      cwd: '/var/www/yourdomain.com',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      env_file: '/var/www/yourdomain.com/.env',
      
      // Logging
      log_file: '/var/www/yourdomain.com/logs/combined.log',
      out_file: '/var/www/yourdomain.com/logs/out.log',
      error_file: '/var/www/yourdomain.com/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Auto restart settings
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 4000,
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Process management
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }]
  }
