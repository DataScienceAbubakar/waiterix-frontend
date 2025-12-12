import { useEffect, useRef, useState, useCallback } from 'react';

interface UseContinuousSpeechRecognitionOptions {
  onWakeWordDetected: () => void;
  enabled: boolean;
  language?: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function useContinuousSpeechRecognition({
  onWakeWordDetected,
  enabled,
  language = 'en-US'
}: UseContinuousSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isEnabledRef = useRef(enabled);
  const isUserStoppedRef = useRef(false);
  const lastRestartTimeRef = useRef<number>(0);

  // Keep enabled state in ref for event handlers
  useEffect(() => {
    isEnabledRef.current = enabled;
  }, [enabled]);

  // Check browser support
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);
  }, []);

  // Wake word detection patterns - case insensitive
  const detectWakeWord = useCallback((text: string): boolean => {
    const normalizedText = text.toLowerCase().trim();

    const wakeWordPatterns = [
      'hey waiterix',
      'hey waitrix',
      'hey wait tricks',
      'hey wait trix',
      'waiterix',
      'waitrix',
    ];

    return wakeWordPatterns.some(pattern => normalizedText.includes(pattern));
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported || !isEnabledRef.current) return;

    try {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = language;

        recognitionRef.current.onstart = () => {
          console.log('[Wake Word] Continuous listening started');
          setIsListening(true);
          isUserStoppedRef.current = false;
        };

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          // Check both interim and final results
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            console.log('[Wake Word] Heard:', transcript, '(final:', event.results[i].isFinal, ')');

            if (detectWakeWord(transcript)) {
              console.log('[Wake Word] Wake word detected!');
              onWakeWordDetected();
              // Don't stop listening - keep session alive for next activation
            }
          }
        };

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.warn('[Wake Word] Recognition error:', event.error);

          // Handle specific errors
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            console.error('[Wake Word] Microphone permission denied');
            isEnabledRef.current = false;
            setIsListening(false);
            return;
          }

          // For 'no-speech' or other transient errors, debounce restart
          if (event.error === 'no-speech' || event.error === 'audio-capture') {
            const now = Date.now();
            const timeSinceLastRestart = now - lastRestartTimeRef.current;

            // Only restart if it's been at least 3 seconds since last restart
            if (timeSinceLastRestart > 3000 && isEnabledRef.current && !isUserStoppedRef.current) {
              console.log('[Wake Word] Will restart after error in 2 seconds...');
              lastRestartTimeRef.current = now;
              restartTimeoutRef.current = setTimeout(() => {
                if (isEnabledRef.current && !isUserStoppedRef.current && recognitionRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch (err) {
                    console.warn('[Wake Word] Restart failed:', err);
                  }
                }
              }, 2000);
            }
          }
        };

        recognitionRef.current.onend = () => {
          console.log('[Wake Word] Recognition ended, user stopped:', isUserStoppedRef.current);

          // Only set listening to false if user actually stopped it
          if (isUserStoppedRef.current) {
            setIsListening(false);
            return;
          }

          // Auto-restart if still enabled and not user-stopped (debounced)
          const now = Date.now();
          const timeSinceLastRestart = now - lastRestartTimeRef.current;

          if (isEnabledRef.current && !isUserStoppedRef.current && timeSinceLastRestart > 1000) {
            console.log('[Wake Word] Auto-restarting after normal end...');
            lastRestartTimeRef.current = now;
            restartTimeoutRef.current = setTimeout(() => {
              if (isEnabledRef.current && !isUserStoppedRef.current && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (err) {
                  console.warn('[Wake Word] Auto-restart failed:', err);
                }
              }
            }, 1000);
          }
        };
      }

      // Prevent starting if already running
      if (isListening) {
        console.log('[Wake Word] Already listening, skipping start');
        return;
      }

      try {
        recognitionRef.current.start();
      } catch (err: any) {
        // Ignore "already started" errors
        if (err.name === 'InvalidStateError' || err.message?.includes('already started')) {
          console.log('[Wake Word] Recognition already started, ignoring start request');
          setIsListening(true);
        } else {
          throw err;
        }
      }
    } catch (error) {
      console.error('[Wake Word] Failed to start recognition:', error);
      setIsListening(false);
    }
  }, [isSupported, language, detectWakeWord, onWakeWordDetected, isListening]);

  const stopListening = useCallback(() => {
    console.log('[Wake Word] User-initiated stop');
    isUserStoppedRef.current = true;

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('[Wake Word] Error stopping recognition:', error);
      }
    }

    setIsListening(false);
  }, []);

  // Start/stop based on enabled prop
  useEffect(() => {
    if (enabled && isSupported) {
      startListening();
    } else {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [enabled, isSupported, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {
          // Ignore errors during cleanup
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
}
