const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'https://cmr.api.stroyka.kz';
const SITE_URL = 'https://app.stroyka.kz';
const LOGO_URL = 'https://app.stroyka.kz/logo.png';

async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function injectMetaTags(html, title, description, url, image) {
  html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  
  if (html.includes('<meta name="description"')) {
    html = html.replace(
      /<meta name="description" content=".*?">/,
      `<meta name="description" content="${escapeHtml(description)}">`
    );
  }
  
  html = html.replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${escapeHtml(title)}">`);
  html = html.replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${escapeHtml(description)}">`);
  html = html.replace(/<meta property="og:url" content=".*?">/, `<meta property="og:url" content="${escapeHtml(url)}">`);
  html = html.replace(/<meta property="og:image" content=".*?">/, `<meta property="og:image" content="${escapeHtml(image)}">`);
  
  html = html.replace(/<meta name="twitter:title" content=".*?">/, `<meta name="twitter:title" content="${escapeHtml(title)}">`);
  html = html.replace(/<meta name="twitter:description" content=".*?">/, `<meta name="twitter:description" content="${escapeHtml(description)}">`);
  html = html.replace(/<meta name="twitter:url" content=".*?">/, `<meta name="twitter:url" content="${escapeHtml(url)}">`);
  html = html.replace(/<meta name="twitter:image" content=".*?">/, `<meta name="twitter:image" content="${escapeHtml(image)}">`);
  
  return html;
}

module.exports = async (req, res) => {
  try {
    const regNumber = req.query.id;
    
    if (!regNumber) {
      return res.status(400).send('Missing order ID');
    }
    
    // Fetch order data
    const apiUrl = `${API_BASE_URL}/rest/api/v1/order/reg/${regNumber}`;
    const order = await fetchWithTimeout(apiUrl);
    
    // Generate meta tags
    const title = order?.name 
      ? `Stroyka.kz - Заказ: ${order.name}` 
      : 'Stroyka.kz - Заказ на стройматериалы';
    
    const description = order 
      ? `${order.name || 'Заказ'}${order.orderAmount ? ` - ${order.orderAmount}` : ''}. ${order.address?.name ? `Город: ${order.address.name}. ` : ''}${order.description ? order.description.substring(0, 100) : 'Просмотрите заказ в приложении Stroyka.kz'}...`
      : 'Просмотрите заказ на стройматериалы в приложении Stroyka.kz';
    
    const url = `${SITE_URL}/order/${regNumber}`;
    
    // Read the HTML template
    const htmlPath = path.join(process.cwd(), 'order', 'order.html');
    let html = fs.readFileSync(htmlPath, 'utf-8');
    
    // Inject meta tags
    html = injectMetaTags(html, title, description, url, LOGO_URL);
    
    // Send response with cache headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400');
    res.send(html);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
};

