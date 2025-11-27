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
      className="overflow-hidden shadow-card-hover glass-card group cursor-pointer relative"
      onClick={onClick}
      data-testid={`card-menu-item-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      <div className="aspect-[4/3] overflow-hidden relative">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
            <Plus className="h-4 w-4 text-primary" />
          </div>
        </div>
      </div>
      <div className="p-6 relative z-10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-bold text-lg group-hover:text-primary transition-colors leading-tight" data-testid={`text-item-name-${name.toLowerCase().replace(/\s+/g, '-')}`}>
            {name}
          </h3>
          <div className="text-right shrink-0">
            <span className="font-bold text-xl gradient-text" data-testid={`text-item-price-${name.toLowerCase().replace(/\s+/g, '-')}`}>
              {formatCurrency(price)}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
          {description}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {typeof spiceLevel === 'number' && spiceLevel > 0 && (
            <Badge variant="secondary" className="gap-1 bg-red-100 text-red-700 border-red-200 hover:bg-red-200 transition-colors">
              <Flame className="h-3 w-3" />
              {Array(spiceLevel).fill("🌶").join("")}
            </Badge>
          )}
          {isVegan && (
            <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 border-green-200 hover:bg-green-200 transition-colors">
              <Leaf className="h-3 w-3" />
              Vegan
            </Badge>
          )}
          {isVegetarian && !isVegan && (
            <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 border-green-200 hover:bg-green-200 transition-colors">
              <Leaf className="h-3 w-3" />
              Vegetarian
            </Badge>
          )}
          {isHalal && (
            <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 transition-colors">
              <Heart className="h-3 w-3" />
              Halal
            </Badge>
          )}
          {isKosher && (
            <Badge variant="secondary" className="gap-1 bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 transition-colors">
              <Star className="h-3 w-3" />
              Kosher
            </Badge>
          )}
        </div>
        {allergens && allergens.length > 0 && (
          <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs text-yellow-800 font-medium">
              ⚠️ Allergens: {allergens.join(", ")}
            </p>
          </div>
        )}
        <Button
          className="w-full gap-2 btn-glow hover-lift font-semibold"
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
