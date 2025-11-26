import { useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Minus, Plus, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartDrawerProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  paymentMethod: 'online' | 'cash';
  onPaymentMethodChange: (method: 'online' | 'cash') => void;
  onCheckout: () => void;
  stripeOnboardingComplete?: boolean;
  paystackOnboardingComplete?: boolean;
}

export function CartDrawer({
  items,
  onUpdateQuantity,
  onRemoveItem,
  paymentMethod,
  onPaymentMethodChange,
  onCheckout,
  stripeOnboardingComplete = false,
  paystackOnboardingComplete = false,
}: CartDrawerProps) {
  const { t, formatCurrency } = useLanguage();
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Check if any online payment gateway is available
  const onlinePaymentAvailable = stripeOnboardingComplete || paystackOnboardingComplete;

  // Auto-select 'cash' payment method when online payments are not available
  useEffect(() => {
    if (!onlinePaymentAvailable && paymentMethod === 'online') {
      onPaymentMethodChange('cash');
    }
  }, [onlinePaymentAvailable, paymentMethod, onPaymentMethodChange]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <div className="relative inline-block">
          <Button variant="outline" size="icon" data-testid="button-open-cart">
            <ShoppingCart className="h-5 w-5" />
          </Button>
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 pointer-events-none translate-x-1/2 -translate-y-1/2">
              <Badge 
                variant="destructive" 
                className="h-5 min-w-5 px-1 rounded-full flex items-center justify-center text-xs" 
                data-testid="badge-cart-count"
              >
                {itemCount}
              </Badge>
            </span>
          )}
        </div>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('yourCart')}</SheetTitle>
        </SheetHeader>
        
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <ShoppingCart className="h-16 w-16 mb-4" />
            <p>{t('emptyCart')}</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4" data-testid={`cart-item-${item.id}`}>
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded-md"
                />
                <div className="flex-1">
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-muted-foreground">{formatCurrency(item.price)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                      data-testid={`button-decrease-${item.id}`}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center" data-testid={`text-quantity-${item.id}`}>{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      data-testid={`button-increase-${item.id}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 ml-auto"
                      onClick={() => onRemoveItem(item.id)}
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>{t('subtotal')}</span>
                <span data-testid="text-subtotal">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('tax')}</span>
                <span data-testid="text-tax">{formatCurrency(tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>{t('total')}</span>
                <span data-testid="text-total">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('paymentMethod')}</Label>
              <RadioGroup value={paymentMethod} onValueChange={(value) => onPaymentMethodChange(value as 'online' | 'cash')}>
                {onlinePaymentAvailable && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="online" id="online" data-testid="radio-payment-online" />
                    <Label htmlFor="online" className="cursor-pointer">{t('payOnline')}</Label>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" data-testid="radio-payment-cash" />
                  <Label htmlFor="cash" className="cursor-pointer">{t('payWithCash')}</Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={onCheckout}
              data-testid="button-checkout"
            >
              {t('checkout')}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
