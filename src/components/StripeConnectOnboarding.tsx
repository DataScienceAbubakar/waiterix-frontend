import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Restaurant {
  id?: string;
  stripeAccountId?: string | null;
  stripeOnboardingComplete?: boolean;
}

interface StripeConnectOnboardingProps {
  restaurant: Restaurant;
}

export function StripeConnectOnboarding({ restaurant }: StripeConnectOnboardingProps) {
  const { toast } = useToast();
  const [location] = useLocation();
  const [isCreating, setIsCreating] = useState(false);

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/stripe/connect-account');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Stripe Account Created",
        description: "Now let's complete the onboarding process.",
      });
      // Trigger onboarding link creation
      getOnboardingLinkMutation.mutate();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create Stripe account",
        variant: "destructive",
      });
      setIsCreating(false);
    },
  });

  const getOnboardingLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/stripe/onboarding-link');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to get onboarding link",
        variant: "destructive",
      });
      setIsCreating(false);
    },
  });

  const checkStatusMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/stripe/account-status');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.isComplete) {
        toast({
          title: "Success!",
          description: "Your Stripe account is now active and ready to accept payments",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/restaurant'] });
      } else {
        toast({
          title: "Onboarding Incomplete",
          description: "Please complete the Stripe onboarding process",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to check account status",
        variant: "destructive",
      });
    },
  });

  // Auto-check status when returning from Stripe
  useEffect(() => {
    if (location.includes('stripe_refresh=true') && restaurant.stripeAccountId) {
      checkStatusMutation.mutate();
    }
  }, [location]);

  const handleSetupPayments = () => {
    setIsCreating(true);
    if (restaurant.stripeAccountId) {
      // Account exists, just get onboarding link
      getOnboardingLinkMutation.mutate();
    } else {
      // Create account first
      createAccountMutation.mutate();
    }
  };

  const isLoading = createAccountMutation.isPending || getOnboardingLinkMutation.isPending || isCreating;
  const isCheckingStatus = checkStatusMutation.isPending;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Payment Processing</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your Stripe account to receive payments from customers
          </p>
        </div>

        {restaurant.stripeOnboardingComplete ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">Connected</p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your Stripe account is active and ready to accept payments
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">Action Required</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Complete Stripe onboarding to accept online payments
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleSetupPayments}
                disabled={isLoading || isCheckingStatus}
                className="gap-2"
                data-testid="button-setup-stripe"
              >
                {isLoading ? (
                  "Loading..."
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    {restaurant.stripeAccountId ? "Continue Onboarding" : "Set Up Payments"}
                  </>
                )}
              </Button>
              
              {restaurant.stripeAccountId && (
                <Button
                  variant="outline"
                  onClick={() => checkStatusMutation.mutate()}
                  disabled={isLoading || isCheckingStatus}
                  className="gap-2"
                  data-testid="button-refresh-stripe-status"
                >
                  {isCheckingStatus ? (
                    "Checking..."
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Refresh Status
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
