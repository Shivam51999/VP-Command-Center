// Vercel serverless proxy — Engineering Daily Updates Apps Script
// File: api/engineering.js  (place in /api/ folder alongside api/sheet.js)

export default async function handler(req, res) {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw7q3Z1BTbiBsnNmquV7WxjXEDeN-3vhhm4YCOiOob4UvpOQ71KJ4LDqoUhUGePWwm0/exec';

  try {
    let url = APPS_SCRIPT_URL;
    // Forward any query params (e.g. ?action=summary)
    const qs = new URLSearchParams(req.query).toString();
    if (qs) url += '?' + qs;

    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'Accept': 'application/json' }
    });

    const text = await response.text();
    // Strip JSONP wrapper if present
    const stripped = text.trim()
      .replace(/^[^\(]+\(/, '')
      .replace(/\);?\s*$/, '');

    let data;
    try { data = JSON.parse(stripped); }
    catch(e) { data = JSON.parse(text); }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=120');
    res.status(200).json(data);

  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: err.message });
  }
}
