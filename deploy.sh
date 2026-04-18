#!/usr/bin/env bash
# deploy.sh — 智创工坊不停机部署脚本
# 用法：bash deploy.sh [--skip-build] [--skip-migrate]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
DIST_DIR="$BACKEND_DIR/../frontend/dist"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
die()  { echo -e "${RED}[deploy] 错误：${NC}$*" >&2; exit 1; }

SKIP_BUILD=false
SKIP_MIGRATE=false
for arg in "$@"; do
  [[ "$arg" == "--skip-build"   ]] && SKIP_BUILD=true
  [[ "$arg" == "--skip-migrate" ]] && SKIP_MIGRATE=true
done

log "==============================="
log "  智创工坊不停机部署开始"
log "==============================="

# ── 1. 检查依赖 ─────────────────────────────────────────
command -v node  >/dev/null 2>&1 || die "未找到 node"
command -v npm   >/dev/null 2>&1 || die "未找到 npm"
command -v pm2   >/dev/null 2>&1 || die "未找到 pm2，请先执行：npm install -g pm2"

# ── 2. 拉取最新代码 ─────────────────────────────────────
if git -C "$SCRIPT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "拉取最新代码..."
  git -C "$SCRIPT_DIR" pull origin "$(git -C "$SCRIPT_DIR" branch --show-current)"
else
  warn "不是 git 仓库，跳过 git pull"
fi

# ── 3. 安装后端依赖 ─────────────────────────────────────
log "安装后端依赖..."
cd "$BACKEND_DIR"
npm ci --omit=dev --prefer-offline 2>/dev/null || npm install --omit=dev

# ── 4. 执行数据库迁移（幂等，安全重复执行）─────────────
if [[ "$SKIP_MIGRATE" == "false" ]]; then
  log "执行数据库迁移..."
  node src/migrations/run.js
fi

# ── 5. 构建前端 ─────────────────────────────────────────
if [[ "$SKIP_BUILD" == "false" ]]; then
  log "安装前端依赖并构建..."
  cd "$FRONTEND_DIR"
  npm ci --prefer-offline 2>/dev/null || npm install
  npm run build

  log "前端构建完成：$DIST_DIR"
fi

# ── 6. 确保日志目录存在 ─────────────────────────────────
mkdir -p "$BACKEND_DIR/logs"

# ── 7. 不停机重载后端 ───────────────────────────────────
cd "$BACKEND_DIR"
if pm2 describe zhichuang >/dev/null 2>&1; then
  log "执行 PM2 graceful reload（新进程就绪后再切换，零停机）..."
  pm2 reload ecosystem.config.js --env production --update-env
else
  log "首次启动 PM2..."
  pm2 start ecosystem.config.js --env production
  pm2 save  # 持久化进程列表，开机自启
fi

# ── 8. 健康检查 ─────────────────────────────────────────
log "等待服务就绪..."
sleep 3
PORT="${PORT:-3001}"
MAX_RETRY=10
for i in $(seq 1 $MAX_RETRY); do
  if curl -sf "http://localhost:$PORT/health" >/dev/null 2>&1; then
    log "健康检查通过 ✓"
    break
  fi
  if [[ $i -eq $MAX_RETRY ]]; then
    die "健康检查失败，请查看日志：pm2 logs zhichuang"
  fi
  warn "等待中... ($i/$MAX_RETRY)"
  sleep 2
done

log "==============================="
log "  部署完成！服务正常运行中"
log "  pm2 logs zhichuang  查看日志"
log "  pm2 status          查看状态"
log "==============================="
