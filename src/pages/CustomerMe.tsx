import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Package, Calendar, ShoppingBag, User, Settings, MapPin, DollarSign, Truck, Star, Wallet, MessageCircle, Clock, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function CustomerMe() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("orders");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  // Refetch data when component becomes visible (e.g., after navigation from cart)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) fetchData(session.user.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }
    
    // Check if user has customer role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    
    const hasCustomerRole = roles?.some(r => r.role === "customer");
    if (!hasCustomerRole) {
      toast.error("Access denied");
      navigate("/");
      return;
    }
    
    fetchData(session.user.id);
  };

  const fetchData = async (userId: string) => {
    try {
      // Fetch orders
      const { data: ordersData } = await supabase
        .from("product_orders")
        .select("*, products(name), service_providers(business_name)")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });
      
      // Fetch rentals
      const { data: rentalsData } = await supabase
        .from("equipment_rentals")
        .select("*, equipment(name), service_providers(business_name)")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });
      
      // Fetch bookings
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*, services(name), service_providers(business_name)")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });
      
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      // Fetch conversations
      const { data: conversationsData } = await supabase
        .from("conversations")
        .select("*, service_providers(business_name, profile_image_url)")
        .eq("customer_id", userId)
        .order("updated_at", { ascending: false });

      setOrders(ordersData || []);
      setRentals(rentalsData || []);
      setBookings(bookingsData || []);
      setProfile(profileData);
      setConversations(conversationsData || []);
    } catch (error: any) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("product_orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      if (error) throw error;
      
      // Immediately update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: "cancelled" } : order
        )
      );
      
      toast.success("Order cancelled successfully");
    } catch (error: any) {
      toast.error("Failed to cancel order");
    }
  };

  const handleCancelRental = async (rentalId: string) => {
    try {
      const { error } = await supabase
        .from("equipment_rentals")
        .update({ status: "cancelled" })
        .eq("id", rentalId);

      if (error) throw error;
      
      // Immediately update local state
      setRentals(prevRentals => 
        prevRentals.map(rental => 
          rental.id === rentalId ? { ...rental, status: "cancelled" } : rental
        )
      );
      
      toast.success("Rental cancelled successfully");
    } catch (error: any) {
      toast.error("Failed to cancel rental");
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) throw error;
      
      // Immediately update local state
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.id === bookingId ? { ...booking, status: "cancelled" } : booking
        )
      );
      
      toast.success("Booking cancelled successfully");
    } catch (error: any) {
      toast.error("Failed to cancel booking");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
          zip_code: profile.zip_code
        })
        .eq("id", profile.id);

      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error("Failed to update profile");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: { icon: <CheckCircle className="w-3 h-3 mr-1" />, className: "bg-emerald-500/10 text-emerald-700 border-emerald-300" },
      pending: { icon: <Clock className="w-3 h-3 mr-1" />, className: "bg-amber-500/10 text-amber-700 border-amber-300" },
      processing: { icon: <Package className="w-3 h-3 mr-1" />, className: "bg-blue-500/10 text-blue-700 border-blue-300" },
      shipped: { icon: <Truck className="w-3 h-3 mr-1" />, className: "bg-purple-500/10 text-purple-700 border-purple-300" },
      cancelled: { icon: <XCircle className="w-3 h-3 mr-1" />, className: "bg-red-500/10 text-red-700 border-red-300" },
    };
    
    const variant = variants[status as keyof typeof variants] || { icon: null, className: "" };
    
    return (
      <Badge variant="outline" className={`${variant.className} flex items-center gap-1 capitalize`}>
        {variant.icon}
        {status}
      </Badge>
    );
  };

  const orderStatusCounts = {
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const rentalStatusCounts = {
    pending: rentals.filter(r => r.status === 'pending').length,
    active: rentals.filter(r => r.status === 'active').length,
    completed: rentals.filter(r => r.status === 'completed').length,
    cancelled: rentals.filter(r => r.status === 'cancelled').length,
  };

  const bookingStatusCounts = {
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  const totalActiveRentals = rentalStatusCounts.pending + rentalStatusCounts.active;
  const totalActiveBookings = bookingStatusCounts.pending + bookingStatusCounts.confirmed;

  const handleStatusFilter = (status: string, tab: string) => {
    // Navigate to purchase history with filters
    if (tab === 'orders') {
      navigate(`/purchase-history?tab=orders&orderStatus=${status}`);
    } else if (tab === 'rentals') {
      navigate(`/purchase-history?tab=rentals&rentalStatus=${status}`);
    } else {
      navigate(`/purchase-history?tab=bookings`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 pb-24 p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        {/* Profile Header Section */}
        <Card className="mb-6 overflow-hidden border-none shadow-lg">
          <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20 p-4 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-6 min-w-0 flex-1">
                <Avatar className="w-16 h-16 md:w-20 md:h-20 border-4 border-background shadow-xl flex-shrink-0">
                  <AvatarImage src="" alt={profile?.full_name} />
                  <AvatarFallback className="text-xl md:text-2xl bg-primary text-primary-foreground">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg md:text-3xl font-bold mb-1 truncate">{profile?.full_name || 'Guest'}</h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 truncate">
                    <User className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                    <span className="truncate">{profile?.email}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleLogout} variant="outline" className="shadow-md w-full md:w-auto">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
                <Button onClick={() => setActiveTab('settings')} variant="outline" size="icon" className="shadow-md hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Settings className="w-4 h-4" />
                </Button>
                <Button onClick={() => navigate('/chats')} variant="outline" size="icon" className="shadow-md hover:bg-primary hover:text-primary-foreground transition-colors">
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Access Section */}
        <Card className="mb-6 shadow-lg border-none">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl md:text-2xl font-bold leading-tight">My Purchases</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/purchase-history')}
                  className="text-muted-foreground hover:text-foreground text-xs shrink-0"
                >
                  View Purchase History →
                </Button>
              </div>
            <Separator className="mb-6" />
            
            {/* Orders Status Grid */}
            {activeTab === 'orders' && (
              <div className="grid grid-cols-4 gap-3 md:gap-6">
                <button 
                  onClick={() => handleStatusFilter('pending', 'orders')}
                  className="flex flex-col items-center justify-center gap-2 md:gap-3 p-3 md:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Wallet className="w-10 h-10 md:w-12 md:h-12 stroke-[1.5] text-primary" />
                    {orderStatusCounts.pending > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full bg-primary">
                        {orderStatusCounts.pending}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs md:text-sm font-medium text-center">To Pay</span>
                </button>
                
                <button 
                  onClick={() => handleStatusFilter('processing', 'orders')}
                  className="flex flex-col items-center justify-center gap-2 md:gap-3 p-3 md:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Package className="w-10 h-10 md:w-12 md:h-12 stroke-[1.5] text-primary" />
                    {orderStatusCounts.processing > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full bg-primary">
                        {orderStatusCounts.processing}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs md:text-sm font-medium text-center">To Ship</span>
                </button>
                
                <button 
                  onClick={() => handleStatusFilter('shipped', 'orders')}
                  className="flex flex-col items-center justify-center gap-2 md:gap-3 p-3 md:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Truck className="w-10 h-10 md:w-12 md:h-12 stroke-[1.5] text-primary" />
                    {orderStatusCounts.shipped > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full bg-primary">
                        {orderStatusCounts.shipped}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs md:text-sm font-medium text-center">To Receive</span>
                </button>
                
                <button 
                  onClick={() => handleStatusFilter('completed', 'orders')}
                  className="flex flex-col items-center justify-center gap-2 md:gap-3 p-3 md:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Star className="w-10 h-10 md:w-12 md:h-12 stroke-[1.5] text-primary" />
                    {orderStatusCounts.completed > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full bg-primary">
                        {orderStatusCounts.completed}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs md:text-sm font-medium text-center">To Rate</span>
                </button>
              </div>
            )}

            {/* Rentals Status Grid */}
            {activeTab === 'rentals' && (
              <div className="grid grid-cols-4 gap-3 md:gap-6">
                <button 
                  onClick={() => handleStatusFilter('pending', 'rentals')}
                  className="flex flex-col items-center justify-center gap-2 md:gap-3 p-3 md:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Clock className="w-10 h-10 md:w-12 md:h-12 stroke-[1.5] text-primary" />
                    {rentalStatusCounts.pending > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full bg-primary">
                        {rentalStatusCounts.pending}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs md:text-sm font-medium text-center">To Pay</span>
                </button>
                
                <button 
                  onClick={() => handleStatusFilter('active', 'rentals')}
                  className="flex flex-col items-center justify-center gap-2 md:gap-3 p-3 md:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Package className="w-10 h-10 md:w-12 md:h-12 stroke-[1.5] text-primary" />
                    {rentalStatusCounts.active > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full bg-primary">
                        {rentalStatusCounts.active}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs md:text-sm font-medium text-center">To Ship</span>
                </button>
                
                <button 
                  onClick={() => handleStatusFilter('completed', 'rentals')}
                  className="flex flex-col items-center justify-center gap-2 md:gap-3 p-3 md:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Truck className="w-10 h-10 md:w-12 md:h-12 stroke-[1.5] text-primary" />
                    {rentalStatusCounts.completed > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full bg-primary">
                        {rentalStatusCounts.completed}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs md:text-sm font-medium text-center">To Receive</span>
                </button>
                
                <button 
                  onClick={() => handleStatusFilter('all', 'rentals')}
                  className="flex flex-col items-center justify-center gap-2 md:gap-3 p-3 md:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Star className="w-10 h-10 md:w-12 md:h-12 stroke-[1.5] text-primary" />
                  </div>
                  <span className="text-xs md:text-sm font-medium text-center">To Rate</span>
                </button>
              </div>
            )}

            {/* Bookings Status Grid */}
            {activeTab === 'bookings' && (
              <div className="grid grid-cols-4 gap-3 md:gap-6">
                <button 
                  onClick={() => handleStatusFilter('pending', 'bookings')}
                  className="flex flex-col items-center justify-center gap-2 md:gap-3 p-3 md:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Wallet className="w-10 h-10 md:w-12 md:h-12 stroke-[1.5] text-primary" />
                    {bookingStatusCounts.pending > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full bg-primary">
                        {bookingStatusCounts.pending}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs md:text-sm font-medium text-center">To Pay</span>
                </button>
                
                <button 
                  onClick={() => handleStatusFilter('confirmed', 'bookings')}
                  className="flex flex-col items-center justify-center gap-2 md:gap-3 p-3 md:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Package className="w-10 h-10 md:w-12 md:h-12 stroke-[1.5] text-primary" />
                    {bookingStatusCounts.confirmed > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full bg-primary">
                        {bookingStatusCounts.confirmed}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs md:text-sm font-medium text-center">To Ship</span>
                </button>
                
                <button 
                  onClick={() => handleStatusFilter('completed', 'bookings')}
                  className="flex flex-col items-center justify-center gap-2 md:gap-3 p-3 md:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Truck className="w-10 h-10 md:w-12 md:h-12 stroke-[1.5] text-primary" />
                    {bookingStatusCounts.completed > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full bg-primary">
                        {bookingStatusCounts.completed}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs md:text-sm font-medium text-center">To Receive</span>
                </button>
                
                <button 
                  onClick={() => handleStatusFilter('all', 'bookings')}
                  className="flex flex-col items-center justify-center gap-2 md:gap-3 p-3 md:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Star className="w-10 h-10 md:w-12 md:h-12 stroke-[1.5] text-primary" />
                  </div>
                  <span className="text-xs md:text-sm font-medium text-center">To Rate</span>
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Support Section */}
        <Card className="mb-6 shadow-lg border-none">
          <CardContent className="p-4 md:p-6">
            <h3 className="text-xl md:text-2xl font-bold mb-4">Support</h3>
            <Separator className="mb-4" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-6 flex flex-col items-center gap-3 hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => navigate('/support-chat')}
              >
                <HelpCircle className="w-8 h-8" />
                <span className="text-base font-medium">Help Centre</span>
                <span className="text-xs text-muted-foreground">Get instant help from our AI assistant</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-6 flex flex-col items-center gap-3 hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => navigate('/support-chat')}
              >
                <MessageCircle className="w-8 h-8" />
                <span className="text-base font-medium">Chat with Glambook</span>
                <span className="text-xs text-muted-foreground">24/7 AI-powered support</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          setStatusFilter('all');
        }} className="w-full">

          {/* Chats Tab */}
          <TabsContent value="chats" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <MessageCircle className="w-5 h-5 inline mr-2" />
                  Messages
                </CardTitle>
                <CardDescription>Your conversations with service providers</CardDescription>
              </CardHeader>
              <CardContent>
                {conversations.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No conversations yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Start a conversation with a service provider
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => navigate(`/chat?providerId=${conv.provider_id}`)}
                        className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                      >
                        <Avatar>
                          <AvatarFallback>
                            {conv.service_providers?.business_name?.charAt(0) || "P"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold">
                            {conv.service_providers?.business_name || "Service Provider"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(conv.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <User className="w-5 h-5 inline mr-2" />
                  Profile Settings
                </CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={profile?.email || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profile?.full_name || ""}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profile?.phone || ""}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={profile?.address || ""}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip_code">ZIP Code</Label>
                    <Input
                      id="zip_code"
                      value={profile?.zip_code || ""}
                      onChange={(e) => setProfile({ ...profile, zip_code: e.target.value })}
                    />
                  </div>
                  <Separator />
                  <Button type="submit">Update Profile</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
