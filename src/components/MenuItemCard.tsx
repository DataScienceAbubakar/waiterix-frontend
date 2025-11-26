import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Flame, Leaf, Heart, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface MenuItemCardProps {
  name: string;
  description: string;
  price: number;
  image: string;
  spiceLevel?: number;
  isVegan?: boolean;
  isVegetarian?: boolean;
  isHalal?: boolean;
  isKosher?: boolean;
  allergens?: string[];
  onAddToCart?: () => void;
  onClick?: () => void;
}

export function MenuItemCard({
  name,
  description,
  price,
  image,
  spiceLevel,
  isVegan,
  isVegetarian,
  isHalal,
  isKosher,
  allergens,
  onAddToCart,
  onClick,
}: MenuItemCardProps) {
  const { formatCurrency } = useLanguage();
  return (
    <Card 
      className="overflow-hidden hover-elevate cursor-pointer"
      onClick={onClick}
      data-testid={`card-menu-item-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-lg" data-testid={`text-item-name-${name.toLowerCase().replace(/\s+/g, '-')}`}>{name}</h3>
          <span className="font-semibold text-xl text-primary shrink-0" data-testid={`text-item-price-${name.toLowerCase().replace(/\s+/g, '-')}`}>
            {formatCurrency(price)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {description}
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {typeof spiceLevel === 'number' && spiceLevel > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Flame className="h-3 w-3" />
              {Array(spiceLevel).fill("🌶").join("")}
            </Badge>
          )}
          {isVegan && (
            <Badge variant="secondary" className="gap-1">
              <Leaf className="h-3 w-3" />
              Vegan
            </Badge>
          )}
          {isVegetarian && !isVegan && (
            <Badge variant="secondary" className="gap-1">
              <Leaf className="h-3 w-3" />
              Vegetarian
            </Badge>
          )}
          {isHalal && (
            <Badge variant="secondary" className="gap-1">
              <Heart className="h-3 w-3" />
              Halal
            </Badge>
          )}
          {isKosher && (
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3" />
              Kosher
            </Badge>
          )}
        </div>
        {allergens && allergens.length > 0 && (
          <p className="text-xs text-muted-foreground mb-3">
            Allergens: {allergens.join(", ")}
          </p>
        )}
        <Button
          className="w-full gap-2"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart?.();
          }}
          data-testid={`button-add-to-cart-${name.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <Plus className="h-4 w-4" />
          Add to Cart
        </Button>
      </div>
    </Card>
  );
}
