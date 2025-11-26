import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import logoUrl from "@/assets/waiterix-logo.png";
import { Link } from "wouter";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" data-testid="link-home">
            <img src={logoUrl} alt="Waiterix" className="h-10 w-auto" />
            <span className="text-xl font-bold">Waiterix</span>
          </Link>
          <Button onClick={() => window.location.href = "/"} variant="ghost" data-testid="button-back-home">
            Back to Home
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>
        <p className="text-muted-foreground mb-8">Last updated: October 19, 2025</p>

        <Card className="p-8 mb-6">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing and using Waiterix ("Service"), you accept and agree to be bound by the terms and provision of this agreement.
              If you do not agree to these Terms and Conditions, please do not use our Service.
            </p>

            <h2 className="text-2xl font-bold mb-4 mt-8">2. Description of Service</h2>
            <p className="mb-4">
              Waiterix is a SaaS platform that provides AI-powered restaurant ordering solutions, including but not limited to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>AI Voice Waiter functionality with multi-language support</li>
              <li>QR code menu generation and management</li>
              <li>Online ordering and payment processing</li>
              <li>Real-time order management</li>
              <li>Customer analytics and reporting</li>
            </ul>

            <h2 className="text-2xl font-bold mb-4 mt-8">3. User Accounts</h2>
            <p className="mb-4">
              To use Waiterix, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Ensuring that your account information is accurate and up-to-date</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
            </ul>

            <h2 className="text-2xl font-bold mb-4 mt-8">4. Free Trial and Subscription</h2>
            <p className="mb-4">
              Waiterix offers a 3-month free trial period with no credit card required. After the trial period:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Service continues at $50/month base subscription fee</li>
              <li>Additional AI usage fees apply based on OpenAI API consumption</li>
              <li>You may cancel your subscription at any time</li>
              <li>No refunds for partial months or unused time</li>
            </ul>

            <h2 className="text-2xl font-bold mb-4 mt-8">5. AI Usage and Third-Party Services</h2>
            <p className="mb-4">
              Our AI features are powered by OpenAI's API. By using Waiterix:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>You acknowledge that AI-generated responses may not always be accurate</li>
              <li>You are responsible for reviewing and monitoring AI interactions with your customers</li>
              <li>AI usage fees are charged at cost based on actual OpenAI API consumption</li>
              <li>We are not responsible for OpenAI service interruptions or changes</li>
            </ul>

            <h2 className="text-2xl font-bold mb-4 mt-8">6. Payment Processing</h2>
            <p className="mb-4">
              Waiterix integrates with third-party payment processors (Stripe, Paystack, Adyen). You acknowledge that:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Payment processing is subject to the terms of the payment provider</li>
              <li>Waiterix is not responsible for payment processing errors or disputes</li>
              <li>You are responsible for all payment processing fees charged by providers</li>
              <li>You must comply with all applicable payment card industry regulations</li>
            </ul>

            <h2 className="text-2xl font-bold mb-4 mt-8">7. User Content and Data</h2>
            <p className="mb-4">
              You retain ownership of all content you upload to Waiterix, including:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Menu items, descriptions, and images</li>
              <li>Restaurant information and branding</li>
              <li>Customer order data and interactions</li>
              <li>Voice recordings and AI conversation logs</li>
            </ul>
            <p className="mb-4">
              By using our Service, you grant Waiterix a license to use, store, and process this content to provide the Service.
            </p>

            <h2 className="text-2xl font-bold mb-4 mt-8">8. Prohibited Uses</h2>
            <p className="mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Use the Service for any illegal purpose</li>
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights of others</li>
              <li>Upload malicious code or attempt to compromise system security</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Attempt to reverse engineer or copy the Service</li>
            </ul>

            <h2 className="text-2xl font-bold mb-4 mt-8">9. Account Termination</h2>
            <p className="mb-4">
              You may permanently delete your account at any time through your account settings. Upon deletion:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>All your data will be permanently removed from our systems</li>
              <li>Active subscriptions will be cancelled</li>
              <li>You will lose access to all content and order history</li>
              <li>This action cannot be undone</li>
            </ul>
            <p className="mb-4">
              We reserve the right to suspend or terminate accounts that violate these Terms.
            </p>

            <h2 className="text-2xl font-bold mb-4 mt-8">10. Limitation of Liability</h2>
            <p className="mb-4">
              Waiterix is provided "as is" without warranties of any kind. We are not liable for:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Service interruptions or downtime</li>
              <li>Data loss or corruption</li>
              <li>Errors in AI-generated responses</li>
              <li>Lost profits or business opportunities</li>
              <li>Third-party service failures (OpenAI, payment processors)</li>
            </ul>

            <h2 className="text-2xl font-bold mb-4 mt-8">11. Modifications to Terms</h2>
            <p className="mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of significant changes via email.
              Continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>

            <h2 className="text-2xl font-bold mb-4 mt-8">12. Contact Information</h2>
            <p className="mb-4">
              For questions about these Terms, please contact us at:
            </p>
            <p className="mb-4">
              Email: support@waiterix.com<br />
              Website: https://waiterix.com
            </p>
          </div>
        </Card>

        <div className="text-center">
          <Button onClick={() => window.location.href = "/"} size="lg" data-testid="button-accept-terms">
            Back to Home
          </Button>
        </div>
      </main>

      <footer className="border-t py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Waiterix. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
