module.exports = {
  apps: [
    {
      name: 'zhichuang',
      script: './server.js',

      // 单实例 graceful reload：新进程 ready 后再干掉旧进程，全程无感
      instances: 1,
      exec_mode: 'fork',

      // 等待进程发出 process.send('ready') 才认为启动成功
      wait_ready: true,
      listen_timeout: 15000,   // 等待 ready 信号最多 15s
      kill_timeout: 10000,     // SIGTERM 后等待 10s 再强制 SIGKILL

      // 内存超过 512MB 自动重启（也是 graceful）
      max_memory_restart: '512M',

      // 崩溃后自动重启，指数退避
      restart_delay: 3000,
      max_restarts: 10,

      // 日志
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // 生产环境变量（与 .env 共存，优先级低于 .env）
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
    },
  ],
}
