// Audio cache utility for instant playback of common AI phrases

// Cached phrases manifest - these match the generated TTS files
const cachedPhrases = [
  { phrase: "Let me help you with that.", file: "phrase_1.mp3" },
  { phrase: "Great choice!", file: "phrase_2.mp3" },
  { phrase: "I'd be happy to help.", file: "phrase_3.mp3" },
  { phrase: "That sounds delicious!", file: "phrase_4.mp3" },
  { phrase: "Absolutely!", file: "phrase_5.mp3" },
  { phrase: "Perfect!", file: "phrase_6.mp3" },
  { phrase: "Good question!", file: "phrase_7.mp3" },
  { phrase: "Of course!", file: "phrase_8.mp3" }
];

// Preload all cached audio files
const cachedAudio: Map<string, HTMLAudioElement> = new Map();

// Initialize cache on first use
let cacheInitialized = false;

function initializeCache() {
  if (cacheInitialized) return;
  
  try {
    cachedPhrases.forEach(({ phrase, file }) => {
      const audio = new Audio(`/attached_assets/cached_tts/${file}`);
      audio.preload = 'auto';
      cachedAudio.set(phrase.toLowerCase(), audio);
    });
    
    cacheInitialized = true;
    console.log('Audio cache initialized with', cachedAudio.size, 'phrases');
  } catch (error) {
    console.warn('Failed to initialize audio cache:', error);
  }
}

export class AudioCacheUtil {
  /**
   * Check if a message starts with a cached phrase and play it instantly
   * Returns the cached audio element if found, null otherwise
   */
  static tryPlayCachedPhrase(message: string): HTMLAudioElement | null {
    if (!cacheInitialized) {
      initializeCache();
    }
    
    const messageLower = message.toLowerCase().trim();
    
    // Check if message starts with any cached phrase
    for (const [phrase, audio] of Array.from(cachedAudio.entries())) {
      if (messageLower.startsWith(phrase)) {
        console.log('Found cached phrase:', phrase);
        
        // Clone the audio to allow multiple simultaneous playback
        const clonedAudio = audio.cloneNode(true) as HTMLAudioElement;
        
        try {
          clonedAudio.play().catch(err => {
            console.debug('Cached audio play failed:', err);
          });
          
          return clonedAudio;
        } catch (error) {
          console.debug('Error playing cached audio:', error);
          return null;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Get list of all cached phrases
   */
  static getCachedPhrases(): string[] {
    if (!cacheInitialized) {
      initializeCache();
    }
    
    return Array.from(cachedAudio.keys());
  }
  
  /**
   * Check if a message starts with a cached phrase (without playing)
   */
  static hasCachedPhrase(message: string): boolean {
    if (!cacheInitialized) {
      initializeCache();
    }
    
    const messageLower = message.toLowerCase().trim();
    
    for (const phrase of Array.from(cachedAudio.keys())) {
      if (messageLower.startsWith(phrase)) {
        return true;
      }
    }
    
    return false;
  }
}
