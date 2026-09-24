export const AUDIO_CUES = Object.freeze({
  button: [{ frequency: 360, duration: .045, gain: .035, type: 'sine' }],
  correct: [{ frequency: 620, endFrequency: 760, duration: .085, gain: .055, type: 'sine' }],
  error: [{ frequency: 170, endFrequency: 120, duration: .15, gain: .06, type: 'triangle' }],
  lifeLost: [
    { frequency: 250, endFrequency: 170, duration: .13, gain: .05, type: 'triangle' },
    { frequency: 155, endFrequency: 105, duration: .18, gain: .045, type: 'triangle', delay: .1 }
  ],
  stage: [
    { frequency: 520, duration: .1, gain: .045 },
    { frequency: 660, duration: .12, gain: .05, delay: .08 },
    { frequency: 880, duration: .18, gain: .055, delay: .17 }
  ],
  perfect: [
    { frequency: 660, duration: .1, gain: .045 },
    { frequency: 880, duration: .12, gain: .05, delay: .07 },
    { frequency: 1100, duration: .22, gain: .06, delay: .15 }
  ],
  gameOver: [
    { frequency: 330, endFrequency: 250, duration: .18, gain: .05, type: 'triangle' },
    { frequency: 220, endFrequency: 130, duration: .32, gain: .055, type: 'triangle', delay: .15 }
  ]
});

export class SoundEngine {
  constructor(isEnabled) {
    this.isEnabled = isEnabled;
    this.context = null;
    this.master = null;
  }

  unlock() {
    if (!this.isEnabled()) return false;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      if (!this.context || this.context.state === 'closed') {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = .9;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      // A silent source started inside the user gesture reliably unlocks iOS Safari.
      const buffer = this.context.createBuffer(1, 1, 22050);
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.master);
      source.start(0);
      return true;
    } catch {
      return false;
    }
  }

  async resume() {
    if (!this.isEnabled()) return false;
    if (!this.context) return this.unlock();
    try {
      if (this.context.state === 'suspended') await this.context.resume();
      return this.context.state === 'running';
    } catch {
      return false;
    }
  }

  play(name) {
    if (!this.isEnabled()) return;
    if (!this.context || this.context.state !== 'running') this.unlock();
    if (!this.context || !this.master) return;
    const cue = AUDIO_CUES[name];
    if (!cue) return;
    const now = this.context.currentTime;
    cue.forEach(note => this.playNote(note, now));
  }

  playNote(note, now) {
    const start = now + (note.delay || 0);
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = note.type || 'sine';
    oscillator.frequency.setValueAtTime(note.frequency, start);
    if (note.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(note.endFrequency, start + note.duration);
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.exponentialRampToValueAtTime(note.gain, start + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + note.duration);
    oscillator.connect(envelope).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + note.duration + .02);
  }
}
