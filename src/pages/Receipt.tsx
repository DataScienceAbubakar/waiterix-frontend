import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Mail, Loader2, Download, MapPin } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import logoUrl from "@/assets/waiterix-logo.png";

interface ReceiptData {
  order: {
    id: string;
    customerNote: string | null;
    paymentMethod: string;
    paymentStatus: string;
    subtotal: string;
    tax: string;
    tip: string;
    total: string;
    status: string;
    createdAt: string;
  };
  items: Array<{
    id: string;
    name: string;
    price: string;
    quantity: number;
    customerNote: string | null;
  }>;
  restaurant: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    country: string | null;
    phone: string | null;
    currencyCode?: string;
    defaultLanguage?: string;
  };
  table: {
    tableNumber: string;
  } | null;
}

function ReceiptContent() {
  const [, params] = useRoute("/receipt/:orderId");
  const orderId = params?.orderId;
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const { toast } = useToast();
  const { t, formatCurrency } = useLanguage();

  // Add print-specific CSS to hide everything except the receipt card
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        .receipt-printable,
        .receipt-printable * {
          visibility: visible;
        }
        .receipt-printable {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        @page {
          margin: 1cm;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const { data: receiptData, isLoading, error} = useQuery<ReceiptData>({
    queryKey: ['/api/orders', orderId, 'receipt'],
    enabled: !!orderId,
  });

  const handleSendEmail = async () => {
    if (!email || !orderId) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: t('invalidEmail'),
        description: t('pleaseEnterValidEmail'),
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await apiRequest("POST", `/api/orders/${orderId}/email-receipt`, {
        email,
      });

      if (response.ok) {
        toast({
          title: t('receiptSent'),
          description: `${t('receiptSentTo')} ${email}`,
        });
        setShowEmailDialog(false);
        setEmail("");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending receipt email:", error);
      toast({
        title: t('failedToSend'),
        description: error instanceof Error ? error.message : t('couldNotSendEmail'),
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePrint = () => {
    if (!isPrinting) {
      setIsPrinting(true);
      window.print();
      setTimeout(() => setIsPrinting(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-receipt" />
      </div>
    );
  }

  if (error || !receiptData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">{t('receiptNotFound')}</h1>
          <p className="text-muted-foreground">
            We couldn't find this order receipt. Please check your order ID and try again.
          </p>
        </Card>
      </div>
    );
  }

  const { order, items, restaurant, table } = receiptData;

  return (
    <div className="min-h-screen bg-muted/30 p-4 print:bg-white print:p-0">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-6 print:hidden">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" data-testid="icon-success" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {receiptData.order.paymentMethod === 'cash' ? t('invoice') : t('receipt')}
          </h1>
          <p className="text-muted-foreground">{t('thankYouForYourOrder')}</p>
        </div>

        {/* Receipt Card */}
        <Card className="p-8 print:shadow-none print:border-0 receipt-printable">
          {/* Header */}
          <div className="text-center mb-8 border-b pb-6">
            <img src={logoUrl} alt="Waiterix" className="h-12 w-12 mx-auto mb-3" data-testid="img-logo" />
            <h2 className="text-2xl font-bold mb-1">{restaurant.name}</h2>
            {restaurant.address && (
              <p className="text-sm text-muted-foreground">
                {restaurant.address}
                {restaurant.city && `, ${restaurant.city}`}
                {restaurant.country && `, ${restaurant.country}`}
              </p>
            )}
            {restaurant.phone && (
              <p className="text-sm text-muted-foreground">{restaurant.phone}</p>
            )}
          </div>

          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-muted-foreground">{t('orderNumber')}</p>
              <p className="font-medium" data-testid="text-order-id">#{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('dateAndTime')}</p>
              <p className="font-medium" data-testid="text-order-date">
                {format(new Date(order.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            {table && (
              <div>
                <p className="text-muted-foreground">{t('table')}</p>
                <p className="font-medium" data-testid="text-table-number">{t('table')} {table.tableNumber}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">{t('paymentMethod')}</p>
              <p className="font-medium capitalize" data-testid="text-payment-method">
                {order.paymentMethod === 'card' ? 'Card' : order.paymentMethod}
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Items */}
          <div className="mb-6">
            <h3 className="font-semibold mb-4">{t('orderItems')}</h3>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="flex justify-between items-start" data-testid={`item-${index}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      <Badge variant="secondary" className="text-xs">×{item.quantity}</Badge>
                    </div>
                    {item.customerNote && (
                      <p className="text-sm text-muted-foreground mt-1">Note: {item.customerNote}</p>
                    )}
                  </div>
                  <span className="font-medium ml-4">
                    {formatCurrency(parseFloat(item.price) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Totals */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('subtotal')}</span>
              <span data-testid="text-subtotal">{formatCurrency(parseFloat(order.subtotal))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('tax')}</span>
              <span data-testid="text-tax">{formatCurrency(parseFloat(order.tax))}</span>
            </div>
            {parseFloat(order.tip) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tip</span>
                <span data-testid="text-tip">{formatCurrency(parseFloat(order.tip))}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between text-lg font-bold">
              <span>{t('total')}</span>
              <span data-testid="text-total">{formatCurrency(parseFloat(order.total))}</span>
            </div>
          </div>

          {/* Customer Note */}
          {order.customerNote && (
            <div className="bg-muted/50 p-4 rounded-lg mb-6">
              <p className="text-sm font-medium mb-1">{t('specialInstructions')}</p>
              <p className="text-sm text-muted-foreground">{order.customerNote}</p>
            </div>
          )}

          {/* Payment Status */}
          <div className="text-center py-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              {order.paymentStatus === 'completed' ? t('paymentCompleted') : t('paymentPending')}
            </Badge>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 print:hidden">
          <Button
            variant="default"
            className="w-full"
            onClick={() => {
              toast({
                title: t('openingOrderTracking'),
                description: t('orderTrackingWillOpen'),
              });
              window.open(`/track/${orderId}`, '_blank');
            }}
            data-testid="button-track-order"
          >
            <MapPin className="h-4 w-4 mr-2" />
            {t('trackOrder')}
          </Button>
          <Button
            onClick={() => setShowEmailDialog(true)}
            variant="outline"
            className="flex-1"
            data-testid="button-email-receipt"
          >
            <Mail className="h-4 w-4 mr-2" />
            {t('emailReceipt')}
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="flex-1"
            disabled={isPrinting}
            data-testid="button-print"
          >
            <Download className="h-4 w-4 mr-2" />
            {isPrinting ? t('printing') : t('printSavePDF')}
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground print:hidden">
          <p>{t('thankYouForDining')}</p>
          <p className="mt-2">{t('questionsContact')} {restaurant.name} {t('directly')}</p>
        </div>

        {/* Waiterix Branding */}
        <div className="text-center mt-6 pt-6 border-t print:hidden">
          <a
            href="https://waiterix.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover-elevate inline-block px-3 py-1.5 rounded-md transition-colors"
            data-testid="link-waiterix-branding-receipt-page"
          >
            Powered by Waiterix.com - AI Ordering Made Simple
          </a>
        </div>
      </div>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('emailReceipt')}</DialogTitle>
            <DialogDescription>
              {t('enterEmailToReceiveReceipt')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('emailAddress')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendEmail();
                  }
                }}
                data-testid="input-email"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEmailDialog(false)}
              disabled={isSendingEmail}
              data-testid="button-cancel-email"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !email}
              data-testid="button-send-email"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('sending')}
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  {t('sendReceipt')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Receipt() {
  const [, params] = useRoute("/receipt/:orderId");
  const orderId = params?.orderId;
  
  // Fetch receipt data for RestaurantProvider (cached - no duplicate network request)
  const { data: receiptData } = useQuery<ReceiptData>({
    queryKey: ['/api/orders', orderId, 'receipt'],
    enabled: !!orderId,
  });
  
  // Wrap with RestaurantProvider to sync currency and language
  return (
    <RestaurantProvider 
      currencyCode={receiptData?.restaurant?.currencyCode} 
      defaultLanguage={receiptData?.restaurant?.defaultLanguage}
    >
      <ReceiptContent />
    </RestaurantProvider>
  );
}
