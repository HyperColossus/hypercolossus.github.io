const https = require('https');
const data = new URLSearchParams({q: 'Marvel Rivals API nodejs OR python'});
const req = https.request('https://lite.duckduckgo.com/lite/', {
  method: 'POST',
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Content-Type': 'application/x-www-form-urlencoded'
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const matches = body.match(/<a class="result-url" href="(.*?)">(.*?)<\/a>/g);
    console.log(matches ? matches.slice(0, 10).join('\n') : 'no matches');
  });
});
req.write(data.toString());
req.end();
