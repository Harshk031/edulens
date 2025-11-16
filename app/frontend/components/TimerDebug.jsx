import React from 'react';
import TopTimer from './TopTimer';
import FocusHourglass from './FocusHourglass';

/**
 * TimerDebug - Minimal test component to verify timer rendering
 */
export default function TimerDebug() {
  const [remaining, setRemaining] = React.useState(1500);
  const [paused, setPaused] = React.useState(false);

  return (
    <div style={{
      position: 'fixed',
      top: '100px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: 'rgba(255, 0, 0, 0.9)',
      border: '5px solid yellow',
      padding: '20px',
      borderRadius: '12px',
      display: 'flex',
      gap: '20px',
      alignItems: 'center'
    }}>
      <div style={{color: 'white', fontWeight: 'bold'}}>TIMER DEBUG:</div>
      <TopTimer 
        duration={1500}
        onEnd={() => console.log('Timer ended')}
        onTimeUpdate={(r) => setRemaining(r)}
        onPauseChange={(p) => setPaused(p)}
        hideSandglass={true}
      />
      <FocusHourglass 
        duration={1500}
        remaining={remaining}
        paused={paused}
      />
    </div>
  );
}
