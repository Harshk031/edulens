import React, { useMemo, useState } from 'react';
import './QuizView.css';

function parseQuiz(text){
  try { const j = JSON.parse(text); if (Array.isArray(j?.questions)) return j.questions; } catch {}
  const lines = String(text||'').split(/\r?\n/);
  const out = [];
  let cur = null;
  for (const ln of lines){
    const l = ln.trim();
    const q = l.match(/^\d+\.\s*(.+)/);
    if (q){ if (cur) out.push(cur); cur = { q: q[1], opts: [], answer: null }; continue; }
    const opt = l.match(/^([A-D])\)\s*(.+)/i);
    if (opt && cur){ cur.opts.push({ key: opt[1].toUpperCase(), text: opt[2] }); continue; }
    const ans = l.match(/^Answer:\s*([A-D])/i);
    if (ans && cur){ cur.answer = ans[1].toUpperCase(); }
  }
  if (cur) out.push(cur);
  return out;
}

export default function QuizView({ text }){
  const [answers, setAnswers] = useState({});
  const qs = useMemo(()=>parseQuiz(text),[text]);

  const select = (idx, key) => setAnswers(a => ({ ...a, [idx]: key }));

  return (
    <div className="quiz-wrap">
      {qs.length === 0 && <div className="quiz-empty">No quiz parsed. Try generating again.</div>}
      {qs.map((q,idx)=>{
        const picked = answers[idx];
        return (
          <div key={idx} className="quiz-item">
            <div className="quiz-q"><span className="qid">Q{idx+1}</span> {q.q}</div>
            <div className="quiz-opts">
              {q.opts.map((o,i)=>{
                const isCorrect = q.answer === o.key;
                const state = picked ? (o.key === picked ? (isCorrect ? 'ok' : 'bad') : (isCorrect ? 'ok' : '')) : '';
                return (
                  <button key={i} className={`quiz-opt ${state}`} onClick={()=>select(idx, o.key)}>
                    <span className="opt-key">{o.key}</span> {o.text}
                  </button>
                );
              })}
            </div>
            {picked && (
              <div className={`quiz-feedback ${picked === q.answer ? 'ok' : 'bad'}`}>
                {picked === q.answer ? '✔ Correct' : `✖ Incorrect • Answer: ${q.answer}`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
