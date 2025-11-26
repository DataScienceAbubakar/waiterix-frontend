import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, CreditCard, Bot, DollarSign, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { signOut } from "@/lib/firebase";
import { useLanguage } from "@/contexts/LanguageContext";

interface Restaurant {
  id: string;
  subscriptionStatus?: string;
  trialEndsAt?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
}

interface SubscriptionStatusProps {
  restaurant: Restaurant;
}

export function SubscriptionStatus({ restaurant }: SubscriptionStatusProps) {
  const { toast } = useToast();
  const { formatCurrency } = useLanguage();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  const isTrialing = restaurant.subscriptionStatus === 'trialing';
  const isActive = restaurant.subscriptionStatus === 'active';
  const trialEndDate = restaurant.trialEndsAt ? new Date(restaurant.trialEndsAt) : null;
  const periodEndDate = restaurant.currentPeriodEnd ? new Date(restaurant.currentPeriodEnd) : null;

  // Fetch subscription status including usage data
  const { data: subscriptionData } = useQuery<{
    subscriptionStatus: string;
    aiUsageCount: number;
    currentMonthUsage: number;
  }>({
    queryKey: ['/api/subscription/status'],
    enabled: isTrialing || isActive,
  });

  const totalUsage = subscriptionData?.aiUsageCount || 0;
  const monthUsage = subscriptionData?.currentMonthUsage || 0;
  
  // Calculate costs ($1 per AI call)
  const monthCost = monthUsage * 1;
  const totalCost = totalUsage * 1;
  
  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/subscription/cancel');
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled and your account will be deleted.",
      });
      // Sign out from Firebase
      try {
        await signOut();
      } catch (error) {
        console.error("Error signing out:", error);
      }
      // Redirect to home after a brief delay
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Subscription</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your current subscription status
          </p>
        </div>

        {isTrialing && trialEndDate && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="font-medium text-blue-900 dark:text-blue-100">Money-Back Guarantee Period</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Full refund available until {format(trialEndDate, 'MMMM d, yyyy')}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                $50/month + AI usage fees
              </p>
            </div>
          </div>
        )}

        {isActive && periodEndDate && (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <p className="font-medium text-green-900 dark:text-green-100">Active Subscription</p>
              <p className="text-sm text-green-700 dark:text-green-300">
                $50/month + AI usage • Renews on {format(periodEndDate, 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
        )}

        {!isTrialing && !isActive && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
            <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="font-medium text-amber-900 dark:text-amber-100">Subscription Required</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Subscribe to continue accepting orders • $50/month + AI usage
              </p>
            </div>
            <Link href="/subscribe">
              <Button size="sm" data-testid="button-subscribe">
                Subscribe
              </Button>
            </Link>
          </div>
        )}

        {(isTrialing || isActive) && (
          <>
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">AI Waiter Usage</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold" data-testid="text-usage-month">
                    {monthUsage.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">API calls</p>
                  <div className="flex items-center gap-1 mt-1">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm font-medium" data-testid="text-cost-month">
                      {formatCurrency(monthCost)}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">All Time</p>
                  <p className="text-2xl font-bold" data-testid="text-usage-total">
                    {totalUsage.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">API calls</p>
                  <div className="flex items-center gap-1 mt-1">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm font-medium" data-testid="text-cost-total">
                      {formatCurrency(totalCost)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                disabled={cancelSubscriptionMutation.isPending}
                data-testid="button-cancel-subscription"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Cancel Subscription
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Cancelling your subscription will delete your restaurant and all data
              </p>
            </div>
          </>
        )}
      </div>
      
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription & Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Cancelling your subscription will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Immediately cancel your Stripe subscription</li>
                <li>Delete your restaurant and all menu items</li>
                <li>Delete all orders and customer data</li>
                <li>Remove all QR codes and analytics</li>
              </ul>
              <p className="mt-3 font-semibold">
                Are you sure you want to proceed?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-dialog-no">
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelSubscriptionMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-cancel-dialog-yes"
            >
              Yes, Cancel & Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
