import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function SubscribeSuccess() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Get session ID from URL
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');

  // Verify checkout session and update subscription
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/subscription/checkout-success', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/subscription/checkout-success?session_id=${sessionId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to verify payment' }));
        throw new Error(errorData.message || 'Failed to verify payment');
      }
      return response.json();
    },
    retry: false,
    enabled: !!sessionId,
  });

  // Redirect to dashboard on success
  useEffect(() => {
    if (data?.success) {
      toast({
        title: "Welcome to Waiterix!",
        description: "Your subscription is now active.",
      });
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }
  }, [data, navigate, toast]);

  if (!sessionId) {
    return (
      <div className="container max-w-2xl mx-auto py-12 flex items-center justify-center min-h-screen">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />
              Invalid Session
            </CardTitle>
            <CardDescription>
              No session ID found in URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This page requires a valid checkout session ID. Please try subscribing again.
            </p>
            <Button 
              onClick={() => navigate('/subscribe')}
              data-testid="button-try-again"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-12 flex items-center justify-center min-h-screen">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Payment Successful!</CardTitle>
            <CardDescription>
              Activating your subscription...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-activating" />
            <p className="text-sm text-muted-foreground">Please wait while we set up your account...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-2xl mx-auto py-12 flex items-center justify-center min-h-screen">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />
              Activation Failed
            </CardTitle>
            <CardDescription>
              We couldn't activate your subscription
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Your payment was successful, but we encountered an issue activating your subscription. 
              Please contact support or try logging in again.
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/dashboard')}
                data-testid="button-dashboard"
              >
                Go to Dashboard
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/subscribe')}
                data-testid="button-try-subscribe"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-12 flex items-center justify-center min-h-screen">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Welcome to Waiterix!
          </CardTitle>
          <CardDescription>
            Your subscription is now active
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500" data-testid="icon-success" />
          <div className="text-center space-y-2">
            <p className="font-medium">Payment successful!</p>
            <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
