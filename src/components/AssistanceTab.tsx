import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, Clock, MessageSquare, Hash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";
import type { AssistanceRequestWithTable } from "@/shared/schema";

// Audio notification
const playNotificationSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Create two-tone chime
  const oscillator1 = audioContext.createOscillator();
  const oscillator2 = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator1.connect(gainNode);
  oscillator2.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator1.frequency.value = 800; // First tone
  oscillator2.frequency.value = 1000; // Second tone
  gainNode.gain.value = 0.3;
  
  const now = audioContext.currentTime;
  oscillator1.start(now);
  oscillator1.stop(now + 0.2);
  oscillator2.start(now + 0.2);
  oscillator2.stop(now + 0.4);
};

export function AssistanceTab() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
  const previousCountRef = useRef<number>(0);
  const isFirstLoadRef = useRef(true);

  // Fetch restaurant data to get the actual restaurant ID
  const { data: restaurant } = useQuery<any>({
    queryKey: ['/api/restaurant'],
  });

  // Construct URL with query parameter
  const queryUrl = filter === 'all' 
    ? '/api/assistance-requests'
    : `/api/assistance-requests?status=${filter}`;

  const { data: requests = [], isLoading } = useQuery<AssistanceRequestWithTable[]>({
    queryKey: [queryUrl],
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!restaurant?.id) {
      return; // Don't connect until we have restaurant ID
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?restaurantId=${restaurant.id}&role=chef`;
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected to assistance requests');
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'new-assistance-request') {
          // Invalidate all assistance-requests queries to refresh the list
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey[0] as string;
              return key?.startsWith('/api/assistance-requests');
            }
          });
          playNotificationSound();
          toast({
            title: "New Assistance Request",
            description: "A customer needs help!",
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error for assistance requests:', error);
    };

    return () => {
      ws.close();
    };
  }, [restaurant?.id, toast]);

  // Play notification sound when new requests appear
  useEffect(() => {
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      previousCountRef.current = requests.filter(r => r.status === 'pending').length;
      return;
    }

    const currentPendingCount = requests.filter(r => r.status === 'pending').length;
    if (currentPendingCount > previousCountRef.current) {
      playNotificationSound();
    }
    previousCountRef.current = currentPendingCount;
  }, [requests]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest('PATCH', `/api/assistance-requests/${id}/status`, { status });
      if (!response.ok) {
        throw new Error('Failed to update request status');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all assistance-requests queries to refresh the list
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.startsWith('/api/assistance-requests');
        }
      });
      toast({
        title: "Status Updated",
        description: "Request status has been updated.",
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

  const filteredRequests = requests;
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-assistance-title">Assistance Requests</h2>
          {pendingCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {pendingCount} pending {pendingCount === 1 ? 'request' : 'requests'}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
            data-testid="button-filter-pending"
          >
            Pending {pendingCount > 0 && `(${pendingCount})`}
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            data-testid="button-filter-all"
          >
            All
          </Button>
          <Button
            variant={filter === 'resolved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('resolved')}
            data-testid="button-filter-resolved"
          >
            Resolved
          </Button>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Assistance Requests</h3>
          <p className="text-muted-foreground">
            {filter === 'pending' 
              ? "No pending requests at the moment" 
              : "No assistance requests found"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="p-4" data-testid={`card-request-${request.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      className={
                        request.status === 'pending'
                          ? 'bg-yellow-500'
                          : request.status === 'acknowledged'
                          ? 'bg-blue-500'
                          : 'bg-green-500'
                      }
                      data-testid={`badge-status-${request.id}`}
                    >
                      {request.status === 'pending' && <Bell className="h-3 w-3 mr-1" />}
                      {request.status === 'resolved' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                    {request.tableId && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        Table {request.tableNumber || 'Unknown'}
                      </Badge>
                    )}
                  </div>

                  {request.customerMessage && (
                    <div className="flex items-start gap-2 mb-3 p-3 bg-muted rounded-md">
                      <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm" data-testid={`text-message-${request.id}`}>{request.customerMessage}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  {request.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'acknowledged' })}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-acknowledge-${request.id}`}
                      >
                        Acknowledge
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'resolved' })}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-resolve-${request.id}`}
                      >
                        Resolve
                      </Button>
                    </>
                  )}
                  {request.status === 'acknowledged' && (
                    <Button
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'resolved' })}
                      disabled={updateStatusMutation.isPending}
                      data-testid={`button-resolve-${request.id}`}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
