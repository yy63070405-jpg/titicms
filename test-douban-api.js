const axios = require('axios');

async function testDoubanAPI() {
  try {
    const suggestResponse = await axios.get('https://movie.douban.com/j/subject_suggest', {
      params: { q: '肖申克的救赎' },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://movie.douban.com/'
      }
    });
    
    console.log('Suggest Response:', JSON.stringify(suggestResponse.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.status, error.message);
  }
}

testDoubanAPI();