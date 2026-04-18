# 智创工坊 - 雇主与创作者撮合平台

## 快速开始

### 1. 配置数据库
```bash
# 确保 MySQL 已启动，然后执行建表
cd backend
cp .env.example .env
# 编辑 .env，填入 DB_PASSWORD

node src/migrations/run.js
```

### 2. 启动后端
```bash
cd backend
npm run dev    # 开发模式（nodemon热重载）
# 运行在 http://localhost:3001
```

### 3. 启动前端
```bash
cd frontend
npm run dev    # 运行在 http://localhost:5173
```

### 4. 访问
- 前台：http://localhost:5173
- 管理后台：http://localhost:5173/admin
  - 默认账号：admin / admin123456

---

## 目录结构
```
zhichuang/
├── frontend/          # React + Vite + Tailwind
│   └── src/
│       ├── pages/     # 22个页面
│       ├── components/# 共用组件
│       ├── store/     # Zustand状态
│       ├── services/  # API + Socket
│       └── utils/     # 工具函数
└── backend/           # Node.js + Express
    ├── server.js      # 入口 + Socket.io
    └── src/
        ├── controllers/  # 10个业务控制器
        ├── routes/       # 统一路由
        ├── middleware/   # 认证 + 限流
        ├── config/       # 数据库配置
        ├── services/     # Socket服务
        └── migrations/   # 数据库建表SQL
```

## 阿里云ECS部署

### 环境准备
```bash
# 安装 Node.js 20+
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# 安装 PM2
npm i -g pm2

# 安装 Nginx
yum install -y nginx
```

### PM2 零停机部署
```bash
# 首次启动
cd /app/zhichuang/backend
pm2 start server.js --name zhichuang-api --instances 2 -i max
pm2 save
pm2 startup

# 更新部署
git pull
npm install
pm2 reload zhichuang-api --update-env
```

### Nginx 配置 (/etc/nginx/conf.d/zhichuang.conf)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        root /app/zhichuang/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

## 上线前必做

1. **修改 JWT_SECRET**：在 `.env` 中设置强密钥
2. **修改管理员密码**：登录后台立即修改
3. **填入短信密钥**：接入阿里云SMS
4. **填入支付密钥**：接入支付宝/微信支付SDK
5. **配置HTTPS**：使用 certbot 申请 SSL 证书
6. **开启数据库备份**：`crontab -e` 添加定时备份
