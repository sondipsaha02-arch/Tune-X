// Web Audio API Sound Generator for Alarms and Notifications
class SoundEngine {
  private audioCtx: AudioContext | null = null;
  private isAlarmRinging = false;
  private alarmInterval: any = null;

  private getContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Plays a crisp 2-note notification chime (E5 -> B5 harmonic chime)
  public playNotificationChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";

      // Note 1: E5 (659.25Hz), Note 2: B5 (987.77Hz)
      osc1.frequency.setValueAtTime(659.25, now);
      osc1.frequency.setValueAtTime(987.77, now + 0.12);

      // Harmony octave
      osc2.frequency.setValueAtTime(1318.51, now);
      osc2.frequency.setValueAtTime(1975.53, now + 0.12);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);
    } catch (e) {
      console.error("Error playing notification chime:", e);
    }
  }

  // Plays an energetic multi-harmonic PA alarm ringtone loop until stopped
  public playAlarmRingtone(): () => void {
    try {
      this.stopAlarmRingtone();
      const ctx = this.getContext();
      this.isAlarmRinging = true;

      const playSequence = () => {
        if (!this.isAlarmRinging) return;
        const now = ctx.currentTime;

        // Alarm Melody: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz) repeating chime pattern
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + idx * 0.14);

          gain.gain.setValueAtTime(0, now + idx * 0.14);
          gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.14 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.38);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.14);
          osc.stop(now + idx * 0.14 + 0.38);
        });
      };

      playSequence();
      this.alarmInterval = setInterval(playSequence, 1100);

      return () => this.stopAlarmRingtone();
    } catch (e) {
      console.error("Error playing alarm ringtone:", e);
      return () => {};
    }
  }

  // Stops any active alarm ringtone
  public stopAlarmRingtone() {
    this.isAlarmRinging = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  // Test preview
  public testRingtone() {
    this.playAlarmRingtone();
    setTimeout(() => {
      this.stopAlarmRingtone();
    }, 4500);
  }
}

export const soundEngine = new SoundEngine();
