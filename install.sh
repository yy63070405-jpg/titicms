#!/bin/bash

echo "=========================================="
echo "  TitiCMS 一键安装脚本"
echo "  Debian 12/13 系统"
echo "=========================================="

if [ "$(id -u)" != "0" ]; then
    echo "错误: 请以 root 用户运行此脚本"
    exit 1
fi

echo ""
echo "[1/8] 更新系统..."
apt update && apt upgrade -y

echo ""
echo "[2/8] 安装必要工具..."
apt install -y curl git unzip

echo ""
echo "[3/8] 安装 Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo ""
echo "[4/8] 创建项目目录..."
mkdir -p /opt/titicms
cd /opt/titicms

echo ""
echo "[5/8] 克隆项目..."
git clone https://github.com/yy63070405-jpg/titicms.git .

echo ""
echo "[6/8] 安装依赖..."
npm install

echo ""
echo "[7/8] 配置防火墙..."
ufw allow 3000/tcp
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "[8/8] 安装 PM2 并启动服务..."
npm install -g pm2
pm2 start server.js --name titicms
pm2 startup
pm2 save

echo ""
echo "=========================================="
echo "  安装完成！"
echo "=========================================="
echo ""
echo "访问地址:"
echo "  前台: http://$(hostname -I | awk '{print $1}'):3000"
echo "  后台: http://$(hostname -I | awk '{print $1}'):3000/admin/index.html"
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