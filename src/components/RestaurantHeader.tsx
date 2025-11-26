import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Clock } from "lucide-react";

interface RestaurantHeaderProps {
  name: string;
  description?: string;
  image?: string;
  address?: string;
  phone?: string;
  hours?: string;
}

export function RestaurantHeader({
  name,
  description,
  image,
  address,
  phone,
  hours,
}: RestaurantHeaderProps) {
  return (
    <div className="relative">
      {image && (
        <div className="relative h-48 md:h-64 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 p-6 z-20 text-white">
            <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-restaurant-name">{name}</h1>
            {description && (
              <p className="text-white/90 max-w-2xl">{description}</p>
            )}
          </div>
        </div>
      )}
      
      {!image && (
        <div className="py-8 px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-restaurant-name">{name}</h1>
          {description && (
            <p className="text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>
      )}

      {(address || phone || hours) && (
        <div className="border-b bg-card">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-4">
              {address && (
                <Badge variant="secondary" className="gap-2 py-2">
                  <MapPin className="h-4 w-4" />
                  {address}
                </Badge>
              )}
              {phone && (
                <Badge variant="secondary" className="gap-2 py-2">
                  <Phone className="h-4 w-4" />
                  {phone}
                </Badge>
              )}
              {hours && (
                <Badge variant="secondary" className="gap-2 py-2">
                  <Clock className="h-4 w-4" />
                  {hours}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
