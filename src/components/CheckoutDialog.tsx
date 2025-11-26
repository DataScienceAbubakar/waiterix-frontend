import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, CreditCard } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import type { Restaurant } from "@/shared/schema";
import { CURRENCY_SYMBOLS } from "@/shared/currencyMapping";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  customerNote?: string;
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'online' | 'cash';
  restaurantId: string;
  tableId?: string;
  onSuccess: () => void;
  onOrderComplete?: (orderId: string) => void;
}

function CheckoutForm({ 
  items, 
  subtotal, 
  tax, 
  tip,
  total, 
  restaurantId,
  tableId,
  stripeAccountId,
  onSuccess,
  onOrderComplete
}: { 
  items: CartItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  restaurantId: string;
  tableId?: string;
  stripeAccountId: string | null;
  onSuccess: () => void;
  onOrderComplete?: (orderId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerNote, setCustomerNote] = useState("");
  const { formatCurrency } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Save order data to localStorage BEFORE redirect (for CashApp, Afterpay, etc.)
      // This ensures we can create the order when customer returns after payment
      const pendingOrderData = {
        restaurantId,
        tableId,
        items: items.map(item => ({
          ...item,
          price: item.price.toFixed(2),
        })),
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        tip: tip.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: 'online',
        customerNote,
        stripeAccountId,
        timestamp: Date.now(),
      };
      localStorage.setItem('pendingOrder', JSON.stringify(pendingOrderData));
      
      // Construct return URL for redirect-based payment methods (CashApp, Afterpay, etc.)
      const returnUrl = `${window.location.origin}/menu/${restaurantId}?payment=success`;
      
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: returnUrl,
        },
      });

      if (error) {
        // Clear pending order data on payment failure (prevents stale data)
        localStorage.removeItem('pendingOrder');
        
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Payment successful (no redirect occurred), create order immediately
      const response = await apiRequest("POST", "/api/orders", {
        restaurantId,
        tableId,
        items: items.map(item => ({
          ...item,
          price: item.price.toFixed(2),
        })),
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        tip: tip.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: 'online',
        customerNote,
        stripePaymentIntentId: paymentIntent.id,
      });

      // Validate response before proceeding
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Order creation failed');
      }

      const data = await response.json();

      // Clear pending order data after successful creation
      localStorage.removeItem('pendingOrder');

      // Show receipt dialog or redirect
      if (onOrderComplete) {
        onOrderComplete(data.id);
        onSuccess();
      } else {
        // Fallback to redirect if no callback provided
        setLocation(`/receipt/${data.id}`);
      }
    } catch (err: any) {
      // Clear pending order data on order creation failure (prevents stale data)
      localStorage.removeItem('pendingOrder');
      
      // Try to parse the error to check for subscription error
      try {
        const errorMessage = err.message || String(err);
        const jsonMatch = errorMessage.match(/:\s*(\{.*\})\s*$/);
        if (jsonMatch) {
          const errorData = JSON.parse(jsonMatch[1]);
          if (errorData.error === 'subscription_required') {
            toast({
              title: "Orders Not Available",
              description: errorData.message || "This restaurant is not currently accepting orders.",
              variant: "destructive",
            });
            setIsProcessing(false);
            return;
          }
        }
      } catch (parseError) {
        // If parsing fails, fall through to generic error
      }

      toast({
        title: "Order Failed",
        description: "Payment was successful but order creation failed. Please contact support.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label>Customer Notes (Optional)</Label>
        <Textarea
          placeholder="Any special requests or dietary requirements..."
          value={customerNote}
          onChange={(e) => setCustomerNote(e.target.value)}
          data-testid="input-customer-note"
        />
      </div>

      <div>
        <Label className="mb-3 block">Payment Information</Label>
        <PaymentElement />
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        size="lg" 
        disabled={!stripe || isProcessing}
        data-testid="button-confirm-payment"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay ${formatCurrency(total)}`
        )}
      </Button>
    </form>
  );
}

function CashCheckoutForm({ 
  items, 
  subtotal, 
  tax, 
  tip,
  total, 
  restaurantId,
  tableId,
  onSuccess,
  onOrderComplete
}: { 
  items: CartItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  restaurantId: string;
  tableId?: string;
  onSuccess: () => void;
  onOrderComplete?: (orderId: string) => void;
}) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerNote, setCustomerNote] = useState("");
  const { formatCurrency } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const response = await apiRequest("POST", "/api/orders", {
        restaurantId,
        tableId,
        items: items.map(item => ({
          ...item,
          price: item.price.toFixed(2),
        })),
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        tip: tip.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: 'cash',
        customerNote,
      });

      // Validate response before proceeding
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Order creation failed');
      }

      const data = await response.json();

      // Show receipt dialog or redirect
      if (onOrderComplete) {
        onOrderComplete(data.id);
        onSuccess();
      } else {
        // Fallback to redirect if no callback provided
        setLocation(`/receipt/${data.id}`);
      }
    } catch (err: any) {
      // Try to parse the error to check for subscription error
      try {
        const errorMessage = err.message || String(err);
        const jsonMatch = errorMessage.match(/:\s*(\{.*\})\s*$/);
        if (jsonMatch) {
          const errorData = JSON.parse(jsonMatch[1]);
          if (errorData.error === 'subscription_required') {
            toast({
              title: "Orders Not Available",
              description: errorData.message || "This restaurant is not currently accepting orders.",
              variant: "destructive",
            });
            setIsProcessing(false);
            return;
          }
        }
      } catch (parseError) {
        // If parsing fails, fall through to generic error
      }

      toast({
        title: "Order Failed",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label>Customer Notes (Optional)</Label>
        <Textarea
          placeholder="Any special requests or dietary requirements..."
          value={customerNote}
          onChange={(e) => setCustomerNote(e.target.value)}
          data-testid="input-customer-note"
        />
      </div>

      <div className="rounded-lg bg-muted p-4 space-y-2">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">Cash Payment</p>
            <p className="text-sm text-muted-foreground">
              Please pay {formatCurrency(total)} at the register when you pick up your order.
            </p>
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        size="lg" 
        disabled={isProcessing}
        data-testid="button-confirm-cash-order"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Placing Order...
          </>
        ) : (
          'Place Order'
        )}
      </Button>
    </form>
  );
}

function PaystackCheckoutForm({ 
  items, 
  subtotal, 
  tax, 
  tip,
  total, 
  restaurantId,
  tableId,
  onSuccess,
  onOrderComplete
}: { 
  items: CartItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  restaurantId: string;
  tableId?: string;
  onSuccess: () => void;
  onOrderComplete?: (orderId: string) => void;
}) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerNote, setCustomerNote] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const { formatCurrency } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email only if provided
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create order with 'pending' status
      const orderResponse = await apiRequest("POST", "/api/orders", {
        restaurantId,
        tableId,
        items: items.map(item => ({
          ...item,
          price: item.price.toFixed(2),
        })),
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        tip: tip.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: 'online',
        customerNote,
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.message || 'Order creation failed');
      }

      const orderData = await orderResponse.json();
      const orderId = orderData.id;

      // Step 2: Initialize Paystack payment
      // Use provided email or generate default (Paystack API requires an email)
      const emailForPaystack = customerEmail || `customer-${orderId.slice(0, 8)}@waiterix.app`;
      
      const paymentResponse = await apiRequest("POST", "/api/paystack/initialize-payment", {
        orderId,
        customerEmail: emailForPaystack,
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        
        // Check if online payment is unavailable
        if (errorData.paymentUnavailable) {
          toast({
            title: "Payment Unavailable",
            description: errorData.message || "Online payment is not available. Please choose cash payment.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
        
        throw new Error(errorData.message || 'Payment initialization failed');
      }

      const paymentData = await paymentResponse.json();

      // Step 3: Redirect to Paystack payment page
      window.location.href = paymentData.authorizationUrl;
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label>Email Address (Optional)</Label>
        <Input
          type="email"
          placeholder="your@email.com (optional)"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          data-testid="input-customer-email"
        />
        <p className="text-sm text-muted-foreground">
          Optional: We can send your receipt to this email
        </p>
      </div>

      <div className="space-y-3">
        <Label>Customer Notes (Optional)</Label>
        <Textarea
          placeholder="Any special requests or dietary requirements..."
          value={customerNote}
          onChange={(e) => setCustomerNote(e.target.value)}
          data-testid="input-customer-note"
        />
      </div>

      <div className="rounded-lg bg-muted p-4 space-y-2">
        <div className="flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">Secure Online Payment</p>
            <p className="text-sm text-muted-foreground">
              You'll be redirected to Paystack to complete your payment of {formatCurrency(total)} securely.
            </p>
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        size="lg" 
        disabled={isProcessing}
        data-testid="button-confirm-paystack-payment"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirecting to Payment...
          </>
        ) : (
          `Pay ${formatCurrency(total)} with Paystack`
        )}
      </Button>
    </form>
  );
}

export function CheckoutDialog({
  open,
  onOpenChange,
  items,
  subtotal,
  tax,
  total,
  paymentMethod,
  restaurantId,
  tableId,
  onSuccess,
  onOrderComplete,
}: CheckoutDialogProps) {
  const { toast } = useToast();
  const { formatCurrency, currencyCode } = useLanguage();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [tipPercentage, setTipPercentage] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState<string>("");
  
  // Fetch restaurant data to determine payment gateway
  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: ['/api/public/restaurant', restaurantId],
    enabled: !!restaurantId,
  });

  // Detect if restaurant uses Paystack (has Paystack subaccount)
  const usesPaystack = Boolean(restaurant?.paystackSubaccountCode);
  
  // Calculate tip amount
  const tipAmount = customTip 
    ? parseFloat(customTip) || 0 
    : tipPercentage 
      ? subtotal * (tipPercentage / 100) 
      : 0;
  
  // Calculate total with tip
  const totalWithTip = total + tipAmount;

  useEffect(() => {
    // Only create Stripe payment intent if not using Paystack
    if (open && paymentMethod === 'online' && !usesPaystack) {
      console.log('CheckoutDialog: Starting payment intent creation for amount:', totalWithTip);
      setIsLoading(true);
      setClientSecret(null); // Reset client secret
      setSubscriptionError(null); // Reset error
      apiRequest("POST", "/api/create-payment-intent", { amount: totalWithTip, restaurantId })
        .then(async (response) => {
          const data = await response.json();
          
          // Check for subscription error
          if (data.error === 'subscription_required') {
            setSubscriptionError(data.message || "This restaurant is not currently accepting orders.");
            setIsLoading(false);
            return;
          }
          
          console.log('Payment intent created successfully:', data);
          console.log('Client secret received:', data.clientSecret ? 'yes' : 'no');
          console.log('Stripe account ID received:', data.stripeAccountId ? 'yes' : 'no');
          setClientSecret(data.clientSecret);
          setStripeAccountId(data.stripeAccountId);
          
          // Create Stripe promise with connected account
          const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
          if (!stripeKey) {
            console.error('VITE_STRIPE_PUBLIC_KEY is not configured');
            setSubscriptionError("Payment system is not properly configured. Please contact support.");
            setIsLoading(false);
            return;
          }
          
          if (!data.stripeAccountId) {
            console.error('Stripe account ID not received from server');
            setSubscriptionError("Restaurant payment setup is incomplete. Please contact support.");
            setIsLoading(false);
            return;
          }
          
          const promise = loadStripe(stripeKey, {
            stripeAccount: data.stripeAccountId,
          });
          setStripePromise(promise);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Failed to create payment intent:', error);
          
          // Try to parse the error to check for subscription error
          try {
            const errorMessage = error.message || String(error);
            const jsonMatch = errorMessage.match(/:\s*(\{.*\})\s*$/);
            if (jsonMatch) {
              const errorData = JSON.parse(jsonMatch[1]);
              if (errorData.error === 'subscription_required') {
                setSubscriptionError(errorData.message || "This restaurant is not currently accepting orders.");
                setIsLoading(false);
                return;
              }
            }
          } catch (parseError) {
            // If parsing fails, fall through to generic error
          }
          
          toast({
            title: "Payment Error",
            description: "Failed to initialize payment. Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
        });
    }
  }, [open, paymentMethod, totalWithTip, restaurantId, toast]);

  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="space-y-4">
            <h3 className="font-semibold">Order Summary</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="space-y-1" data-testid={`checkout-item-${item.id}`}>
                  <div className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                  {item.customerNote && (
                    <p className="text-xs text-muted-foreground italic pl-6" data-testid={`checkout-item-note-${item.id}`}>
                      Note: {item.customerNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span data-testid="checkout-subtotal">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (10%)</span>
                <span data-testid="checkout-tax">{formatCurrency(tax)}</span>
              </div>
              {tipAmount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Tip</span>
                  <span data-testid="checkout-tip">{formatCurrency(tipAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span data-testid="checkout-total">{formatCurrency(totalWithTip)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tip Selection */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Add a Tip (Optional)</Label>
              <p className="text-sm text-muted-foreground mt-1">Show your appreciation for great service</p>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              <Button
                type="button"
                variant={tipPercentage === 10 ? "default" : "outline"}
                onClick={() => {
                  setTipPercentage(10);
                  setCustomTip("");
                }}
                data-testid="button-tip-10"
              >
                10%
              </Button>
              <Button
                type="button"
                variant={tipPercentage === 15 ? "default" : "outline"}
                onClick={() => {
                  setTipPercentage(15);
                  setCustomTip("");
                }}
                data-testid="button-tip-15"
              >
                15%
              </Button>
              <Button
                type="button"
                variant={tipPercentage === 20 ? "default" : "outline"}
                onClick={() => {
                  setTipPercentage(20);
                  setCustomTip("");
                }}
                data-testid="button-tip-20"
              >
                20%
              </Button>
              <Button
                type="button"
                variant={tipPercentage === null && !customTip ? "default" : "outline"}
                onClick={() => {
                  setTipPercentage(null);
                  setCustomTip("");
                }}
                data-testid="button-tip-none"
              >
                None
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-tip">Custom Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {currencyCode && CURRENCY_SYMBOLS[currencyCode] ? CURRENCY_SYMBOLS[currencyCode] : '$'}
                </span>
                <input
                  id="custom-tip"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={customTip}
                  onChange={(e) => {
                    setCustomTip(e.target.value);
                    setTipPercentage(null);
                  }}
                  className="w-full pl-7 pr-3 py-2 border rounded-md"
                  data-testid="input-custom-tip"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Subscription Error Alert */}
          {subscriptionError && (
            <Alert variant="destructive" data-testid="alert-subscription-error">
              <AlertDescription>{subscriptionError}</AlertDescription>
            </Alert>
          )}

          {/* Payment Section */}
          {paymentMethod === 'online' ? (
            usesPaystack ? (
              // Paystack payment flow
              <PaystackCheckoutForm
                items={items}
                subtotal={subtotal}
                tax={tax}
                tip={tipAmount}
                total={totalWithTip}
                restaurantId={restaurantId}
                tableId={tableId}
                onSuccess={handleSuccess}
                onOrderComplete={onOrderComplete}
              />
            ) : (
              // Stripe payment flow
              subscriptionError ? null : isLoading || !clientSecret || !stripePromise ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Elements 
                  stripe={stripePromise} 
                  options={{ 
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                    },
                  }}
                >
                  <CheckoutForm
                    items={items}
                    subtotal={subtotal}
                    tax={tax}
                    tip={tipAmount}
                    total={totalWithTip}
                    restaurantId={restaurantId}
                    tableId={tableId}
                    stripeAccountId={stripeAccountId}
                    onSuccess={handleSuccess}
                    onOrderComplete={onOrderComplete}
                  />
                </Elements>
              )
            )
          ) : (
            <CashCheckoutForm
              items={items}
              subtotal={subtotal}
              tax={tax}
              tip={tipAmount}
              total={totalWithTip}
              restaurantId={restaurantId}
              tableId={tableId}
              onSuccess={handleSuccess}
              onOrderComplete={onOrderComplete}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
