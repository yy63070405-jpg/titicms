class SeoService {
  constructor(siteConfig) {
    this.siteConfig = siteConfig;
  }

  generateMeta(pageType, data = {}) {
    const baseTitle = this.siteConfig.siteName || 'Free Movies Online';
    const baseDesc = this.siteConfig.siteDesc || 'Watch free movies online, full HD movies, latest releases.';
    const baseKeywords = this.siteConfig.siteKeywords || 'free movies, watch movies online, full movies, HD movies';

    let meta = {
      title: baseTitle,
      description: baseDesc,
      keywords: baseKeywords,
      canonical: this.siteConfig.siteURL || '',
      ogType: 'website',
      ogTitle: baseTitle,
      ogDescription: baseDesc,
      ogImage: '',
      ogUrl: '',
      twitterCard: 'summary_large_image',
      twitterTitle: baseTitle,
      twitterDescription: baseDesc,
      twitterImage: '',
      robots: 'index, follow'
    };

    switch (pageType) {
      case 'home':
        meta.title = `${baseTitle} | Watch Free HD Movies Online`;
        meta.description = `Watch the latest movies and TV shows online for free. ${baseDesc}`;
        meta.keywords = `free movies, online movies, watch movies, ${baseKeywords}`;
        meta.ogType = 'website';
        break;

      case 'movie':
        const movie = data.movie || {};
        const movieTitle = movie.title || '';
        const movieYear = movie.year ? ` (${movie.year})` : '';
        const movieGenre = movie.genre ? ` ${movie.genre}` : '';
        
        meta.title = `${movieTitle}${movieYear} - Watch${movieGenre} Movie Online Free - ${baseTitle}`;
        meta.description = movie.description || `${movieTitle}${movieYear} full movie online. Watch${movieGenre} movie streaming free.`;
        meta.keywords = `${movieTitle}, ${movie.genre || ''}, watch online, free movie, ${baseKeywords}`.replace(/\s+/g, ' ');
        meta.canonical = `${this.siteConfig.siteURL}/movie-${movie.id}.html`;
        meta.ogType = 'video.movie';
        meta.ogTitle = meta.title;
        meta.ogDescription = meta.description;
        meta.ogImage = movie.poster || movie.cover || '';
        meta.ogUrl = meta.canonical;
        meta.twitterTitle = meta.title;
        meta.twitterDescription = meta.description;
        meta.twitterImage = movie.poster || movie.cover || '';
        break;

      case 'category':
        const category = data.category || {};
        const catName = category.alias || category.name || '';
        
        meta.title = `${catName} Movies - Watch ${catName} Movies Online Free - ${baseTitle}`;
        meta.description = `Watch ${catName} movies online free. Latest ${catName} full movies streaming.`;
        meta.keywords = `${catName}, ${catName} movies, watch ${catName} online, free ${catName} movies, ${baseKeywords}`;
        meta.canonical = `${this.siteConfig.siteURL}/category-${category.id}.html`;
        meta.ogType = 'collection';
        meta.ogTitle = meta.title;
        meta.ogDescription = meta.description;
        break;

      case 'list':
        const listType = data.type || '';
        const typeNames = {
          'top': 'Top Rated',
          'latest': 'Latest',
          'popular': 'Popular',
          'az': 'A-Z List'
        };
        const listName = typeNames[listType] || 'Movie List';
        
        meta.title = `${listName} Movies - Watch ${listName} Movies Online - ${baseTitle}`;
        meta.description = `Browse our ${listName.toLowerCase()} movies collection. Watch free movies online.`;
        meta.keywords = `${listName.toLowerCase()} movies, ${listName.toLowerCase()} movies online, free movies, ${baseKeywords}`;
        meta.canonical = `${this.siteConfig.siteURL}/list?vt=${listType}`;
        break;

      case 'search':
        const query = data.query || '';
        meta.title = `Search Results for "${query}" - ${baseTitle}`;
        meta.description = `Search results for "${query}". Watch movies online free.`;
        meta.keywords = `${query}, search movies, watch ${query} online, ${baseKeywords}`;
        meta.canonical = `${this.siteConfig.siteURL}/search?q=${encodeURIComponent(query)}`;
        break;
    }

    return meta;
  }

  generateStructuredData(pageType, data = {}) {
    switch (pageType) {
      case 'movie':
        const movie = data.movie || {};
        return {
          '@context': 'https://schema.org',
          '@type': 'Movie',
          'name': movie.title || '',
          'alternateName': movie.titleEn || '',
          'description': movie.description || '',
          'image': movie.poster || movie.cover || '',
          'dateCreated': movie.year ? `${movie.year}-01-01` : '',
          'director': movie.director ? [{
            '@type': 'Person',
            'name': movie.director
          }] : [],
          'actor': movie.cast ? movie.cast.split(/[,，]/).filter(c => c.trim()).map(name => ({
            '@type': 'Person',
            'name': name.trim()
          })) : [],
          'genre': movie.genre ? movie.genre.split(/[,，]/).map(g => g.trim()) : [],
          'aggregateRating': {
            '@type': 'AggregateRating',
            'ratingValue': movie.rating || 0,
            'bestRating': 10
          },
          'contentRating': 'PG-13',
          'duration': movie.duration ? `PT${movie.duration.replace(/分钟|min/, 'M')}` : ''
        };

      case 'home':
        return {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          'name': this.siteConfig.siteName || '',
          'description': this.siteConfig.siteDesc || '',
          'url': this.siteConfig.siteURL || '',
          'potentialAction': {
            '@type': 'SearchAction',
            'target': `${this.siteConfig.siteURL || ''}/search?q={search_term_string}`,
            'query-input': 'required name=search_term_string'
          }
        };

      default:
        return null;
    }
  }

  generateMetaTags(pageType, data = {}) {
    const meta = this.generateMeta(pageType, data);
    const structuredData = this.generateStructuredData(pageType, data);

    let tags = [];
    
    tags.push(`<meta name="description" content="${this.escapeHtml(meta.description)}">`);
    tags.push(`<meta name="keywords" content="${this.escapeHtml(meta.keywords)}">`);
    tags.push(`<meta name="robots" content="${meta.robots}">`);
    tags.push(`<meta name="author" content="${this.escapeHtml(this.siteConfig.siteName || 'Free Movies')}">`);
    tags.push(`<meta name="viewport" content="width=device-width, initial-scale=1.0">`);
    
    if (meta.canonical) {
      tags.push(`<link rel="canonical" href="${meta.canonical}">`);
    }
    
    tags.push(`<meta property="og:type" content="${meta.ogType}">`);
    tags.push(`<meta property="og:title" content="${this.escapeHtml(meta.ogTitle)}">`);
    tags.push(`<meta property="og:description" content="${this.escapeHtml(meta.ogDescription)}">`);
    if (meta.ogUrl) tags.push(`<meta property="og:url" content="${meta.ogUrl}">`);
    if (meta.ogImage) tags.push(`<meta property="og:image" content="${meta.ogImage}">`);
    
    tags.push(`<meta name="twitter:card" content="${meta.twitterCard}">`);
    tags.push(`<meta name="twitter:title" content="${this.escapeHtml(meta.twitterTitle)}">`);
    tags.push(`<meta name="twitter:description" content="${this.escapeHtml(meta.twitterDescription)}">`);
    if (meta.twitterImage) tags.push(`<meta name="twitter:image" content="${meta.twitterImage}">`);
    
    tags.push(`<meta property="article:publisher" content="${this.siteConfig.siteURL || ''}">`);
    tags.push(`<meta property="article:section" content="Movies">`);
    
    if (structuredData) {
      tags.push(`<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`);
    }

    return tags.join('\n    ');
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  generateSitemap(movies, categories) {
    const baseURL = this.siteConfig.siteURL || 'http://localhost:3000';
    const now = new Date().toISOString();
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    xml += `  <url>\n    <loc>${baseURL}/</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    
    xml += `  <url>\n    <loc>${baseURL}/list?vt=top</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
    
    xml += `  <url>\n    <loc>${baseURL}/list?vt=latest</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
    
    xml += `  <url>\n    <loc>${baseURL}/list?vt=popular</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
    
    xml += `  <url>\n    <loc>${baseURL}/list?vt=az</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    
    categories.forEach(cat => {
      xml += `  <url>\n    <loc>${baseURL}/category-${cat.id}.html</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });
    
    movies.forEach(movie => {
      xml += `  <url>\n    <loc>${baseURL}/movie-${movie.id}.html</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    });
    
    xml += '</urlset>';
    
    return xml;
  }
}

module.exports = SeoService;