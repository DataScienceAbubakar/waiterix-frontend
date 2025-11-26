import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

interface TermsAcceptanceModalProps {
  open: boolean;
  onAccept: () => void;
}

export function TermsAcceptanceModal({ open, onAccept }: TermsAcceptanceModalProps) {
  const [agreed, setAgreed] = useState(false);
  const { toast } = useToast();

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/accept-terms', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to accept terms');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      onAccept();
      toast({
        title: "Welcome!",
        description: "You've successfully accepted the terms and conditions.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept terms. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAccept = () => {
    if (!agreed) {
      toast({
        title: "Please accept terms",
        description: "You must agree to the terms and conditions to continue.",
        variant: "destructive",
      });
      return;
    }
    acceptTermsMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-3xl max-h-[90vh]" data-testid="dialog-terms-acceptance">
        <DialogHeader>
          <DialogTitle className="text-2xl">Terms and Conditions</DialogTitle>
          <DialogDescription>
            Please read and accept our terms and conditions to continue using Waiterix.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <h3 className="font-bold mb-2">1. Acceptance of Terms</h3>
            <p className="mb-4">
              By using Waiterix, you accept and agree to be bound by these terms. If you do not agree, 
              please do not use our service.
            </p>

            <h3 className="font-bold mb-2">2. Service Description</h3>
            <p className="mb-4">
              Waiterix provides AI-powered restaurant ordering solutions including voice assistance, 
              QR code menus, online ordering, and payment processing.
            </p>

            <h3 className="font-bold mb-2">3. Subscription & Money-Back Guarantee</h3>
            <p className="mb-4">
              Waiterix costs $50/month plus AI usage costs (typically $15-20/month). 
              If you're not satisfied within 30 days, you can request a full refund. 
              Contact support within the guarantee period for a no-questions-asked refund.
            </p>

            <h3 className="font-bold mb-2">4. AI Usage</h3>
            <p className="mb-4">
              Our AI features are powered by OpenAI. You acknowledge that AI responses may not always 
              be accurate and you are responsible for monitoring customer interactions.
            </p>

            <h3 className="font-bold mb-2">5. User Content</h3>
            <p className="mb-4">
              You retain ownership of all content you upload. By using our service, you grant us 
              a license to use, store, and process this content to provide the service.
            </p>

            <h3 className="font-bold mb-2">6. Account Termination</h3>
            <p className="mb-4">
              You may permanently delete your account at any time. Upon deletion, all your data 
              will be permanently removed and cannot be recovered.
            </p>

            <h3 className="font-bold mb-2">7. Limitation of Liability</h3>
            <p className="mb-4">
              Waiterix is provided "as is" without warranties. We are not liable for service 
              interruptions, data loss, errors in AI responses, or third-party service failures.
            </p>

            <p className="text-sm text-muted-foreground mt-6">
              For complete terms, please visit our{" "}
              <Link href="/terms" className="text-primary hover:underline" data-testid="link-full-terms">
                full Terms and Conditions page
              </Link>
              .
            </p>
          </div>
        </ScrollArea>

        <div className="flex items-center space-x-2 mt-4">
          <Checkbox
            id="terms"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked as boolean)}
            data-testid="checkbox-agree-terms"
          />
          <label
            htmlFor="terms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I have read and agree to the Terms and Conditions
          </label>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAccept}
            disabled={!agreed || acceptTermsMutation.isPending}
            className="w-full"
            data-testid="button-accept-terms"
          >
            {acceptTermsMutation.isPending ? "Accepting..." : "Accept and Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
