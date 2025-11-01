// Basic verification script for YouTube embed
import http from 'http';

function get(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode);
      res.resume();
    });
    req.on('error', reject);
  });
}

(async () => {
  const code = await get('http://127.0.0.1:5173');
  console.log('Vite dev server status:', code);
  console.log('Open the app and copy https://youtu.be/dQw4w9WgXcQ then check DevTools console for VideoLoader logs.');
})();