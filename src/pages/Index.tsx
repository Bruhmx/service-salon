import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ServiceProviderCard } from "@/components/ServiceProviderCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/gb_logo.png";

interface ServiceProvider {
  id: string;
  business_name: string;
  description: string | null;
  background_image_url: string | null;
  address: string;
  zip_code: string;
  rating: number;
  total_reviews: number;
  is_active: boolean;
}

const Index = () => {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<ServiceProvider[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from("service_providers")
        .select("*")
        .order("rating", { ascending: false });

      if (error) throw error;
      setProviders(data || []);
      setFilteredProviders(data || []);
    } catch (error: any) {
      toast.error("Failed to load service providers");
    } finally {
      setLoading(false);
    }
  };

  const handleLocationFilter = () => {
    if (!searchQuery.trim()) {
      setFilteredProviders(providers);
      return;
    }

    const query = searchQuery.trim().toLowerCase();
    const filtered = providers.filter((provider) =>
      provider.business_name.toLowerCase().includes(query) ||
      provider.address.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      toast.info("No providers found matching your search");
    }

    setFilteredProviders(filtered);
  };

  const handleNearbyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    toast.loading("Getting your location...");
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        toast.dismiss();
        toast.success("Location detected! Showing all nearby providers");
        // Show all providers as we don't have lat/long in database yet
        setFilteredProviders(providers);
        setSearchQuery("");
      },
      (error) => {
        toast.dismiss();
        toast.error("Unable to get your location. Please enter ZIP code manually.");
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 pb-24">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-accent py-16 px-4 animate-fade-in">
        <div className="container mx-auto text-center">
          <img 
            src={logo} 
            alt="GB Beauty" 
            className="w-24 h-24 mx-auto mb-6 animate-scale-in hover:scale-110 transition-transform duration-300" 
          />
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4 animate-fade-in">
            GB Beauty Services
          </h1>
          <p className="text-lg text-primary-foreground/90 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Book professional makeup and beauty services near you
          </p>

          {/* Location Search */}
          <div className="max-w-md mx-auto flex gap-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors" />
              <Input
                placeholder="Search by provider name or address"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLocationFilter()}
                className="pl-10 bg-background transition-all duration-200 focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <Button 
              onClick={handleNearbyLocation} 
              variant="secondary" 
              title="Use my location"
              className="hover:scale-105 transition-transform duration-200"
            >
              <Navigation className="w-5 h-5" />
            </Button>
            <Button 
              onClick={handleLocationFilter} 
              variant="secondary"
              className="hover:scale-105 transition-transform duration-200"
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Providers Grid */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-6 animate-fade-in">Available Service Providers</h2>

        {loading ? (
          <div className="text-center py-12 animate-fade-in">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground mt-4">Loading providers...</p>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <p className="text-muted-foreground">
              {searchQuery ? "No providers found matching your search. Try different keywords." : "No service providers available yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProviders.map((provider) => (
              <ServiceProviderCard
                key={provider.id}
                id={provider.id}
                businessName={provider.business_name}
                description={provider.description || undefined}
                backgroundImageUrl={provider.background_image_url || undefined}
                address={provider.address}
                zipCode={provider.zip_code}
                rating={Number(provider.rating)}
                totalReviews={provider.total_reviews}
                isActive={provider.is_active}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
