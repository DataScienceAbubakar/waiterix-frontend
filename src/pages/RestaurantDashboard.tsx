import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OrderCard } from "@/components/OrderCard";
import { PrintableOrder } from "@/components/PrintableOrder";
import { RestaurantInfoForm } from "@/components/RestaurantInfoForm";
import { MenuItemForm } from "@/components/MenuItemForm";
import { MenuInterviewAssistant } from "@/components/MenuInterviewAssistant";
import { PendingQuestionsPanel } from "@/components/PendingQuestionsPanel";
import { AssistanceTab } from "@/components/AssistanceTab";
import { ContactUsTab } from "@/components/ContactUsTab";
import { TermsAcceptanceModal } from "@/components/TermsAcceptanceModal";
import { MenuItemsCSVUpload } from "@/components/MenuItemsCSVUpload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutDashboard, UtensilsCrossed, ShoppingBag, Plus, Loader2, Edit, Trash2, Eye, EyeOff, Bot, MessageCircleQuestion, BookOpen, LogOut, Shield, HelpCircle, Mail, Download, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Restaurant, MenuItem, OrderWithTable, OrderItem, User } from "@/shared/schema";
import logoUrl from "@/assets/waiterix-logo.png";
import { signOut } from "@/lib/firebase";
import { NotificationSound } from "@/lib/notificationSound";
import { useLanguage } from "@/contexts/LanguageContext";
import { RestaurantProvider } from "@/contexts/RestaurantContext";

export default function RestaurantDashboard() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [showMenuItemDialog, setShowMenuItemDialog] = useState(false);
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [showCSVUploadDialog, setShowCSVUploadDialog] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [interviewingMenuItem, setInterviewingMenuItem] = useState<MenuItem | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showAdminPasswordDialog, setShowAdminPasswordDialog] = useState(false);
  const [showPasswordRecoveryDialog, setShowPasswordRecoveryDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);
  const [recoveryAnswer1, setRecoveryAnswer1] = useState('');
  const [recoveryAnswer2, setRecoveryAnswer2] = useState('');
  const [newRecoveryPassword, setNewRecoveryPassword] = useState('');
  const [confirmRecoveryPassword, setConfirmRecoveryPassword] = useState('');
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useLanguage();
  const previousOrderCountRef = useRef<number>(0);
  const ordersInitializedRef = useRef<boolean>(false);
  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const [orderToPrint, setOrderToPrint] = useState<{ order: OrderWithTable; items: OrderItem[] } | null>(null);
  const [pendingPrintOrderId, setPendingPrintOrderId] = useState<string | null>(null);

  // Fetch full user data to check terms acceptance
  const { data: userData } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    enabled: !!user,
  });

  // Show terms modal if user hasn't accepted terms
  useEffect(() => {
    if (userData && !userData.acceptedTerms) {
      setShowTermsModal(true);
    }
  }, [userData]);

  // Sync activeTab with URL on mount and URL changes
  useEffect(() => {
    const path = location.split('/').pop();
    if (path && ['overview', 'menu', 'orders', 'questions', 'assistance', 'contact'].includes(path)) {
      setActiveTab(path);
    } else if (location === '/dashboard') {
      setActiveTab('overview');
    }
  }, [location]);

  // Fetch restaurant data
  const {
    data: restaurant,
    isLoading: isRestaurantLoading,
    error: restaurantError,
  } = useQuery<Restaurant>({
    queryKey: ['/api/restaurant'],
    enabled: !!user,
  });

  // Auto-redirect restaurants without active/trialing subscriptions to subscription page
  useEffect(() => {
    if (restaurant) {
      const hasValidSubscription = restaurant.subscriptionId &&
        (restaurant.subscriptionStatus === 'active' || restaurant.subscriptionStatus === 'trialing');

      if (!hasValidSubscription) {
        setLocation('/subscribe');
      }
    }
  }, [restaurant, setLocation]);

  // Fetch menu items
  const {
    data: menuItems = [],
    isLoading: isMenuItemsLoading,
  } = useQuery<MenuItem[]>({
    queryKey: [`/api/menu-items?restaurantId=${restaurant?.id}`],
    enabled: !!restaurant,
  });

  // Fetch orders with items (includes table numbers from backend join)
  const {
    data: orders = [],
    isLoading: isOrdersLoading,
  } = useQuery<OrderWithTable[]>({
    queryKey: ['/api/orders'],
    enabled: !!restaurant,
    refetchInterval: 10000, // Poll every 10 seconds for new orders
  });

  // Fetch security questions
  const { data: securityQuestionsData } = useQuery<{
    questions: { question1: string | null; question2: string | null } | null;
    hasQuestions: boolean;
  }>({
    queryKey: ['/api/admin/security-questions'],
    enabled: !!restaurant,
  });

  // Fetch pending questions count for red dot indicator
  const { data: pendingQuestionsCount = 0 } = useQuery<number>({
    queryKey: ['/api/chef/questions'],
    select: (data: any) => {
      if (Array.isArray(data)) {
        return data.filter((q: any) => q.status === 'pending').length;
      }
      return 0;
    },
    refetchInterval: 5000, // Poll every 5 seconds
    enabled: !!restaurant,
  });

  // Fetch restaurant tables
  const {
    data: tables = [],
  } = useQuery<{ id: string; tableNumber: string }[]>({
    queryKey: ['/api/restaurant', restaurant?.id, 'tables'],
    enabled: !!restaurant,
  });

  // Fetch order items for all orders using useQueries
  const orderItemsQueries = useQueries({
    queries: orders.map(order => ({
      queryKey: [`/api/orders/${order.id}/items`],
      enabled: !!order.id,
    })),
  });

  // Play notification sound for new orders and auto-print
  useEffect(() => {
    if (!isOrdersLoading && orderItemsQueries.length > 0) {
      // First load - just store the IDs without notification
      if (!ordersInitializedRef.current) {
        previousOrderCountRef.current = orders.length;
        previousOrderIdsRef.current = new Set(orders.map(o => o.id));
        ordersInitializedRef.current = true;
      }
      // Subsequent loads - check for new orders
      else if (orders.length > previousOrderCountRef.current) {
        const currentOrderIds = new Set(orders.map(o => o.id));
        const newOrders = orders.filter(o => !previousOrderIdsRef.current.has(o.id));

        if (newOrders.length > 0) {
          NotificationSound.playChime();
          toast({
            title: "New Order",
            description: `You have ${newOrders.length} new order(s)!`,
          });

          // Auto-print the first new order if enabled
          if (restaurant?.autoPrintOrders && newOrders[0]) {
            console.log('[Auto-Print] New order detected, queuing for print:', newOrders[0].id);
            setPendingPrintOrderId(newOrders[0].id);
          }

          previousOrderCountRef.current = orders.length;
          previousOrderIdsRef.current = currentOrderIds;
        }
      }
    }
  }, [orders, isOrdersLoading, orderItemsQueries, toast, restaurant?.autoPrintOrders]);

  // Handle pending print order - wait for items to load before printing
  useEffect(() => {
    if (pendingPrintOrderId && orders.length > 0 && orderItemsQueries.length > 0) {
      const orderIndex = orders.findIndex(o => o.id === pendingPrintOrderId);

      // Order no longer exists - clear pending
      if (orderIndex < 0) {
        console.warn('[Auto-Print] Order disappeared before printing:', pendingPrintOrderId);
        setPendingPrintOrderId(null);
        return;
      }

      const orderItemsQuery = orderItemsQueries[orderIndex];
      const orderItemsData = orderItemsQuery?.data as OrderItem[] | undefined;

      // Check if items are loaded and available
      if (orderItemsData && !orderItemsQuery?.isLoading) {
        // Double-check that auto-print is still enabled before printing
        if (restaurant?.autoPrintOrders) {
          console.log('[Auto-Print] Order items loaded, triggering print for order:', pendingPrintOrderId);
          setOrderToPrint({
            order: orders[orderIndex],
            items: orderItemsData,
          });
        } else {
          console.log('[Auto-Print] Auto-print was disabled, skipping print for order:', pendingPrintOrderId);
        }
        setPendingPrintOrderId(null); // Clear the pending order
      } else if (!orderItemsQuery?.isLoading && !orderItemsData) {
        console.warn('[Auto-Print] Order items failed to load for order:', pendingPrintOrderId);
        toast({
          title: "Auto-Print Failed",
          description: "Could not load order details for printing",
          variant: "destructive",
        });
        setPendingPrintOrderId(null); // Clear if loading failed
      }
    }
  }, [pendingPrintOrderId, orders, orderItemsQueries, restaurant?.autoPrintOrders, toast]);

  // Trigger print when orderToPrint is set
  useEffect(() => {
    if (orderToPrint) {
      // Small delay to ensure the PrintableOrder component is rendered
      setTimeout(() => {
        window.print();
        // Clear the orderToPrint after printing
        setOrderToPrint(null);
      }, 100);
    }
  }, [orderToPrint]);

  // Create restaurant mutation
  const createRestaurantMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/restaurant', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant'] });
      toast({
        title: "Success",
        description: "Restaurant created successfully",
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
    onSuccess: () => {
      toast({
        title: "Restaurant Deleted",
        description: "Your restaurant has been permanently deleted",
      });
      // Redirect to home or trigger a refresh
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
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted. Redirecting...",
      });
      // Wait a moment for user to see the toast, then redirect
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  // Create menu item mutation
  const createMenuItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/menu-items', {
        ...data,
        restaurantId: restaurant?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/menu-items?restaurantId=${restaurant?.id}`] });
      setShowMenuItemDialog(false);
      setEditingMenuItem(null);
      toast({
        title: "Success",
        description: "Menu item created successfully",
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

  // Update menu item mutation
  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/menu-items/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/menu-items?restaurantId=${restaurant?.id}`] });
      setShowMenuItemDialog(false);
      setEditingMenuItem(null);
      toast({
        title: "Success",
        description: "Menu item updated successfully",
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

  // Delete menu item mutation
  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/menu-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/menu-items?restaurantId=${restaurant?.id}`] });
      toast({
        title: "Success",
        description: "Menu item deleted successfully",
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

  // Toggle menu item availability mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, available }: { id: string; available: boolean }) => {
      const response = await apiRequest('PUT', `/api/menu-items/${id}`, { available });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/menu-items?restaurantId=${restaurant?.id}`] });
      toast({
        title: "Success",
        description: "Menu item availability updated",
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

  // Download menu items as CSV
  const handleDownloadCSV = async () => {
    try {
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/menu-items/export`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to export menu items');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `menu-items-${restaurant?.name || 'export'}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "CSV Downloaded",
        description: `${menuItems.length} menu items exported`,
      });
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download CSV",
        variant: "destructive",
      });
    }
  };

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, paymentMethod }: { orderId: string; status: string; paymentMethod: 'online' | 'cash' }) => {
      // Auto-complete online orders when marked as ready
      const finalStatus = (status === 'ready' && paymentMethod === 'online') ? 'completed' : status;

      const response = await apiRequest('PUT', `/api/orders/${orderId}/status`, { status: finalStatus });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Success",
        description: "Order status updated successfully",
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

  // Admin password verification handler
  const handleAdminPasswordVerification = async () => {
    if (!restaurant) return;

    setIsVerifyingAdmin(true);
    try {
      // First check if admin password is set
      const checkResponse = await apiRequest('POST', '/api/admin/password/check');
      const { hasPassword } = await checkResponse.json();

      if (!hasPassword) {
        // No password set, redirect directly to admin page
        setLocation('/admin');
        setShowAdminPasswordDialog(false);
        return;
      }

      // Verify password
      const verifyResponse = await apiRequest('POST', '/api/admin/password/verify', {
        password: adminPassword,
      });
      const { valid } = await verifyResponse.json();

      if (valid) {
        setLocation('/admin');
        setShowAdminPasswordDialog(false);
        setAdminPassword('');
      } else {
        toast({
          title: "Invalid Password",
          description: "The admin password you entered is incorrect",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Admin verification error:', error);
      toast({
        title: "Error",
        description: "Failed to verify admin password",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingAdmin(false);
    }
  };

  // Password recovery handler
  const handlePasswordRecovery = async () => {
    if (!restaurant) return;

    if (!recoveryAnswer1 || !recoveryAnswer2) {
      toast({
        title: "Error",
        description: "Please answer both security questions",
        variant: "destructive",
      });
      return;
    }

    if (!newRecoveryPassword || !confirmRecoveryPassword) {
      toast({
        title: "Error",
        description: "Please enter and confirm your new password",
        variant: "destructive",
      });
      return;
    }

    if (newRecoveryPassword !== confirmRecoveryPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newRecoveryPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsVerifyingAdmin(true);
    try {
      const response = await apiRequest('POST', '/api/admin/password/reset', {
        answer1: recoveryAnswer1,
        answer2: recoveryAnswer2,
        newPassword: newRecoveryPassword,
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Admin password reset successfully",
        });
        setShowPasswordRecoveryDialog(false);
        setRecoveryAnswer1('');
        setRecoveryAnswer2('');
        setNewRecoveryPassword('');
        setConfirmRecoveryPassword('');

        // Now try to verify with the new password and go to admin page
        setAdminPassword(newRecoveryPassword);
        setTimeout(() => {
          setShowAdminPasswordDialog(true);
        }, 500);
      }
    } catch (error) {
      console.error('Password recovery error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingAdmin(false);
    }
  };

  // Handle unauthorized errors
  if (restaurantError && isUnauthorizedError(restaurantError as Error)) {
    setLocation('/');
    return null;
  }

  // Loading state for auth
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-auth" />
      </div>
    );
  }

  // If not authenticated, redirect
  if (!user) {
    setLocation('/');
    return null;
  }

  // Loading state for restaurant
  if (isRestaurantLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-restaurant" />
      </div>
    );
  }

  // Setup wizard if no restaurant exists
  if (!restaurant) {
    return (
      <>
        <div className="flex flex-col min-h-screen">
          <header className="border-b p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logoUrl} alt="Waiterix" className="h-8 w-8" data-testid="img-waiterix-logo" />
                <span className="text-xl font-bold">Waiterix</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    console.log("Logout button clicked");
                    try {
                      // Sign out from Firebase first
                      await signOut();
                      // Then destroy backend session
                      await apiRequest("POST", "/api/logout");
                      console.log("Logout complete, redirecting...");
                      // Force reload to clear all state
                      window.location.href = '/';
                    } catch (error) {
                      console.error("Logout error:", error);
                      // Force redirect anyway
                      window.location.href = '/';
                    }
                  }}
                  data-testid="button-logout-setup"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
                <ThemeToggle />
              </div>
            </div>
          </header>
          <div className="flex items-center justify-center flex-1 p-6">
            <div className="max-w-2xl w-full">
              <h1 className="text-3xl font-bold mb-6">Welcome! Let's set up your restaurant</h1>
              <RestaurantInfoForm
                onSubmit={(data) => createRestaurantMutation.mutate(data)}
              />
            </div>
          </div>
        </div>
        <TermsAcceptanceModal
          open={showTermsModal}
          onAccept={() => setShowTermsModal(false)}
        />
      </>
    );
  }

  // Transform orders data for OrderCard component
  const transformedOrders = orders.map((order, index) => {
    const orderItemsData = (orderItemsQueries[index]?.data || []) as OrderItem[];
    return {
      orderId: order.id,
      items: orderItemsData.map((item: OrderItem) => ({
        name: item.name,
        quantity: item.quantity,
      })),
      total: parseFloat(order.total),
      tip: order.tip ? parseFloat(order.tip) : undefined,
      paymentMethod: order.paymentMethod as 'online' | 'cash',
      status: order.status as 'new' | 'preparing' | 'ready' | 'completed',
      createdAt: new Date(order.createdAt),
      customerNote: order.customerNote || undefined,
      tableNumber: order.tableNumber || undefined,
    };
  });

  // Group orders by status for organized display
  const groupedOrders = {
    new: transformedOrders.filter(order => order.status === 'new'),
    preparing: transformedOrders.filter(order => order.status === 'preparing'),
    ready: transformedOrders.filter(order => order.status === 'ready'),
    completed: transformedOrders.filter(order => order.status === 'completed'),
  };

  // Calculate stats
  const todayOrders = transformedOrders.filter(order => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return order.createdAt >= today;
  });

  const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);
  const activeOrders = transformedOrders.filter(order =>
    order.status === 'new' || order.status === 'preparing'
  ).length;

  const menuItemsList = [
    { title: 'Overview', icon: LayoutDashboard, id: 'overview' },
    { title: 'Menu', icon: UtensilsCrossed, id: 'menu' },
    { title: 'Orders', icon: ShoppingBag, id: 'orders' },
    { title: 'Active Questions', icon: MessageCircleQuestion, id: 'questions', badge: pendingQuestionsCount > 0 ? pendingQuestionsCount : null },
    { title: 'Assistance', icon: HelpCircle, id: 'assistance' },
    { title: 'Contact Us', icon: Mail, id: 'contact' },
  ];

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <RestaurantProvider
      currencyCode={restaurant?.currencyCode}
      defaultLanguage={restaurant?.defaultLanguage}
    >
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <Sidebar>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel className="text-lg font-semibold px-4 py-3">
                  <div className="flex items-center gap-2">
                    <img src={logoUrl} alt="Waiterix" className="h-6 w-6" />
                    <span>Waiterix</span>
                  </div>
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuItemsList.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setLocation(`/dashboard/${item.id}`)}
                          isActive={activeTab === item.id}
                          data-testid={`button-nav-${item.id}`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="flex items-center gap-2 flex-1">
                            <span>{item.title}</span>
                            {item.badge && (
                              <span className="h-2 w-2 rounded-full bg-destructive" data-testid={`badge-${item.id}`}></span>
                            )}
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between p-4 border-b bg-card">
              <div className="flex items-center gap-2">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <h1 className="text-xl font-semibold">Dashboard</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAdminPasswordDialog(true)}
                  data-testid="button-admin"
                  title="Admin Settings"
                >
                  <Shield className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    console.log("Logout button clicked");
                    try {
                      // Sign out from Firebase first
                      await signOut();
                      // Then destroy backend session
                      await apiRequest("POST", "/api/logout");
                      console.log("Logout complete, redirecting...");
                      // Force reload to clear all state
                      window.location.href = '/';
                    } catch (error) {
                      console.error("Logout error:", error);
                      // Force redirect anyway
                      window.location.href = '/';
                    }
                  }}
                  data-testid="button-logout"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
                <ThemeToggle />
              </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-6">
                      <p className="text-sm text-muted-foreground">Total Orders Today</p>
                      <p className="text-3xl font-bold mt-2" data-testid="text-orders-today">
                        {todayOrders.length}
                      </p>
                    </Card>
                    <Card className="p-6">
                      <p className="text-sm text-muted-foreground">Revenue Today</p>
                      <p className="text-3xl font-bold mt-2" data-testid="text-revenue-today">
                        {formatCurrency(todayRevenue)}
                      </p>
                    </Card>
                    <Card className="p-6">
                      <p className="text-sm text-muted-foreground">Menu Items</p>
                      <p className="text-3xl font-bold mt-2" data-testid="text-menu-items-count">
                        {menuItems.length}
                      </p>
                    </Card>
                    <Card className="p-6">
                      <p className="text-sm text-muted-foreground">Active Orders</p>
                      <p className="text-3xl font-bold mt-2" data-testid="text-active-orders">
                        {activeOrders}
                      </p>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <Card className="p-6">
                      <h3 className="font-semibold text-lg mb-4">Recent Orders</h3>
                      {isOrdersLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" data-testid="loader-orders" />
                        </div>
                      ) : transformedOrders.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8" data-testid="text-no-orders">
                          No orders yet
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {transformedOrders.slice(0, 2).map((order) => (
                            <OrderCard
                              key={order.orderId}
                              {...order}
                              onStatusChange={(orderId, status) =>
                                updateOrderStatusMutation.mutate({ orderId, status, paymentMethod: order.paymentMethod })
                              }
                            />
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'menu' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-2xl font-bold">Menu Items</h2>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={handleDownloadCSV}
                        disabled={menuItems.length === 0}
                        data-testid="button-download-csv"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCSVUploadDialog(true)}
                        data-testid="button-upload-csv"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload CSV
                      </Button>
                      <Button onClick={() => setShowMenuItemDialog(true)} data-testid="button-add-menu-item">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                  </div>
                  {isMenuItemsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-menu-items" />
                    </div>
                  ) : menuItems.length === 0 ? (
                    <Card className="p-12">
                      <p className="text-muted-foreground text-center" data-testid="text-no-menu-items">
                        No menu items yet. Click "Add Item" to create your first menu item.
                      </p>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {menuItems.map((item) => (
                        <Card key={item.id} className="p-4" data-testid={`card-menu-item-${item.id}`}>
                          <div className="space-y-3">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold text-lg">{item.name}</h3>
                                {!item.available && (
                                  <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                                    Unavailable
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                              <p className="text-lg font-semibold mt-2">{formatCurrency(parseFloat(item.price))}</p>
                              <p className="text-sm text-muted-foreground mt-1 capitalize">{item.category}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2 border-t">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setInterviewingMenuItem(item);
                                  setShowInterviewDialog(true);
                                }}
                                data-testid={`button-add-details-${item.id}`}
                              >
                                <Bot className="h-3 w-3 mr-1" />
                                AI Details
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingMenuItem(item);
                                  setShowMenuItemDialog(true);
                                }}
                                data-testid={`button-edit-${item.id}`}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleAvailabilityMutation.mutate({ id: item.id, available: !item.available })}
                                data-testid={`button-toggle-availability-${item.id}`}
                              >
                                {item.available ? (
                                  <>
                                    <EyeOff className="h-3 w-3 mr-1" />
                                    Hide
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-3 w-3 mr-1" />
                                    Show
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this menu item?')) {
                                    deleteMenuItemMutation.mutate(item.id);
                                  }
                                }}
                                data-testid={`button-delete-${item.id}`}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Orders</h2>
                  {isOrdersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-all-orders" />
                    </div>
                  ) : transformedOrders.length === 0 ? (
                    <Card className="p-12">
                      <p className="text-muted-foreground text-center" data-testid="text-no-all-orders">
                        No orders yet
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-8">
                      {/* New Orders Section */}
                      {groupedOrders.new.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">New Orders</h3>
                            <Badge variant="default" className="bg-blue-500">{groupedOrders.new.length}</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groupedOrders.new.map((order) => (
                              <OrderCard
                                key={order.orderId}
                                {...order}
                                onStatusChange={(orderId, status) =>
                                  updateOrderStatusMutation.mutate({ orderId, status, paymentMethod: order.paymentMethod })
                                }
                              />
                            ))}
                          </div>
                          <div className="border-t-2 border-border" />
                        </div>
                      )}

                      {/* Preparing Orders Section */}
                      {groupedOrders.preparing.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">Preparing</h3>
                            <Badge variant="default" className="bg-yellow-500">{groupedOrders.preparing.length}</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groupedOrders.preparing.map((order) => (
                              <OrderCard
                                key={order.orderId}
                                {...order}
                                onStatusChange={(orderId, status) =>
                                  updateOrderStatusMutation.mutate({ orderId, status, paymentMethod: order.paymentMethod })
                                }
                              />
                            ))}
                          </div>
                          <div className="border-t-2 border-border" />
                        </div>
                      )}

                      {/* Ready Orders Section */}
                      {groupedOrders.ready.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">Ready for Pickup</h3>
                            <Badge variant="default" className="bg-green-500">{groupedOrders.ready.length}</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groupedOrders.ready.map((order) => (
                              <OrderCard
                                key={order.orderId}
                                {...order}
                                onStatusChange={(orderId, status) =>
                                  updateOrderStatusMutation.mutate({ orderId, status, paymentMethod: order.paymentMethod })
                                }
                              />
                            ))}
                          </div>
                          <div className="border-t-2 border-border" />
                        </div>
                      )}

                      {/* Completed Orders Section */}
                      {groupedOrders.completed.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">Completed</h3>
                            <Badge variant="secondary">{groupedOrders.completed.length}</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groupedOrders.completed.map((order) => (
                              <OrderCard
                                key={order.orderId}
                                {...order}
                                onStatusChange={(orderId, status) =>
                                  updateOrderStatusMutation.mutate({ orderId, status, paymentMethod: order.paymentMethod })
                                }
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'questions' && (
                <PendingQuestionsPanel restaurantId={restaurant.id} />
              )}

              {activeTab === 'assistance' && (
                <AssistanceTab />
              )}

              {activeTab === 'contact' && restaurant && (
                <ContactUsTab restaurantName={restaurant.name} />
              )}
            </main>
          </div>
        </div>

        <Dialog open={showMenuItemDialog} onOpenChange={(open) => {
          setShowMenuItemDialog(open);
          if (!open) {
            setEditingMenuItem(null);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
            </DialogHeader>
            <MenuItemForm
              menuItem={editingMenuItem || undefined}
              onSubmit={(data) => {
                if (editingMenuItem) {
                  updateMenuItemMutation.mutate({ id: editingMenuItem.id, data });
                } else {
                  createMenuItemMutation.mutate(data);
                }
              }}
              onCancel={() => {
                setShowMenuItemDialog(false);
                setEditingMenuItem(null);
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showInterviewDialog} onOpenChange={(open) => {
          setShowInterviewDialog(open);
          if (!open) {
            setInterviewingMenuItem(null);
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI Menu Interview</DialogTitle>
            </DialogHeader>
            {interviewingMenuItem && restaurant && (
              <MenuInterviewAssistant
                menuItemId={interviewingMenuItem.id}
                menuItemName={interviewingMenuItem.name}
                restaurantId={restaurant.id}
                interviewType="menu_item"
                onComplete={() => {
                  setShowInterviewDialog(false);
                  setInterviewingMenuItem(null);
                  toast({
                    title: "Interview Complete",
                    description: "Menu details saved successfully!",
                  });
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showAdminPasswordDialog} onOpenChange={(open) => {
          setShowAdminPasswordDialog(open);
          if (!open) {
            setAdminPassword('');
          }
        }}>
          <DialogContent data-testid="dialog-admin-password">
            <DialogHeader>
              <DialogTitle>Admin Access Required</DialogTitle>
              <DialogDescription>
                Enter your admin password to access admin settings and analytics.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleAdminPasswordVerification();
            }}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Admin Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="Enter admin password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    disabled={isVerifyingAdmin}
                    data-testid="input-admin-password"
                  />
                </div>
                {securityQuestionsData?.hasQuestions && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdminPasswordDialog(false);
                        setAdminPassword('');
                        setShowPasswordRecoveryDialog(true);
                      }}
                      disabled={isVerifyingAdmin}
                      className="text-sm text-primary hover:underline"
                      data-testid="button-forgot-password"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAdminPasswordDialog(false);
                    setAdminPassword('');
                  }}
                  disabled={isVerifyingAdmin}
                  data-testid="button-cancel-admin"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isVerifyingAdmin || !adminPassword}
                  data-testid="button-verify-admin"
                >
                  {isVerifyingAdmin ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    'Access Admin'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showPasswordRecoveryDialog} onOpenChange={(open) => {
          setShowPasswordRecoveryDialog(open);
          if (!open) {
            setRecoveryAnswer1('');
            setRecoveryAnswer2('');
            setNewRecoveryPassword('');
            setConfirmRecoveryPassword('');
          }
        }}>
          <DialogContent data-testid="dialog-password-recovery">
            <DialogHeader>
              <DialogTitle>Reset Admin Password</DialogTitle>
              <DialogDescription>
                Answer your security questions to reset your admin password.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handlePasswordRecovery();
            }}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recovery-question-1">
                    {securityQuestionsData?.questions?.question1 || "Security Question 1"}
                  </Label>
                  <Input
                    id="recovery-answer-1"
                    type="text"
                    placeholder="Your answer"
                    value={recoveryAnswer1}
                    onChange={(e) => setRecoveryAnswer1(e.target.value)}
                    disabled={isVerifyingAdmin}
                    required
                    data-testid="input-recovery-answer-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recovery-question-2">
                    {securityQuestionsData?.questions?.question2 || "Security Question 2"}
                  </Label>
                  <Input
                    id="recovery-answer-2"
                    type="text"
                    placeholder="Your answer"
                    value={recoveryAnswer2}
                    onChange={(e) => setRecoveryAnswer2(e.target.value)}
                    disabled={isVerifyingAdmin}
                    required
                    data-testid="input-recovery-answer-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-recovery-password">New Password</Label>
                  <Input
                    id="new-recovery-password"
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    value={newRecoveryPassword}
                    onChange={(e) => setNewRecoveryPassword(e.target.value)}
                    disabled={isVerifyingAdmin}
                    required
                    data-testid="input-new-recovery-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-recovery-password">Confirm New Password</Label>
                  <Input
                    id="confirm-recovery-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmRecoveryPassword}
                    onChange={(e) => setConfirmRecoveryPassword(e.target.value)}
                    disabled={isVerifyingAdmin}
                    required
                    data-testid="input-confirm-recovery-password"
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordRecoveryDialog(false);
                    setRecoveryAnswer1('');
                    setRecoveryAnswer2('');
                    setNewRecoveryPassword('');
                    setConfirmRecoveryPassword('');
                  }}
                  disabled={isVerifyingAdmin}
                  data-testid="button-cancel-recovery"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isVerifyingAdmin}
                  data-testid="button-submit-recovery"
                >
                  {isVerifyingAdmin ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <TermsAcceptanceModal
          open={showTermsModal}
          onAccept={() => setShowTermsModal(false)}
        />

        <MenuItemsCSVUpload
          open={showCSVUploadDialog}
          onOpenChange={setShowCSVUploadDialog}
          onImportComplete={() => {
            queryClient.invalidateQueries({ queryKey: [`/api/menu-items?restaurantId=${restaurant?.id}`] });
          }}
        />

        {/* Hidden printable order component for auto-print */}
        {orderToPrint && (
          <PrintableOrder
            order={orderToPrint.order}
            items={orderToPrint.items}
            tableNumber={orderToPrint.order.tableNumber}
            restaurantName={restaurant?.name}
          />
        )}
      </SidebarProvider>
    </RestaurantProvider>
  );
}
