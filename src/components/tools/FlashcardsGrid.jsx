import React, { useEffect, useMemo, useState } from 'react';
import './FlashcardsGrid.css';

function parseCards(text){
  // Try JSON first
  try {
    const j = typeof text === 'string' ? JSON.parse(text) : text;
    if (Array.isArray(j)) return j;
    if (Array.isArray(j?.cards)) return j.cards;
  } catch {}
  // Heuristic parse from free text
  const lines = String(text||'').split(/\r?\n/);
  const cards = [];
  let cur = { term:'', question:'', answer:'', ts:null };
  for (const ln of lines){
    const l = ln.trim();
    if (/^(Q:|Question:)/i.test(l)) { cur.question = l.replace(/^(Q:|Question:)/i,'').trim(); }
    else if (/^(A:|Answer:)/i.test(l)) { cur.answer = l.replace(/^(A:|Answer:)/i,'').trim(); if (cur.answer) { cards.push(cur); cur = { term:'', question:'', answer:'', ts:null }; } }
    else if (/^[-*]/.test(l)) { if (cur.question && cur.answer) { cards.push(cur); cur={term:'',question:'',answer:'',ts:null}; } }
  }
  return cards.filter(c=>c.question && c.answer);
}

export default function FlashcardsGrid({ text, videoId }){
  const [duration,setDuration] = useState(0);
  useEffect(()=>{
    (async()=>{
      try{
        if(!videoId) return;
        const r = await fetch(`/api/video/transcript?videoId=${videoId}`);
        if (r.ok){ const j = await r.json(); setDuration(j?.duration||0); }
      }catch{}
    })();
  },[videoId]);

  const allCards = useMemo(()=>parseCards(text),[text]);
  const target = Math.max(6, Math.min(40, Math.ceil((duration||0)/240))); // ~1 per 4 minutes
  const cards = allCards.slice(0, Math.max(target, allCards.length ? 0 : 6));

  return (
    <div className="fc-grid">
      {cards.length === 0 && <div className="fc-empty">No flashcards parsed. Try generating again.</div>}
      {cards.map((c,idx)=> (
        <div className="fc-card" key={idx}>
          <div className="fc-idx">#{idx+1}</div>
          {c.term && <div className="fc-term">{c.term}</div>}
          <div className="fc-q">{c.question}</div>
          <div className="fc-a">{c.answer}</div>
          {typeof c.timestamp === 'number' && (
            <button className="fc-jump" onClick={()=>window.dispatchEvent(new CustomEvent('video:seek',{detail:{seconds:Math.max(0,Math.floor(c.timestamp))}}))}>Jump ↗</button>
          )}
        </div>
      ))}
    </div>
  );
}
