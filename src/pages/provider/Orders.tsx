import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Package, User, MapPin, FileText, Search, Filter, DollarSign, Hash, Phone, Mail } from "lucide-react";
import { format } from "date-fns";

interface Order {
  id: string;
  quantity: number;
  total_price: number;
  delivery_address: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  products: { name: string; price: number } | null;
  profiles: { full_name: string; email: string; phone: string | null } | null;
}

export default function ProviderOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("created-desc");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to view orders");
        return;
      }

      const { data: provider, error: providerError } = await supabase
        .from("service_providers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (providerError) throw providerError;

      if (!provider) {
        toast.error("Provider profile not found");
        setLoading(false);
        return;
      }

      const { data: ordersData, error: ordersError } = await supabase
        .from("product_orders")
        .select(`
          id,
          quantity,
          total_price,
          delivery_address,
          notes,
          status,
          created_at,
          customer_id,
          products(name, price)
        `)
        .eq("provider_id", provider.id)
        .order("created_at", { ascending: false });
      
      if (ordersError) throw ordersError;
      
      // Fetch customer profiles separately
      if (ordersData) {
        const customerIds = [...new Set(ordersData.map(o => o.customer_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", customerIds);
        
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const enrichedOrders = ordersData.map(order => ({
          ...order,
          profiles: profilesMap.get(order.customer_id) || null
        }));
        
        setOrders(enrichedOrders as Order[]);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("product_orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;
      
      toast.success(`Order ${newStatus} successfully`);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || "Failed to update order status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "secondary";
      case "processing": return "default";
      case "shipped": return "outline";
      case "completed": return "outline";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  const filteredAndSortedOrders = orders
    .filter(order => {
      if (filterStatus !== "all" && order.status !== filterStatus) return false;
      if (searchQuery && !order.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "amount-asc":
          return a.total_price - b.total_price;
        case "amount-desc":
          return b.total_price - a.total_price;
        case "created-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "created-desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Product Orders
        </h1>
        <p className="text-muted-foreground">Manage your product sales</p>
      </div>

      {/* Filters and Search */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created-desc">Date (Newest)</SelectItem>
                <SelectItem value="created-asc">Date (Oldest)</SelectItem>
                <SelectItem value="amount-desc">Amount (Highest)</SelectItem>
                <SelectItem value="amount-asc">Amount (Lowest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredAndSortedOrders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No orders found</h3>
            <p className="text-sm text-muted-foreground text-center">
              {searchQuery || filterStatus !== "all" 
                ? "Try adjusting your filters" 
                : "Your orders will appear here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAndSortedOrders.map((order, index) => (
            <Card 
              key={order.id} 
              className="hover:shadow-[var(--shadow-elegant)] transition-all duration-300 border-l-4 border-l-accent animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-xl">{order.products?.name || "Product"}</CardTitle>
                      <Badge variant={getStatusColor(order.status)} className="ml-2">
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-3 mt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium">{order.profiles?.full_name || "Unknown"}</span>
                      </div>
                      
                      {order.profiles?.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{order.profiles.email}</span>
                        </div>
                      )}
                      
                      {order.profiles?.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{order.profiles.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <Hash className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Quantity</p>
                      <p className="text-sm font-medium">{order.quantity}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/5 border border-accent/10">
                    <DollarSign className="h-4 w-4 text-accent" />
                    <div>
                      <p className="text-xs text-muted-foreground">Unit Price</p>
                      <p className="text-sm font-medium">₱{order.products?.price.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <DollarSign className="h-5 w-5 text-primary font-bold" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold text-primary">₱{order.total_price.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/5 border border-secondary/10">
                    <Package className="h-4 w-4 text-secondary-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Ordered</p>
                      <p className="text-sm font-medium">{format(new Date(order.created_at), "MMM dd, yyyy")}</p>
                    </div>
                  </div>
                </div>

                {order.delivery_address && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Delivery Address</p>
                      <p className="text-sm">{order.delivery_address}</p>
                    </div>
                  </div>
                )}

                {order.notes && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Customer Notes</p>
                      <p className="text-sm">{order.notes}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 pt-2">
                  {order.status === "pending" && (
                    <Button 
                      size="sm" 
                      onClick={() => updateStatus(order.id, "processing")}
                      className="hover:scale-105 transition-transform"
                    >
                      Start Processing
                    </Button>
                  )}
                  {order.status === "processing" && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => updateStatus(order.id, "shipped")}
                        className="hover:scale-105 transition-transform"
                      >
                        Mark as Shipped
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateStatus(order.id, "completed")}
                        className="hover:scale-105 transition-transform"
                      >
                        Complete Directly
                      </Button>
                    </>
                  )}
                  {order.status === "shipped" && (
                    <Button 
                      size="sm" 
                      onClick={() => updateStatus(order.id, "completed")}
                      className="hover:scale-105 transition-transform"
                    >
                      Confirm Delivery
                    </Button>
                  )}
                  {order.status === "completed" && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      ✓ Completed
                    </Badge>
                  )}
                  {(order.status === "pending" || order.status === "processing") && (
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => updateStatus(order.id, "cancelled")}
                      className="hover:scale-105 transition-transform"
                    >
                      Cancel Order
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}