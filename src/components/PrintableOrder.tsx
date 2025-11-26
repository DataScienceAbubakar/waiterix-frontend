import { format } from "date-fns";
import type { Order, OrderItem } from "@/shared/schema";
import { useLanguage } from "@/contexts/LanguageContext";

interface PrintableOrderProps {
  order: Order;
  items: OrderItem[];
  tableNumber?: string | null;
  restaurantName?: string;
}

export function PrintableOrder({ order, items, tableNumber, restaurantName }: PrintableOrderProps) {
  const { formatCurrency } = useLanguage();
  return (
    <div className="printable-order hidden print:block">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .printable-order,
            .printable-order * {
              visibility: visible;
            }
            .printable-order {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
              color: black;
              padding: 20px;
            }
            @page {
              margin: 10mm;
            }
          }
        `}
      </style>

      <div className="max-w-md mx-auto text-black bg-white">
        {/* Header */}
        <div className="text-center mb-6 pb-4 border-b-2 border-black">
          {restaurantName && (
            <h1 className="text-2xl font-bold mb-2">{restaurantName}</h1>
          )}
          <h2 className="text-xl font-semibold">ORDER RECEIPT</h2>
        </div>

        {/* Order Info */}
        <div className="mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Order ID:</span>
            <span className="font-mono">{order.id.substring(0, 8).toUpperCase()}</span>
          </div>
          {tableNumber && (
            <div className="flex justify-between text-sm">
              <span className="font-semibold">Table:</span>
              <span>{tableNumber}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Date:</span>
            <span>{format(new Date(order.createdAt), "MMM dd, yyyy")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Time:</span>
            <span>{format(new Date(order.createdAt), "hh:mm a")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Status:</span>
            <span className="uppercase font-bold">{order.status}</span>
          </div>
        </div>

        {/* Items */}
        <div className="mb-6 pb-4 border-b-2 border-dashed border-gray-400">
          <h3 className="font-bold mb-3 text-lg">ITEMS</h3>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between">
                  <div className="flex-1">
                    <span className="font-semibold">{item.quantity}x</span>{" "}
                    <span>{item.name}</span>
                  </div>
                  <span className="font-mono">{formatCurrency(parseFloat(item.price))}</span>
                </div>
                {item.customerNote && (
                  <div className="ml-6 mt-1 text-sm italic text-gray-700">
                    Note: {item.customerNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Customer Note */}
        {order.customerNote && (
          <div className="mb-6 pb-4 border-b-2 border-dashed border-gray-400">
            <h3 className="font-bold mb-2">CUSTOMER NOTE</h3>
            <p className="text-sm font-semibold bg-gray-100 p-3 rounded border-2 border-gray-800">
              {order.customerNote}
            </p>
          </div>
        )}

        {/* Totals */}
        <div className="mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span className="font-mono">{formatCurrency(parseFloat(order.subtotal))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax:</span>
            <span className="font-mono">{formatCurrency(parseFloat(order.tax))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tip:</span>
            <span className="font-mono">{formatCurrency(parseFloat(order.tip))}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-black">
            <span>TOTAL:</span>
            <span className="font-mono">{formatCurrency(parseFloat(order.total))}</span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="mb-6 pb-4 border-b-2 border-dashed border-gray-400">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Payment Method:</span>
            <span className="uppercase">{order.paymentMethod}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Payment Status:</span>
            <span className="uppercase font-bold">{order.paymentStatus}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600">
          <p>Thank you for your order!</p>
          <p className="mt-2">Printed: {format(new Date(), "MMM dd, yyyy hh:mm a")}</p>
        </div>
      </div>
    </div>
  );
}
