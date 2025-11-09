import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Wrench, User, MapPin, FileText, Search, Filter, DollarSign, Calendar, Phone, Mail } from "lucide-react";
import { format } from "date-fns";

interface Rental {
  id: string;
  rental_start_date: string;
  rental_end_date: string;
  total_price: number;
  notes: string | null;
  status: string;
  created_at: string;
  equipment: { name: string; price_per_day: number } | null;
  profiles: { full_name: string; email: string; phone: string | null } | null;
}

export default function ProviderRentals() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("created-desc");

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to view rentals");
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

      const { data: rentalsData, error: rentalsError } = await supabase
        .from("equipment_rentals")
        .select(`
          id,
          rental_start_date,
          rental_end_date,
          total_price,
          notes,
          status,
          created_at,
          customer_id,
          equipment(name, price_per_day)
        `)
        .eq("provider_id", provider.id)
        .order("created_at", { ascending: false });
      
      if (rentalsError) throw rentalsError;
      
      // Fetch customer profiles separately
      if (rentalsData) {
        const customerIds = [...new Set(rentalsData.map(r => r.customer_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", customerIds);
        
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const enrichedRentals = rentalsData.map(rental => ({
          ...rental,
          profiles: profilesMap.get(rental.customer_id) || null
        }));
        
        setRentals(enrichedRentals as Rental[]);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load rentals");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (rentalId: string, newStatus: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-rental-status', {
        body: { rentalId, newStatus }
      });

      if (error) throw error;
      
      const statusMessages: Record<string, string> = {
        active: "Payment confirmed! Rental is now active and equipment marked as unavailable",
        completed: "Rental marked as completed and equipment is now available",
        cancelled: "Rental cancelled and equipment is now available"
      };
      
      toast.success(statusMessages[newStatus] || `Rental ${newStatus} successfully`);
      fetchRentals();
    } catch (error: any) {
      toast.error(error.message || "Failed to update rental status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "secondary";
      case "active": return "default";
      case "completed": return "outline";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const filteredAndSortedRentals = rentals
    .filter(rental => {
      if (filterStatus !== "all" && rental.status !== filterStatus) return false;
      if (searchQuery && !rental.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
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
          Equipment Rentals
        </h1>
        <p className="text-muted-foreground">Manage your equipment rental bookings</p>
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
                <SelectItem value="active">Active</SelectItem>
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

      {/* Rentals List */}
      {filteredAndSortedRentals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wrench className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No rentals found</h3>
            <p className="text-sm text-muted-foreground text-center">
              {searchQuery || filterStatus !== "all" 
                ? "Try adjusting your filters" 
                : "Your equipment rentals will appear here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAndSortedRentals.map((rental, index) => (
            <Card 
              key={rental.id} 
              className="hover:shadow-[var(--shadow-elegant)] transition-all duration-300 border-l-4 border-l-accent animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-xl">{rental.equipment?.name || "Equipment"}</CardTitle>
                      <Badge variant={getStatusColor(rental.status)} className="ml-2">
                        {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-3 mt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium">{rental.profiles?.full_name || "Unknown"}</span>
                      </div>
                      
                      {rental.profiles?.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{rental.profiles.email}</span>
                        </div>
                      )}
                      
                      {rental.profiles?.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{rental.profiles.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Start Date</p>
                      <p className="text-sm font-medium">{format(new Date(rental.rental_start_date), "MMM dd, yyyy")}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/5 border border-accent/10">
                    <Calendar className="h-4 w-4 text-accent" />
                    <div>
                      <p className="text-xs text-muted-foreground">End Date</p>
                      <p className="text-sm font-medium">{format(new Date(rental.rental_end_date), "MMM dd, yyyy")}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/5 border border-secondary/10">
                    <Wrench className="h-4 w-4 text-secondary-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="text-sm font-medium">{calculateDays(rental.rental_start_date, rental.rental_end_date)} days</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <DollarSign className="h-5 w-5 text-primary font-bold" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold text-primary">₱{rental.total_price.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {rental.notes && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Customer Notes</p>
                      <p className="text-sm">{rental.notes}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 pt-2">
                  {rental.status === "pending" && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => updateStatus(rental.id, "active")}
                        className="hover:scale-105 transition-transform"
                      >
                        ✓ Confirm Payment Received
                      </Button>
                      <p className="text-xs text-muted-foreground self-center">
                        Click after verifying GCash payment
                      </p>
                    </>
                  )}
                  {rental.status === "active" && (
                    <Button 
                      size="sm" 
                      onClick={() => updateStatus(rental.id, "completed")}
                      className="hover:scale-105 transition-transform"
                    >
                      Mark as Returned
                    </Button>
                  )}
                  {rental.status === "completed" && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      ✓ Completed
                    </Badge>
                  )}
                  {(rental.status === "pending" || rental.status === "active") && (
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => updateStatus(rental.id, "cancelled")}
                      className="hover:scale-105 transition-transform"
                    >
                      Cancel Rental
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
