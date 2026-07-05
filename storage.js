const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

class Storage {
  constructor(dataDir) {
    this.dataDir = dataDir;
    fs.ensureDirSync(dataDir);
  }

  async loadFile(filename) {
    const filePath = path.join(this.dataDir, filename);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async saveFile(filename, data) {
    const filePath = path.join(this.dataDir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async getMovies() {
    return await this.loadFile('movies.json');
  }

  async saveMovies(movies) {
    await this.saveFile('movies.json', movies);
  }

  async addMovie(movie) {
    const movies = await this.getMovies();
    const id = movies.length > 0 ? Math.max(...movies.map(m => m.id)) + 1 : 1;
    movie.id = id;
    movie.createdAt = new Date().toISOString();
    movie.updatedAt = movie.createdAt;
    movies.push(movie);
    await this.saveMovies(movies);
    return movie;
  }

  async updateMovie(id, data) {
    const movies = await this.getMovies();
    const index = movies.findIndex(m => m.id === parseInt(id));
    if (index === -1) return null;
    movies[index] = { ...movies[index], ...data, updatedAt: new Date().toISOString() };
    await this.saveMovies(movies);
    return movies[index];
  }

  async deleteMovie(id) {
    const movies = await this.getMovies();
    const filtered = movies.filter(m => m.id !== parseInt(id));
    await this.saveMovies(filtered);
    return filtered;
  }

  async deleteMovies(ids) {
    const movies = await this.getMovies();
    const idSet = new Set(ids.map(id => parseInt(id)));
    const filtered = movies.filter(m => !idSet.has(m.id));
    await this.saveMovies(filtered);
    return filtered;
  }

  async getMovieById(id) {
    const movies = await this.getMovies();
    return movies.find(m => m.id === parseInt(id));
  }

  async getActors() {
    return await this.loadFile('actors.json');
  }

  async saveActors(actors) {
    await this.saveFile('actors.json', actors);
  }

  async addActor(actor) {
    const actors = await this.getActors();
    const id = actors.length > 0 ? Math.max(...actors.map(a => a.id)) + 1 : 1;
    actor.id = id;
    actor.createdAt = new Date().toISOString();
    actors.push(actor);
    await this.saveActors(actors);
    return actor;
  }

  async updateActor(id, data) {
    const actors = await this.getActors();
    const index = actors.findIndex(a => a.id === parseInt(id));
    if (index === -1) return null;
    actors[index] = { ...actors[index], ...data };
    await this.saveActors(actors);
    return actors[index];
  }

  async deleteActor(id) {
    const actors = await this.getActors();
    const filtered = actors.filter(a => a.id !== parseInt(id));
    await this.saveActors(filtered);
    return filtered;
  }

  async getComments() {
    return await this.loadFile('comments.json');
  }

  async saveComments(comments) {
    await this.saveFile('comments.json', comments);
  }

  async addComment(comment) {
    const comments = await this.getComments();
    const id = comments.length > 0 ? Math.max(...comments.map(c => c.id)) + 1 : 1;
    comment.id = id;
    comment.createdAt = new Date().toISOString();
    comments.push(comment);
    await this.saveComments(comments);
    return comment;
  }

  async deleteComment(id) {
    const comments = await this.getComments();
    const filtered = comments.filter(c => c.id !== parseInt(id));
    await this.saveComments(filtered);
    return filtered;
  }

  async getCommentsByMovie(movieId) {
    const comments = await this.getComments();
    return comments.filter(c => c.movieId === parseInt(movieId)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getAds() {
    return await this.loadFile('ads.json');
  }

  async saveAds(ads) {
    await this.saveFile('ads.json', ads);
  }

  async addAd(ad) {
    const ads = await this.getAds();
    const id = ads.length > 0 ? Math.max(...ads.map(a => a.id)) + 1 : 1;
    ad.id = id;
    ads.push(ad);
    await this.saveAds(ads);
    return ad;
  }

  async updateAd(id, data) {
    const ads = await this.getAds();
    const index = ads.findIndex(a => a.id === parseInt(id));
    if (index === -1) return null;
    ads[index] = { ...ads[index], ...data };
    await this.saveAds(ads);
    return ads[index];
  }

  async deleteAd(id) {
    const ads = await this.getAds();
    const filtered = ads.filter(a => a.id !== parseInt(id));
    await this.saveAds(filtered);
    return filtered;
  }

  async getSettings() {
    try {
      const data = await this.loadFile('settings.json');
      if (!data || Object.keys(data).length === 0) {
        return this.getDefaultSettings();
      }
      return data;
    } catch {
      return this.getDefaultSettings();
    }
  }

  async saveSettings(settings) {
    await this.saveFile('settings.json', settings);
    return settings;
  }

  getDefaultSettings() {
    return {
      siteName: '影视天堂',
      siteURL: 'http://localhost:3000',
      siteDesc: '最新电影电视剧在线观看',
      siteKeywords: '电影,电视剧,在线观看',
      themeColor: '#e50914',
      footerText: '© 2026 影视天堂 版权所有',
      adsEnabled: true
    };
  }

  async getCategories() {
    return await this.loadFile('categories.json');
  }

  async saveCategories(categories) {
    await this.saveFile('categories.json', categories);
  }

  async initCategories() {
    const categories = await this.getCategories();
    if (categories.length === 0) {
      const defaultCategories = [
        { id: 1, name: '动作', slug: 'action', icon: '🎬' },
        { id: 2, name: '喜剧', slug: 'comedy', icon: '😂' },
        { id: 3, name: '爱情', slug: 'romance', icon: '💕' },
        { id: 4, name: '科幻', slug: 'scifi', icon: '👽' },
        { id: 5, name: '恐怖', slug: 'horror', icon: '👻' },
        { id: 6, name: '悬疑', slug: 'mystery', icon: '🔍' },
        { id: 7, name: '剧情', slug: 'drama', icon: '🎭' },
        { id: 8, name: '动画', slug: 'animation', icon: '🐱' }
      ];
      await this.saveCategories(defaultCategories);
      return defaultCategories;
    }
    return categories;
  }

  async getAdmins() {
    return await this.loadFile('admins.json');
  }

  async saveAdmins(admins) {
    await this.saveFile('admins.json', admins);
  }

  async hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  async verifyAdmin(username, password) {
    const admins = await this.getAdmins();
    const admin = admins.find(a => a.username === username);
    if (!admin) return null;
    const hashedPassword = await this.hashPassword(password);
    if (admin.password === hashedPassword) {
      return { id: admin.id, username: admin.username };
    }
    return null;
  }

  async initAdmin() {
    const admins = await this.getAdmins();
    if (admins.length === 0) {
      const defaultAdmin = {
        id: 1,
        username: 'admin',
        password: await this.hashPassword('admin123'),
        createdAt: new Date().toISOString()
      };
      await this.saveAdmins([defaultAdmin]);
      return defaultAdmin;
    }
    return admins[0];
  }
}

module.exports = Storage;