#!/bin/bash

set -e

echo "=========================================="
echo "  TitiCMS 一键安装脚本"
echo "  Debian 12/13 系统"
echo "=========================================="

if [ "$(id -u)" != "0" ]; then
    echo "错误: 请以 root 用户运行此脚本"
    exit 1
fi

error_exit() {
    echo ""
    echo "❌ 错误: $1"
    exit 1
}

echo ""
echo "[1/8] 更新系统..."
apt update || error_exit "系统更新失败"
apt upgrade -y || error_exit "系统升级失败"

echo ""
echo "[2/8] 安装必要工具..."
apt install -y curl git unzip build-essential || error_exit "工具安装失败"

echo ""
echo "[3/8] 安装 Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - || error_exit "Node.js仓库配置失败"
    apt install -y nodejs || error_exit "Node.js安装失败"
else
    echo "Node.js 已安装: $(node --version)"
fi

echo ""
echo "[4/8] 检查 Node.js 版本..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "警告: Node.js 版本过低，建议升级到 20.x"
fi

echo ""
echo "[5/8] 创建项目目录..."
mkdir -p /opt/titicms || error_exit "创建目录失败"
cd /opt/titicms || error_exit "切换目录失败"

echo ""
echo "[6/8] 克隆项目..."
if [ -d ".git" ]; then
    echo "项目已存在，更新代码..."
    git pull origin main || error_exit "代码更新失败"
else
    git clone https://github.com/yy63070405-jpg/titicms.git . || error_exit "克隆项目失败"
fi

echo ""
echo "[7/8] 安装依赖..."
if [ ! -d "node_modules" ]; then
    npm install || error_exit "依赖安装失败"
else
    echo "依赖已安装，跳过..."
fi

echo ""
echo "[8/8] 配置防火墙..."
ufw allow 3000/tcp || echo "防火墙配置警告"
ufw allow 'Nginx Full' || echo "防火墙配置警告"
ufw --force enable || echo "防火墙启用警告"

echo ""
echo "[9/9] 安装 PM2 并启动服务..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2 || error_exit "PM2安装失败"
    pm2 startup || echo "PM2开机自启配置警告"
fi

pm2 delete titicms 2>/dev/null || true
pm2 start server.js --name titicms || error_exit "服务启动失败"
pm2 save || echo "PM2进程保存警告"

echo ""
echo "=========================================="
echo "  ✅ 安装完成！"
echo "=========================================="
echo ""
echo "访问地址:"
IP=$(hostname -I | awk '{print $1}')
echo "  前台: http://$IP:3000"
echo "  后台: http://$IP:3000/admin/index.html"
echo ""
echo "默认账号:"
echo "  用户名: admin"
echo "  密码: admin123"
echo ""
echo "常用命令:"
echo "  pm2 status          # 查看服务状态"
echo "  pm2 logs titicms    # 查看日志"
echo "  pm2 restart titicms # 重启服务"
echo ""
echo "如需配置域名和SSL，请手动安装Nginx:"
echo "  apt install nginx"
echo "  certbot --nginx -d your-domain.com"

echo ""
echo "检查服务状态..."
pm2 status