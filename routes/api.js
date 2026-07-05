const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');

const upload = multer({
  dest: './uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }
});

function jsonResponse(res, data) {
  res.json(data);
}

function errorResponse(res, message, status = 500) {
  res.status(status).json({ success: false, error: message });
}

function generateToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

const tokenStore = {};

function requireAuth(req, res, next) {
  if (req.session.user) {
    next();
    return;
  }
  
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (tokenStore[token]) {
      req.session.user = tokenStore[token];
      next();
      return;
    }
  }
  
  errorResponse(res, 'Unauthorized', 401);
}

module.exports = function(storage, vidstService) {
  router.post('/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const admin = await storage.verifyAdmin(username, password);
      if (!admin) {
        errorResponse(res, 'Invalid username or password', 401);
        return;
      }
      req.session.user = admin;
      const token = generateToken();
      tokenStore[token] = admin;
      req.session.token = token;
      req.session.save((err) => {
        if (err) {
          console.log('Session save error:', err);
        }
        jsonResponse(res, { success: true, data: admin, token: token });
      });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.post('/auth/logout', (req, res) => {
    req.session.destroy();
    jsonResponse(res, { success: true });
  });

  router.get('/auth/check', (req, res) => {
    if (req.session.user) {
      jsonResponse(res, { success: true, data: req.session.user });
    } else {
      jsonResponse(res, { success: false, error: 'Not logged in' });
    }
  });

  router.get('/douban/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        errorResponse(res, '请输入搜索关键词', 400);
        return;
      }
      
      const response = await axios.get('https://movie.douban.com/j/subject_suggest', {
        params: { q: q },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://movie.douban.com/'
        }
      });
      
      const results = response.data.map(item => ({
        id: item.id,
        title: item.title,
        titleEn: item.sub_title || '',
        year: parseInt(item.year) || '',
        poster: item.img || '',
        cover: item.img || '',
        type: item.type || 'movie'
      }));
      
      jsonResponse(res, { success: true, data: results });
    } catch (error) {
      errorResponse(res, '搜索失败: ' + error.message);
    }
  });

  router.get('/douban/detail/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      let title = '';
      let titleEn = '';
      let year = '';
      let rating = 0;
      let director = '';
      let cast = '';
      let genre = '';
      let duration = '';
      let description = '';
      let poster = '';
      
      try {
        const suggestResponse = await axios.get('https://movie.douban.com/j/subject_suggest', {
          params: { q: id },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://movie.douban.com/'
          }
        });
        
        const suggestItem = suggestResponse.data.find(item => item.id === id);
        
        if (suggestItem) {
          title = suggestItem.title || '';
          titleEn = suggestItem.sub_title || '';
          year = suggestItem.year || '';
          poster = suggestItem.img || '';
        }
        
        const subjectResponse = await axios.get(`https://m.douban.com/movie/subject/${id}/`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
            'Referer': 'https://m.douban.com/movie/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });
        
        const html = subjectResponse.data;
        
        const ratingMatch = html.match(/<meta itemprop="ratingValue" content="([\d.]+)"/);
        const subMetaMatch = html.match(/<div class="sub-meta">([^<]+)<\/div>/);
        const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
        const posterMatch = html.match(/<img src="([^"]+)"\s*\/>\s*<span class="cover-count">/);
        
        if (!title) {
          const titleMatch = html.match(/<div class="sub-title">([^<]+)<\/div>/);
          title = titleMatch ? titleMatch[1].trim() : '';
        }
        
        if (!titleEn) {
          const titleEnMatch = html.match(/<div class="sub-original-title">([^<]+)<\/div>/);
          titleEn = titleEnMatch ? titleEnMatch[1].trim() : '';
        }
        
        if (!poster) {
          poster = posterMatch ? posterMatch[1] : '';
        }
        
        rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
        description = descMatch ? descMatch[1].trim().replace(/.*?简介[：:] */, '').replace(/[\s\n]+/g, ' ') : '';
        
        const castMatches = description.match(/（([^（）]+?) 饰）/g);
        if (castMatches) {
          cast = castMatches.slice(0, 5).map(c => c.replace(/[（）饰]/g, '').trim()).join(', ');
        }
        
        if (subMetaMatch) {
          const meta = subMetaMatch[1].trim();
          const parts = meta.split(' / ');
          if (parts.length >= 3) {
            genre = parts[1].trim();
            const yearMatch = meta.match(/(\d{4})/);
            if (yearMatch && !year) {
              year = yearMatch[1];
            }
          }
          const durationMatch = meta.match(/片长(\d+分钟)/);
          duration = durationMatch ? durationMatch[1] : '';
        }
        
        const allLinks = html.match(/<a[^>]*>([^<]+)<\/a>/g);
        if (allLinks) {
          for (let i = 0; i < allLinks.length; i++) {
            const linkText = allLinks[i].replace(/<[^>]+>/g, '').trim();
            const nextLink = allLinks[i + 1] ? allLinks[i + 1].replace(/<[^>]+>/g, '').trim() : '';
            const prevLink = allLinks[i - 1] ? allLinks[i - 1].replace(/<[^>]+>/g, '').trim() : '';
            
            if (!director && (prevLink === '导演' || prevLink.includes('导演'))) {
              director = linkText;
            }
            
            if (!cast && (prevLink === '主演' || prevLink.includes('主演'))) {
              const castList = [];
              let j = i;
              while (j < Math.min(i + 5, allLinks.length)) {
                castList.push(allLinks[j].replace(/<[^>]+>/g, '').trim());
                j++;
              }
              cast = castList.join(', ');
            }
          }
        }
        
        if (!director) {
          const creditMatch = html.match(/<div class="credits">[\s\S]*?<\/div>/);
          if (creditMatch) {
            const creditLinks = creditMatch[0].match(/<a[^>]*>([^<]+)<\/a>/g);
            if (creditLinks && creditLinks.length > 0) {
              director = creditLinks[0].replace(/<[^>]+>/g, '').trim();
              if (!cast) {
                cast = creditLinks.slice(1, 6).map(c => c.replace(/<[^>]+>/g, '').trim()).join(', ');
              }
            }
          }
        }
        
      } catch (detailError) {
        console.log('Detail fetch failed:', detailError.message);
        errorResponse(res, '获取电影详情失败', 500);
        return;
      }
      
      if (!title) {
        errorResponse(res, '未找到该电影', 404);
        return;
      }
      
      const data = {
        id: id,
        title: title,
        titleEn: titleEn,
        year: parseInt(year) || '',
        rating: rating,
        poster: poster,
        cover: poster,
        director: director,
        cast: cast,
        genre: genre,
        duration: duration,
        description: description
      };
      
      jsonResponse(res, { success: true, data });
    } catch (error) {
      errorResponse(res, '获取详情失败: ' + error.message);
    }
  });

  router.get('/movies', async (req, res) => {
    try {
      const { q, year, genre, cast, director, page = 1, limit = 20 } = req.query;
      let movies = await storage.getMovies();
      
      if (q) {
        const query = q.toLowerCase();
        movies = movies.filter(m => 
          (m.title && m.title.toLowerCase().includes(query)) ||
          (m.titleEn && m.titleEn.toLowerCase().includes(query)) ||
          (m.description && m.description.toLowerCase().includes(query)) ||
          (m.cast && m.cast.toLowerCase().includes(query)) ||
          (m.director && m.director.toLowerCase().includes(query))
        );
      }
      
      if (year) {
        movies = movies.filter(m => m.year == year);
      }
      
      if (genre) {
        movies = movies.filter(m => m.genre === genre);
      }
      
      if (cast) {
        const castQuery = cast.toLowerCase();
        movies = movies.filter(m => m.cast && m.cast.toLowerCase().includes(castQuery));
      }
      
      if (director) {
        const dirQuery = director.toLowerCase();
        movies = movies.filter(m => m.director && m.director.toLowerCase().includes(dirQuery));
      }
      
      const start = (page - 1) * limit;
      const end = start + parseInt(limit);
      const paginatedMovies = movies.slice(start, end);
      
      jsonResponse(res, { 
        success: true, 
        data: paginatedMovies, 
        total: movies.length,
        page: parseInt(page),
        totalPages: Math.ceil(movies.length / limit)
      });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.post('/movies', requireAuth, async (req, res) => {
    try {
      const movie = await storage.addMovie(req.body);
      jsonResponse(res, { success: true, data: movie });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.get('/movies/:id', async (req, res) => {
    try {
      const movie = await storage.getMovieById(req.params.id);
      if (!movie) {
        errorResponse(res, 'Movie not found', 404);
        return;
      }
      jsonResponse(res, { success: true, data: movie });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.put('/movies/:id', requireAuth, async (req, res) => {
    try {
      const movie = await storage.updateMovie(req.params.id, req.body);
      if (!movie) {
        errorResponse(res, 'Movie not found', 404);
        return;
      }
      jsonResponse(res, { success: true, data: movie });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.delete('/movies/batch', requireAuth, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        errorResponse(res, 'Invalid request', 400);
        return;
      }
      await storage.deleteMovies(ids);
      jsonResponse(res, { success: true });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.delete('/movies/:id', requireAuth, async (req, res) => {
    try {
      await storage.deleteMovie(req.params.id);
      jsonResponse(res, { success: true });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.get('/movies/:id/episodes', async (req, res) => {
    try {
      const movie = await storage.getMovieById(req.params.id);
      if (!movie) {
        errorResponse(res, 'Movie not found', 404);
        return;
      }
      jsonResponse(res, { success: true, data: movie.episodes || [] });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.post('/movies/:id/episodes', requireAuth, async (req, res) => {
    try {
      const movie = await storage.getMovieById(req.params.id);
      if (!movie) {
        errorResponse(res, 'Movie not found', 404);
        return;
      }
      if (!movie.episodes) movie.episodes = [];
      const episode = { ...req.body, id: Date.now() };
      movie.episodes.push(episode);
      await storage.updateMovie(req.params.id, movie);
      jsonResponse(res, { success: true, data: episode });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.get('/actors', async (req, res) => {
    try {
      const actors = await storage.getActors();
      jsonResponse(res, { success: true, data: actors, total: actors.length });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.post('/actors', requireAuth, async (req, res) => {
    try {
      const actor = await storage.addActor(req.body);
      jsonResponse(res, { success: true, data: actor });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.get('/actors/:id', async (req, res) => {
    try {
      const actors = await storage.getActors();
      const actor = actors.find(a => a.id === parseInt(req.params.id));
      if (!actor) {
        errorResponse(res, 'Actor not found', 404);
        return;
      }
      jsonResponse(res, { success: true, data: actor });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.put('/actors/:id', requireAuth, async (req, res) => {
    try {
      const actor = await storage.updateActor(req.params.id, req.body);
      if (!actor) {
        errorResponse(res, 'Actor not found', 404);
        return;
      }
      jsonResponse(res, { success: true, data: actor });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.delete('/actors/:id', requireAuth, async (req, res) => {
    try {
      await storage.deleteActor(req.params.id);
      jsonResponse(res, { success: true });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.get('/comments', async (req, res) => {
    try {
      const comments = await storage.getComments();
      jsonResponse(res, { success: true, data: comments, total: comments.length });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.get('/movies/:id/comments', async (req, res) => {
    try {
      const comments = await storage.getCommentsByMovie(req.params.id);
      jsonResponse(res, { success: true, data: comments, total: comments.length });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.post('/comments', async (req, res) => {
    try {
      const comment = await storage.addComment(req.body);
      jsonResponse(res, { success: true, data: comment });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.delete('/comments/:id', async (req, res) => {
    try {
      await storage.deleteComment(req.params.id);
      jsonResponse(res, { success: true });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.get('/ads', async (req, res) => {
    try {
      const ads = await storage.getAds();
      jsonResponse(res, { success: true, data: ads, total: ads.length });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.post('/ads', requireAuth, async (req, res) => {
    try {
      const ad = await storage.addAd(req.body);
      jsonResponse(res, { success: true, data: ad });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.put('/ads/:id', requireAuth, async (req, res) => {
    try {
      const ad = await storage.updateAd(req.params.id, req.body);
      if (!ad) {
        errorResponse(res, 'Ad not found', 404);
        return;
      }
      jsonResponse(res, { success: true, data: ad });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.delete('/ads/:id', requireAuth, async (req, res) => {
    try {
      await storage.deleteAd(req.params.id);
      jsonResponse(res, { success: true });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.get('/settings', async (req, res) => {
    try {
      const settings = await storage.getSettings();
      jsonResponse(res, { success: true, data: settings });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.put('/settings', requireAuth, async (req, res) => {
    try {
      const settings = await storage.saveSettings(req.body);
      jsonResponse(res, { success: true, data: settings });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.get('/categories', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      jsonResponse(res, { success: true, data: categories });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.post('/categories', requireAuth, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      const newCategory = {
        id: Date.now(),
        name: req.body.name,
        slug: req.body.slug,
        icon: req.body.icon || '🏷️'
      };
      categories.push(newCategory);
      await storage.saveCategories(categories);
      jsonResponse(res, { success: true, data: newCategory });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.put('/categories/:id', requireAuth, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      const index = categories.findIndex(c => c.id === parseInt(req.params.id));
      if (index === -1) {
        errorResponse(res, 'Category not found', 404);
        return;
      }
      categories[index] = { ...categories[index], ...req.body };
      await storage.saveCategories(categories);
      jsonResponse(res, { success: true, data: categories[index] });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.delete('/categories/:id', requireAuth, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      const filtered = categories.filter(c => c.id !== parseInt(req.params.id));
      await storage.saveCategories(filtered);
      jsonResponse(res, { success: true });
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  router.get('/vidst/account-info', requireAuth, async (req, res) => {
    try {
      const info = await vidstService.getAccountInfo();
      jsonResponse(res, { success: true, data: info });
    } catch (error) {
      jsonResponse(res, { success: false, error: error.message });
    }
  });

  router.get('/vidst/files', requireAuth, async (req, res) => {
    try {
      const files = await vidstService.getFiles();
      jsonResponse(res, { success: true, data: files });
    } catch (error) {
      jsonResponse(res, { success: false, error: error.message });
    }
  });

  router.post('/vidst/upload-url', requireAuth, async (req, res) => {
    try {
      const result = await vidstService.uploadURL(req.body.url);
      jsonResponse(res, { success: true, data: result });
    } catch (error) {
      jsonResponse(res, { success: false, error: error.message });
    }
  });

  router.get('/vidst/upload-info', requireAuth, async (req, res) => {
    try {
      const tokenResult = await vidstService.getUploadToken();
      const serverResult = await vidstService.getUploadServer();
      
      jsonResponse(res, {
        success: true,
        data: {
          token: tokenResult.result,
          uploadUrl: serverResult.result
        }
      });
    } catch (error) {
      jsonResponse(res, { success: false, error: error.message });
    }
  });

  router.post('/vidst/upload-complete', requireAuth, async (req, res) => {
    try {
      const { token } = req.body;
      const result = await vidstService.request('upload/complete', { token });
      
      let videoUrl = '';
      let fileId = '';
      const fileInfo = result.result || {};
      
      if (fileInfo.url) {
        videoUrl = fileInfo.url;
      } else if (fileInfo.download_url) {
        videoUrl = fileInfo.download_url;
      } else if (fileInfo.file_url) {
        videoUrl = fileInfo.file_url;
      } else if (fileInfo.play_url) {
        videoUrl = fileInfo.play_url;
      } else if (fileInfo.link) {
        videoUrl = fileInfo.link;
      }
      
      fileId = fileInfo.file_id || fileInfo.id || fileInfo.fileId || '';

      jsonResponse(res, {
        success: true,
        data: {
          url: videoUrl,
          fileId: fileId,
          result: result
        }
      });
    } catch (error) {
      jsonResponse(res, { success: false, error: error.message });
    }
  });

  router.post('/upload/video', requireAuth, upload.single('video'), async (req, res) => {
    try {
      if (!req.file) {
        errorResponse(res, 'No file uploaded', 400);
        return;
      }

      const newPath = './uploads/' + req.file.filename + path.extname(req.file.originalname);
      await fs.rename(req.file.path, newPath);

      try {
        const vidstResult = await vidstService.uploadFile(newPath);
        
        const videoUrl = vidstResult.videoUrl;
        const fileId = vidstResult.fileId;

        if (!videoUrl) {
          throw new Error('Failed to get video URL from vidst response');
        }

        await fs.remove(newPath);

        jsonResponse(res, {
          success: true,
          data: {
            filename: req.file.originalname,
            url: videoUrl,
            fileId: fileId,
            uploadedToVidst: true,
            vidstResponse: vidstResult
          }
        });
      } catch (vidstError) {
        const settings = await storage.getSettings();
        const fileURL = settings.siteURL + '/uploads/' + req.file.filename + path.extname(req.file.originalname);
        
        jsonResponse(res, {
          success: true,
          data: {
            filename: req.file.originalname,
            url: fileURL,
            fileId: req.file.filename,
            uploadedToVidst: false,
            vidstError: vidstError.message
          }
        });
      }
    } catch (error) {
      errorResponse(res, error.message);
    }
  });

  return router;
};