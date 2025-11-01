// Web Audio API-based sound effects
class SoundEffects {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playTone(frequency, duration = 0.2, type = 'sine') {
    if (!this.enabled) return;
    
    this.init();
    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  // Timer completion chime - celebratory ascending tones
  timerComplete() {
    this.playTone(523.25, 0.15); // C5
    setTimeout(() => this.playTone(659.25, 0.15), 100); // E5
    setTimeout(() => this.playTone(783.99, 0.3), 200); // G5
  }

  // Timer tick every minute
  timerTick() {
    this.playTone(440, 0.1, 'triangle'); // A4
  }

  // Notification sound - gentle ping
  notification() {
    this.playTone(880, 0.15, 'sine'); // A5
    setTimeout(() => this.playTone(1046.5, 0.15, 'sine'), 80); // C6
  }

  // Focus mode activated
  focusStart() {
    this.playTone(329.63, 0.12); // E4
    setTimeout(() => this.playTone(392, 0.12), 80); // G4
    setTimeout(() => this.playTone(523.25, 0.2), 160); // C5
  }

  // Button click
  click() {
    this.playTone(1200, 0.05, 'square');
  }

  // Hover sound
  hover() {
    this.playTone(800, 0.03, 'sine');
  }

  // Error/warning
  error() {
    this.playTone(200, 0.2, 'sawtooth');
  }

  // Success
  success() {
    this.playTone(650, 0.1);
    setTimeout(() => this.playTone(800, 0.15), 60);
  }

  // Toggle sounds on/off
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

export const sounds = new SoundEffects();
export default sounds;
