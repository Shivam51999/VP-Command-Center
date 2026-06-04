// Vercel serverless proxy — uses Node built-in https (no dependencies needed)
const https = require('https');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyD4NvXJbMb3jooE4KHpmzAbkvBiOJ6Ejz40SKz-E043blt_v31tzK5ggKllkorH4MQUg/exec';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');

  try {
    const text = await new Promise((resolve, reject) => {
      // Apps Script redirects — follow up to 5 redirects manually
      function doRequest(url, redirects) {
        if (redirects > 5) return reject(new Error('Too many redirects'));
        https.get(url, (response) => {
          // Follow redirects
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            return doRequest(response.headers.location, redirects + 1);
          }
          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => resolve(data));
          response.on('error', reject);
        }).on('error', reject);
      }
      doRequest(APPS_SCRIPT_URL, 0);
    });

    // Strip JSONP wrapper if present: gsRelay({...}) → {...}
    const stripped = text.trim()
      .replace(/^[^\(]+\(/, '')
      .replace(/\);?\s*$/, '');

    let data;
    try {
      data = JSON.parse(stripped);
    } catch(e) {
      data = JSON.parse(text);
    }

    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
