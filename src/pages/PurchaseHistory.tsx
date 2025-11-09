import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Package, Calendar, ShoppingBag, ArrowLeft, Store } from "lucide-react";
import { toast } from "sonner";

// Purchase History Page Component
export default function PurchaseHistory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  
  // Get initial state from URL parameters
  const initialTab = searchParams.get('tab') || 'orders';
  const initialOrderStatus = searchParams.get('orderStatus') || 'pending';
  const initialRentalStatus = searchParams.get('rentalStatus') || 'pending';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>(initialOrderStatus);
  const [rentalStatusFilter, setRentalStatusFilter] = useState<string>(initialRentalStatus);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }
    
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
      const { data: ordersData } = await supabase
        .from("product_orders")
        .select("*, products(name, image_url), service_providers(business_name)")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });
      
      const { data: rentalsData } = await supabase
        .from("equipment_rentals")
        .select("*, equipment(name, image_url), service_providers(business_name)")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });
      
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*, services(name, image_url), service_providers(business_name)")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });

      setOrders(ordersData || []);
      setRentals(rentalsData || []);
      setBookings(bookingsData || []);
    } catch (error: any) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("product_orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      if (error) throw error;
      
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
        return 'text-amber-600';
      case 'processing':
        return 'text-blue-600';
      case 'shipped':
        return 'text-purple-600';
      case 'active':
        return 'text-green-600';
      case 'confirmed':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredOrders = orders.filter(o => 
    orderStatusFilter === 'all' ? o.status !== 'cancelled' : o.status === orderStatusFilter
  );

  const filteredRentals = rentals.filter(r => 
    rentalStatusFilter === 'all' ? r.status !== 'cancelled' : r.status === rentalStatusFilter
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 pb-24 p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button onClick={() => navigate('/me')} variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
            
            <h1 className="text-3xl md:text-4xl font-bold">Purchase History</h1>
          </div>

          <div className="flex gap-2">
            <Button 
              variant={activeTab === 'orders' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveTab('orders');
                setOrderStatusFilter('pending');
                navigate('/purchase-history?tab=orders&orderStatus=pending');
              }}
            >
              <Package className="w-4 h-4 mr-2" />
              Orders
            </Button>
            <Button 
              variant={activeTab === 'rentals' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveTab('rentals');
                setRentalStatusFilter('pending');
                navigate('/purchase-history?tab=rentals&rentalStatus=pending');
              }}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Rentals
            </Button>
            <Button 
              variant={activeTab === 'bookings' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveTab('bookings');
                navigate('/purchase-history?tab=bookings');
              }}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Bookings
            </Button>
          </div>
        </div>

        {/* Status Tabs for Orders */}
        {activeTab === 'orders' && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            <Button 
              variant={orderStatusFilter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setOrderStatusFilter('pending');
                navigate('/purchase-history?tab=orders&orderStatus=pending');
              }}
            >
              To Pay
            </Button>
            <Button 
              variant={orderStatusFilter === 'processing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setOrderStatusFilter('processing');
                navigate('/purchase-history?tab=orders&orderStatus=processing');
              }}
            >
              To Ship
            </Button>
            <Button 
              variant={orderStatusFilter === 'shipped' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setOrderStatusFilter('shipped');
                navigate('/purchase-history?tab=orders&orderStatus=shipped');
              }}
            >
              To Receive
            </Button>
            <Button 
              variant={orderStatusFilter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setOrderStatusFilter('completed');
                navigate('/purchase-history?tab=orders&orderStatus=completed');
              }}
            >
              To Rate
            </Button>
          </div>
        )}

        {/* Status Tabs for Rentals */}
        {activeTab === 'rentals' && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            <Button 
              variant={rentalStatusFilter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setRentalStatusFilter('pending');
                navigate('/purchase-history?tab=rentals&rentalStatus=pending');
              }}
            >
              To Pay
            </Button>
            <Button 
              variant={rentalStatusFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setRentalStatusFilter('active');
                navigate('/purchase-history?tab=rentals&rentalStatus=active');
              }}
            >
              To Ship
            </Button>
            <Button 
              variant={rentalStatusFilter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setRentalStatusFilter('completed');
                navigate('/purchase-history?tab=rentals&rentalStatus=completed');
              }}
            >
              To Receive
            </Button>
          </div>
        )}

        {/* Orders Content */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No orders found</p>
                </CardContent>
              </Card>
            ) : (
              filteredOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Store className="w-4 h-4" />
                        <span className="font-medium">{order.service_providers?.business_name}</span>
                      </div>
                      <span className={`text-sm font-medium capitalize ${getStatusBadgeClass(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    
                    <Separator className="mb-3" />
                    
                    <div className="flex gap-3">
                      <img 
                        src={order.products?.image_url || '/placeholder.svg'} 
                        alt={order.products?.name}
                        className="w-20 h-20 rounded-md object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium mb-1 line-clamp-2">{order.products?.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">x{order.quantity}</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-primary">₱{Number(order.total_price).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total: <span className="font-semibold text-foreground">₱{Number(order.total_price).toFixed(2)}</span>
                      </span>
                      <div className="flex gap-2">
                        {order.status === 'pending' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Cancel
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to cancel this order?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>No</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCancelOrder(order.id)}>
                                  Yes, cancel
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Rentals Content */}
        {activeTab === 'rentals' && (
          <div className="space-y-4">
            {filteredRentals.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No rentals found</p>
                </CardContent>
              </Card>
            ) : (
              filteredRentals.map((rental) => (
                <Card key={rental.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Store className="w-4 h-4" />
                        <span className="font-medium">{rental.service_providers?.business_name}</span>
                      </div>
                      <span className={`text-sm font-medium capitalize ${getStatusBadgeClass(rental.status)}`}>
                        {rental.status}
                      </span>
                    </div>
                    
                    <Separator className="mb-3" />
                    
                    <div className="flex gap-3">
                      <img 
                        src={rental.equipment?.image_url || '/placeholder.svg'} 
                        alt={rental.equipment?.name}
                        className="w-20 h-20 rounded-md object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium mb-1 line-clamp-2">{rental.equipment?.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          {new Date(rental.rental_start_date).toLocaleDateString()} - {new Date(rental.rental_end_date).toLocaleDateString()}
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-primary">₱{Number(rental.total_price).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total: <span className="font-semibold text-foreground">₱{Number(rental.total_price).toFixed(2)}</span>
                      </span>
                      <div className="flex gap-2">
                        {rental.status === 'pending' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Cancel
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Rental</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to cancel this rental?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>No</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCancelRental(rental.id)}>
                                  Yes, cancel
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Bookings Content */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No bookings found</p>
                </CardContent>
              </Card>
            ) : (
              bookings.filter(b => b.status !== 'cancelled').map((booking) => (
                <Card key={booking.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Store className="w-4 h-4" />
                        <span className="font-medium">{booking.service_providers?.business_name}</span>
                      </div>
                      <span className={`text-sm font-medium capitalize ${getStatusBadgeClass(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                    
                    <Separator className="mb-3" />
                    
                    <div className="flex gap-3">
                      <img 
                        src={booking.services?.image_url || '/placeholder.svg'} 
                        alt={booking.services?.name}
                        className="w-20 h-20 rounded-md object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium mb-1 line-clamp-2">{booking.services?.name}</h3>
                        <p className="text-xs text-muted-foreground mb-1">
                          {new Date(booking.booking_date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {booking.booking_time}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t flex items-center justify-end">
                      {booking.status === 'pending' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel this booking?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>No</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleCancelBooking(booking.id)}>
                                Yes, cancel
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
