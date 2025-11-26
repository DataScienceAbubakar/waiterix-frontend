import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, Send } from "lucide-react";

interface ContactUsTabProps {
  restaurantName: string;
}

export function ContactUsTab({ restaurantName }: ContactUsTabProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const contactMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string }) => {
      const response = await apiRequest('POST', '/api/contact-support', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your message has been sent to Waiterix support. We'll get back to you soon!",
      });
      setSubject("");
      setMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both subject and message fields.",
        variant: "destructive",
      });
      return;
    }

    contactMutation.mutate({ subject, message });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Contact Waiterix Support</h2>
        <p className="text-muted-foreground">
          Need help or have questions? Reach out to our support team and we'll get back to you as soon as possible.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Send us a message</CardTitle>
              <CardDescription>
                Messages will be sent to support@harmoniaenterprisesllc.com
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="restaurant-name">Restaurant Name</Label>
              <Input
                id="restaurant-name"
                value={restaurantName}
                disabled
                className="bg-muted"
                data-testid="input-restaurant-name"
              />
              <p className="text-xs text-muted-foreground">
                Your restaurant information will be automatically included in the message
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Brief description of your inquiry"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={contactMutation.isPending}
                data-testid="input-subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Please describe your question or issue in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={contactMutation.isPending}
                rows={8}
                className="resize-none"
                data-testid="input-message"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={contactMutation.isPending || !subject.trim() || !message.trim()}
                data-testid="button-send-message"
              >
                {contactMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Support Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="flex items-start gap-2">
            <span className="font-semibold min-w-[100px]">Email:</span>
            <span className="text-muted-foreground">support@harmoniaenterprisesllc.com</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="font-semibold min-w-[100px]">Response Time:</span>
            <span className="text-muted-foreground">We typically respond within 24-48 hours</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
