// Vercel serverless proxy — Finance Dashboard (Google Sheets API v4)
// File: api/finance.js  (place in /api/ folder)
// Reads Account DPR sheet and returns summary KPIs — no auth required for read

export default async function handler(req, res) {
  const SHEET_ID = '1rHVXJI2CjOViQJjt2CK42HdFBK8Q-ezltKGVkP19P7I';
  const API_KEY  = 'AIzaSyCH6NYlXSGbSscLW1wNmT2y5AEXNk-_rzo';

  try {
    // Account DPR: cols P-S = 30%, 70%, FD, Total balances (cols 16-19, 1-indexed)
    // Rows 2 onward = firms. We fetch the whole range and sum P:S columns.
    const range  = encodeURIComponent('Account DPR!A2:T200');
    const url    = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;

    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('Sheets API HTTP ' + r.status);
    const data = await r.json();
    const rows = data.values || [];

    let total30=0, total70=0, totalFD=0, totalBal=0, firmCount=0;
    for (const row of rows) {
      // Skip empty rows and grand-total rows
      if (!row[0] || row[1]==='TOTAL' || row[1]==='Grand Total') continue;
      const p = parseFloat((row[15]||'0').toString().replace(/[,₹\s]/g,'')) || 0;
      const q = parseFloat((row[16]||'0').toString().replace(/[,₹\s]/g,'')) || 0;
      const fd= parseFloat((row[17]||'0').toString().replace(/[,₹\s]/g,'')) || 0;
      const t = parseFloat((row[18]||'0').toString().replace(/[,₹\s]/g,'')) || 0;
      total30  += p;
      total70  += q;
      totalFD  += fd;
      totalBal += t || (p+q+fd);
      if (p+q+fd > 0) firmCount++;
    }

    // Also fetch latest transaction count (last 7 days)
    const txRange = encodeURIComponent('Transactions!A2:I500');
    const txUrl   = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${txRange}?key=${API_KEY}`;
    let recentTx = 0;
    try {
      const txR  = await fetch(txUrl, { headers: { Accept: 'application/json' } });
      const txD  = await txR.json();
      const txRows = txD.values || [];
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
      for (const row of txRows) {
        if (!row[0]) continue;
        const d = new Date(row[0]);
        if (!isNaN(d) && d >= cutoff) recentTx++;
      }
    } catch(e) {}

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=180');
    res.status(200).json({
      totalBalance: totalBal,
      balance30:    total30,
      balance70:    total70,
      balanceFD:    totalFD,
      activeFirms:  firmCount,
      recentTx:     recentTx,
      fetchedAt:    new Date().toISOString()
    });

  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: err.message });
  }
}
