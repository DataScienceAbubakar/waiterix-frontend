import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Loader2, CheckCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface CallWaiterButtonProps {
  restaurantId: string;
  tableId?: string;
  orderId?: string;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function CallWaiterButton({ restaurantId, tableId, orderId, variant = "default", className }: CallWaiterButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const callWaiterMutation = useMutation({
    mutationFn: async (data: { restaurantId: string; tableId?: string; orderId?: string; customerMessage?: string }) => {
      const response = await apiRequest('POST', '/api/assistance-requests', {
        ...data,
        requestType: 'call_waiter',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to call waiter');
      }
      return response.json();
    },
    onSuccess: () => {
      setSuccess(true);
      toast({
        title: t('waiterCalled'),
        description: t('staffMemberWillBeWithYouShortly'),
      });
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setMessage('');
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    // Validate restaurantId before submitting (check for non-empty)
    if (!restaurantId || !restaurantId.trim()) {
      toast({
        title: t('error'),
        description: t('unableToContactRestaurant'),
        variant: "destructive",
      });
      return;
    }
    
    callWaiterMutation.mutate({
      restaurantId,
      tableId,
      orderId,
      customerMessage: message || undefined,
    });
  };

  return (
    <>
      <Button
        variant={variant}
        size="icon"
        onClick={() => setIsOpen(true)}
        className={className}
        data-testid="button-call-waiter"
      >
        <Bell className="h-5 w-5 text-red-500" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent data-testid="dialog-call-waiter">
          <DialogHeader>
            <DialogTitle>{t('callForAssistance')}</DialogTitle>
            <DialogDescription>
              {t('staffNotified')}
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('requestSent')}</h3>
              <p className="text-muted-foreground">{t('someoneWillBeWithYouSoon')}</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('assistanceQuestion')}
                </label>
                <Textarea
                  placeholder={t('assistancePlaceholder')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  data-testid="textarea-waiter-message"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={callWaiterMutation.isPending}
                  data-testid="button-cancel-call"
                >
                  {t('cancel')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={callWaiterMutation.isPending}
                  data-testid="button-confirm-call"
                >
                  {callWaiterMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('callWaiter')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
