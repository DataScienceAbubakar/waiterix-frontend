import { RestaurantQRCode } from '../RestaurantQRCode';
import { Toaster } from '@/components/ui/toaster';

export default function RestaurantQRCodeExample() {
  return (
    <>
      <div className="max-w-md">
        <RestaurantQRCode
          restaurantId="demo-restaurant-123"
          restaurantName="Demo Restaurant"
        />
      </div>
      <Toaster />
    </>
  );
}
