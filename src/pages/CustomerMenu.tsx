import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { RestaurantHeader } from "@/components/RestaurantHeader";
import { CategoryFilter } from "@/components/CategoryFilter";
import { MenuItemCard } from "@/components/MenuItemCard";
import { CartDrawer } from "@/components/CartDrawer";
import { MenuItemDialog } from "@/components/MenuItemDialog";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import { FloatingAIWaiter } from "@/components/FloatingAIWaiter";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { CallWaiterButton } from "@/components/CallWaiterButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Bot } from "lucide-react";
import type { Restaurant, MenuItem } from "@/shared/schema";
import type { Language } from "@/lib/translations";
const restaurantImg = '/assets/stock_images/restaurant_interior__df0b7770.jpg';
import { loadStripe } from '@stripe/stripe-js';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CartItem {
  id: string;
  name: string;
  description: string;
  price: string;
  quantity: number;
  image: string;
  category: string;
  spiceLevel?: string | null;
  isVegan?: boolean;
  isVegetarian?: boolean;
  isHalal?: boolean;
  isKosher?: boolean;
  allergens?: string[] | null;
  customerNote?: string;
}

function CustomerMenuContent() {
  const { id: restaurantId } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { t, setLanguage, language } = useLanguage();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const [receiptOrderId, setReceiptOrderId] = useState<string | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const floatingAIWaiterRef = useRef<{ triggerWelcome: () => Promise<void> } | null>(null);

  // Extract table Number from query params (e.g. ?table=1)
  const tableNumber = new URLSearchParams(window.location.search).get('table');

  // Fetch tables to resolve table number to UUID
  const { data: tables = [] } = useQuery<any[]>({
    queryKey: ['/api/public/restaurant', restaurantId, 'tables'],
    queryFn: async () => {
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBaseUrl}/api/public/restaurant/${restaurantId}/tables`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!restaurantId,
  });

  const activeTable = tables.find(t => t.tableNumber === tableNumber);
  // Use the UUID if found, otherwise undefined (or fallback to number string for legacy compatibility if needed)
  const tableId = activeTable?.id;

  // Check if this is the first visit for this restaurant session
  useEffect(() => {
    if (restaurantId) {
      const hasSeenWelcome = sessionStorage.getItem(`restaurant-${restaurantId}-welcome-seen`);
      if (!hasSeenWelcome) {
        setShowWelcomeOverlay(true);
      }
    }
  }, [restaurantId]);

  // Fetch restaurant data
  const { data: restaurant, isLoading: restaurantLoading, error: restaurantError } = useQuery<Restaurant>({
    queryKey: ['/api/public/restaurant', restaurantId],
    queryFn: async () => {
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBaseUrl}/api/public/restaurant/${restaurantId}`);
      if (!res.ok) throw new Error('Restaurant not found');
      return res.json();
    },
    enabled: !!restaurantId,
  });

  // Set language to restaurant's default when restaurant data loads
  useEffect(() => {
    if (restaurant?.defaultLanguage && restaurantId) {
      const storedRestaurantLanguage = localStorage.getItem(`restaurant-${restaurantId}-language`);

      if (storedRestaurantLanguage) {
        // User has a preference for this restaurant, use it
        if (storedRestaurantLanguage !== language) {
          setLanguage(storedRestaurantLanguage as Language);
        }
      } else {
        // No preference stored, use restaurant's default
        setLanguage(restaurant.defaultLanguage as Language);
        localStorage.setItem(`restaurant-${restaurantId}-language`, restaurant.defaultLanguage);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.defaultLanguage, restaurantId]);

  // Track language changes and store per-restaurant (when user manually changes language)
  useEffect(() => {
    if (restaurantId && language && restaurant) {
      const storedRestaurantLanguage = localStorage.getItem(`restaurant-${restaurantId}-language`);
      // Only update if language changed from what's stored
      if (storedRestaurantLanguage && storedRestaurantLanguage !== language) {
        localStorage.setItem(`restaurant-${restaurantId}-language`, language);
      }
    }
  }, [language, restaurantId, restaurant]);

  // Track table scan when menu loads
  useEffect(() => {
    const trackTableScan = async () => {
      // Only track if we have a valid restaurant and table UUID
      if (restaurantId && tableId) {
        // Use tableNumber for storage key to keep it simple/consistent with URL
        const hasTrackedScan = sessionStorage.getItem(`restaurant-${restaurantId}-table-${tableNumber}-tracked`);
        if (!hasTrackedScan) {
          try {
            const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || '';
            await fetch(`${apiBaseUrl}/api/analytics/table-scan`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ restaurantId, tableId }), // Sending UUID
            });
            sessionStorage.setItem(`restaurant-${restaurantId}-table-${tableNumber}-tracked`, 'true');
          } catch (error) {
            console.error('Failed to track table scan:', error);
          }
        }
      }
    };

    trackTableScan();
  }, [restaurantId, tableId, tableNumber]);

  // Handle payment redirect return (CashApp Pay, Afterpay, etc.)
  useEffect(() => {
    const handlePaymentReturn = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentIntent = urlParams.get('payment_intent');
      const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret');

      // Check if this is a return from a redirect-based payment
      if (paymentIntent && paymentIntentClientSecret) {
        console.log('[Payment Return] Detected payment redirect return');

        // Get pending order data from localStorage
        const pendingOrderDataStr = localStorage.getItem('pendingOrder');
        if (!pendingOrderDataStr) {
          console.error('[Payment Return] No pending order data found in localStorage');
          toast({
            title: "Order Error",
            description: "Could not find pending order data. Please contact support if payment was charged.",
            variant: "destructive",
          });
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        const pendingOrderData = JSON.parse(pendingOrderDataStr);

        // Check if pending order data has expired (1 hour)
        const PENDING_ORDER_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds
        const orderAge = Date.now() - pendingOrderData.timestamp;
        if (orderAge > PENDING_ORDER_EXPIRY) {
          console.error('[Payment Return] Pending order data has expired:', orderAge, 'ms old');
          localStorage.removeItem('pendingOrder');
          toast({
            title: "Order Expired",
            description: "This order session has expired. Please place a new order.",
            variant: "destructive",
          });
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        // Verify payment was successful using Stripe
        try {
          const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
          if (!stripeKey) {
            throw new Error('Stripe public key not configured');
          }

          const stripe = await loadStripe(stripeKey, {
            stripeAccount: pendingOrderData.stripeAccountId,
          });

          if (!stripe) {
            throw new Error('Failed to load Stripe');
          }

          // Retrieve the PaymentIntent to verify status
          const { paymentIntent: retrievedPaymentIntent } = await stripe.retrievePaymentIntent(paymentIntentClientSecret);

          if (retrievedPaymentIntent?.status === 'succeeded') {
            console.log('[Payment Return] Payment successful, creating order');

            // Create the order
            const response = await apiRequest("POST", "/api/orders", {
              ...pendingOrderData,
              stripePaymentIntentId: paymentIntent,
            });

            // Validate response before proceeding
            if (!response.ok) {
              const errorData = await response.json();
              console.error('[Payment Return] Order creation failed:', errorData);

              // Keep pending data for potential retry, show error
              toast({
                title: "Order Creation Failed",
                description: errorData.message || "Payment succeeded but order creation failed. Please contact support with your payment confirmation.",
                variant: "destructive",
              });

              // Clean up URL but keep localStorage for support/retry
              window.history.replaceState({}, document.title, window.location.pathname);
              return;
            }

            const data = await response.json();
            console.log('[Payment Return] Order created successfully:', data);

            // Clear pending order data only after successful creation
            localStorage.removeItem('pendingOrder');

            // Clear cart
            setCartItems([]);

            // Redirect to receipt page
            setLocation(`/receipt/${data.id}`);
          } else {
            console.error('[Payment Return] Payment not successful:', retrievedPaymentIntent?.status);

            // Clear stale pending data since payment didn't succeed
            localStorage.removeItem('pendingOrder');

            toast({
              title: "Payment Issue",
              description: `Payment status: ${retrievedPaymentIntent?.status}. Please contact support if you were charged.`,
              variant: "destructive",
            });
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error('[Payment Return] Error creating order after redirect:', error);

          // Keep pending data for potential retry
          toast({
            title: "Order Failed",
            description: "Payment verification or order creation failed. Please contact support with your payment confirmation.",
            variant: "destructive",
          });

          // Clean up URL but keep localStorage for support/retry
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    handlePaymentReturn();
  }, [restaurantId, toast]);

  // Fetch menu items
  const { data: menuItems = [], isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu-items', restaurantId],
    queryFn: async () => {
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBaseUrl}/api/menu-items?restaurantId=${restaurantId}`);
      if (!res.ok) throw new Error('Failed to fetch menu items');
      return res.json();
    },
    enabled: !!restaurantId,
  });

  // Get unique categories from menu items
  const actualCategories = Array.from(new Set(menuItems.map(item => item.category)));
  const categories = [
    { value: "ALL", label: t('allCategories') },
    ...actualCategories.map(cat => ({ value: cat, label: cat }))
  ];

  const filteredItems = activeCategory === "ALL"
    ? menuItems.filter(item => item.available)
    : menuItems.filter(item => item.category === activeCategory && item.available);

  const addToCart = (item: MenuItem, quantity: number = 1) => {
    console.log('[CustomerMenu] addToCart called with item:', item);
    console.log('[CustomerMenu] Current cart items:', cartItems);

    const cartItem: CartItem = {
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      quantity,
      image: item.imageUrl || restaurantImg,
      category: item.category,
      spiceLevel: item.spiceLevel,
      isVegan: item.isVegan,
      isVegetarian: item.isVegetarian,
      isHalal: item.isHalal,
      isKosher: item.isKosher,
      allergens: item.allergens,
    };

    console.log('[CustomerMenu] Created cart item:', cartItem);

    const existingItem = cartItems.find(ci => ci.id === item.id);
    if (existingItem) {
      console.log('[CustomerMenu] Item exists in cart, updating quantity');
      setCartItems(cartItems.map(ci =>
        ci.id === item.id ? { ...ci, quantity: ci.quantity + quantity } : ci
      ));
    } else {
      console.log('[CustomerMenu] Adding new item to cart');
      setCartItems([...cartItems, cartItem]);
    }
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity === 0) {
      setCartItems(cartItems.filter(item => item.id !== id));
    } else {
      setCartItems(cartItems.map(item =>
        item.id === id ? { ...item, quantity } : item
      ));
    }
  };

  const handleCheckout = () => {
    setCheckoutOpen(true);
  };

  const handleCheckoutSuccess = () => {
    setCartItems([]);
    setCheckoutOpen(false);
  };

  const handleOrderComplete = (orderId: string) => {
    // Show receipt dialog with order ID
    setReceiptOrderId(orderId);
    setReceiptDialogOpen(true);
    // Close checkout dialog
    setCheckoutOpen(false);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  // Loading state
  if (restaurantLoading || menuLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Restaurant header skeleton */}
          <div className="relative mb-8 overflow-hidden rounded-xl">
            <Skeleton className="h-64 w-full pulse-enhanced" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <Skeleton className="h-8 w-3/4 mb-2 pulse-enhanced" />
              <Skeleton className="h-4 w-1/2 pulse-enhanced" />
            </div>
          </div>

          {/* Menu navigation skeleton */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-20 pulse-enhanced" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-24 pulse-enhanced" />
                <Skeleton className="h-10 w-24 pulse-enhanced" />
                <Skeleton className="h-10 w-24 pulse-enhanced" />
              </div>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-8 w-20 pulse-enhanced" />
              ))}
            </div>
          </div>

          {/* Menu items skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-card rounded-lg overflow-hidden">
                <Skeleton className="h-48 w-full pulse-enhanced" />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <Skeleton className="h-6 w-3/4 pulse-enhanced" />
                    <Skeleton className="h-6 w-16 pulse-enhanced" />
                  </div>
                  <Skeleton className="h-4 w-full mb-2 pulse-enhanced" />
                  <Skeleton className="h-4 w-2/3 mb-4 pulse-enhanced" />
                  <div className="flex gap-2 mb-4">
                    <Skeleton className="h-6 w-16 pulse-enhanced" />
                    <Skeleton className="h-6 w-20 pulse-enhanced" />
                  </div>
                  <Skeleton className="h-10 w-full pulse-enhanced" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (restaurantError || !restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Restaurant Not Found</AlertTitle>
          <AlertDescription>
            The restaurant you're looking for doesn't exist or has been removed.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RestaurantHeader
        name={restaurant.name}
        description={restaurant.description || ""}
        image={restaurant.coverImageUrl || restaurantImg}
        address={restaurant.address || ""}
        phone={restaurant.phone || ""}
        hours={restaurant.hours || ""}
      />

      <div className="sticky top-0 z-40 glass backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold gradient-text">{t('menu')}</h2>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <CallWaiterButton
                restaurantId={restaurantId || ''}
                tableId={tableId || undefined}
                variant="outline"
                className="hover-lift"
              />
              <CartDrawer
                items={cartItems.map(item => ({
                  ...item,
                  price: parseFloat(item.price),
                }))}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={(id) => setCartItems(cartItems.filter(item => item.id !== id))}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                onCheckout={handleCheckout}
                stripeOnboardingComplete={restaurant.stripeOnboardingComplete}
                paystackOnboardingComplete={!!restaurant.paystackSubaccountCode}
              />
            </div>
          </div>
          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-chart-2/5 pointer-events-none"></div>
        {filteredItems.length === 0 ? (
          <div className="text-center py-20 relative z-10">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center">
                <Bot className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Items Available</h3>
              <p className="text-muted-foreground">No menu items available in this category at the moment.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
            {filteredItems.map((item, index) => (
              <div
                key={item.id}
                className="bounce-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <MenuItemCard
                  name={item.name}
                  description={item.description}
                  price={parseFloat(item.price as any)}
                  image={item.imageUrl?.startsWith('http') || item.imageUrl?.startsWith('/') ? item.imageUrl : `/assets/stock_images/${item.imageUrl}` || restaurantImg}
                  spiceLevel={item.spiceLevel ? parseInt(item.spiceLevel) : undefined}
                  isVegan={item.isVegan}
                  isVegetarian={item.isVegetarian}
                  isHalal={item.isHalal}
                  isKosher={item.isKosher}
                  allergens={item.allergens || []}
                  onAddToCart={() => addToCart(item)}
                  onClick={() => setSelectedItem(item)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedItem && (
        <MenuItemDialog
          open={!!selectedItem}
          onOpenChange={(open) => !open && setSelectedItem(null)}
          item={{
            ...selectedItem,
            price: parseFloat(selectedItem.price as any),
            spiceLevel: selectedItem.spiceLevel ? parseInt(selectedItem.spiceLevel) : undefined,
            allergens: selectedItem.allergens || [],
            image: selectedItem.imageUrl?.startsWith('http') || selectedItem.imageUrl?.startsWith('/') ? selectedItem.imageUrl : `/assets/stock_images/${selectedItem.imageUrl}` || restaurantImg,
          }}
          onAddToCart={(quantity) => addToCart(selectedItem, quantity)}
        />
      )}

      {restaurantId && (
        <CheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          items={cartItems.map(item => ({
            ...item,
            price: parseFloat(item.price),
          }))}
          subtotal={subtotal}
          tax={tax}
          total={total}
          paymentMethod={paymentMethod}
          restaurantId={restaurantId}
          tableId={tableId || undefined}
          onSuccess={handleCheckoutSuccess}
          onOrderComplete={handleOrderComplete}
        />
      )}

      {/* Receipt Dialog */}
      <ReceiptDialog
        orderId={receiptOrderId}
        open={receiptDialogOpen}
        onOpenChange={(open) => {
          setReceiptDialogOpen(open);
          // Clear cart when receipt dialog is closed
          if (!open) {
            setCartItems([]);
          }
        }}
      />

      {/* Welcome overlay - shown on first visit only if AI is enabled */}
      <AnimatePresence>
        {showWelcomeOverlay && restaurant && restaurant.aiWaiterEnabled && (
          <WelcomeOverlay
            restaurantName={restaurant.name}
            onDismiss={async () => {
              // Request microphone permission for wake word detection (user gesture context)
              const wakeWordEnabled = localStorage.getItem('waiterix-wake-word-enabled');
              if (wakeWordEnabled === null || wakeWordEnabled === 'true') {
                try {
                  console.log('[CustomerMenu] Requesting mic permission for wake word detection...');
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                  console.log('[CustomerMenu] Mic permission granted');
                  // Store permission grant
                  sessionStorage.setItem('waiterix-mic-permission-granted', 'true');
                  // Stop the stream immediately - we just needed permission
                  stream.getTracks().forEach(track => track.stop());
                } catch (err) {
                  console.warn('[CustomerMenu] Mic permission denied:', err);
                  sessionStorage.setItem('waiterix-mic-permission-granted', 'false');
                }
              }

              // Mark that user has seen the welcome
              if (restaurantId) {
                sessionStorage.setItem(`restaurant-${restaurantId}-welcome-seen`, 'true');
              }

              // Hide overlay immediately
              setShowWelcomeOverlay(false);

              // Trigger AI welcome IMMEDIATELY in the user gesture context (critical for audio unlock)
              // This is non-blocking - overlay closes while welcome plays
              if (floatingAIWaiterRef.current) {
                floatingAIWaiterRef.current.triggerWelcome().catch(err => {
                  console.error('Welcome trigger failed:', err);
                });
              } else {
                console.error('AI Waiter ref not available when overlay was dismissed');
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Floating AI Waiter character - only show if AI is enabled */}
      {restaurantId && restaurant?.aiWaiterEnabled && (
        <FloatingAIWaiter
          ref={floatingAIWaiterRef}
          restaurantId={restaurantId}
          restaurantName={restaurant.name}
          menuItems={menuItems}
          onAddToCart={(item) => addToCart(item)}
          initiallyHidden={showWelcomeOverlay}
        />
      )}

      {/* Waiterix Branding Footer */}
      <footer className="mt-8 pb-4 text-center border-t pt-4">
        <a
          href="https://waiterix.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover-elevate inline-block px-3 py-1.5 rounded-md transition-colors"
          data-testid="link-waiterix-branding"
        >
          Powered by Waiterix.com - AI Ordering Made Simple
        </a>
      </footer>
    </div>
  );
}

export default function CustomerMenu() {
  const { id: restaurantId } = useParams<{ id: string }>();

  // Fetch restaurant data for RestaurantProvider
  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: ['/api/public/restaurant', restaurantId],
    queryFn: async () => {
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBaseUrl}/api/public/restaurant/${restaurantId}`);
      if (!res.ok) throw new Error('Restaurant not found');
      return res.json();
    },
    enabled: !!restaurantId,
  });

  // Wrap with RestaurantProvider to sync currency and language
  return (
    <RestaurantProvider
      currencyCode={restaurant?.currencyCode}
      defaultLanguage={restaurant?.defaultLanguage}
    >
      <CustomerMenuContent />
    </RestaurantProvider>
  );
}
