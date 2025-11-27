import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bot, QrCode, Store, CreditCard, Smartphone, BarChart3, Shield, Mic, Languages, Zap, Check, Loader2 } from "lucide-react";
import logoUrl from "@/assets/waiterix-logo.png";
import { Link, useLocation } from "wouter";
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (user && !isLoading) {
      console.log("User authenticated, redirecting to dashboard");
      setLocation('/dashboard');
    }
  }, [user, isLoading, setLocation]);

  const handleGoogleSignIn = async () => {
    try {
      setIsAuthenticating(true);
      await signInWithGoogle();
      setShowAuthDialog(false);
    } catch (error: any) {
      toast({
        title: "Sign-in failed",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please enter email and password",
        variant: "destructive",
      });
      return;
    }

    if (authMode === 'signup' && password.length < 6) {
      toast({
        title: "Weak password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAuthenticating(true);
      
      if (authMode === 'signup') {
        await signUpWithEmail(email, password, displayName || undefined);
        toast({
          title: "Account created",
          description: "Welcome to Waiterix! Redirecting to dashboard...",
        });
      } else {
        await signInWithEmail(email, password);
        toast({
          title: "Signed in",
          description: "Welcome back! Redirecting to dashboard...",
        });
      }
      
      setShowAuthDialog(false);
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (error: any) {
      let errorMessage = "Authentication failed";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Email already in use. Try signing in instead.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak";
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = "Invalid email or password";
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password";
      }
      
      toast({
        title: "Authentication failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-auth-home" />
      </div>
    );
  }

  if (user) {
    return null;
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b glass backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Waiterix" className="h-12 hover-lift smooth-transition" />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              onClick={() => setShowAuthDialog(true)}
              data-testid="button-get-started"
              className="btn-glow shadow-glow hover-lift"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <section className="py-20 md:py-32 particles-bg animated-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-chart-2/5"></div>
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <div className="bounce-in">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-shadow">
              AI-Powered Voice Ordering for <span className="gradient-text">Modern Restaurants</span>
            </h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto smooth-transition hover:text-foreground/80">
            Your customers speak, our AI Waiter listens. Natural voice conversations in 10 languages,
            instant menu recommendations, and seamless ordering—all powered by advanced AI technology.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              onClick={() => setShowAuthDialog(true)}
              data-testid="button-hero-start"
              className="btn-glow shadow-glow hover-lift text-lg px-8 py-6"
            >
              <Zap className="mr-2 h-5 w-5" />
              Get Started Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.location.href = "/menu/demo"}
              data-testid="button-hero-demo"
              className="hover-lift glass-card text-lg px-8 py-6"
            >
              <Bot className="mr-2 h-5 w-5" />
              View Demo Menu
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6 pulse-enhanced">
            ✨ 30-day money-back guarantee • No setup fees • Start in minutes
          </p>
        </div>
        
        {/* Floating decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl float"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-chart-2/10 rounded-full blur-xl float-delayed"></div>
        <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-chart-3/10 rounded-full blur-xl float"></div>
      </section>

      <section className="py-20 bg-gradient-to-br from-muted/30 via-background to-muted/50 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.1),transparent_50%)]"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">Revolutionary Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover the cutting-edge technology that's transforming restaurant experiences worldwide
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 shadow-card-hover glass-card group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-6 shadow-glow group-hover:scale-110 transition-transform duration-300">
                  <Bot className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors">AI Voice Waiter</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Natural voice conversations powered by GPT-5. Customers speak their orders, get instant recommendations,
                  and ask questions—all in their preferred language.
                </p>
              </div>
            </Card>

            <Card className="p-8 shadow-card-hover glass-card group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-chart-2/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-6 shadow-glow group-hover:scale-110 transition-transform duration-300">
                   <Languages className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-xl mb-3 group-hover:text-chart-2 transition-colors">10 Languages</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Serve global customers effortlessly. Full support for English, Spanish, French, German, Italian,
                  Chinese, Japanese, Arabic, Portuguese, and Russian.
                </p>
              </div>
            </Card>

            <Card className="p-8 shadow-card-hover glass-card group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-chart-3/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-chart-3 to-chart-3/60 flex items-center justify-center mb-6 shadow-glow group-hover:scale-110 transition-transform duration-300">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-3 group-hover:text-chart-3 transition-colors">Smart Knowledge System</h3>
                <p className="text-muted-foreground leading-relaxed">
                  AI learns from chef responses. Questions get automatically added to the knowledge base,
                  making the system smarter over time.
                </p>
              </div>
            </Card>

            <Card className="p-8 shadow-card-hover glass-card group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-chart-4/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-chart-4 to-chart-4/60 flex items-center justify-center mb-6 shadow-glow group-hover:scale-110 transition-transform duration-300">
                  <QrCode className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-3 group-hover:text-chart-4 transition-colors">QR Code Menus</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Generate unique QR codes for your restaurant. Customers scan and order instantly from their phones.
                </p>
              </div>
            </Card>

            <Card className="p-8 shadow-card-hover glass-card group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-6 shadow-glow group-hover:scale-110 transition-transform duration-300">
                  <CreditCard className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors">Global Payments</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Accept payments via Stripe, Paystack, or Adyen. Support for multiple currencies and payment methods worldwide.
                </p>
              </div>
            </Card>

            <Card className="p-8 shadow-card-hover glass-card group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-chart-5/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-chart-5 to-chart-5/60 flex items-center justify-center mb-6 shadow-glow group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-3 group-hover:text-chart-5 transition-colors">Real-Time Management</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Track all orders in real-time. Answer customer questions via voice, manage menus, and monitor sales instantly.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-chart-2/5"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">
              Full refund if you're not satisfied within 30 days
            </p>
          </div>

          <div className="grid grid-cols-1 max-w-lg mx-auto">
            <Card className="p-10 shadow-card-hover glass-card relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-chart-2/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="mb-8 text-center">
                  <div className="inline-block p-3 bg-gradient-to-r from-primary to-chart-2 rounded-2xl mb-4 shadow-glow">
                    <Store className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold mb-4 text-glow">Waiterix Pro</h3>
                  <div className="flex items-baseline gap-2 mb-6 justify-center">
                    <span className="text-6xl font-bold gradient-text">$50</span>
                    <span className="text-muted-foreground text-xl">/month</span>
                  </div>
                  <div className="inline-block bg-gradient-to-r from-primary/20 to-chart-2/20 text-primary px-4 py-2 rounded-full text-sm font-medium border border-primary/30 shimmer">
                    ✨ 30-Day Money-Back Guarantee
                  </div>
                </div>
                <ul className="space-y-4 mb-10">
                  <li className="flex items-start gap-4 group/item">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary/30 transition-colors">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="group-hover/item:text-foreground transition-colors">AI Voice Waiter in 10 languages</span>
                  </li>
                  <li className="flex items-start gap-4 group/item">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary/30 transition-colors">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="group-hover/item:text-foreground transition-colors">Unlimited menu items</span>
                  </li>
                  <li className="flex items-start gap-4 group/item">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary/30 transition-colors">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="group-hover/item:text-foreground transition-colors">QR code generation</span>
                  </li>
                  <li className="flex items-start gap-4 group/item">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary/30 transition-colors">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="group-hover/item:text-foreground transition-colors">Real-time order management</span>
                  </li>
                  <li className="flex items-start gap-4 group/item">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary/30 transition-colors">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="group-hover/item:text-foreground transition-colors">Multi-gateway payments (Stripe, Paystack, Adyen)</span>
                  </li>
                  <li className="flex items-start gap-4 group/item">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary/30 transition-colors">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="group-hover/item:text-foreground transition-colors">Priority support</span>
                  </li>
                  <li className="flex items-start gap-4 group/item">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary/30 transition-colors">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm group-hover/item:text-foreground transition-colors">+ AI usage fees (OpenAI API costs)</span>
                  </li>
                </ul>
                <Button
                  className="w-full btn-glow shadow-glow hover-lift text-lg py-6"
                  size="lg"
                  onClick={() => setShowAuthDialog(true)}
                  data-testid="button-pricing-trial"
                >
                  <Zap className="mr-2 h-5 w-5" />
                  Start Your Journey Now
                </Button>
              </div>
            </Card>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-10 max-w-2xl mx-auto leading-relaxed">
            💡 AI usage fees are based on actual OpenAI API consumption (text-to-speech, speech-to-text, and chat completions).
            Typical restaurant usage averages $15-20/month in AI costs.
          </p>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-primary/10 via-background to-chart-2/10 relative overflow-hidden">
        <div className="absolute inset-0 particles-bg"></div>
        <div className="absolute top-10 left-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl float"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-chart-2/20 rounded-full blur-3xl float-delayed"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <div className="bounce-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 gradient-text text-glow">Ready to Transform Your Restaurant?</h2>
          </div>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed">
            Join restaurants worldwide using AI-powered voice ordering to serve customers better.
            <br className="hidden md:block" />
            Try risk-free with our 30-day money-back guarantee.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button
              size="lg"
              onClick={() => setShowAuthDialog(true)}
              data-testid="button-cta-start"
              className="btn-glow shadow-glow hover-lift text-xl px-12 py-8 bg-gradient-to-r from-primary to-chart-2"
            >
              <Bot className="mr-3 h-6 w-6" />
              Start Your AI Journey
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>30-day guarantee • No setup fees • Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center gap-6 mb-4 text-sm">
            <Link href="/terms" className="text-muted-foreground hover:text-foreground" data-testid="link-terms">
              Terms & Conditions
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground" data-testid="link-privacy">
              Privacy Policy
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">© 2025 Waiterix. All rights reserved.</p>
        </div>
      </footer>

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-auth">
          <DialogHeader>
            <DialogTitle>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</DialogTitle>
            <DialogDescription>
              {authMode === 'signin' 
                ? 'Welcome back! Sign in to access your restaurant dashboard.' 
                : 'Join Waiterix to start serving customers with AI-powered voice ordering.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isAuthenticating}
              data-testid="button-google-auth"
            >
              {isAuthenticating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {authMode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">Restaurant Name (optional)</Label>
                  <Input
                    id="displayName"
                    placeholder="Your Restaurant"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={isAuthenticating}
                    data-testid="input-display-name"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isAuthenticating}
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isAuthenticating}
                  required
                  data-testid="input-password"
                />
                {authMode === 'signup' && (
                  <p className="text-xs text-muted-foreground">At least 6 characters</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isAuthenticating}
                data-testid="button-email-auth"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {authMode === 'signin' ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  authMode === 'signin' ? 'Sign In' : 'Create Account'
                )}
              </Button>
            </form>

            <div className="text-center text-sm">
              {authMode === 'signin' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className="text-primary hover:underline"
                    disabled={isAuthenticating}
                    data-testid="button-switch-signup"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className="text-primary hover:underline"
                    disabled={isAuthenticating}
                    data-testid="button-switch-signin"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
