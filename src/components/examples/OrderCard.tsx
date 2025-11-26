import { OrderCard } from '../OrderCard';

export default function OrderCardExample() {
  return (
    <div className="max-w-md space-y-4">
      <OrderCard
        orderId="1234"
        items={[
          { name: 'Classic Burger', quantity: 2 },
          { name: 'Pasta Carbonara', quantity: 1 },
          { name: 'Cola', quantity: 2 },
        ]}
        total={46.97}
        paymentMethod="online"
        status="new"
        createdAt={new Date(Date.now() - 5 * 60 * 1000)}
        customerNote="No onions please"
      />
      <OrderCard
        orderId="1235"
        items={[
          { name: 'Caesar Salad', quantity: 1 },
        ]}
        total={12.99}
        paymentMethod="cash"
        status="preparing"
        createdAt={new Date(Date.now() - 15 * 60 * 1000)}
      />
    </div>
  );
}
