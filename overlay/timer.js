(() => {
  const digits = document.getElementById('digits');
  const toggle = document.getElementById('toggle');
  let running = true;
  let seconds = 25*60;

  function fmt(s){const m=Math.floor(s/60), r=s%60;return `${m.toString().padStart(2,'0')}:${r.toString().padStart(2,'0')}`}
  function tick(){ if(!running) return; seconds=Math.max(0,seconds-1); render(); if(seconds===0){ running=false; window.electronTimer?.notifyEnded?.(); }}
  function render(){ digits.textContent = fmt(seconds); window.electronTimer?.update?.({secondsLeft:seconds,running}); }

  toggle.addEventListener('click', () => { running=!running; toggle.textContent = running? 'Pause':'Resume'; render(); });

  // IPC from main for control
  window.electronTimer?.onControl?.((cmd)=>{
    if(cmd?.type==='reset'){ seconds = (cmd.minutes||25)*60; running=false; render(); }
    if(cmd?.type==='start'){ seconds = (cmd.minutes||25)*60; running=true; render(); }
    if(cmd?.type==='pause'){ running=false; render(); }
    if(cmd?.type==='resume'){ running=true; render(); }
  });

  // Bootstrap
  render();
  setInterval(tick,1000);
})();
