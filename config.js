module.exports = {
  port: process.env.PORT || 3000,
  vidst: {
    apiKey: process.env.VIDST_API_KEY || '2912a7f1ce081867396ae4e105753add',
    baseURL: process.env.VIDST_BASE_URL || 'https://vids.st/api/index.php'
  },
  paths: {
    data: './data',
    dist: './dist',
    templates: './templates',
    admin: './admin',
    public: './public',
    uploads: './uploads'
  }
}