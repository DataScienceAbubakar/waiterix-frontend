import { CartDrawer } from '../CartDrawer';
import { useState } from 'react';
import burgerImg from '@/assets/stock_images/delicious_gourmet_bu_7d89f757.jpg';
import pastaImg from '@/assets/stock_images/appetizing_pasta_dis_63bd7595.jpg';

export default function CartDrawerExample() {
  const [items, setItems] = useState([
    { id: '1', name: 'Classic Burger', price: 14.99, quantity: 2, image: burgerImg },
    { id: '2', name: 'Pasta Carbonara', price: 16.99, quantity: 1, image: pastaImg },
  ]);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online');

  return (
    <CartDrawer
      items={items}
      onUpdateQuantity={(id, qty) => {
        if (qty === 0) {
          setItems(items.filter(item => item.id !== id));
        } else {
          setItems(items.map(item => item.id === id ? { ...item, quantity: qty } : item));
        }
      }}
      onRemoveItem={(id) => setItems(items.filter(item => item.id !== id))}
      paymentMethod={paymentMethod}
      onPaymentMethodChange={setPaymentMethod}
      onCheckout={() => console.log('Checkout clicked', { items, paymentMethod })}
    />
  );
}
