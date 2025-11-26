import { Button } from "@/components/ui/button";

interface Category {
  value: string;
  label: string;
}

interface CategoryFilterProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => (
        <Button
          key={category.value}
          variant={activeCategory === category.value ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange(category.value)}
          className="shrink-0"
          data-testid={`button-category-${category.value.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {category.label}
        </Button>
      ))}
    </div>
  );
}
