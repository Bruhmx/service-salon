import { Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ServiceProviderCardProps {
  id: string;
  businessName: string;
  description?: string;
  backgroundImageUrl?: string;
  address: string;
  zipCode: string;
  rating: number;
  totalReviews: number;
  isActive: boolean;
}

export const ServiceProviderCard = ({
  id,
  businessName,
  description,
  backgroundImageUrl,
  address,
  zipCode,
  rating,
  totalReviews,
  isActive,
}: ServiceProviderCardProps) => {
  const navigate = useNavigate();

  const handleBookNow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }
    
    navigate(`/provider/${id}`);
  };

  return (
    <Card className="overflow-hidden hover:shadow-[var(--shadow-elegant)] transition-all duration-300 group animate-fade-in hover:-translate-y-1">
      <div className="aspect-[4/3] overflow-hidden bg-muted relative">
        {backgroundImageUrl ? (
          <img
            src={backgroundImageUrl}
            alt={businessName}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 group-hover:from-primary/30 group-hover:to-accent/30 transition-all duration-300">
            <span className="text-4xl font-bold text-primary group-hover:scale-110 transition-transform duration-300">{businessName[0]}</span>
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold">{businessName}</h3>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Available" : "Unavailable"}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center">
            <Star className="w-4 h-4 fill-primary text-primary" />
            <span className="ml-1 font-medium">{rating.toFixed(1)}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
          </span>
        </div>

        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{address}, {zipCode}</span>
        </div>

        {description && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button 
          variant="hero" 
          className="w-full hover:scale-105 transition-transform duration-200"
          onClick={handleBookNow}
        >
          Book Now
        </Button>
      </CardFooter>
    </Card>
  );
};
