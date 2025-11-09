import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/gb_logo.png";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Equipment {
  id: string;
  name: string;
  description: string;
  price_per_day: number;
  image_url: string;
  is_available: boolean;
  provider_id: string | null;
}

interface Provider {
  id: string;
  gcash_qr_code_url: string | null;
}

export default function Renting() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEquipment(data || []);
    } catch (error: any) {
      toast.error("Failed to load equipment");
    } finally {
      setLoading(false);
    }
  };

  const filteredEquipment = equipment.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRentNow = async (item: Equipment) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }
    
    setSelectedEquipment(item);
    
    // Fetch provider's GCash QR code
    if (item.provider_id) {
      const { data: provider } = await supabase
        .from("service_providers")
        .select("id, gcash_qr_code_url")
        .eq("id", item.provider_id)
        .single();
      
      if (provider) {
        setSelectedProvider(provider);
      }
    }
    
    setDialogOpen(true);
  };

  const calculateTotalPrice = () => {
    if (!startDate || !endDate || !selectedEquipment) return 0;
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return days * selectedEquipment.price_per_day;
  };

  const handleSubmitRental = async () => {
    if (!selectedEquipment || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (endDate <= startDate) {
      toast.error("End date must be after start date");
      return;
    }

    // Show confirmation dialog with QR code
    setDialogOpen(false);
    setConfirmDialogOpen(true);
  };

  const handleConfirmRental = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) {
        toast.error("Profile not found");
        return;
      }

      const totalPrice = calculateTotalPrice();

      const { error } = await supabase
        .from("equipment_rentals")
        .insert({
          customer_id: profile.id,
          equipment_id: selectedEquipment!.id,
          provider_id: selectedEquipment!.provider_id,
          rental_start_date: format(startDate!, "yyyy-MM-dd"),
          rental_end_date: format(endDate!, "yyyy-MM-dd"),
          total_price: totalPrice,
          notes: notes || null,
          status: "pending"
        });

      if (error) throw error;

      toast.success("Rental request submitted successfully! Please proceed with the downpayment.");
      setConfirmDialogOpen(false);
      setStartDate(undefined);
      setEndDate(undefined);
      setNotes("");
      setSelectedEquipment(null);
      setSelectedProvider(null);
    } catch (error: any) {
      toast.error("Failed to submit rental request");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 pb-24">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <img src={logo} alt="GB Beauty" className="w-16 h-16" />
          <div>
            <h1 className="text-3xl font-bold">Equipment Renting</h1>
            <p className="text-muted-foreground">Rent professional beauty equipment</p>
          </div>
        </div>

        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading equipment...</p>
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No equipment available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEquipment.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-[var(--shadow-elegant)] transition-all">
                <div className="aspect-square overflow-hidden bg-muted">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                      <span className="text-4xl font-bold text-primary">{item.name[0]}</span>
                    </div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-1">{item.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                  <p className="text-2xl font-bold text-primary">₱{item.price_per_day.toFixed(2)}/day</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.is_available ? "Available" : "Currently rented"}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="hero" 
                    className="w-full" 
                    disabled={!item.is_available}
                    onClick={() => handleRentNow(item)}
                  >
                    {item.is_available ? "Rent Now" : "Not Available"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Rent {selectedEquipment?.name}</DialogTitle>
            <DialogDescription>
              Fill in the rental details below. We'll process your request shortly.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4 overflow-y-auto pr-2">
            <div className="grid gap-2">
              <Label htmlFor="start-date">Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="end-date">End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => !startDate || date <= startDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {startDate && endDate && selectedEquipment && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">Total Duration</p>
                <p className="text-lg font-semibold">
                  {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
                <p className="text-sm text-muted-foreground mt-2">Total Price</p>
                <p className="text-2xl font-bold text-primary">
                  ₱{calculateTotalPrice().toFixed(2)}
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special requests or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-auto">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRental} disabled={!startDate || !endDate}>
              Continue to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog with GCash QR Code */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Confirm Rental & Downpayment</DialogTitle>
            <DialogDescription>
              Please scan the QR code below to make your downpayment via GCash
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
            <div className="rounded-lg bg-muted p-3">
              <h3 className="font-semibold text-sm mb-2">Rental Summary</h3>
              <div className="space-y-1 text-xs sm:text-sm">
                <p><span className="text-muted-foreground">Equipment:</span> {selectedEquipment?.name}</p>
                <p><span className="text-muted-foreground">Duration:</span> {startDate && endDate && Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days</p>
                <p><span className="text-muted-foreground">Start Date:</span> {startDate && format(startDate, "PPP")}</p>
                <p><span className="text-muted-foreground">End Date:</span> {endDate && format(endDate, "PPP")}</p>
                <p className="text-base sm:text-lg font-bold text-primary mt-2">
                  Total: ₱{calculateTotalPrice().toFixed(2)}
                </p>
              </div>
            </div>

            {selectedProvider?.gcash_qr_code_url ? (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">GCash Payment QR Code</Label>
                <div className="border-2 border-primary rounded-lg p-3 bg-white">
                  <img 
                    src={selectedProvider.gcash_qr_code_url} 
                    alt="GCash QR Code" 
                    className="w-full max-w-[160px] mx-auto"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Scan this QR code with your GCash app to complete the downpayment
                </p>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Provider has not set up GCash payment yet. Please contact them directly for payment instructions.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setConfirmDialogOpen(false);
                setDialogOpen(true);
              }}
            >
              Back
            </Button>
            <Button onClick={handleConfirmRental} disabled={submitting}>
              {submitting ? "Submitting..." : "Confirm Rental"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
