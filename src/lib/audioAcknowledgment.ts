// Audio acknowledgment utility for instant feedback when speech recording stops
export class AudioAcknowledgment {
  private static audioContext: AudioContext | null = null;

  private static getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  // Play a subtle "ding" acknowledgment sound
  static playAck() {
    try {
      const context = this.getAudioContext();
      const now = context.currentTime;

      // Create a gentle confirmation tone (single pleasant note)
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      // Use a pleasant frequency - G5 note (784 Hz)
      oscillator.frequency.value = 784;
      oscillator.type = 'sine';
      
      // Quick, subtle envelope - quiet and brief
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01); // Quieter than notification
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12); // Shorter duration
      
      oscillator.start(now);
      oscillator.stop(now + 0.12);
    } catch (error) {
      // Silent fail - acknowledgment is nice-to-have
      console.debug('Audio acknowledgment skipped:', error);
    }
  }
}
