import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowLeft, Save, Shield, BarChart3, Trash2, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import logoUrl from "@/assets/waiterix-logo.png";
import type { Restaurant } from "@/shared/schema";
import { TableQRCodes } from "@/components/TableQRCodes";
import { PaymentGatewayOnboarding } from "@/components/PaymentGatewayOnboarding";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import { RestaurantInfoForm } from "@/components/RestaurantInfoForm";
import { FAQManagementPanel } from "@/components/FAQManagementPanel";
import { AnalyticsTab } from "@/components/AnalyticsTab";
import { signOut } from "@/lib/firebase";

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("settings");

  // Settings state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [aiWaiterEnabled, setAiWaiterEnabled] = useState(true);
  const [autoPrintOrders, setAutoPrintOrders] = useState(false);

  // Analytics state
  const [analyticsRange, setAnalyticsRange] = useState<"week" | "lifetime">("week");

  // Fetch restaurant data
  const { data: restaurant, isLoading: isRestaurantLoading, error: restaurantError } = useQuery<Restaurant>({
    queryKey: ['/api/restaurant'],
    enabled: !!user,
  });

  // Fetch analytics data
  const { data: analyticsData, isLoading: isAnalyticsLoading } = useQuery<{
    period: string;
    tableScans: { totalScans: number; scansByTable: { tableNumber: string; count: number }[] };
    aiCalls: { totalCalls: number; callsByType: { callType: string; count: number }[] };
  }>({
    queryKey: ['/api/analytics/stats', analyticsRange],
    queryFn: async () => {
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBaseUrl}/api/analytics/stats?period=${analyticsRange}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
    enabled: !!user && !!restaurant,
  });

  // Set password mutation
  const setPasswordMutation = useMutation({
    mutationFn: async (data: { password: string; currentPassword?: string }) => {
      const response = await apiRequest('POST', '/api/admin/password/set', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Admin password updated successfully",
      });
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle AI waiter mutation
  const toggleAiWaiterMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest('PUT', '/api/admin/settings/ai-waiter', { enabled });
      return response.json();
    },
    onSuccess: (_data, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant'] });
      toast({
        title: "Success",
        description: `AI Waiter ${enabled ? "enabled" : "disabled"} successfully`,
      });
    },
    onError: (error: Error, enabled) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      // Revert the switch back to the opposite of what we tried to set
      setAiWaiterEnabled(!enabled);
    },
  });

  // Toggle auto-print mutation
  const toggleAutoPrintMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest('PUT', '/api/admin/settings/auto-print', { enabled });
      return response.json();
    },
    onSuccess: (_data, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant'] });
      toast({
        title: "Success",
        description: `Auto-print ${enabled ? "enabled" : "disabled"} successfully`,
      });
    },
    onError: (error: Error, enabled) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      // Revert the switch back to the opposite of what we tried to set
      setAutoPrintOrders(!enabled);
    },
  });

  // Update restaurant mutation
  const updateRestaurantMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', `/api/restaurant/${restaurant?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant'] });
      toast({
        title: "Success",
        description: "Restaurant information updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete restaurant mutation
  const deleteRestaurantMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/restaurant/${restaurant?.id}`);
    },
    onSuccess: async () => {
      toast({
        title: "Restaurant Deleted",
        description: "Your restaurant has been permanently deleted",
      });
      try {
        await signOut();
      } catch (error) {
        console.error("Error signing out:", error);
      }
      window.location.href = '/';
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', '/api/auth/delete-account');
    },
    onSuccess: async () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted",
      });
      try {
        await signOut();
      } catch (error) {
        console.error("Error signing out:", error);
      }
      window.location.href = '/';
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update AI waiter and auto-print state when restaurant data loads
  useEffect(() => {
    if (restaurant) {
      setAiWaiterEnabled(restaurant.aiWaiterEnabled ?? true);
      setAutoPrintOrders(restaurant.autoPrintOrders ?? false);
    }
  }, [restaurant]);

  // Handle password form submit
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast({
        title: "Error",
        description: "Current passcode is required",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passcodes do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length !== 6 || !/^\d{6}$/.test(newPassword)) {
      toast({
        title: "Error",
        description: "New passcode must be exactly 6 digits",
        variant: "destructive",
      });
      return;
    }

    setPasswordMutation.mutate({
      password: newPassword,
      currentPassword: currentPassword,
    });
  };

  // Handle AI waiter toggle
  const handleAiWaiterToggle = (enabled: boolean) => {
    setAiWaiterEnabled(enabled);
    toggleAiWaiterMutation.mutate(enabled);
  };

  // Handle auto-print toggle
  const handleAutoPrintToggle = (enabled: boolean) => {
    setAutoPrintOrders(enabled);
    toggleAutoPrintMutation.mutate(enabled);
  };

  // Handle unauthorized errors
  if (restaurantError && isUnauthorizedError(restaurantError as Error)) {
    setLocation('/');
    return null;
  }

  // Loading state
  if (isAuthLoading || isRestaurantLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-admin" />
      </div>
    );
  }

  // If not authenticated, redirect
  if (!user || !restaurant) {
    setLocation('/');
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/dashboard')}
              data-testid="button-back-dashboard"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logoUrl} alt="Waiterix" className="h-8 w-8" data-testid="img-waiterix-logo" />
            <div>
              <h1 className="text-xl font-bold">Admin Settings</h1>
              <p className="text-sm text-muted-foreground">{restaurant.name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-3" data-testid="tabs-admin">
              <TabsTrigger value="settings" data-testid="tab-settings">
                <Shield className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="knowledge" data-testid="tab-knowledge">
                <BookOpen className="h-4 w-4 mr-2" />
                Knowledge
              </TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PaymentGatewayOnboarding restaurant={restaurant} />
                <SubscriptionStatus restaurant={restaurant} />
              </div>

              <Card className="p-6">
                <TableQRCodes
                  restaurantId={restaurant.id}
                  restaurantName={restaurant.name}
                />
              </Card>

              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold mb-4">Restaurant Information</h3>
                <RestaurantInfoForm
                  restaurantId={restaurant.id}
                  initialData={{
                    name: restaurant.name,
                    description: restaurant.description || '',
                    address: restaurant.address || '',
                    city: restaurant.city || '',
                    country: restaurant.country || '',
                    phone: restaurant.phone || '',
                    hours: restaurant.hours || '',
                    coverImageUrl: restaurant.coverImageUrl || '',
                    defaultLanguage: restaurant.defaultLanguage || 'en',
                  }}
                  onSubmit={(data) => updateRestaurantMutation.mutate(data)}
                  showSecurityFields={false}
                />
              </div>

              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Change Admin Passcode</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Change the passcode required to access admin settings and analytics.
                </p>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Passcode *</Label>
                    <Input
                      id="current-password"
                      type="password"
                      inputMode="numeric"
                      placeholder="Enter current passcode"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      data-testid="input-current-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Passcode (6 digits) *</Label>
                    <Input
                      id="new-password"
                      type="password"
                      inputMode="numeric"
                      placeholder="Enter new passcode"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      data-testid="input-new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Passcode *</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      inputMode="numeric"
                      placeholder="Confirm new passcode"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      data-testid="input-confirm-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={setPasswordMutation.isPending || !newPassword || !confirmPassword || !currentPassword}
                    data-testid="button-save-password"
                  >
                    {setPasswordMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Change Passcode
                      </>
                    )}
                  </Button>
                </form>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">AI Waiter</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Enable or disable the AI Waiter feature for your restaurant's customer menu.
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">AI Waiter Status</p>
                    <p className="text-sm text-muted-foreground">
                      {aiWaiterEnabled ? "AI assistance is active" : "AI assistance is disabled"}
                    </p>
                  </div>
                  <Switch
                    checked={aiWaiterEnabled}
                    onCheckedChange={handleAiWaiterToggle}
                    disabled={toggleAiWaiterMutation.isPending}
                    data-testid="switch-ai-waiter"
                  />
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Auto-Print Orders</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Automatically print new orders as they arrive. When enabled, your browser will show the print dialog for each new order.
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-Print Status</p>
                    <p className="text-sm text-muted-foreground">
                      {autoPrintOrders ? "Orders will print automatically" : "Manual printing only"}
                    </p>
                  </div>
                  <Switch
                    checked={autoPrintOrders}
                    onCheckedChange={handleAutoPrintToggle}
                    disabled={toggleAutoPrintMutation.isPending}
                    data-testid="switch-auto-print"
                  />
                </div>
              </Card>

              <Card className="max-w-2xl border-destructive/50">
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Irreversible action that will permanently delete your data.
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t">
                    <div>
                      <h4 className="font-medium mb-1">Delete Account</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Permanently delete your entire account, including all restaurants, menu items, orders, and personal data. This cannot be undone.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          const confirmed = confirm('⚠️ FINAL WARNING ⚠️\n\nThis will permanently delete your ENTIRE ACCOUNT including:\n- All restaurants\n- All menu items\n- All orders and customer data\n- All personal information\n\nThis action is IRREVERSIBLE and cannot be undone.\n\nAre you absolutely certain you want to proceed?');

                          if (confirmed) {
                            const doubleCheck = confirm('Type DELETE in the next prompt to confirm account deletion');

                            if (doubleCheck) {
                              const typed = prompt('Type DELETE (in capital letters) to confirm:');
                              if (typed === 'DELETE') {
                                deleteAccountMutation.mutate();
                              } else {
                                toast({
                                  title: "Cancelled",
                                  description: "Account deletion cancelled.",
                                });
                              }
                            }
                          }
                        }}
                        data-testid="button-delete-account"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account Permanently
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="knowledge" className="space-y-6">
              <FAQManagementPanel restaurantId={restaurant.id} />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
                <div className="flex gap-2">
                  <Button
                    variant={analyticsRange === "week" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAnalyticsRange("week")}
                    data-testid="button-range-week"
                  >
                    This Week
                  </Button>
                  <Button
                    variant={analyticsRange === "lifetime" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAnalyticsRange("lifetime")}
                    data-testid="button-range-lifetime"
                  >
                    Lifetime
                  </Button>
                </div>
              </div>

              {isAnalyticsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-analytics" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Table Scans</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-3xl font-bold" data-testid="text-total-scans">
                            {analyticsData?.tableScans.totalScans || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">Total QR scans</p>
                        </div>
                        {analyticsData?.tableScans.scansByTable && analyticsData.tableScans.scansByTable.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">By Table:</p>
                            {analyticsData.tableScans.scansByTable.map((item) => (
                              <div key={item.tableNumber} className="flex justify-between items-center">
                                <span className="text-sm" data-testid={`text-table-${item.tableNumber}`}>
                                  Table {item.tableNumber}
                                </span>
                                <span className="text-sm font-medium" data-testid={`text-table-${item.tableNumber}-scans`}>
                                  {item.count} scans
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">API Usage</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-3xl font-bold" data-testid="text-total-api-calls">
                            {analyticsData?.aiCalls.totalCalls || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">Total AI API calls</p>
                        </div>
                        {analyticsData?.aiCalls.callsByType && analyticsData.aiCalls.callsByType.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">By Type:</p>
                            {analyticsData.aiCalls.callsByType.map((item) => (
                              <div key={item.callType} className="flex justify-between items-center">
                                <span className="text-sm capitalize" data-testid={`text-api-${item.callType}`}>
                                  {item.callType.replace(/_/g, ' ')}
                                </span>
                                <span className="text-sm font-medium" data-testid={`text-api-${item.callType}-count`}>
                                  {item.count} calls
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {(!analyticsData?.tableScans.totalScans && !analyticsData?.aiCalls.totalCalls) && (
                    <Card className="p-12">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium">No analytics data yet</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Data will appear here once customers start using your menu
                        </p>
                      </div>
                    </Card>
                  )}
                </>
              )}

              {/* Customer Ratings Section */}
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Customer Ratings & Feedback</h2>
                {restaurant && <AnalyticsTab restaurantId={restaurant.id} />}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
