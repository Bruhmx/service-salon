import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Loader2, Menu, Package, ShoppingBag, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminOrders() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAllOrders();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/admin");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasAdminRole = roles?.some((r) => r.role === "admin");

      if (!hasAdminRole) {
        toast.error("Access denied. Admin role required.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllOrders = async () => {
    try {
      // Fetch orders without joins first
      const [bookingsRes, ordersRes, rentalsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("product_orders")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("equipment_rentals")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (bookingsRes.error) {
        console.error("Bookings error:", bookingsRes.error);
        toast.error("Failed to load bookings");
      }
      if (ordersRes.error) {
        console.error("Orders error:", ordersRes.error);
        toast.error("Failed to load orders");
      }
      if (rentalsRes.error) {
        console.error("Rentals error:", rentalsRes.error);
        toast.error("Failed to load rentals");
      }

      // Fetch additional data separately
      const customerIds = new Set([
        ...(bookingsRes.data?.map(b => b.customer_id) || []),
        ...(ordersRes.data?.map(o => o.customer_id) || []),
        ...(rentalsRes.data?.map(r => r.customer_id) || []),
      ]);

      const productIds = ordersRes.data?.map(o => o.product_id) || [];
      const serviceIds = bookingsRes.data?.map(b => b.service_id) || [];
      const equipmentIds = rentalsRes.data?.map(r => r.equipment_id) || [];

      // Fetch related data
      const [profilesRes, productsRes, servicesRes, equipmentRes] = await Promise.all([
        customerIds.size > 0 
          ? supabase.from("profiles").select("id, full_name, email").in("id", Array.from(customerIds))
          : { data: [] },
        productIds.length > 0
          ? supabase.from("products").select("id, name").in("id", productIds)
          : { data: [] },
        serviceIds.length > 0
          ? supabase.from("services").select("id, name").in("id", serviceIds)
          : { data: [] },
        equipmentIds.length > 0
          ? supabase.from("equipment").select("id, name").in("id", equipmentIds)
          : { data: [] },
      ]);

      // Create lookup maps
      const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
      const productsMap = new Map((productsRes.data || []).map((p: any) => [p.id, p]));
      const servicesMap = new Map((servicesRes.data || []).map((s: any) => [s.id, s]));
      const equipmentMap = new Map((equipmentRes.data || []).map((e: any) => [e.id, e]));

      // Merge data
      const enrichedBookings = (bookingsRes.data || []).map(b => ({
        ...b,
        profiles: profilesMap.get(b.customer_id),
        services: servicesMap.get(b.service_id),
      }));

      const enrichedOrders = (ordersRes.data || []).map(o => ({
        ...o,
        profiles: profilesMap.get(o.customer_id),
        products: productsMap.get(o.product_id),
      }));

      const enrichedRentals = (rentalsRes.data || []).map(r => ({
        ...r,
        profiles: profilesMap.get(r.customer_id),
        equipment: equipmentMap.get(r.equipment_id),
      }));

      setBookings(enrichedBookings);
      setOrders(enrichedOrders);
      setRentals(enrichedRentals);
      
      console.log("Fetched data:", {
        bookings: enrichedBookings.length,
        orders: enrichedOrders.length,
        rentals: enrichedRentals.length
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    }
  };

  const updateStatus = async (type: "booking" | "order" | "rental", id: string, status: string) => {
    try {
      const table = type === "booking" ? "bookings" : type === "order" ? "product_orders" : "equipment_rentals";
      
      const { error } = await supabase
        .from(table)
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast.success("Status updated successfully");
      fetchAllOrders();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      processing: "default",
      shipped: "secondary",
      confirmed: "default",
      completed: "secondary",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col w-full">
          {/* Mobile Header */}
          <header className="sticky top-0 z-40 flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
            <h1 className="text-xl font-bold">Order Management</h1>
            <SidebarTrigger>
              <Menu className="h-6 w-6" />
            </SidebarTrigger>
          </header>
          
          <main className="flex-1 p-4 md:p-6 bg-gradient-to-br from-background to-secondary/20 overflow-x-hidden">
            <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 hidden lg:block">Order Management</h1>
            
            <Tabs defaultValue="bookings" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="bookings" className="gap-1 md:gap-2 text-xs md:text-sm py-2">
                <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Service</span> Bookings ({bookings.length})
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-1 md:gap-2 text-xs md:text-sm py-2">
                <ShoppingBag className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Product</span> Orders ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="rentals" className="gap-1 md:gap-2 text-xs md:text-sm py-2">
                <Package className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Equipment</span> Rentals ({rentals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bookings" className="space-y-4">
              {bookings.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No service bookings found
                  </CardContent>
                </Card>
              ) : (
                bookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-base md:text-lg">{booking.services?.name || "Service"}</CardTitle>
                          <p className="text-xs md:text-sm text-muted-foreground mt-1 break-words">
                            Customer: {booking.profiles?.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground break-all">
                            {booking.profiles?.email}
                          </p>
                        </div>
                        {getStatusBadge(booking.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 text-xs md:text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date:</span>
                          <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Time:</span>
                          <span>{booking.booking_time}</span>
                        </div>
                        {booking.notes && (
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                            <span className="text-muted-foreground">Notes:</span>
                            <span className="text-right break-words">{booking.notes}</span>
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-4">
                          <span className="text-muted-foreground">Update Status:</span>
                          <Select
                            value={booking.status}
                            onValueChange={(value) => updateStatus("booking", booking.id, value)}
                          >
                            <SelectTrigger className="w-full sm:w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              {orders.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No product orders found
                  </CardContent>
                </Card>
              ) : (
                orders.map((order) => (
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{order.products?.name || "Product"}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Customer: {order.profiles?.full_name} ({order.profiles?.email})
                          </p>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Quantity:</span>
                          <span>{order.quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Price:</span>
                          <span className="font-medium">₱{Number(order.total_price).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Delivery Address:</span>
                          <span className="text-right">{order.delivery_address}</span>
                        </div>
                        {order.notes && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Notes:</span>
                            <span className="text-right">{order.notes}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center mt-4">
                          <span className="text-muted-foreground">Update Status:</span>
                          <Select
                            value={order.status}
                            onValueChange={(value) => updateStatus("order", order.id, value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="rentals" className="space-y-4">
              {rentals.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No equipment rentals found
                  </CardContent>
                </Card>
              ) : (
                rentals.map((rental) => (
                  <Card key={rental.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{rental.equipment?.name || "Equipment"}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Customer: {rental.profiles?.full_name} ({rental.profiles?.email})
                          </p>
                        </div>
                        {getStatusBadge(rental.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Start Date:</span>
                          <span>{new Date(rental.rental_start_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">End Date:</span>
                          <span>{new Date(rental.rental_end_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Price:</span>
                          <span className="font-medium">₱{Number(rental.total_price).toFixed(2)}</span>
                        </div>
                        {rental.notes && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Notes:</span>
                            <span className="text-right">{rental.notes}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center mt-4">
                          <span className="text-muted-foreground">Update Status:</span>
                          <Select
                            value={rental.status}
                            onValueChange={(value) => updateStatus("rental", rental.id, value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
