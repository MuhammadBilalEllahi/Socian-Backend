module.exports = {
  apps: [
    {
      name: 'socian-backend',
      script: 'index.js',

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

      // Logs
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
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

// module.exports = {
//   apps: [
//     {
//       name: 'socian-backend',
//       script: 'index.js',
//       instances: 'max', // Use all available CPU cores
//       exec_mode: 'cluster',
//       env: {
//         NODE_ENV: 'development',
//         PORT: 8080
//       },
//       env_production: {
//         NODE_ENV: 'production',
//         PORT: process.env.PORT || 8080
//       },
//       // PM2 specific options
//       max_memory_restart: '1G',
//       min_uptime: '10s',
//       max_restarts: 10,
//       restart_delay: 4000,
//       // Logging
//       log_file: './logs/combined.log',
//       out_file: './logs/out.log',
//       error_file: './logs/error.log',
//       log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
//       // Monitoring
//       watch: false,
//       ignore_watch: ['node_modules', 'logs', '*.log'],
//       // Advanced options
//       kill_timeout: 5000,
//       wait_ready: true,
//       listen_timeout: 8000,
//       // Socket.IO specific for cluster mode
//       node_args: '--max-old-space-size=1024'
//     }
//   ],

//   deploy: {
//     production: {
//       user: 'node',
//     //   host: '139.59.10.100',
//     host: '0.0.0.0',
//     port: 8080,
//       ref: 'origin/main',
//       repo: 'https://github.com/MuhammadBilalEllahi/Socian-Backend.git',
//     //   path: '/var/www/socian-backend',
//       'pre-deploy-local': '',
//       'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
//       'pre-setup': ''
//     }
//   }
// }; 