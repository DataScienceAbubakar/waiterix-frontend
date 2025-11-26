import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Leaf, Heart, Star, Plus, Minus } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface MenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
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
  };
  onAddToCart?: (quantity: number) => void;
}

export function MenuItemDialog({
  open,
  onOpenChange,
  item,
  onAddToCart,
}: MenuItemDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const { formatCurrency } = useLanguage();

  const handleAddToCart = () => {
    onAddToCart?.(quantity);
    setQuantity(1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="aspect-video overflow-hidden rounded-lg">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <p className="text-muted-foreground">{item.description}</p>
            <span className="font-semibold text-2xl text-primary shrink-0">
              {formatCurrency(item.price)}
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Dietary Information</h3>
            <div className="flex flex-wrap gap-2">
              {item.spiceLevel && item.spiceLevel > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Flame className="h-4 w-4" />
                  Spice Level: {item.spiceLevel}
                </Badge>
              )}
              {item.isVegan && (
                <Badge variant="secondary" className="gap-1">
                  <Leaf className="h-4 w-4" />
                  Vegan
                </Badge>
              )}
              {item.isVegetarian && !item.isVegan && (
                <Badge variant="secondary" className="gap-1">
                  <Leaf className="h-4 w-4" />
                  Vegetarian
                </Badge>
              )}
              {item.isHalal && (
                <Badge variant="secondary" className="gap-1">
                  <Heart className="h-4 w-4" />
                  Halal
                </Badge>
              )}
              {item.isKosher && (
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-4 w-4" />
                  Kosher
                </Badge>
              )}
            </div>
          </div>

          {item.allergens && item.allergens.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Allergen Information</h3>
              <div className="flex flex-wrap gap-2">
                {item.allergens.map((allergen) => (
                  <Badge key={allergen} variant="outline">
                    {allergen}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                data-testid="button-decrease-quantity"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium" data-testid="text-dialog-quantity">
                {quantity}
              </span>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setQuantity(quantity + 1)}
                data-testid="button-increase-quantity"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={handleAddToCart} className="gap-2" data-testid="button-dialog-add-to-cart">
              <Plus className="h-4 w-4" />
              Add to Cart - {formatCurrency(item.price * quantity)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
