import { MenuItemCard } from '../MenuItemCard';
import burgerImg from '@/assets/stock_images/delicious_gourmet_bu_7d89f757.jpg';

export default function MenuItemCardExample() {
  return (
    <div className="max-w-sm">
      <MenuItemCard
        name="Classic Burger"
        description="Juicy beef patty with lettuce, tomato, and our special sauce"
        price={14.99}
        image={burgerImg}
        spiceLevel={1}
        isHalal={true}
        allergens={["Gluten", "Dairy"]}
        onAddToCart={() => console.log('Added to cart')}
        onClick={() => console.log('Item clicked')}
      />
    </div>
  );
}
