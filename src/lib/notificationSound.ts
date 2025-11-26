// Simple notification sound utility using Web Audio API
export class NotificationSound {
  private static audioContext: AudioContext | null = null;

  private static getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  // Play a pleasant notification chime (2-tone beep)
  static playChime() {
    try {
      const context = this.getAudioContext();
      const now = context.currentTime;

      // Create oscillator for first tone (higher pitch)
      const oscillator1 = context.createOscillator();
      const gainNode1 = context.createGain();
      
      oscillator1.connect(gainNode1);
      gainNode1.connect(context.destination);
      
      oscillator1.frequency.value = 800; // E5 note
      oscillator1.type = 'sine';
      
      gainNode1.gain.setValueAtTime(0, now);
      gainNode1.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      oscillator1.start(now);
      oscillator1.stop(now + 0.15);

      // Create oscillator for second tone (lower pitch, slightly delayed)
      const oscillator2 = context.createOscillator();
      const gainNode2 = context.createGain();
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(context.destination);
      
      oscillator2.frequency.value = 600; // D5 note
      oscillator2.type = 'sine';
      
      gainNode2.gain.setValueAtTime(0, now + 0.1);
      gainNode2.gain.linearRampToValueAtTime(0.3, now + 0.11);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      
      oscillator2.start(now + 0.1);
      oscillator2.stop(now + 0.3);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }
}
