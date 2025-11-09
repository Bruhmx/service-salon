import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Star, MapPin, Clock, DollarSign, Sparkles, Award, MessageSquare, QrCode, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TimePickerClock } from "@/components/TimePickerClock";

interface Provider {
  id: string;
  business_name: string;
  description: string | null;
  background_image_url: string | null;
  gcash_qr_code_url: string | null;
  address: string;
  zip_code: string;
  rating: number;
  total_reviews: number;
  is_active: boolean;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  image_url: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles_public: {
    full_name: string;
  };
}

export default function ProviderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedService, setSelectedService] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<Date | undefined>();
  const [bookingTime, setBookingTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<Record<string, string[]>>({});
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedServiceDetail, setSelectedServiceDetail] = useState<Service | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    if (id) {
      fetchProviderData();
    }
  }, [id]);

  const fetchProviderData = async () => {
    try {
      const [providerRes, servicesRes, reviewsRes, bookingsRes] = await Promise.all([
        supabase.from("service_providers").select("*").eq("id", id).single(),
        supabase.from("services").select("*").eq("provider_id", id).eq("is_active", true),
        supabase
          .from("reviews")
          .select(`
            id,
            rating,
            comment,
            created_at,
            customer_id,
            profiles_public (
              full_name
            )
          `)
          .eq("provider_id", id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.rpc("get_provider_booking_availability", {
          provider_uuid: id,
          start_date: new Date().toISOString().split("T")[0],
        }),
      ]);

      if (providerRes.error) throw providerRes.error;
      setProvider(providerRes.data);
      setServices(servicesRes.data || []);
      setReviews((reviewsRes.data || []) as any);

      // Organize bookings by date
      const slots: Record<string, string[]> = {};
      if (bookingsRes.data) {
        bookingsRes.data.forEach((booking) => {
          if (!slots[booking.booking_date]) {
            slots[booking.booking_date] = [];
          }
          slots[booking.booking_date].push(booking.booking_time);
        });
      }
      setBookedSlots(slots);
    } catch (error: any) {
      toast.error("Failed to load provider details");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleBookingFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!bookingDate) {
        toast.error("Please select a booking date");
        return;
      }

      // Validate inputs
      const bookingSchema = z.object({
        service_id: z.string().uuid("Invalid service selected"),
        booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
        booking_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
        customer_phone: z.string()
          .trim()
          .regex(/^(\+63|0)?9\d{9}$/, "Invalid Philippine phone number. Format: 09XXXXXXXXX or +639XXXXXXXXX")
          .transform(val => {
            // Normalize to +639XXXXXXXXX format
            if (val.startsWith('0')) return '+63' + val.slice(1);
            if (val.startsWith('9')) return '+63' + val;
            return val;
          }),
        notes: z.string().max(500, "Notes must be less than 500 characters").trim().optional(),
      });

      const formattedDate = format(bookingDate, "yyyy-MM-dd");

      bookingSchema.parse({
        service_id: selectedService,
        booking_date: formattedDate,
        booking_time: bookingTime,
        customer_phone: customerPhone,
        notes: notes || undefined,
      });

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Please login to book a service");
        navigate("/login");
        return;
      }

      // Open confirmation dialog
      setConfirmDialogOpen(true);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to validate booking");
      }
    }
  };

  const handleConfirmBooking = async () => {
    setBooking(true);

    try {
      const formattedDate = format(bookingDate!, "yyyy-MM-dd");
      
      // Normalize phone number
      let normalizedPhone = customerPhone.trim();
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '+63' + normalizedPhone.slice(1);
      } else if (normalizedPhone.startsWith('9')) {
        normalizedPhone = '+63' + normalizedPhone;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Please login to book a service");
        navigate("/login");
        return;
      }

      // Check if the time slot is available
      const { data: existingBookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("provider_id", id)
        .eq("booking_date", formattedDate)
        .eq("booking_time", bookingTime)
        .neq("status", "cancelled");

      if (existingBookings && existingBookings.length > 0) {
        toast.error("This time slot is already booked. Please choose another time.");
        setConfirmDialogOpen(false);
        return;
      }

      const { error } = await supabase.from("bookings").insert({
        customer_id: userData.user.id,
        provider_id: id,
        service_id: selectedService,
        booking_date: formattedDate,
        booking_time: bookingTime,
        customer_phone: normalizedPhone,
        notes: notes.trim() || null,
      });

      // Handle unique constraint violation (code 23505)
      if (error?.code === '23505') {
        toast.error("This time slot was just booked by someone else. Please choose another time.");
        setConfirmDialogOpen(false);
        return;
      }

      if (error) throw error;

      toast.success("Booking confirmed! We'll contact you soon.");
      setConfirmDialogOpen(false);
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to create booking");
    } finally {
      setBooking(false);
    }
  };

  // Generate available time slots (9 AM to 6 PM in 30-minute intervals)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  const totalTimeSlots = timeSlots.length; // 18 total slots (9 AM to 6 PM)
  const selectedDateString = bookingDate ? format(bookingDate, "yyyy-MM-dd") : "";
  const bookedTimesForSelectedDate = selectedDateString ? (bookedSlots[selectedDateString] || []) : [];
  const availableTimeSlots = timeSlots.filter(slot => !bookedTimesForSelectedDate.includes(slot));
  
  // Check if a date is fully booked
  const isDateFullyBooked = (date: Date) => {
    const dateString = format(date, "yyyy-MM-dd");
    const bookedSlotsCount = bookedSlots[dateString]?.length || 0;
    return bookedSlotsCount >= totalTimeSlots;
  };

  const handleSubmitReview = async () => {
    try {
      setSubmittingReview(true);

      if (reviewRating === 0) {
        toast.error("Please select a rating");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Please login to submit a review");
        navigate("/login");
        return;
      }

      // Check if user is a customer
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);

      if (!roles?.some(r => r.role === "customer")) {
        toast.error("Only customers can submit reviews");
        return;
      }

      // Check if user has a completed booking with this provider
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, status")
        .eq("customer_id", userData.user.id)
        .eq("provider_id", id);

      if (!bookings || bookings.length === 0) {
        toast.error("You must have a booking with this provider to leave a review");
        return;
      }

      // Check if user already reviewed this provider
      const { data: existingReview } = await supabase
        .from("reviews")
        .select("id")
        .eq("customer_id", userData.user.id)
        .eq("provider_id", id)
        .maybeSingle();

      if (existingReview) {
        toast.error("You have already reviewed this provider");
        return;
      }

      // Insert the review
      const { error } = await supabase.from("reviews").insert({
        customer_id: userData.user.id,
        provider_id: id,
        booking_id: bookings[0].id, // Use the first booking
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });

      if (error) throw error;

      toast.success("Thank you for your review!");
      setReviewDialogOpen(false);
      setReviewRating(0);
      setReviewComment("");
      
      // Refresh provider data to get updated rating and reviews
      fetchProviderData();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!provider) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24 animate-fade-in">
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")} 
          className="mb-8 hover:scale-105 transition-transform duration-200 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform duration-200">←</span>
          <span className="ml-2">Back to Providers</span>
        </Button>

        {/* Provider Header - Enhanced Hero Section */}
        <div className="relative mb-12">
          <div className="grid md:grid-cols-5 gap-8">
            {/* Image Section - Larger and more prominent */}
            <div className="md:col-span-3">
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-muted animate-fade-in shadow-[var(--shadow-elegant)] group">
                {provider.background_image_url ? (
                  <img
                    src={provider.background_image_url}
                    alt={provider.business_name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-accent/10 to-primary/30 group-hover:from-primary/30 group-hover:to-accent/20 transition-all duration-500">
                    <div className="text-center">
                      <span className="text-8xl font-bold text-primary drop-shadow-lg">{provider.business_name[0]}</span>
                      <Sparkles className="w-12 h-12 text-primary/60 mx-auto mt-4 animate-pulse" />
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </div>

            {/* Info Section - Enhanced styling */}
            <div className="md:col-span-2 animate-fade-in flex flex-col justify-center" style={{ animationDelay: '0.1s' }}>
              <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 shadow-[var(--shadow-card)] border border-border/50">
                <div className="flex items-start gap-3 mb-6">
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        {provider.business_name}
                      </h1>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={async () => {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) {
                            toast.error("Please login to chat");
                            navigate("/login");
                            return;
                          }
                          navigate(`/chat?providerId=${id}`);
                        }}
                        className="hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <MessageCircle className="h-5 w-5" />
                      </Button>
                    </div>
                    <Badge 
                      variant={provider.is_active ? "default" : "destructive"} 
                      className="text-sm px-4 py-1.5 animate-scale-in shadow-lg"
                    >
                      <div className={cn("w-2 h-2 rounded-full mr-2", provider.is_active ? "bg-green-400 animate-pulse" : "bg-red-400")} />
                      {provider.is_active ? "Available Now" : "Currently Unavailable"}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-1 bg-primary/10 px-3 py-2 rounded-lg">
                      <Star className="w-5 h-5 fill-primary text-primary" />
                      <span className="ml-1 font-bold text-lg text-primary">{Number(provider.rating).toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Award className="w-4 h-4" />
                      <span className="text-sm">
                        {provider.total_reviews} {provider.total_reviews === 1 ? 'review' : 'reviews'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/10">
                    <MapPin className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{provider.address}, {provider.zip_code}</span>
                  </div>

                  {provider.description && (
                    <div className="pt-4 border-t border-border/50">
                      <p className="text-sm text-muted-foreground leading-relaxed">{provider.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Services List - Compact Grid */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-full" />
                <h2 className="text-2xl font-bold">Our Services</h2>
              </div>
              {services.length === 0 ? (
                <Card className="p-8 text-center">
                  <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="text-muted-foreground">No services available at the moment</p>
                </Card>
              ) : (
                <div className="max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services.map((service, index) => (
                    <Card 
                      key={service.id}
                      className="group hover:shadow-[var(--shadow-elegant)] transition-all duration-300 hover:-translate-y-1 animate-fade-in overflow-hidden cursor-pointer"
                      style={{ animationDelay: `${index * 0.1}s` }}
                      onClick={() => setSelectedServiceDetail(service)}
                    >
                      <CardContent className="p-3">
                        {service.image_url && (
                          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                            <img 
                              src={service.image_url} 
                              alt={service.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                        )}
                        <h3 className="font-semibold text-sm mb-1.5 group-hover:text-primary transition-colors line-clamp-1">
                          {service.name}
                        </h3>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {service.duration_minutes}m
                          </span>
                          <span className="font-bold text-primary">₱{service.price.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reviews - Enhanced */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-gradient-to-b from-accent to-primary rounded-full" />
                  <h2 className="text-3xl font-bold">Customer Reviews</h2>
                </div>
                <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Write a Review
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Write Your Review</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-3">
                        <Label className="text-base">Your Rating</Label>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="transition-transform hover:scale-110"
                            >
                              <Star
                                className={cn(
                                  "w-8 h-8 transition-colors",
                                  star <= (hoverRating || reviewRating)
                                    ? "fill-primary text-primary"
                                    : "fill-muted text-muted"
                                )}
                              />
                            </button>
                          ))}
                          {reviewRating > 0 && (
                            <span className="ml-2 text-sm text-muted-foreground">
                              {reviewRating} {reviewRating === 1 ? "star" : "stars"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="review-comment" className="text-base">
                          Your Review (Optional)
                        </Label>
                        <Textarea
                          id="review-comment"
                          placeholder="Share your experience with this service provider..."
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          rows={5}
                          maxLength={500}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                          {reviewComment.length}/500 characters
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setReviewDialogOpen(false);
                            setReviewRating(0);
                            setReviewComment("");
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSubmitReview}
                          disabled={submittingReview || reviewRating === 0}
                          className="flex-1"
                        >
                          {submittingReview ? "Submitting..." : "Submit Review"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {reviews.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <Star className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review, index) => (
                    <Card 
                      key={review.id}
                      className="hover:shadow-[var(--shadow-card)] transition-all duration-300 animate-fade-in border-l-4 border-l-accent/20"
                      style={{ animationDelay: `${(index + services.length) * 0.1}s` }}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    "w-4 h-4 transition-all duration-200",
                                    i < review.rating
                                      ? "fill-primary text-primary"
                                      : "fill-muted text-muted"
                                  )}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-semibold">{review.profiles_public.full_name}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {new Date(review.created_at).toLocaleDateString()}
                          </Badge>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground leading-relaxed pl-0.5">{review.comment}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Booking Form - Enhanced */}
          <div data-booking-form>
            <Card className="sticky top-4 shadow-[var(--shadow-elegant)] hover:shadow-2xl transition-all duration-300 animate-fade-in border-t-4 border-t-primary overflow-hidden" style={{ animationDelay: '0.2s' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
              <CardHeader className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <CardTitle className="text-2xl">Book Your Service</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">Select your preferred date and time</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBookingFormSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="service">Select Service</Label>
                    <select
                      id="service"
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Choose a service</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} - ₱{service.price}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Date</Label>
                    <div className="space-y-3">
                      <Calendar
                        mode="single"
                        selected={bookingDate}
                        onSelect={setBookingDate}
                        disabled={(date) => date < today || isDateFullyBooked(date)}
                        className={cn("rounded-md border pointer-events-auto")}
                        modifiers={{
                          partiallyBooked: (date) => {
                            const dateString = format(date, "yyyy-MM-dd");
                            const bookedCount = bookedSlots[dateString]?.length || 0;
                            return bookedCount > 0 && bookedCount < totalTimeSlots;
                          },
                          fullyBooked: (date) => isDateFullyBooked(date)
                        }}
                        modifiersStyles={{
                          partiallyBooked: {
                            backgroundColor: 'hsl(var(--primary) / 0.15)',
                            color: 'hsl(var(--primary))',
                            fontWeight: '600',
                            border: '1px solid hsl(var(--primary) / 0.3)'
                          },
                          fullyBooked: {
                            backgroundColor: 'hsl(var(--destructive) / 0.1)',
                            color: 'hsl(var(--muted-foreground))',
                            textDecoration: 'line-through',
                            opacity: '0.5'
                          }
                        }}
                      />
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded border bg-background" />
                          <span className="text-muted-foreground">Available</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded border border-primary/30" style={{ backgroundColor: 'hsl(var(--primary) / 0.15)' }} />
                          <span className="text-muted-foreground">Partially Booked</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded opacity-50" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)' }} />
                          <span className="text-muted-foreground">Fully Booked</span>
                        </div>
                      </div>
                      
                      {/* Time Picker Clock - Always visible */}
                      <div className="space-y-2 pt-2">
                        <Label htmlFor="time">Select Time</Label>
                        <div className="flex justify-center">
                          <TimePickerClock 
                            value={bookingTime || "12:00"} 
                            onChange={setBookingTime}
                            size={200}
                          />
                        </div>
                      </div>
                    </div>
                    {bookingDate && bookedTimesForSelectedDate.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {bookedTimesForSelectedDate.length} of {totalTimeSlots} time slot(s) already booked
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Special Requests (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special requests or notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      maxLength={500}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Contact Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="09XXXXXXXXX"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                      maxLength={13}
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: 09XXXXXXXXX or +639XXXXXXXXX
                    </p>
                  </div>

                  <Button
                    type="submit"
                    variant="hero"
                    className="w-full hover:scale-105 transition-transform duration-200"
                    disabled={booking || services.length === 0 || !bookingDate || !bookingTime}
                  >
                    Confirm Booking
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Booking Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Confirm Your Booking</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Booking Details Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold bg-muted/50">Service</TableCell>
                    <TableCell>{services.find(s => s.id === selectedService)?.name}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold bg-muted/50">Price</TableCell>
                    <TableCell className="text-primary font-bold">
                      ₱{services.find(s => s.id === selectedService)?.price.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold bg-muted/50">Date</TableCell>
                    <TableCell>{bookingDate ? format(bookingDate, "MMMM dd, yyyy") : ""}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold bg-muted/50">Time</TableCell>
                    <TableCell>{bookingTime}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold bg-muted/50">Contact Number</TableCell>
                    <TableCell>{customerPhone}</TableCell>
                  </TableRow>
                  {notes && (
                    <TableRow>
                      <TableCell className="font-semibold bg-muted/50">Notes</TableCell>
                      <TableCell>{notes}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Downpayment Section */}
            <div className="border-t pt-4">
              <div className="p-6 rounded-lg bg-primary/5 border border-primary/10">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-primary" />
                  GCash Downpayment
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Scan the QR code below to make your downpayment via GCash
                </p>
                
                {provider.gcash_qr_code_url ? (
                  <div className="bg-white p-6 rounded-lg mx-auto w-fit shadow-md">
                    <img 
                      src={provider.gcash_qr_code_url} 
                      alt="GCash QR Code" 
                      className="w-64 h-64 object-contain"
                    />
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-lg mx-auto w-fit shadow-md">
                    <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <QrCode className="w-16 h-16 mx-auto text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">QR code not available</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 p-3 bg-background rounded-lg border">
                  <p className="text-sm font-medium mb-2">Payment Instructions:</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Open your GCash app</li>
                    <li>Scan the QR code above</li>
                    <li>Enter the downpayment amount</li>
                    <li>Complete the transaction</li>
                    <li>Take a screenshot of your receipt</li>
                  </ol>
                </div>

                <div className="mt-3 p-2 bg-accent/10 border border-accent/20 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> After payment, please provide your reference number when we contact you.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                  toast.error("Please login to chat");
                  navigate("/login");
                  return;
                }
                setConfirmDialogOpen(false);
                navigate(`/chat?providerId=${id}`);
              }}
              disabled={booking}
              className="gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Chat with Provider
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialogOpen(false)}
              disabled={booking}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmBooking}
              disabled={booking}
              className="gap-2"
            >
              {booking ? "Processing..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Detail Sheet */}
      <Sheet open={!!selectedServiceDetail} onOpenChange={(open) => !open && setSelectedServiceDetail(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {selectedServiceDetail && (
            <>
              <SheetHeader>
                <SheetTitle className="text-2xl">{selectedServiceDetail.name}</SheetTitle>
                <SheetDescription className="sr-only">Service details and information</SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {selectedServiceDetail.image_url && (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted shadow-md">
                    <img 
                      src={selectedServiceDetail.image_url} 
                      alt={selectedServiceDetail.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <span className="font-medium">Price</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">₱{selectedServiceDetail.price.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-accent/5 border border-accent/10">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-5 h-5 text-accent" />
                      <span className="font-medium">Duration</span>
                    </div>
                    <span className="text-lg font-semibold">{selectedServiceDetail.duration_minutes} minutes</span>
                  </div>
                  
                  {selectedServiceDetail.description && (
                    <div className="p-4 rounded-lg bg-card border">
                      <h4 className="font-semibold mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedServiceDetail.description}</p>
                    </div>
                  )}
                </div>
                
                <Button 
                  className="w-full" 
                  variant="hero"
                  onClick={() => {
                    setSelectedService(selectedServiceDetail.id);
                    setSelectedServiceDetail(null);
                    // Scroll to booking form
                    setTimeout(() => {
                      document.querySelector('[data-booking-form]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }}
                >
                  Book This Service
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
