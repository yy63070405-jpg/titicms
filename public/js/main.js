function showTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
}

async function getSearchSuggestions(query) {
  try {
    const response = await fetch('/api/suggestions?q=' + encodeURIComponent(query));
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    return [];
  }
}

async function loadTrendingKeywords() {
  try {
    const response = await fetch('/api/trending');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    return [];
  }
}