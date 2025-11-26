import { MenuItemDialog } from '../MenuItemDialog';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import burgerImg from '@/assets/stock_images/delicious_gourmet_bu_7d89f757.jpg';

export default function MenuItemDialogExample() {
  const [open, setOpen] = useState(false);

  const item = {
    name: 'Classic Burger',
    description: 'Juicy beef patty with lettuce, tomato, pickles, and our special sauce on a toasted brioche bun. Served with crispy fries.',
    price: 14.99,
    image: burgerImg,
    spiceLevel: 1,
    isHalal: true,
    allergens: ['Gluten', 'Dairy', 'Eggs'],
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Item Details</Button>
      <MenuItemDialog
        open={open}
        onOpenChange={setOpen}
        item={item}
        onAddToCart={(qty) => console.log('Added to cart:', qty)}
      />
    </>
  );
}
