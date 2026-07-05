const axios = require('axios');

class GeoService {
  constructor() {
    this.geoIPUrl = 'http://ip-api.com/json/';
    this.cache = {};
    this.hotKeywords = [
      { keyword: 'free movies online', country: 'US', count: 150000 },
      { keyword: 'watch movies online free', country: 'US', count: 120000 },
      { keyword: 'full movies free', country: 'US', count: 95000 },
      { keyword: 'movie streaming free', country: 'US', count: 85000 },
      { keyword: 'hd movies online', country: 'US', count: 75000 },
      { keyword: 'latest movies 2024', country: 'US', count: 70000 },
      { keyword: 'best movies 2024', country: 'US', count: 65000 },
      { keyword: 'watch free movies', country: 'US', count: 60000 },
      { keyword: 'movies to watch', country: 'US', count: 55000 },
      { keyword: 'popular movies', country: 'US', count: 50000 },
      { keyword: 'film gratuit en ligne', country: 'FR', count: 45000 },
      { keyword: 'voir film en ligne gratuit', country: 'FR', count: 40000 },
      { keyword: 'film streaming gratuit', country: 'FR', count: 35000 },
      { keyword: 'peliculas online gratis', country: 'ES', count: 55000 },
      { keyword: 'ver peliculas online', country: 'ES', count: 45000 },
      { keyword: 'filmes online gratis', country: 'BR', count: 45000 },
      { keyword: 'assistir filmes online', country: 'BR', count: 40000 },
      { keyword: '映画 無料 オンライン', country: 'JP', count: 30000 },
      { keyword: '免费电影', country: 'CN', count: 80000 },
      { keyword: '在线观看电影', country: 'CN', count: 70000 },
      { keyword: 'movie download free', country: 'US', count: 60000 },
      { keyword: 'watch series online free', country: 'US', count: 80000 },
      { keyword: 'netflix movies', country: 'US', count: 100000 },
      { keyword: 'amazon prime movies', country: 'US', count: 70000 },
      { keyword: 'hollywood movies', country: 'US', count: 90000 },
      { keyword: 'bollywood movies', country: 'IN', count: 120000 },
      { keyword: 'south indian movies', country: 'IN', count: 60000 },
      { keyword: 'new movies 2024', country: 'US', count: 85000 },
      { keyword: 'top rated movies', country: 'US', count: 75000 },
      { keyword: 'action movies', country: 'US', count: 95000 },
      { keyword: 'comedy movies', country: 'US', count: 85000 },
      { keyword: 'horror movies', country: 'US', count: 75000 },
      { keyword: 'romance movies', country: 'US', count: 70000 },
      { keyword: 'drama movies', country: 'US', count: 65000 },
      { keyword: 'sci-fi movies', country: 'US', count: 60000 },
      { keyword: 'fantasy movies', country: 'US', count: 55000 },
      { keyword: 'adventure movies', country: 'US', count: 50000 },
      { keyword: 'animation movies', country: 'US', count: 45000 },
      { keyword: 'thriller movies', country: 'US', count: 55000 },
      { keyword: 'crime movies', country: 'US', count: 50000 },
      { keyword: 'family movies', country: 'US', count: 55000 },
      { keyword: 'mystery movies', country: 'US', count: 45000 }
    ];

    this.countryMappings = {
      'US': { name: 'United States', language: 'en', flag: '🇺🇸' },
      'CA': { name: 'Canada', language: 'en', flag: '🇨🇦' },
      'UK': { name: 'United Kingdom', language: 'en', flag: '🇬🇧' },
      'AU': { name: 'Australia', language: 'en', flag: '🇦🇺' },
      'FR': { name: 'France', language: 'fr', flag: '🇫🇷' },
      'DE': { name: 'Germany', language: 'de', flag: '🇩🇪' },
      'ES': { name: 'Spain', language: 'es', flag: '🇪🇸' },
      'IT': { name: 'Italy', language: 'it', flag: '🇮🇹' },
      'PT': { name: 'Portugal', language: 'pt', flag: '🇵🇹' },
      'BR': { name: 'Brazil', language: 'pt', flag: '🇧🇷' },
      'JP': { name: 'Japan', language: 'ja', flag: '🇯🇵' },
      'CN': { name: 'China', language: 'zh', flag: '🇨🇳' },
      'KR': { name: 'South Korea', language: 'ko', flag: '🇰🇷' },
      'IN': { name: 'India', language: 'hi', flag: '🇮🇳' },
      'RU': { name: 'Russia', language: 'ru', flag: '🇷🇺' },
      'MX': { name: 'Mexico', language: 'es', flag: '🇲🇽' },
      'TR': { name: 'Turkey', language: 'tr', flag: '🇹🇷' },
      'SA': { name: 'Saudi Arabia', language: 'ar', flag: '🇸🇦' },
      'AE': { name: 'United Arab Emirates', language: 'ar', flag: '🇦🇪' },
      'EG': { name: 'Egypt', language: 'ar', flag: '🇪🇬' },
      'NG': { name: 'Nigeria', language: 'en', flag: '🇳🇬' },
      'ZA': { name: 'South Africa', language: 'en', flag: '🇿🇦' },
      'ID': { name: 'Indonesia', language: 'id', flag: '🇮🇩' },
      'MY': { name: 'Malaysia', language: 'ms', flag: '🇲🇾' },
      'SG': { name: 'Singapore', language: 'en', flag: '🇸🇬' },
      'TH': { name: 'Thailand', language: 'th', flag: '🇹🇭' },
      'VN': { name: 'Vietnam', language: 'vi', flag: '🇻🇳' },
      'PH': { name: 'Philippines', language: 'en', flag: '🇵🇭' }
    };
  }

  async getLocation(ip) {
    if (this.cache[ip]) {
      return this.cache[ip];
    }

    try {
      const response = await axios.get(`${this.geoIPUrl}${ip}`, {
        timeout: 5000
      });

      const data = response.data;
      if (data.status === 'success') {
        const location = {
          ip: ip,
          country: data.country,
          countryCode: data.countryCode,
          region: data.regionName,
          city: data.city,
          latitude: data.lat,
          longitude: data.lon,
          timezone: data.timezone,
          isp: data.isp,
          org: data.org,
          as: data.as
        };
        this.cache[ip] = location;
        return location;
      }
    } catch (error) {
      console.error('Geo IP lookup failed:', error.message);
    }

    return {
      ip: ip,
      country: 'Unknown',
      countryCode: 'XX',
      region: '',
      city: '',
      latitude: 0,
      longitude: 0,
      timezone: '',
      isp: '',
      org: '',
      as: ''
    };
  }

  getCountryInfo(countryCode) {
    return this.countryMappings[countryCode] || {
      name: 'Unknown',
      language: 'en',
      flag: '🌍'
    };
  }

  getHotKeywords(countryCode = 'US', limit = 10) {
    let keywords = this.hotKeywords;
    
    if (countryCode && countryCode !== 'XX') {
      const countryKeywords = this.hotKeywords.filter(k => k.country === countryCode);
      if (countryKeywords.length > 0) {
        keywords = [...countryKeywords, ...this.hotKeywords.filter(k => k.country === 'US')];
      }
    }
    
    return keywords.slice(0, limit).map(k => k.keyword);
  }

  getTrendingKeywords(limit = 15) {
    return this.hotKeywords
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(k => ({
        keyword: k.keyword,
        country: this.getCountryInfo(k.country).name,
        flag: this.getCountryInfo(k.country).flag,
        count: k.count
      }));
  }

  getSearchSuggestions(query, limit = 5) {
    const queryLower = query.toLowerCase();
    return this.hotKeywords
      .filter(k => k.keyword.toLowerCase().includes(queryLower))
      .slice(0, limit)
      .map(k => k.keyword);
  }
}

module.exports = GeoService;