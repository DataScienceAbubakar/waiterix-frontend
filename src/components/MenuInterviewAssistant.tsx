import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Mic, Save, Loader2, Volume2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AudioAcknowledgment } from "@/lib/audioAcknowledgment";
import { AudioCacheUtil } from "@/lib/audioCacheUtil";

interface MenuInterviewAssistantProps {
  menuItemId?: string;
  menuItemName?: string;
  restaurantId: string;
  interviewType?: 'menu_item' | 'restaurant';
  onComplete?: () => void;
}

type Status = 'idle' | 'listening' | 'processing' | 'responding' | 'saving';

export function MenuInterviewAssistant({ 
  menuItemId, 
  menuItemName,
  restaurantId, 
  interviewType = 'menu_item',
  onComplete 
}: MenuInterviewAssistantProps) {
  const { toast } = useToast();
  
  const [hasGreeted, setHasGreeted] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [extractedData, setExtractedData] = useState<any>({});
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      audioRef.current.onplay = () => {
        setStatus('responding');
      };
      audioRef.current.onended = () => {
        setStatus('idle');
      };
      audioRef.current.onpause = () => {
        setStatus('idle');
      };
      audioRef.current.onerror = () => {
        setStatus('idle');
      };
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      // Clean up Web Audio API resources on unmount
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // Auto-start interview with greeting
  useEffect(() => {
    if (!hasGreeted && restaurantId) {
      setHasGreeted(true);
      
      setTimeout(async () => {
        const welcomeMessage = interviewType === 'menu_item' 
          ? `Hi! I'm here to help you add rich details about ${menuItemName || 'this menu item'}. Let's chat about how you make it, where your ingredients come from, and what makes it special. Ready to start?`
          : `Hi! I'd love to learn about your restaurant's story. Tell me about how you started, your cooking philosophy, and what makes your restaurant unique. Ready?`;
        
        await sendMessage({ role: 'assistant', content: welcomeMessage }, true);
      }, 100);
    }
  }, [hasGreeted, restaurantId, menuItemId, menuItemName, interviewType]);

  const speakMessage = async (text: string): Promise<boolean> => {
    try {
      // Try to play cached phrase instantly for immediate feedback
      AudioCacheUtil.tryPlayCachedPhrase(text);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      const response = await fetch('/api/ai/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: 'en' }),
      });

      if (response.status === 503 || !response.ok) {
        setStatus('idle');
        return false;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        try {
          await audioRef.current.play();
          return true;
        } catch (err) {
          setStatus('idle');
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('TTS error:', error);
      setStatus('idle');
      return false;
    }
  };

  const sendMessage = async (message: { role: 'user' | 'assistant', content: string }, isInitial = false) => {
    const newHistory = isInitial ? [message] : [...conversationHistory, message];
    setConversationHistory(newHistory);

    if (message.role === 'assistant') {
      // AI already responded, just speak it
      await speakMessage(message.content);
      return;
    }

    try {
      setStatus('processing');

      const response = await fetch('/api/ai/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: newHistory,
          menuItemId,
          restaurantId,
          interviewType,
        }),
      });

      if (!response.ok) {
        throw new Error('Interview request failed');
      }

      const data = await response.json();
      const aiMessage = { role: 'assistant' as const, content: data.message };
      
      setConversationHistory([...newHistory, aiMessage]);
      await speakMessage(data.message);

    } catch (error) {
      console.error('Interview error:', error);
      toast({
        title: "Interview Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setStatus('idle');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        cleanupRecordingResources();
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setStatus('listening');
      console.log('Recording started (max 20 seconds, or until silence detected)...');

      // Set up silence detection using Web Audio API
      audioContextRef.current = new AudioContext();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      sourceRef.current.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let silenceStart: number | null = null;
      const SILENCE_THRESHOLD = 5; // Volume threshold for silence
      const SILENCE_DURATION = 1500; // 1.5 seconds of silence triggers stop
      
      const recordingStartTime = Date.now();
      
      const checkAudioLevel = () => {
        if (mediaRecorder.state !== 'recording' || !analyserRef.current) return;
        
        analyserRef.current.getByteTimeDomainData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const value = Math.abs(dataArray[i] - 128);
          sum += value;
        }
        const average = sum / bufferLength;
        
        const elapsed = ((Date.now() - recordingStartTime) / 1000).toFixed(1);
        
        // Check if silent
        if (average < SILENCE_THRESHOLD) {
          if (silenceStart === null) {
            silenceStart = Date.now();
            console.log(`Silence started at ${elapsed}s (volume: ${average.toFixed(1)})`);
          } else if (Date.now() - silenceStart > SILENCE_DURATION) {
            const totalTime = ((Date.now() - recordingStartTime) / 1000).toFixed(1);
            console.log(`Silence detected after ${totalTime}s, stopping recording early`);
            
            // Play instant acknowledgment sound
            AudioAcknowledgment.playAck();
            
            mediaRecorder.stop();
            stream.getTracks().forEach(track => track.stop());
            return;
          }
        } else {
          // Reset silence timer when sound is detected
          if (silenceStart !== null) {
            console.log(`Sound detected at ${elapsed}s (volume: ${average.toFixed(1)}), continuing recording`);
          }
          silenceStart = null;
        }
        
        // Continue checking
        requestAnimationFrame(checkAudioLevel);
      };
      
      // Start monitoring audio levels
      requestAnimationFrame(checkAudioLevel);

      // Maximum recording time: 20 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          console.log('Auto-stopping recording after 20 seconds');
          
          // Play instant acknowledgment sound
          AudioAcknowledgment.playAck();
          
          mediaRecorder.stop();
          stream.getTracks().forEach(track => track.stop());
        }
      }, 20000);

    } catch (error) {
      console.error('Recording error:', error);
      cleanupRecordingResources();
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
      setStatus('idle');
    }
  };

  // Clean up recording resources
  const cleanupRecordingResources = () => {
    // Disconnect and clean up Web Audio API resources
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setStatus('processing');
    }
    cleanupRecordingResources();
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', 'en');

      const response = await fetch('/api/ai/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      
      if (data.text && data.text.trim()) {
        await sendMessage({ role: 'user', content: data.text });
      } else {
        setStatus('idle');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Transcription Error",
        description: "Could not transcribe audio. Please try again.",
        variant: "destructive",
      });
      setStatus('idle');
    }
  };

  const handleVoiceButtonClick = () => {
    if (status === 'listening') {
      stopRecording();
    } else if (status === 'idle') {
      startRecording();
    }
  };

  const saveInterview = async () => {
    try {
      setStatus('saving');

      // Extract structured data from conversation
      const data = extractDataFromConversation();

      const response = await fetch('/api/ai/interview/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          menuItemId,
          restaurantId,
          interviewType,
          data,
        }),
      });

      if (!response.ok) {
        throw new Error('Save failed');
      }

      toast({
        title: "Interview Saved",
        description: "Your details have been saved successfully!",
      });

      setStatus('idle');
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Error",
        description: "Could not save interview. Please try again.",
        variant: "destructive",
      });
      setStatus('idle');
    }
  };

  const extractDataFromConversation = () => {
    // Simple extraction - in production, use GPT to extract structured data
    const conversationText = conversationHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ');

    return {
      preparationMethod: conversationText.substring(0, 500),
      ingredientSources: '',
      pairingSuggestions: '',
      chefNotes: conversationText,
      cookingTime: '',
      specialTechniques: '',
    };
  };

  const getStatusText = () => {
    switch (status) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Processing...';
      case 'responding': return 'Speaking...';
      case 'saving': return 'Saving...';
      default: return 'Press to speak';
    }
  };

  const canSave = conversationHistory.length > 2 && status === 'idle';

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="card-interview-assistant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Menu Interview Assistant
        </CardTitle>
        <CardDescription>
          {interviewType === 'menu_item' 
            ? `Adding details for: ${menuItemName || 'Menu Item'}`
            : 'Share your restaurant story'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            variant={status === 'listening' ? 'destructive' : 'default'}
            className="w-32 h-32 rounded-full"
            onClick={handleVoiceButtonClick}
            disabled={status === 'processing' || status === 'responding' || status === 'saving'}
            data-testid="button-voice-interview"
          >
            {status === 'processing' || status === 'responding' || status === 'saving' ? (
              <Loader2 className="w-12 h-12 animate-spin" />
            ) : status === 'listening' ? (
              <Volume2 className="w-12 h-12 animate-pulse" />
            ) : (
              <Mic className="w-12 h-12" />
            )}
          </Button>
          
          <p className="text-sm text-muted-foreground" data-testid="text-interview-status">
            {getStatusText()}
          </p>
        </div>

        {conversationHistory.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto rounded-md border p-4">
            {conversationHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`text-sm ${msg.role === 'assistant' ? 'text-muted-foreground italic' : 'font-medium'}`}
                data-testid={`text-message-${idx}`}
              >
                <strong>{msg.role === 'assistant' ? 'AI: ' : 'You: '}</strong>
                {msg.content}
              </div>
            ))}
          </div>
        )}

        {canSave && (
          <Button
            className="w-full"
            onClick={saveInterview}
            disabled={status !== 'idle'}
            data-testid="button-save-interview"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Interview
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
