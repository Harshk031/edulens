import React, { useEffect, useRef, useState } from 'react'

export default function TTSControls({ text, videoId }) {
  const [lang, setLang] = useState('en-US')
  const [speed, setSpeed] = useState(1)
  const [status, setStatus] = useState('idle')
  const [isPlaying, setIsPlaying] = useState(false)
  const utteranceRef = useRef(null)

  // Use Web Speech API (works in all modern browsers)
  const speak = () => {
    if (!text || !window.speechSynthesis) return
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = speed
    utterance.pitch = 1
    
    utterance.onstart = () => {
      setStatus('playing')
      setIsPlaying(true)
    }
    
    utterance.onend = () => {
      setStatus('idle')
      setIsPlaying(false)
    }
    
    utterance.onerror = (e) => {
      setStatus('error: ' + e.error)
      setIsPlaying(false)
    }
    
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  const pause = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.pause()
      setStatus('paused')
      setIsPlaying(false)
    }
  }

  const resume = () => {
    if (window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setStatus('playing')
      setIsPlaying(true)
    }
  }

  const stop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setStatus('idle')
      setIsPlaying(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  if (!text) return null

  return (
    <div style={{display:'flex', gap:8, alignItems:'center', padding:'8px', background:'rgba(139,92,246,0.08)', borderRadius:'8px', border:'1px solid rgba(139,92,246,0.25)'}}>
      <span style={{fontSize:12, opacity:0.7}}>🔊 Text-to-Speech:</span>
      <select value={lang} onChange={e=>setLang(e.target.value)} style={{padding:'4px 8px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(139,92,246,0.3)', borderRadius:'4px', color:'#e0e0e0', fontSize:12}}>
        <option value="en-US">English (US)</option>
        <option value="en-GB">English (UK)</option>
        <option value="hi-IN">Hindi</option>
        <option value="es-ES">Spanish</option>
        <option value="fr-FR">French</option>
      </select>
      <label style={{fontSize:12, display:'flex', alignItems:'center', gap:4}}>
        Speed: {speed.toFixed(1)}x
        <input type="range" min="0.5" max="2" step="0.1" value={speed} onChange={e=>setSpeed(parseFloat(e.target.value))} style={{width:60}} />
      </label>
      <button onClick={isPlaying ? pause : speak} style={{padding:'4px 12px', background:'var(--accent-gradient)', border:'none', borderRadius:'6px', color:'white', cursor:'pointer', fontSize:12, fontWeight:600}}>
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </button>
      {isPlaying && (
        <button onClick={stop} style={{padding:'4px 12px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(139,92,246,0.3)', borderRadius:'6px', color:'#e0e0e0', cursor:'pointer', fontSize:12}}>
          ⏹ Stop
        </button>
      )}
      <span style={{fontSize:11, opacity:0.6, marginLeft:4}}>{status}</span>
    </div>
  )
}
