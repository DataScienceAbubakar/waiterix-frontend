import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle, AlertCircle, RefreshCw, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getGatewayInfo, type PaymentGateway } from "@/shared/paymentGatewayUtils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Restaurant {
  id?: string;
  country?: string | null;
  stripeAccountId?: string | null;
  stripeOnboardingComplete?: boolean;
  paystackSubaccountCode?: string | null;
  paystackBankCode?: string | null;
  paystackAccountNumber?: string | null;
  paystackAccountName?: string | null;
  paystackOnboardingComplete?: boolean;
  telrMerchantId?: string | null;
  telrOnboardingComplete?: boolean;
  adyenMerchantAccount?: string | null;
  adyenOnboardingComplete?: boolean;
}

interface PaymentGatewayOnboardingProps {
  restaurant: Restaurant;
}

// Check if a gateway is onboarded
function isGatewayOnboarded(restaurant: Restaurant, gateway: string): boolean {
  switch (gateway) {
    case 'stripe':
      return !!restaurant.stripeOnboardingComplete;
    case 'paystack':
      return !!restaurant.paystackOnboardingComplete;
    case 'telr':
      return !!restaurant.telrOnboardingComplete;
    case 'adyen':
      return !!restaurant.adyenOnboardingComplete;
    default:
      return false;
  }
}

// Stripe-specific onboarding logic
function StripeOnboarding({ restaurant }: { restaurant: Restaurant }) {
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

  useEffect(() => {
    if (location.includes('stripe_refresh=true') && restaurant.stripeAccountId) {
      checkStatusMutation.mutate();
    }
  }, [location]);

  const handleSetupPayments = () => {
    setIsCreating(true);
    if (restaurant.stripeAccountId) {
      getOnboardingLinkMutation.mutate();
    } else {
      createAccountMutation.mutate();
    }
  };

  const isLoading = createAccountMutation.isPending || getOnboardingLinkMutation.isPending || isCreating;
  const isCheckingStatus = checkStatusMutation.isPending;

  return (
    <div className="space-y-4">
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
              {restaurant.stripeAccountId ? "Continue Onboarding" : "Set Up Stripe Payments"}
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
  );
}

// Paystack-specific onboarding logic
function PaystackOnboarding({ restaurant }: { restaurant: Restaurant }) {
  const { toast } = useToast();
  const [bankCode, setBankCode] = useState(restaurant.paystackBankCode || '');
  const [accountNumber, setAccountNumber] = useState(restaurant.paystackAccountNumber || '');

  // Fetch banks list
  const { data: banksData } = useQuery({
    queryKey: ['/api/paystack/banks'],
    queryFn: async () => {
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBaseUrl}/api/paystack/banks`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch banks');
      return res.json();
    },
  });

  const createSubaccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/paystack/create-subaccount', {
        bankCode,
        accountNumber,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: `Paystack subaccount created for ${data.accountName}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Paystack subaccount",
        variant: "destructive",
      });
    },
  });

  const handleSetup = () => {
    if (!bankCode || !accountNumber) {
      toast({
        title: "Missing Information",
        description: "Please select a bank and enter your account number",
        variant: "destructive",
      });
      return;
    }

    // Validate Nigerian account number (10 digits)
    if (!/^\d{10}$/.test(accountNumber)) {
      toast({
        title: "Invalid Account Number",
        description: "Nigerian bank account numbers must be exactly 10 digits",
        variant: "destructive",
      });
      return;
    }

    createSubaccountMutation.mutate();
  };

  const isLoading = createSubaccountMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <Label htmlFor="bank" data-testid="label-paystack-bank">Bank</Label>
          <Select value={bankCode} onValueChange={setBankCode} disabled={isLoading || !!restaurant.paystackSubaccountCode}>
            <SelectTrigger id="bank" data-testid="select-paystack-bank">
              <SelectValue placeholder="Select your bank" />
            </SelectTrigger>
            <SelectContent>
              {banksData?.banks?.map((bank: any) => (
                <SelectItem key={bank.code} value={bank.code} data-testid={`option-bank-${bank.code}`}>
                  {bank.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="accountNumber" data-testid="label-paystack-account">Account Number</Label>
          <Input
            id="accountNumber"
            type="text"
            placeholder="0123456789"
            maxLength={10}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
            disabled={isLoading || !!restaurant.paystackSubaccountCode}
            data-testid="input-paystack-account"
          />
        </div>

        {restaurant.paystackAccountName && (
          <div className="text-sm text-muted-foreground">
            Account Name: <span className="font-medium">{restaurant.paystackAccountName}</span>
          </div>
        )}
      </div>

      {!restaurant.paystackSubaccountCode && (
        <Button
          onClick={handleSetup}
          disabled={isLoading || !bankCode || !accountNumber}
          className="gap-2"
          data-testid="button-setup-paystack"
        >
          {isLoading ? "Creating Subaccount..." : "Set Up Paystack Payments"}
        </Button>
      )}
    </div>
  );
}

// Placeholder onboarding for other gateways
function PlaceholderOnboarding({ gatewayName }: { gatewayName: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      <div>
        <p className="font-medium text-blue-900 dark:text-blue-100">API Keys Required</p>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {gatewayName} integration is ready. Add your API keys to enable payments.
        </p>
      </div>
    </div>
  );
}

export function PaymentGatewayOnboarding({ restaurant }: PaymentGatewayOnboardingProps) {
  const recommended = getGatewayInfo(restaurant.country);
  const isOnboarded = isGatewayOnboarded(restaurant, recommended.gateway);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Payment Processing</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Recommended gateway for {restaurant.country || 'your region'}: <span className="font-medium">{recommended.name}</span> ({recommended.region})
          </p>
        </div>

        {isOnboarded ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">Connected</p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your {recommended.name} account is active and ready to accept payments
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
                  Complete {recommended.name} onboarding to accept online payments
                </p>
              </div>
            </div>

            {recommended.gateway === 'stripe' && <StripeOnboarding restaurant={restaurant} />}
            {recommended.gateway === 'paystack' && <PaystackOnboarding restaurant={restaurant} />}
            {recommended.gateway === 'telr' && <PlaceholderOnboarding gatewayName="Telr" />}
            {recommended.gateway === 'adyen' && <PlaceholderOnboarding gatewayName="Adyen" />}
          </div>
        )}
      </div>
    </Card>
  );
}
