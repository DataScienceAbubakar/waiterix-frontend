import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Mic, Square, Send, MessageSquare } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { NotificationSound } from "@/lib/notificationSound";

interface PendingQuestion {
  id: string;
  restaurantId: string;
  customerSessionId: string;
  question: string;
  language: string;
  status: 'pending' | 'answered';
  createdAt: string;
}

export function PendingQuestionsPanel({ restaurantId }: { restaurantId: string }) {
  const [selectedQuestion, setSelectedQuestion] = useState<PendingQuestion | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [answerMode, setAnswerMode] = useState<'voice' | 'text'>('voice');
  const [textAnswer, setTextAnswer] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Fetch pending questions
  const {
    data: questions = [],
    isLoading,
  } = useQuery<PendingQuestion[]>({
    queryKey: ['/api/chef/questions'],
    refetchInterval: 5000, // Poll every 5 seconds for new questions
  });

  // Listen for WebSocket messages
  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws?restaurantId=${restaurantId}&role=chef`);

    ws.onopen = () => {
      console.log('WebSocket connected for chef');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'new-question') {
        // Refresh questions list
        queryClient.invalidateQueries({ queryKey: ['/api/chef/questions'] });

        // Play notification sound
        NotificationSound.playChime();

        toast({
          title: "New Question",
          description: "A customer has a question that needs your answer!",
        });
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [restaurantId, user, toast]);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Failed to access microphone",
        variant: "destructive",
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Send answer mutation
  const sendAnswerMutation = useMutation({
    mutationFn: async () => {
      if (!selectedQuestion) {
        throw new Error('No question selected');
      }

      if (answerMode === 'voice' && !audioBlob) {
        throw new Error('No audio recorded');
      }

      if (answerMode === 'text' && !textAnswer.trim()) {
        throw new Error('Please enter an answer');
      }

      const formData = new FormData();
      formData.append('questionId', selectedQuestion.id);
      formData.append('language', selectedQuestion.language);

      if (answerMode === 'voice' && audioBlob) {
        formData.append('audio', audioBlob, 'answer.webm');
      } else {
        formData.append('textAnswer', textAnswer.trim());
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/chef/answer`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send answer');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chef/questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/faqs'] });
      setSelectedQuestion(null);
      setAudioBlob(null);
      setTextAnswer('');
      setAnswerMode('voice');
      toast({
        title: "Success",
        description: "Your answer has been sent to the customer!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pendingQuestions = questions.filter(q => q.status === 'pending');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-questions" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Customer Questions</h2>
        <p className="text-muted-foreground mt-1">
          Answer customer questions via voice - your responses will be sent back instantly
        </p>
      </div>

      {pendingQuestions.length === 0 ? (
        <Card className="p-12">
          <p className="text-muted-foreground text-center" data-testid="text-no-questions">
            No pending questions. When customers ask questions that the AI can't answer, they'll appear here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingQuestions.map((question) => (
            <Card key={question.id} className="p-6 space-y-4" data-testid={`card-question-${question.id}`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(question.createdAt), 'MMM d, h:mm a')}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                    {question.language.toUpperCase()}
                  </span>
                </div>
                <p className="font-medium text-lg mb-2" data-testid={`text-question-${question.id}`}>
                  {question.question}
                </p>
                <p className="text-xs text-muted-foreground">
                  Session: {question.customerSessionId.substring(0, 8)}...
                </p>
              </div>

              {selectedQuestion?.id === question.id ? (
                <div className="space-y-3">
                  {/* Mode Selection */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setAnswerMode('voice')}
                      variant={answerMode === 'voice' ? 'default' : 'outline'}
                      className="flex-1"
                      size="sm"
                      data-testid={`button-mode-voice-${question.id}`}
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Voice
                    </Button>
                    <Button
                      onClick={() => setAnswerMode('text')}
                      variant={answerMode === 'text' ? 'default' : 'outline'}
                      className="flex-1"
                      size="sm"
                      data-testid={`button-mode-text-${question.id}`}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Text
                    </Button>
                  </div>

                  {/* Voice Mode */}
                  {answerMode === 'voice' && !audioBlob && (
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      className="w-full"
                      variant={isRecording ? "destructive" : "default"}
                      data-testid={`button-record-${question.id}`}
                    >
                      {isRecording ? (
                        <>
                          <Square className="h-4 w-4 mr-2" />
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4 mr-2" />
                          Record Answer
                        </>
                      )}
                    </Button>
                  )}

                  {/* Voice - Recorded */}
                  {answerMode === 'voice' && audioBlob && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Answer recorded</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => sendAnswerMutation.mutate()}
                          disabled={sendAnswerMutation.isPending}
                          className="flex-1"
                          data-testid={`button-send-${question.id}`}
                        >
                          {sendAnswerMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Send Answer
                        </Button>
                        <Button
                          onClick={() => setAudioBlob(null)}
                          variant="outline"
                          data-testid={`button-re-record-${question.id}`}
                        >
                          Re-record
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Text Mode */}
                  {answerMode === 'text' && (
                    <div className="space-y-2">
                      <Textarea
                        value={textAnswer}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        className="min-h-[100px]"
                        data-testid={`input-answer-${question.id}`}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => sendAnswerMutation.mutate()}
                          disabled={sendAnswerMutation.isPending || !textAnswer.trim()}
                          className="flex-1"
                          data-testid={`button-send-text-${question.id}`}
                        >
                          {sendAnswerMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Send Answer
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Cancel Button */}
                  <Button
                    onClick={() => {
                      setAudioBlob(null);
                      setTextAnswer('');
                      setSelectedQuestion(null);
                    }}
                    variant="outline"
                    className="w-full"
                    data-testid={`button-cancel-${question.id}`}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setSelectedQuestion(question)}
                  variant="outline"
                  className="w-full"
                  data-testid={`button-answer-${question.id}`}
                >
                  Answer Question
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
