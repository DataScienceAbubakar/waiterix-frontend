import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Mail, Loader2, Download, X, MapPin } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
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
    modifiers?: Array<{
      name: string;
      price: string;
    }>;
  }>;
  restaurant: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    country: string | null;
    phone: string | null;
  };
  table: {
    tableNumber: string;
  } | null;
}

interface ReceiptDialogProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptDialog({ orderId, open, onOpenChange }: ReceiptDialogProps) {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const { toast } = useToast();
  const { t, formatCurrency } = useLanguage();

  // Add print-specific CSS to hide everything except the receipt content
  // Only inject when dialog is open to avoid breaking printing on the underlying page
  useEffect(() => {
    if (!open || !orderId) return;

    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        .receipt-printable-dialog,
        .receipt-printable-dialog * {
          visibility: visible;
        }
        .receipt-printable-dialog {
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
  }, [open, orderId]);

  const { data: receiptData, isLoading } = useQuery<ReceiptData>({
    queryKey: ['/api/orders', orderId, 'receipt'],
    enabled: !!orderId && open,
  });

  const handleSendEmail = async () => {
    if (!email || !orderId) return;

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

  if (!orderId) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-receipt">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-receipt" />
            </div>
          ) : receiptData ? (
            <>
              {/* Success Header */}
              <div className="text-center mb-6 print:hidden">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" data-testid="icon-success" />
                </div>
                <DialogTitle className="text-3xl font-bold mb-2">
                  {receiptData.order.paymentMethod === 'cash' ? t('invoice') : t('receipt')}
                </DialogTitle>
                <DialogDescription className="text-base">{t('thankYouForYourOrder')}</DialogDescription>
              </div>

              {/* Receipt Content */}
              <div className="space-y-6 receipt-printable-dialog">
                {/* Restaurant Header */}
                <div className="text-center border-b pb-6">
                  <img src={logoUrl} alt="Waiterix" className="h-12 w-12 mx-auto mb-3" data-testid="img-logo" />
                  <h2 className="text-2xl font-bold mb-1">{receiptData.restaurant.name}</h2>
                  {receiptData.restaurant.address && (
                    <p className="text-sm text-muted-foreground">
                      {receiptData.restaurant.address}
                      {receiptData.restaurant.city && `, ${receiptData.restaurant.city}`}
                      {receiptData.restaurant.country && `, ${receiptData.restaurant.country}`}
                    </p>
                  )}
                  {receiptData.restaurant.phone && (
                    <p className="text-sm text-muted-foreground">{receiptData.restaurant.phone}</p>
                  )}
                </div>

                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('orderNumber')}</p>
                    <p className="font-medium" data-testid="text-order-number">#{receiptData.order.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('dateAndTime')}</p>
                    <p className="font-medium" data-testid="text-order-date">
                      {format(new Date(receiptData.order.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  {receiptData.table && (
                    <div>
                      <p className="text-muted-foreground">{t('table')}</p>
                      <p className="font-medium" data-testid="text-table-number">{t('table')} {receiptData.table.tableNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">{t('paymentMethod')}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" data-testid="badge-payment-method">
                        {receiptData.order.paymentMethod === 'card' ? 'Card' : receiptData.order.paymentMethod.charAt(0).toUpperCase() + receiptData.order.paymentMethod.slice(1)}
                      </Badge>
                      {receiptData.order.paymentStatus === 'completed' && (
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                          {t('paid')}
                        </Badge>
                      )}
                      {receiptData.order.paymentStatus === 'pending' && (
                        <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
                          {t('pending')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Items */}
                <div>
                  <h3 className="font-semibold mb-4">{t('orderItems')}</h3>
                  <div className="space-y-3">
                    {receiptData.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start" data-testid={`item-${item.id}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground">x{item.quantity}</span>
                          </div>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="text-sm text-muted-foreground ml-4 mt-1">
                              {item.modifiers.map((mod, idx) => (
                                <div key={idx}>
                                  + {mod.name} {parseFloat(mod.price) > 0 && `(+${formatCurrency(parseFloat(mod.price))})`}
                                </div>
                              ))}
                            </div>
                          )}
                          {item.customerNote && (
                            <p className="text-sm text-muted-foreground ml-4 mt-1">Note: {item.customerNote}</p>
                          )}
                        </div>
                        <span className="font-medium ml-4" data-testid={`item-price-${item.id}`}>
                          {formatCurrency(parseFloat(item.price) * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('subtotal')}</span>
                    <span data-testid="text-subtotal">{formatCurrency(parseFloat(receiptData.order.subtotal))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('tax')}</span>
                    <span data-testid="text-tax">{formatCurrency(parseFloat(receiptData.order.tax))}</span>
                  </div>
                  {parseFloat(receiptData.order.tip) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tip</span>
                      <span data-testid="text-tip">{formatCurrency(parseFloat(receiptData.order.tip))}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>{t('total')}</span>
                    <span data-testid="text-total">{formatCurrency(parseFloat(receiptData.order.total))}</span>
                  </div>
                </div>

                {receiptData.order.customerNote && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t('specialInstructions')}</p>
                      <p className="text-sm">{receiptData.order.customerNote}</p>
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 print:hidden">
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => setShowEmailDialog(true)}
                    data-testid="button-email-receipt"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {t('emailReceipt')}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    disabled={isPrinting}
                    onClick={() => {
                      if (!isPrinting) {
                        setIsPrinting(true);
                        window.print();
                        setTimeout(() => setIsPrinting(false), 2000);
                      }
                    }}
                    data-testid="button-print-receipt"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isPrinting ? t('printing') : t('printSavePDF')}
                  </Button>
                </div>

                <div className="space-y-3 pt-4 print:hidden">
                  <Button 
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
                    {t('trackYourOrder')}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => onOpenChange(false)} 
                    className="w-full"
                    data-testid="button-close-receipt"
                  >
                    {t('continueBrowsingMenu')}
                  </Button>
                </div>

                {/* Waiterix Branding */}
                <div className="text-center pt-4 border-t mt-4 print:hidden">
                  <a
                    href="https://waiterix.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover-elevate inline-block px-3 py-1.5 rounded-md transition-colors"
                    data-testid="link-waiterix-branding-receipt"
                  >
                    Powered by Waiterix.com - AI Ordering Made Simple
                  </a>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('receiptNotFound')}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent data-testid="dialog-email-receipt">
          <DialogHeader>
            <DialogTitle>{t('emailReceipt')}</DialogTitle>
            <DialogDescription>
              {t('enterEmailToReceiveReceipt')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="email">{t('emailAddress')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendEmail()}
                data-testid="input-email"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowEmailDialog(false)}
              data-testid="button-cancel-email"
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleSendEmail} 
              disabled={isSendingEmail}
              data-testid="button-send-email"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('sending')}
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  {t('sendReceipt')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
