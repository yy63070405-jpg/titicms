const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const session = require('express-session');
const ejs = require('ejs');

const config = require('./config');
const Storage = require('./storage');
const VidstService = require('./services/vidst');
const SeoService = require('./services/seo');
const GeoService = require('./services/geo');
const apiRoutes = require('./routes/api');
const Generator = require('./generator');

const app = express();
const port = config.port;

fs.ensureDirSync(config.paths.data);
fs.ensureDirSync(config.paths.uploads);
fs.ensureDirSync(config.paths.dist);

const storage = new Storage(config.paths.data);
const vidstService = new VidstService(config.vidst);
const geoService = new GeoService();

storage.initCategories();
storage.initAdmin();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'movie-admin-secret-key-2024',
  resave: true,
  saveUninitialized: true,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false
  }
}));

app.use('/api', apiRoutes(storage, vidstService, geoService));

app.use('/admin', (req, res, next) => {
  if (req.path === '/login.html') {
    next();
    return;
  }
  if (!req.session.user) {
    res.redirect('/admin/login.html');
    return;
  }
  next();
});

app.post('/api/build', async (req, res) => {
  try {
    const result = await generator.build();
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const settings = await storage.getSettings();
    const movies = await storage.getMovies();
    const categories = await storage.getCategories();
    const seoService = new SeoService(settings);
    const sitemap = seoService.generateSitemap(movies, categories);
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    res.status(500).send('Failed to generate sitemap');
  }
});

app.get('/api/trending', async (req, res) => {
  try {
    const keywords = geoService.getTrendingKeywords(15);
    res.json({ success: true, data: keywords });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    const suggestions = geoService.getSearchSuggestions(q || '', 8);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/location', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';
    const location = await geoService.getLocation(ip);
    const countryInfo = geoService.getCountryInfo(location.countryCode);
    const hotKeywords = geoService.getHotKeywords(location.countryCode, 10);
    
    res.json({ 
      success: true, 
      data: {
        location,
        countryInfo,
        hotKeywords
      } 
    });
  } catch (error) {
    res.json({ 
      success: true, 
      data: {
        location: null,
        countryInfo: { name: 'Unknown', language: 'en', flag: '🌍' },
        hotKeywords: geoService.getHotKeywords('US', 10)
      } 
    });
  }
});

app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/uploads', express.static(config.paths.uploads));
app.use('/admin', express.static(config.paths.admin));

app.get('/list.html', async (req, res) => {
  try {
    const { vt = 'default', letter = 'all', year: yearParam, sort = 'az' } = req.query;
    const movies = await storage.getMovies();
    const settings = await storage.getSettings();
    const categories = await storage.getCategories();
    
    let filteredMovies = movies.filter(m => m.status === 'published');
    
    let pageTitle = 'List A-Z';
    let viewType = vt;
    
    if (viewType === 'year') {
      pageTitle = 'Year';
      if (yearParam) {
        filteredMovies = filteredMovies.filter(m => m.year == yearParam);
        pageTitle = `Year ${yearParam}`;
      }
    } else if (viewType === 'top') {
      pageTitle = 'Trending';
      filteredMovies.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      if (letter !== 'all') {
        filteredMovies = filteredMovies.filter(m => {
          const firstChar = (m.title || '').charAt(0).toUpperCase();
          return firstChar === letter;
        });
        pageTitle = `List ${letter}`;
      }
    }
    
    if (sort === 'az') {
      filteredMovies.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sort === 'za') {
      filteredMovies.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    } else if (sort === 'newest') {
      filteredMovies.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (sort === 'top') {
      filteredMovies.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    
    const yearCounts = {};
    movies.filter(m => m.status === 'published' && m.year).forEach(m => {
      yearCounts[m.year] = (yearCounts[m.year] || 0) + 1;
    });
    const years = Object.entries(yearCounts)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => b.year - a.year);
    
    const template = await fs.readFile(path.join(config.paths.templates, 'list.html'), 'utf-8');
    const html = ejs.render(template, {
      site: settings,
      movies: filteredMovies,
      categories,
      years,
      pageTitle,
      viewType,
      letter,
      currentLetter: letter,
      selectedYear: yearParam || null,
      sortBy: sort,
      currentYear: new Date().getFullYear()
    });
    
    res.send(html);
  } catch (error) {
    res.status(500).send('页面加载失败: ' + error.message);
  }
});

app.get('/search.html', async (req, res) => {
  try {
    const { q, year, genre, cast, director, page = 1 } = req.query;
    const movies = await storage.getMovies();
    const settings = await storage.getSettings();
    const categories = await storage.getCategories();
    
    let filteredMovies = movies.filter(m => m.status === 'published');
    
    if (q) {
      const query = q.toLowerCase();
      filteredMovies = filteredMovies.filter(m => 
        (m.title && m.title.toLowerCase().includes(query)) ||
        (m.titleEn && m.titleEn.toLowerCase().includes(query)) ||
        (m.description && m.description.toLowerCase().includes(query)) ||
        (m.cast && m.cast.toLowerCase().includes(query)) ||
        (m.director && m.director.toLowerCase().includes(query))
      );
    }
    
    if (year) {
      filteredMovies = filteredMovies.filter(m => m.year == year);
    }
    
    if (genre) {
      filteredMovies = filteredMovies.filter(m => m.genre === genre);
    }
    
    if (cast) {
      const castQuery = cast.toLowerCase();
      filteredMovies = filteredMovies.filter(m => m.cast && m.cast.toLowerCase().includes(castQuery));
    }
    
    if (director) {
      const dirQuery = director.toLowerCase();
      filteredMovies = filteredMovies.filter(m => m.director && m.director.toLowerCase().includes(dirQuery));
    }
    
    const years = [...new Set(movies.filter(m => m.year).map(m => m.year))].sort((a, b) => b - a);
    const limit = 20;
    const pageNum = parseInt(page);
    const start = (pageNum - 1) * limit;
    const end = start + limit;
    const paginatedMovies = filteredMovies.slice(start, end);
    const totalPages = Math.ceil(filteredMovies.length / limit);
    
    const getPageUrl = (pageNum) => {
      let url = '/search.html?';
      const params = [];
      if (q) params.push('q=' + encodeURIComponent(q));
      if (year) params.push('year=' + year);
      if (genre) params.push('genre=' + encodeURIComponent(genre));
      if (cast) params.push('cast=' + encodeURIComponent(cast));
      if (director) params.push('director=' + encodeURIComponent(director));
      params.push('page=' + pageNum);
      return url + params.join('&');
    };
    
    const template = await fs.readFile(path.join(config.paths.templates, 'search.html'), 'utf-8');
    const html = ejs.render(template, {
      site: settings,
      movies: paginatedMovies,
      categories,
      years,
      query: q || '',
      genre: genre || '',
      year: year || '',
      cast: cast || '',
      director: director || '',
      page: pageNum,
      total: filteredMovies.length,
      totalPages,
      currentYear: new Date().getFullYear(),
      getPageUrl
    });
    
    res.send(html);
  } catch (error) {
    res.status(500).send('搜索失败: ' + error.message);
  }
});

app.get('/movie/:id.html', async (req, res) => {
  try {
    const { id } = req.params;
    const movie = await storage.getMovie(id);
    if (!movie) {
      const template = await fs.readFile(path.join(config.paths.templates, '404.html'), 'utf-8');
      return res.status(404).send(template);
    }
    
    const settings = await storage.getSettings();
    const categories = await storage.getCategories();
    const relatedMovies = await storage.getMovies();
    
    const template = await fs.readFile(path.join(config.paths.templates, 'movie.html'), 'utf-8');
    const html = ejs.render(template, {
      site: settings,
      movie,
      categories,
      relatedMovies: relatedMovies.filter(m => m.id !== id && m.genre === movie.genre).slice(0, 8)
    });
    
    res.send(html);
  } catch (error) {
    res.status(500).send('电影加载失败: ' + error.message);
  }
});

app.get('/category/:id.html', async (req, res) => {
  try {
    const { id } = req.params;
    const categories = await storage.getCategories();
    const category = categories.find(c => c.id === id || c.alias === id);
    
    if (!category) {
      const template = await fs.readFile(path.join(config.paths.templates, '404.html'), 'utf-8');
      return res.status(404).send(template);
    }
    
    const settings = await storage.getSettings();
    const movies = await storage.getMovies();
    
    const filteredMovies = movies.filter(m => m.status === 'published' && m.genre === category.id);
    
    const template = await fs.readFile(path.join(config.paths.templates, 'category.html'), 'utf-8');
    const html = ejs.render(template, {
      site: settings,
      category,
      categories,
      movies: filteredMovies,
      currentYear: new Date().getFullYear()
    });
    
    res.send(html);
  } catch (error) {
    res.status(500).send('分类加载失败: ' + error.message);
  }
});

app.get('/', async (req, res) => {
  try {
    const movies = await storage.getMovies();
    const settings = await storage.getSettings();
    const categories = await storage.getCategories();
    
    const publishedMovies = movies.filter(m => m.status === 'published');
    const featuredMovies = publishedMovies.filter(m => m.featured).slice(0, 10);
    const recentMovies = [...publishedMovies].sort((a, b) => (b.year || 0) - (a.year || 0)).slice(0, 12);
    const trendingKeywords = geoService.getTrendingKeywords(10);
    
    const template = await fs.readFile(path.join(config.paths.templates, 'index.html'), 'utf-8');
    const html = ejs.render(template, {
      site: settings,
      movies: publishedMovies,
      featuredMovies,
      recentMovies,
      trendingKeywords,
      categories,
      page: 'home',
      currentYear: new Date().getFullYear()
    });
    
    res.send(html);
  } catch (error) {
    res.status(500).send('首页加载失败: ' + error.message);
  }
});

app.use('/', express.static(config.paths.dist));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Admin: http://localhost:${port}/admin/index.html`);
});