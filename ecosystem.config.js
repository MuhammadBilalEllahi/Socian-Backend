module.exports = {
  apps: [
    {
      name: 'socian-backend',
      script: 'index.js',
      cwd: '/app', // Set working directory for Docker

      // Use a dynamic instance count: scale smart, not full brute-force
      instances: process.env.INSTANCES || 4, // use 'max' only when needed
      exec_mode: 'cluster',

      // ENV configs
      env: {
        NODE_ENV: 'development',
        PORT: 8080
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 8080
      },

      // Restart logic
      max_memory_restart: '1G', // restart if memory > 1GB
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Logs - use absolute paths for Docker
      log_file: '/app/logs/combined.log',
      out_file: '/app/logs/out.log',
      error_file: '/app/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // File watcher
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log'],

      // Cluster/socket tuning
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,

      // Memory limit for each worker
      node_args: '--max-old-space-size=1024'
    }
  ],

  deploy: {
    production: {
      user: 'node',

      // Host SHOULD NOT be '0.0.0.0' — use actual IP or domain!
      host: 'api.socian.app', // or a real IP/domain

      ref: 'origin/main',
      repo: 'https://github.com/MuhammadBilalEllahi/Socian-Backend.git',

      // Set path to avoid deploying to root or home dir
      path: '/var/www/socian-backend',

      'pre-deploy-local': '',

      'post-deploy':
        'npm install && pm2 reload ecosystem.config.js --env production',

      'pre-setup': ''
    }
  }
}; 