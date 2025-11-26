import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, ChefHat, UtensilsCrossed, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { RestaurantProvider } from "@/contexts/RestaurantContext";

function OrderTrackingContent() {
  const { orderId } = useParams<{ orderId: string }>();
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const { formatCurrency } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/orders', orderId, 'track'],
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!data || !('restaurant' in data) || !data.restaurant?.id) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?restaurantId=${data.restaurant.id}&customerSessionId=tracking-${orderId}&role=customer`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'order-status-changed' && message.data.orderId === orderId) {
          // Refresh the order data
          window.location.reload();
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    return () => {
      ws.close();
    };
  }, [data?.restaurant?.id, orderId]);

  // Show rating dialog when order is completed and hasn't been rated
  useEffect(() => {
    if (data?.order?.status === 'completed' && !data?.hasBeenRated) {
      setShowRatingDialog(true);
    }
  }, [data?.order?.status, data?.hasBeenRated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!data?.order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
          <p className="text-muted-foreground">We couldn't find an order with this ID.</p>
        </Card>
      </div>
    );
  }

  const { order, items, restaurant, table } = data;

  const statusSteps = [
    { key: 'new', label: 'Order Placed', icon: Package, description: 'Your order has been received' },
    { key: 'preparing', label: 'Preparing', icon: ChefHat, description: 'Our chefs are preparing your food' },
    { key: 'ready', label: 'Ready', icon: UtensilsCrossed, description: 'Your order is ready!' },
    { key: 'completed', label: 'Completed', icon: CheckCircle, description: 'Enjoy your meal!' },
  ];

  const currentStepIndex = statusSteps.findIndex(step => step.key === order.status);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 py-8 space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-order-title">Order #{order.id.slice(0, 8)}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {restaurant?.name}
              </p>
              {table && (
                <p className="text-sm text-muted-foreground">
                  Table {table.tableNumber}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Placed</p>
              <p className="font-medium">{formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}</p>
            </div>
          </div>
        </Card>

        {/* Status Timeline */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-6">Order Status</h2>
          <div className="space-y-4">
            {statusSteps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              const IconComponent = step.icon;

              return (
                <div key={step.key} className="flex items-start gap-4" data-testid={`status-step-${step.key}`}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <IconComponent className="h-6 w-6" />
                    </div>
                    {index < statusSteps.length - 1 && (
                      <div
                        className={`w-0.5 h-16 ${
                          index < currentStepIndex ? 'bg-green-500' : 'bg-muted'
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 pt-2">
                    <h3 className={`font-semibold ${isActive ? 'text-primary' : ''}`}>
                      {step.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    {isActive && (
                      <Badge className="mt-2" data-testid="badge-current-status">Current Status</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Order Items */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Order Items</h2>
          <div className="space-y-3">
            {items?.map((item: any, index: number) => (
              <div key={index} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">
                    <span className="text-muted-foreground">{item.quantity}x</span> {item.name}
                  </p>
                  {item.customerNote && (
                    <p className="text-sm text-muted-foreground italic">Note: {item.customerNote}</p>
                  )}
                </div>
                <p className="font-medium">{formatCurrency(parseFloat(item.price))}</p>
              </div>
            ))}
          </div>
          
          <div className="border-t mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(parseFloat(order.subtotal))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(parseFloat(order.tax))}</span>
            </div>
            {parseFloat(order.tip) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tip</span>
                <span>{formatCurrency(parseFloat(order.tip))}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(parseFloat(order.total))}</span>
            </div>
          </div>
        </Card>

        {/* Show Rating Button if completed and not yet rated */}
        {order.status === 'completed' && !data.hasBeenRated && showRatingDialog && (
          <Card className="p-6 bg-primary/5 border-primary">
            <h2 className="text-lg font-semibold mb-2">How was your experience?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              We'd love to hear your feedback!
            </p>
            <button
              onClick={() => {
                // This will be handled by the RatingDialog component we'll create next
                const event = new CustomEvent('open-rating-dialog', { 
                  detail: { orderId: order.id, items, restaurantId: restaurant.id } 
                });
                window.dispatchEvent(event);
              }}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover-elevate active-elevate-2"
              data-testid="button-rate-order"
            >
              Rate Your Order
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  
  // Fetch order data for RestaurantProvider
  const { data } = useQuery({
    queryKey: ['/api/orders', orderId, 'track'],
    refetchInterval: 5000,
    enabled: !!orderId, // Only fetch when orderId is available
  });
  
  // Wrap with RestaurantProvider to sync currency and language
  return (
    <RestaurantProvider 
      currencyCode={data?.restaurant?.currencyCode} 
      defaultLanguage={data?.restaurant?.defaultLanguage}
    >
      <OrderTrackingContent />
    </RestaurantProvider>
  );
}
