import { RestaurantHeader } from '../RestaurantHeader';
import restaurantImg from '@/assets/stock_images/restaurant_interior__df0b7770.jpg';

export default function RestaurantHeaderExample() {
  return (
    <RestaurantHeader
      name="The Golden Bistro"
      description="Experience culinary excellence with our chef's signature dishes"
      image={restaurantImg}
      address="123 Main Street, Downtown"
      phone="(555) 123-4567"
      hours="Mon-Sun: 11AM - 10PM"
    />
  );
}
