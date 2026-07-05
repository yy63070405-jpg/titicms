const axios = require('axios');

async function testParseMobile() {
  try {
    const response = await axios.get('https://m.douban.com/movie/subject/1292052/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://m.douban.com/movie/'
      },
      timeout: 10000
    });
    
    const html = response.data;
    
    const titleOgMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const title = titleOgMatch ? titleOgMatch[1].replace(/ - 电影 - 豆瓣$/, '') : '';
    
    const ratingMatch = html.match(/<meta itemprop="ratingValue" content="([\d.]+)"/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
    
    const posterMatch = html.match(/<meta itemprop="image" content="([^"]+)"/);
    const poster = posterMatch ? posterMatch[1] : '';
    
    const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
    let description = descMatch ? descMatch[1] : '';
    if (description) {
      description = description.replace(/^[^：]+：/, '').replace(/^[\d.]+[^\s]*\s*/, '');
    }
    
    const yearMatch = html.match(/(\d{4})[\s\S]{1,100}评分/);
    const year = yearMatch ? parseInt(yearMatch[1]) : '';
    
    const directorMatch = html.match(/导演[^<]{0,50}<a[^>]+>([^<]+)<\/a>/);
    const director = directorMatch ? directorMatch[1] : '';
    
    const castMatch = html.match(/主演[^<]{0,50}<a[^>]+>([^<]+)<\/a>/g);
    const cast = castMatch ? castMatch.slice(0, 5).map(c => c.replace(/<[^>]+>/g, '')).join(', ') : '';
    
    const genreMatch = html.match(/类型[^<]{0,50}<span[^>]+>([^<]+)<\/span>/);
    const genre = genreMatch ? genreMatch[1] : '';
    
    const durationMatch = html.match(/片长[^<]{0,50}<span[^>]+>([^<]+)<\/span>/);
    const duration = durationMatch ? durationMatch[1] : '';
    
    console.log('Parsed data:', JSON.stringify({
      title,
      rating,
      year,
      poster,
      description,
      director,
      cast,
      genre,
      duration
    }, null, 2));
    
  } catch (error) {
    console.log('Error:', error.message);
  }
}

testParseMobile();
