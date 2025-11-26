import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign, Hash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface OrderCardProps {
  orderId: string;
  items: { name: string; quantity: number; customerNote?: string }[];
  total: number;
  tip?: number;
  paymentMethod: 'online' | 'cash';
  status: 'new' | 'preparing' | 'ready' | 'completed';
  createdAt: Date;
  customerNote?: string;
  tableNumber?: string;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

export function OrderCard({
  orderId,
  items,
  total,
  tip,
  paymentMethod,
  status,
  createdAt,
  customerNote,
  tableNumber,
  onStatusChange,
}: OrderCardProps) {
  const { formatCurrency } = useLanguage();
  const statusColors = {
    new: 'bg-blue-500',
    preparing: 'bg-yellow-500',
    ready: 'bg-green-500',
    completed: 'bg-gray-500',
  };

  const getNextStatus = () => {
    const statusFlow = ['new', 'preparing', 'ready', 'completed'];
    const currentIndex = statusFlow.indexOf(status);
    if (currentIndex < statusFlow.length - 1) {
      return statusFlow[currentIndex + 1];
    }
    return null;
  };

  const nextStatus = getNextStatus();

  return (
    <Card className="p-4" data-testid={`card-order-${orderId}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold" data-testid={`text-order-id-${orderId}`}>Order #{orderId}</h4>
            {tableNumber && (
              <Badge variant="outline" className="flex items-center gap-1" data-testid={`badge-table-${orderId}`}>
                <Hash className="h-3 w-3" />
                Table {tableNumber}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </div>
        </div>
        <Badge className={statusColors[status]} data-testid={`badge-status-${orderId}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      </div>

      <div className="space-y-2 mb-3">
        {items.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="text-sm">
              <span className="font-medium">{item.quantity}x</span> {item.name}
            </div>
            {item.customerNote && (
              <p className="text-xs text-muted-foreground italic pl-6" data-testid={`text-item-note-${index}`}>
                Note: {item.customerNote}
              </p>
            )}
          </div>
        ))}
      </div>

      {customerNote && (
        <div className="bg-muted p-2 rounded-md mb-3">
          <p className="text-sm font-bold text-red-600 dark:text-red-400">Note: {customerNote}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span className="font-semibold" data-testid={`text-order-total-${orderId}`}>{formatCurrency(total)}</span>
          </div>
          {tip && tip > 0 && (
            <span className="text-xs text-muted-foreground" data-testid={`text-order-tip-${orderId}`}>
              Includes {formatCurrency(tip)} tip
            </span>
          )}
        </div>
        <Badge variant={paymentMethod === 'online' ? 'default' : 'outline'} data-testid={`badge-payment-${orderId}`}>
          {paymentMethod === 'online' ? 'Paid Online' : 'Cash'}
        </Badge>
      </div>

      {onStatusChange && nextStatus && (
        <div className="mt-3 pt-3 border-t">
          <Button
            size="sm"
            className="w-full"
            onClick={() => onStatusChange(orderId, nextStatus)}
            data-testid={`button-update-status-${orderId}`}
          >
            Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
          </Button>
        </div>
      )}
    </Card>
  );
}
