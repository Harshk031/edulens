import http from 'http';

import fs from 'fs';
import path from 'path';
const pickPort = async () => {
  try {
    const p = path.join(process.cwd(), '.runtime-env');
    if (fs.existsSync(p)){
      const txt = fs.readFileSync(p,'utf-8');
      const m = txt.match(/PORT=(\d+)/);
      if (m) return parseInt(m[1],10);
    }
  } catch {}
  const tryPorts = [5000,5001,5002];
  for (const p of tryPorts){
    try { await new Promise((resolve,reject)=>{ const req=http.request({hostname:'127.0.0.1',port:p,path:'/health',method:'GET'},r=>{r.resume(); resolve();}); req.on('error',reject); req.end();}); return p; } catch {}
  }
  return 5000;
};

async function post(path, body){
  const port = await pickPort();
  return new Promise((resolve,reject)=>{
    const data = Buffer.from(JSON.stringify(body));
    const req = http.request({ hostname:'127.0.0.1', port, path, method:'POST', headers:{'Content-Type':'application/json','Content-Length':data.length}}, res=>{
      let b=''; res.on('data',d=>b+=d); res.on('end',()=>resolve({ status: res.statusCode, body: b }));
    }); req.on('error',reject); req.write(data); req.end();
  });
}
async function get(path){
  const port = await pickPort();
  return new Promise((resolve,reject)=>{
    const req = http.request({ hostname:'127.0.0.1', port, path, method:'GET'}, res=>{
      let b=''; res.on('data',d=>b+=d); res.on('end',()=>resolve({ status: res.statusCode, headers: res.headers, body: b }));
    }); req.on('error',reject); req.end();
  });
}

(async ()=>{
  const en = await post('/api/tts/generate', { videoId:'test', text:'Hello from EduLens text to speech.', lang:'en', format:'mp3' });
  const enJ = JSON.parse(en.body);
  let jobId = enJ.jobId;
  if (enJ.status==='ready'){
    const s = await get('/api/tts/stream?path='+encodeURIComponent(enJ.filePath||''));
    console.log('EN stream status', s.status, s.headers['content-type']);
  } else {
    for(let i=0;i<40;i++){
      await new Promise(r=>setTimeout(r,500));
      const st = await get('/api/tts/status/'+jobId);
      const j = JSON.parse(st.body);
      if (j.status==='done'){
        const s = await get('/api/tts/stream?path='+encodeURIComponent(j.filePath||''));
        console.log('EN stream status', s.status, s.headers['content-type']);
        break;
      }
      if (j.status==='failed') throw new Error('TTS failed: '+j.error);
    }
  }
  const hi = await post('/api/tts/generate', { videoId:'test', text:'नमस्ते, यह ए़ड्यूलेंस का टेक्स्ट टू स्पीच है।', lang:'hi', format:'mp3' });
  console.log('HI req', hi.status, hi.body.slice(0,120));
})();
