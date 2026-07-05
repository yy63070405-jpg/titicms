const fs = require('fs-extra');
const path = require('path');
const ejs = require('ejs');

class Generator {
  constructor(storage, config) {
    this.storage = storage;
    this.config = config;
    fs.ensureDirSync(config.paths.dist);
  }

  async renderTemplate(templateName, outputName, data) {
    const templatePath = path.join(this.config.paths.templates, templateName);
    const outputPath = path.join(this.config.paths.dist, outputName);
    
    const template = await fs.readFile(templatePath, 'utf-8');
    const html = ejs.render(template, data);
    await fs.writeFile(outputPath, html, 'utf-8');
    console.log(`Generated: ${outputName}`);
  }

  async generateHomePage() {
    const movies = await this.storage.getMovies();
    const settings = await this.storage.getSettings();
    const categories = await this.storage.getCategories();
    const ads = await this.storage.getAds();

    const publishedMovies = movies.filter(m => m.status === 'published');
    publishedMovies.sort((a, b) => b.id - a.id);

    const featuredMovies = publishedMovies.filter(m => m.featured).slice(0, 6);
    const recentMovies = publishedMovies.slice(0, 12);

    const trendingKeywords = [
      { keyword: 'Free Movies Online', count: 150000 },
      { keyword: 'Watch Full Movies', count: 120000 },
      { keyword: 'HD Movies Streaming', count: 100000 },
      { keyword: 'Latest Movies 2024', count: 95000 },
      { keyword: 'Action Movies', count: 90000 },
      { keyword: 'Hollywood Movies', count: 85000 },
      { keyword: 'Comedy Movies', count: 80000 },
      { keyword: 'Drama Movies', count: 75000 },
      { keyword: 'Sci-Fi Movies', count: 70000 },
      { keyword: 'Horror Movies', count: 65000 },
      { keyword: 'Adventure Movies', count: 60000 },
      { keyword: 'Thriller Movies', count: 55000 },
      { keyword: 'Romance Movies', count: 50000 },
      { keyword: 'Animation Movies', count: 45000 },
      { keyword: 'Fantasy Movies', count: 40000 }
    ];

    await this.renderTemplate('index.html', 'index.html', {
      site: settings,
      movies: publishedMovies.slice(0, 20),
      recentMovies,
      featuredMovies,
      categories,
      ads,
      page: 'home',
      trendingKeywords,
      currentYear: new Date().getFullYear()
    });
  }

  async generateMovieList() {
    const movies = await this.storage.getMovies();
    const settings = await this.storage.getSettings();
    const categories = await this.storage.getCategories();

    const publishedMovies = movies.filter(m => m.status === 'published');
    publishedMovies.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    const yearCounts = {};
    movies.filter(m => m.status === 'published' && m.year).forEach(m => {
      yearCounts[m.year] = (yearCounts[m.year] || 0) + 1;
    });
    const years = Object.entries(yearCounts)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => b.year - a.year);

    await this.renderTemplate('list.html', 'list.html', {
      site: settings,
      movies: publishedMovies,
      categories,
      years,
      pageTitle: 'List A-Z',
      viewType: 'default',
      letter: 'all',
      currentLetter: 'all',
      selectedYear: null,
      sortBy: 'az',
      currentYear: new Date().getFullYear()
    });
  }

  async generateSeriesList() {
    const movies = await this.storage.getMovies();
    const settings = await this.storage.getSettings();
    const categories = await this.storage.getCategories();

    const series = movies.filter(m => m.type === 'series' && m.status === 'published');
    series.sort((a, b) => b.id - a.id);

    await this.renderTemplate('list.html', 'series.html', {
      site: settings,
      movies: series,
      categories,
      page: 'series',
      title: '电视剧',
      currentYear: new Date().getFullYear()
    });
  }

  async generateMovieDetail(movie) {
    const settings = await this.storage.getSettings();
    const categories = await this.storage.getCategories();
    const comments = await this.storage.getCommentsByMovie(movie.id);

    await this.renderTemplate('movie.html', `movie-${movie.id}.html`, {
      site: settings,
      movie,
      categories,
      comments,
      page: 'movie',
      currentYear: new Date().getFullYear()
    });
  }

  async generateCategoryPage(category) {
    const movies = await this.storage.getMovies();
    const settings = await this.storage.getSettings();
    const categories = await this.storage.getCategories();

    const categoryMovies = movies.filter(m => m.genre === category.name && m.status === 'published');
    categoryMovies.sort((a, b) => b.id - a.id);

    await this.renderTemplate('category.html', `category-${category.slug}.html`, {
      site: settings,
      movies: categoryMovies,
      categories,
      category,
      page: 'category',
      title: category.name,
      currentYear: new Date().getFullYear()
    });
  }

  async generateSitemap() {
    const movies = await this.storage.getMovies();
    const settings = await this.storage.getSettings();
    const categories = await this.storage.getCategories();

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${settings.siteURL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${settings.siteURL}/list.html</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`;

    categories.forEach(cat => {
      sitemap += `
  <url><loc>${settings.siteURL}/category-${cat.slug}.html</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
    });

    movies.forEach(movie => {
      if (movie.status === 'published') {
        sitemap += `
  <url><loc>${settings.siteURL}/movie-${movie.id}.html</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`;
      }
    });

    sitemap += `
</urlset>`;

    const outputPath = path.join(this.config.paths.dist, 'sitemap.xml');
    await fs.writeFile(outputPath, sitemap);
    console.log('Generated: sitemap.xml');
  }

  async generateRSS() {
    const movies = await this.storage.getMovies();
    const settings = await this.storage.getSettings();

    const publishedMovies = movies.filter(m => m.status === 'published');
    publishedMovies.sort((a, b) => b.id - a.id);

    let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${settings.siteName}</title>
  <link>${settings.siteURL}</link>
  <description>${settings.siteDesc}</description>
  <atom:link href="${settings.siteURL}/rss.xml" rel="self" type="application/rss+xml"/>`;

    publishedMovies.slice(0, 10).forEach(movie => {
      rss += `
  <item>
    <title>${movie.title}</title>
    <link>${settings.siteURL}/movie-${movie.id}.html</link>
    <description>${movie.description || movie.title}</description>
  </item>`;
    });

    rss += `
</channel>
</rss>`;

    const outputPath = path.join(this.config.paths.dist, 'rss.xml');
    await fs.writeFile(outputPath, rss);
    console.log('Generated: rss.xml');
  }

  async generate404() {
    const settings = await this.storage.getSettings();
    const categories = await this.storage.getCategories();

    await this.renderTemplate('404.html', '404.html', {
      site: settings,
      categories,
      currentYear: new Date().getFullYear()
    });
  }

  async generateSearch() {
    const movies = await this.storage.getMovies();
    const settings = await this.storage.getSettings();
    const categories = await this.storage.getCategories();

    const years = [...new Set(movies.filter(m => m.year).map(m => m.year))].sort((a, b) => b - a);

    await this.renderTemplate('search.html', 'search.html', {
      site: settings,
      movies: [],
      categories,
      years,
      query: '',
      genre: '',
      year: '',
      cast: '',
      director: '',
      page: 1,
      total: movies.filter(m => m.status === 'published').length,
      totalPages: 1,
      currentYear: new Date().getFullYear(),
      getPageUrl: (pageNum) => {
        return `search.html?page=${pageNum}`;
      }
    });
  }

  async copyAssets() {
    const publicDir = this.config.paths.public;
    const distDir = this.config.paths.dist;

    if (await fs.pathExists(publicDir)) {
      await fs.copy(publicDir, distDir);
      console.log('Copied static assets');
    }
  }

  async build() {
    await this.generateHomePage();
    await this.generateMovieList();

    const movies = await this.storage.getMovies();
    const publishedMovies = movies.filter(m => m.status === 'published');
    for (const movie of publishedMovies) {
      await this.generateMovieDetail(movie);
    }

    const categories = await this.storage.getCategories();
    for (const category of categories) {
      await this.generateCategoryPage(category);
    }

    await this.generateSitemap();
    await this.generateRSS();
    await this.generate404();
    await this.generateSearch();
    await this.copyAssets();

    console.log('Build completed!');
    return { success: true };
  }
}

module.exports = Generator;