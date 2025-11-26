import { Switch, Route } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import CustomerMenu from "@/pages/CustomerMenu";
import RestaurantDashboard from "@/pages/RestaurantDashboard";
import AdminPage from "@/pages/AdminPage";
import Subscribe from "@/pages/Subscribe";
import SubscribeSuccess from "@/pages/SubscribeSuccess";
import Terms from "@/pages/Terms";
import Receipt from "@/pages/Receipt";
import OrderTracking from "@/pages/OrderTracking";
import { RatingDialogManager } from "@/components/RatingDialog";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/menu/:id" component={CustomerMenu} />
      <Route path="/receipt/:orderId" component={Receipt} />
      <Route path="/track/:orderId" component={OrderTracking} />
      <Route path="/dashboard" component={RestaurantDashboard} />
      <Route path="/dashboard/:tab" component={RestaurantDashboard} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/subscribe/success" component={SubscribeSuccess} />
      <Route path="/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <RatingDialogManager />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;