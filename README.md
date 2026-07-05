# TitiCMS - 电影管理系统

一个基于 Node.js 的电影管理系统，支持视频托管、SEO优化、地理位置服务等功能。

## 功能特性

- 🎬 **电影管理** - 添加、编辑、删除电影，支持分类管理
- 📤 **视频上传** - 集成 Vid.st API 进行视频托管
- 📊 **SEO优化** - 自动生成 Meta 标签、结构化数据、Sitemap
- 🌍 **地理位置服务** - IP定位、热门搜索词推荐
- 🔍 **搜索功能** - 支持按片名、主演、导演、年份、类型搜索
- 📝 **评论系统** - 用户评论功能
- 📱 **响应式设计** - 适配移动端、平板和桌面端
- 📦 **静态网站生成** - 一键生成静态HTML文件

## 技术栈

- **后端**: Node.js, Express
- **模板引擎**: EJS
- **数据库**: JSON 文件存储
- **视频托管**: Vid.st API
- **前端**: HTML5, CSS3, JavaScript

## 快速开始

### 环境要求

- Node.js >= 20.x
- npm >= 10.x

### 安装步骤

#### 1. 克隆仓库

```bash
git clone https://github.com/yy63070405-jpg/titicms.git
cd titicms
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 配置 API Key

编辑 `config.js` 文件，配置 Vid.st API Key：

```javascript
vidst: {
  apiKey: 'your-api-key',
  baseURL: 'https://vids.st/api/index.php'
}
```

#### 4. 启动服务

```bash
npm start
```

服务启动后访问：
- 前台: http://localhost:3000
- 后台管理: http://localhost:3000/admin/index.html

### 默认管理员账号

- 用户名: `admin`
- 密码: `admin123`

## Debian 安装指南

### 1. 系统更新

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. 安装 Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. 克隆项目

```bash
sudo mkdir -p /opt/titicms
cd /opt/titicms
git clone https://github.com/yy63070405-jpg/titicms.git .
```

### 4. 安装依赖

```bash
npm install
```

### 5. 配置防火墙

```bash
sudo ufw allow 3000/tcp
sudo ufw reload
```

### 6. 使用 PM2 管理进程

```bash
sudo npm install -g pm2
pm2 start server.js --name titicms
pm2 startup
pm2 save
```

### 7. Nginx 反向代理（可选）

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/titicms
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/titicms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. SSL 配置（可选）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 项目结构

```
titicms/
├── admin/           # 后台管理页面
│   ├── index.html
│   └── login.html
├── data/            # JSON 数据文件（自动生成）
├── dist/            # 静态生成文件（自动生成）
├── public/          # 公共资源
│   ├── css/         # 样式文件
│   └── js/          # JavaScript 文件
├── routes/          # API 路由
│   └── api.js
├── services/        # 服务模块
│   ├── geo.js       # 地理位置服务
│   ├── seo.js       # SEO服务
│   └── vidst.js     # Vid.st API服务
├── templates/       # EJS 模板
├── uploads/         # 上传文件（自动生成）
├── config.js        # 配置文件
├── generator.js     # 静态网站生成器
├── server.js        # 主入口文件
└── storage.js       # 数据存储层
```

## API 接口

### 热门搜索词
```
GET /api/trending
```

### 搜索建议
```
GET /api/suggestions?q=keyword
```

### 地理位置信息
```
GET /api/location
```

### Sitemap
```
GET /sitemap.xml
```

## Git 操作指南

### 首次推送

```bash
# 初始化仓库
git init

# 创建 .gitignore
cat > .gitignore <<EOF
node_modules/
data/
dist/
uploads/
.env
*.log
EOF

# 添加文件
git add -A

# 提交
git commit -m "Initial commit"

# 添加远程仓库
git remote add origin https://github.com/yy63070405-jpg/titicms.git

# 推送
git branch -M main
git push -u origin main
```

### 更新代码

```bash
git add -A
git commit -m "描述你的更改"
git push origin main
```

### 拉取代码

```bash
git pull origin main
```

## 注意事项

1. **文件权限** - 确保 `data/`、`uploads/`、`dist/` 目录有读写权限
2. **安全** - 生产环境请修改默认管理员密码
3. **备份** - 定期备份 `data/` 目录
4. **Vid.st API** - 需要有效的 API Key 才能上传视频

## License

MIT License