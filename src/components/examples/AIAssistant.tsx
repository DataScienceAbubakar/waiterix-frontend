import { AIAssistant } from '../AIAssistant';
const burgerImg = '/assets/stock_images/delicious_gourmet_bu_7d89f757.jpg';

export default function AIAssistantExample() {
  const mockMenuItems = [
    {
      id: '1',
      name: 'Classic Burger',
      description: 'Juicy beef patty with lettuce, tomato',
      price: 14.99,
      image: burgerImg,
      category: 'Entrees',
      spiceLevel: 1,
      isHalal: true,
      allergens: ['Gluten', 'Dairy'],
    },
  ];

  return (
    <div className="h-screen">
      <AIAssistant
        restaurantId="demo"
        menuItems={mockMenuItems}
        onAddToCart={(item) => console.log('Added to cart:', item)}
      />
    </div>
  );
}
