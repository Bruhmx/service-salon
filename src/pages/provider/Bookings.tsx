import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Calendar, Clock, User, FileText, Search, Filter, Phone, Mail, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  notes: string | null;
  customer_phone: string | null;
  created_at: string;
  services: { name: string; price: number; duration_minutes: number } | null;
  profiles: { full_name: string; email: string; phone: string | null } | null;
}

export default function ProviderBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to view bookings");
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

      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          booking_time,
          status,
          notes,
          customer_phone,
          created_at,
          customer_id,
          services(name, price, duration_minutes)
        `)
        .eq("provider_id", provider.id)
        .order("booking_date", { ascending: false });
      
      if (bookingsError) throw bookingsError;
      
      // Fetch customer profiles separately
      if (bookingsData) {
        const customerIds = [...new Set(bookingsData.map(b => b.customer_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", customerIds);
        
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const enrichedBookings = bookingsData.map(booking => ({
          ...booking,
          profiles: profilesMap.get(booking.customer_id) || null
        }));
        
        setBookings(enrichedBookings as Booking[]);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", bookingId);

      if (error) throw error;
      
      toast.success(`Booking ${newStatus} successfully`);
      fetchBookings();
    } catch (error: any) {
      toast.error(error.message || "Failed to update booking status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "secondary";
      case "confirmed": return "default";
      case "completed": return "outline";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  // Group bookings by date
  const bookingsByDate = bookings.reduce((acc, booking) => {
    const date = booking.booking_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(booking);
    return acc;
  }, {} as Record<string, Booking[]>);

  // Get bookings for selected date
  const selectedDateBookings = selectedDate 
    ? bookingsByDate[format(selectedDate, "yyyy-MM-dd")] || []
    : [];

  // Calendar day modifiers
  const getDateModifiers = (date: Date) => {
    const dateString = format(date, "yyyy-MM-dd");
    const dayBookings = bookingsByDate[dateString] || [];
    
    if (dayBookings.length === 0) return {};
    
    const hasConfirmed = dayBookings.some(b => b.status === "confirmed");
    const hasPending = dayBookings.some(b => b.status === "pending");
    const hasCompleted = dayBookings.some(b => b.status === "completed");
    const allCancelled = dayBookings.every(b => b.status === "cancelled");
    
    if (allCancelled) return { cancelled: true };
    if (hasConfirmed) return { confirmed: true };
    if (hasPending) return { pending: true };
    if (hasCompleted) return { completed: true };
    
    return {};
  };

  const filteredAndSortedBookings = bookings
    .filter(booking => {
      if (filterStatus !== "all" && booking.status !== filterStatus) return false;
      if (searchQuery && !booking.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime();
        case "date-desc":
          return new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Service Bookings
          </h1>
          <p className="text-muted-foreground">Manage your customer appointments</p>
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "calendar")}>
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <FileText className="h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Calendar
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Booking Date (Newest)</SelectItem>
                <SelectItem value="date-asc">Booking Date (Oldest)</SelectItem>
                <SelectItem value="created-desc">Created (Newest)</SelectItem>
                <SelectItem value="created-asc">Created (Oldest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Booking Calendar</CardTitle>
              <div className="flex flex-wrap gap-2 pt-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span>Confirmed</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span>Cancelled</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                modifiers={{
                  pending: (date) => getDateModifiers(date).pending || false,
                  confirmed: (date) => getDateModifiers(date).confirmed || false,
                  completed: (date) => getDateModifiers(date).completed || false,
                  cancelled: (date) => getDateModifiers(date).cancelled || false,
                }}
                modifiersClassNames={{
                  pending: "bg-yellow-500/20 text-yellow-900 dark:text-yellow-100 font-bold",
                  confirmed: "bg-primary/20 text-primary font-bold",
                  completed: "bg-green-500/20 text-green-900 dark:text-green-100 font-bold",
                  cancelled: "bg-destructive/20 text-destructive font-bold line-through",
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedDate ? format(selectedDate, "MMMM dd, yyyy") : "Select a Date"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Click on a date to view bookings
                </p>
              ) : selectedDateBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No bookings for this date
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDateBookings.map((booking) => (
                    <Card key={booking.id} className="border-l-4 border-l-accent">
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{booking.booking_time}</span>
                          <Badge variant={getStatusColor(booking.status)} className="text-xs">
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">{booking.services?.name}</p>
                          <p className="text-muted-foreground text-xs">{booking.profiles?.full_name}</p>
                          {booking.customer_phone && (
                            <p className="text-muted-foreground text-xs flex items-center gap-1 mt-1">
                              <Phone className="h-3 w-3" />
                              {booking.customer_phone}
                            </p>
                          )}
                        </div>
                        {booking.status === "pending" && (
                          <div className="flex gap-1 pt-2">
                            <Button 
                              size="sm" 
                              onClick={() => updateStatus(booking.id, "confirmed")}
                              className="flex-1 text-xs h-7"
                            >
                              Confirm
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => updateStatus(booking.id, "cancelled")}
                              className="flex-1 text-xs h-7"
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                        {booking.status === "confirmed" && (
                          <Button 
                            size="sm" 
                            onClick={() => updateStatus(booking.id, "completed")}
                            className="w-full text-xs h-7"
                          >
                            Mark Complete
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bookings List */}
      {viewMode === "list" && filteredAndSortedBookings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
            <p className="text-sm text-muted-foreground text-center">
              {searchQuery || filterStatus !== "all" 
                ? "Try adjusting your filters" 
                : "Your bookings will appear here"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        <div className="grid gap-4">
          {filteredAndSortedBookings.map((booking, index) => (
            <Card 
              key={booking.id} 
              className="hover:shadow-[var(--shadow-elegant)] transition-all duration-300 border-l-4 border-l-accent animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-xl">{booking.services?.name || "Service"}</CardTitle>
                      <Badge variant={getStatusColor(booking.status)} className="ml-2">
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-3 mt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium">{booking.profiles?.full_name || "Unknown"}</span>
                      </div>
                      
                      {booking.profiles?.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{booking.profiles.email}</span>
                        </div>
                      )}
                      
                      {(booking.customer_phone || booking.profiles?.phone) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{booking.customer_phone || booking.profiles.phone}</span>
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
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-medium">{format(new Date(booking.booking_date), "MMM dd, yyyy")}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/5 border border-accent/10">
                    <Clock className="h-4 w-4 text-accent" />
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="text-sm font-medium">{booking.booking_time}</p>
                    </div>
                  </div>
                  
                  {booking.services?.duration_minutes && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/5 border border-secondary/10">
                      <Clock className="h-4 w-4 text-secondary-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="text-sm font-medium">{booking.services.duration_minutes} min</p>
                      </div>
                    </div>
                  )}
                  
                  {booking.services?.price && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <span className="text-lg font-bold text-primary">₱</span>
                      <div>
                        <p className="text-xs text-muted-foreground">Price</p>
                        <p className="text-sm font-medium">₱{booking.services.price.toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {booking.notes && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Customer Notes</p>
                      <p className="text-sm">{booking.notes}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 pt-2">
                  {booking.status === "pending" && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => updateStatus(booking.id, "confirmed")}
                        className="hover:scale-105 transition-transform"
                      >
                        Confirm Booking
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => updateStatus(booking.id, "cancelled")}
                        className="hover:scale-105 transition-transform"
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  {booking.status === "confirmed" && (
                    <Button 
                      size="sm" 
                      onClick={() => updateStatus(booking.id, "completed")}
                      className="hover:scale-105 transition-transform"
                    >
                      Mark as Completed
                    </Button>
                  )}
                  {booking.status === "completed" && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      ✓ Completed
                    </Badge>
                  )}
                  {booking.status === "cancelled" && (
                    <Badge variant="destructive">
                      Cancelled
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}