const providerManager = require('../ai/providers/providerManager.cjs');

function splitBatches(segments, maxChars = 1800) {
  const batches = [];
  let cur = [];
  let len = 0;
  for (const s of segments) {
    const t = s.text || '';
    if (len + t.length > maxChars && cur.length) {
      batches.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(s);
    len += t.length;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

async function translateSegments(segments, sourceLang = 'auto') {
  const out = [];
  const batches = splitBatches(segments);
  
  console.log(`[translator] Translating ${segments.length} segments in ${batches.length} batches...`);
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    try {
      console.log(`[translator] Batch ${batchIndex + 1}/${batches.length} (${batch.length} segments)...`);
      
      const enumerated = batch.map((s, i) => `${i + 1}) ${s.text}`).join('\n');
      const prompt = `Translate the following ${sourceLang==='auto'?'non-English':''} lines to English. Preserve numbering, timestamps context, and do not add lines. Output translated lines only.` + "\n\n" + enumerated;
      
      // CRITICAL FIX: Add timeout to prevent hanging
      const TRANSLATION_TIMEOUT = 30000; // 30 seconds per batch
      
      const translationPromise = providerManager.generate({ 
        prompt, 
        maxTokens: Math.min(1200, Math.floor(enumerated.length * 1.2 / 4)), 
        temperature: 0.0, 
        model: process.env.OLLAMA_SMALL_MODEL 
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Translation timeout for batch ${batchIndex + 1}`)), TRANSLATION_TIMEOUT)
      );
      
      const resp = await Promise.race([translationPromise, timeoutPromise]);
      
      const lines = resp.text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const map = new Map();
      lines.forEach(l => {
        const m = l.match(/^(\d+)\)\s*(.*)$/);
        if (m) map.set(parseInt(m[1], 10) - 1, m[2]);
      });
      
      batch.forEach((s, i) => { 
        const translated = map.get(i) || s.text;
        out.push({ ...s, text: translated }); 
      });
      
      console.log(`[translator] ✅ Batch ${batchIndex + 1} translated`);
      
    } catch (error) {
      console.error(`[translator] ❌ Batch ${batchIndex + 1} failed: ${error.message}`);
      console.log(`[translator] ⚠️  Using original text for failed batch`);
      // If translation fails, use original text
      batch.forEach((s) => { out.push(s); });
    }
  }
  
  return out;
}

async function toEnglish(transcript) {
  const lang = transcript.language || 'en';
  if (lang === 'en') return { transcript, detectedLanguage: 'en' };
  const segmentsEn = await translateSegments(transcript.segments || [], lang);
  return { transcript: { ...transcript, language: 'en', segments: segmentsEn }, detectedLanguage: lang };
}

module.exports = { toEnglish };
