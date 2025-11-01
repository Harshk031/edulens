import http from 'http';

const ID = process.argv[2] || 'dQw4w9WgXcQ';
const URL = `http://127.0.0.1:5000/local/embed/${ID}`;

console.log('Verifying local embed route:', URL);

http.get(URL, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', (c) => (data += c));
  res.on('end', () => {
    const ok = res.statusCode === 200 && data.includes('<iframe');
    console.log(ok ? '✅ Embed HTML present' : '❌ Missing iframe or non-200');
    process.exit(ok ? 0 : 1);
  });
}).on('error', (e) => {
  console.error('Request failed:', e.message);
  process.exit(2);
});
