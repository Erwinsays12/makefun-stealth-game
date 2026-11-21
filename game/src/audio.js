// All sound is synthesized with WebAudio — no audio files, no network.
// Footsteps, the alarm sting, loot chimes and a low night-drone.
export class SoundBank {
  constructor() {
    this.context = null;
    this.muted = false;
    this.droneNodes = null;
  }

  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.startDrone();
  }

  startDrone() {
    if (!this.context || this.droneNodes) return;
    const gain = this.context.createGain();
    gain.gain.value = 0.035;
    gain.connect(this.context.destination);
    const low = this.context.createOscillator();
    low.type = 'sine';
    low.frequency.value = 55;
    const shimmer = this.context.createOscillator();
    shimmer.type = 'triangle';
    shimmer.frequency.value = 110.3;
    const shimmerGain = this.context.createGain();
    shimmerGain.gain.value = 0.25;
    low.connect(gain);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(gain);
    low.start();
    shimmer.start();
    this.droneNodes = { gain, low, shimmer };
  }

  tone(frequency, seconds, type, volume, when = 0) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + when;
    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.05);
  }

  noiseBurst(seconds, volume, lowpass) {
    if (!this.context || this.muted) return;
    const length = Math.max(1, Math.floor(this.context.sampleRate * seconds));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = this.context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    source.start();
  }

  footstep(sneaking) {
    this.noiseBurst(0.07, sneaking ? 0.05 : 0.16, sneaking ? 500 : 900);
  }

  pebble() {
    this.noiseBurst(0.05, 0.12, 2400);
    this.tone(1400, 0.08, 'sine', 0.05, 0.02);
  }

  pickup() {
    this.tone(880, 0.12, 'sine', 0.12);
    this.tone(1318, 0.18, 'sine', 0.1, 0.07);
  }

  suspicious() {
    this.tone(392, 0.16, 'square', 0.06);
    this.tone(311, 0.22, 'square', 0.06, 0.12);
  }

  alarm() {
    this.tone(220, 0.22, 'sawtooth', 0.12);
    this.tone(330, 0.22, 'sawtooth', 0.12, 0.16);
    this.tone(440, 0.3, 'sawtooth', 0.1, 0.32);
  }

  caught() {
    this.tone(196, 0.4, 'sawtooth', 0.14);
    this.tone(147, 0.6, 'sawtooth', 0.14, 0.25);
  }

  levelClear() {
    [523, 659, 784, 1047].forEach((note, i) => this.tone(note, 0.22, 'sine', 0.1, i * 0.09));
  }
}
