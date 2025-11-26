import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, CreditCard } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Subscribe() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Check if returning from successful payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const canceled = params.get('canceled');
    
    if (canceled === 'true') {
      toast({
        variant: "destructive",
        title: "Payment canceled",
        description: "You can try again when you're ready.",
      });
      // Clear the URL parameter
      window.history.replaceState({}, '', '/subscribe');
    }
  }, [toast]);

  // Create checkout session
  const { data: checkoutData, isLoading, error } = useQuery<{
    checkoutUrl: string;
    alreadyActive?: boolean;
  }>({
    queryKey: ['/api/subscription/create'],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/subscription/create');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create checkout session' }));
        throw new Error(errorData.message || 'Failed to create checkout session');
      }
      return response.json();
    },
    retry: false,
  });

  // Redirect to checkout or dashboard
  useEffect(() => {
    if (checkoutData?.alreadyActive) {
      navigate('/dashboard');
    } else if (checkoutData?.checkoutUrl) {
      window.location.href = checkoutData.checkoutUrl;
    }
  }, [checkoutData, navigate]);

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-12 flex items-center justify-center min-h-screen">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              Subscribe to Waiterix
            </CardTitle>
            <CardDescription>
              Setting up your subscription...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-subscription" />
            <p className="text-sm text-muted-foreground">Preparing checkout...</p>
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
              <CreditCard className="h-6 w-6" />
              Subscribe to Waiterix
            </CardTitle>
            <CardDescription>
              $50/month + AI usage ($0.10 per request)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              <p className="font-medium">Error creating checkout session</p>
              <p className="text-sm mt-1">{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              data-testid="button-back-dashboard"
            >
              Back to Dashboard
            </Button>
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
            <CreditCard className="h-6 w-6" />
            Subscribe to Waiterix
          </CardTitle>
          <CardDescription>
            Redirecting to secure checkout...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-redirect" />
          <p className="text-sm text-muted-foreground">Please wait...</p>
        </CardContent>
      </Card>
    </div>
  );
}
