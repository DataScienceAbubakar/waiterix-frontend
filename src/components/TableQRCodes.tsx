import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Plus, Trash2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TableQRCodesProps {
  restaurantId: string;
  restaurantName: string;
}

interface RestaurantTable {
  id: string;
  tableNumber: string;
  qrCodeUrl?: string;
}

export function TableQRCodes({ restaurantId, restaurantName }: TableQRCodesProps) {
  const { toast } = useToast();
  const [deleteTableId, setDeleteTableId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");

  const { data: tables = [], isLoading } = useQuery<RestaurantTable[]>({
    queryKey: ['/api/restaurant', restaurantId, 'tables'],
    enabled: !!restaurantId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (tableId: string) => {
      await apiRequest('DELETE', `/api/restaurant/${restaurantId}/tables/${tableId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant', restaurantId, 'tables'] });
      toast({
        title: "Table Deleted",
        description: "Table has been removed successfully.",
      });
      setDeleteTableId(null);
    },
  });

  const addMutation = useMutation({
    mutationFn: async (tableNumber: string) => {
      return await apiRequest('POST', `/api/restaurant/${restaurantId}/tables`, {
        tableNumber,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant', restaurantId, 'tables'] });
      toast({
        title: "Table Added",
        description: "New table has been created successfully.",
      });
      setShowAddDialog(false);
      setNewTableNumber("");
    },
  });

  const getTableUrl = (tableNumber: string) => {
    return `${window.location.origin}/menu/${restaurantId}?table=${tableNumber}`;
  };

  const handleDownloadQR = (tableId: string, tableNumber: string) => {
    const canvas = document.getElementById(`qr-code-${tableId}`) as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${restaurantName}-table-${tableNumber}-qr.png`;
      link.href = url;
      link.click();
      toast({
        title: "QR Code Downloaded",
        description: `Table ${tableNumber} QR code has been saved.`,
      });
    }
  };

  const handleAddTable = () => {
    if (newTableNumber.trim()) {
      addMutation.mutate(newTableNumber.trim());
    }
  };

  if (isLoading) {
    return <Card className="p-6">Loading tables...</Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">Table QR Codes</h3>
        <Button
          onClick={() => setShowAddDialog(true)}
          size="sm"
          className="gap-2"
          data-testid="button-add-table"
        >
          <Plus className="h-4 w-4" />
          Add Table
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((table) => (
          <Card key={table.id} className="p-4">
            <div className="flex flex-col items-center space-y-3">
              <h4 className="font-medium">Table {table.tableNumber}</h4>
              <div className="bg-white p-2 rounded-lg">
                <QRCodeCanvas
                  id={`qr-code-${table.id}`}
                  value={getTableUrl(table.tableNumber)}
                  size={150}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center break-all">
                {getTableUrl(table.tableNumber)}
              </p>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => handleDownloadQR(table.id, table.tableNumber)}
                  data-testid={`button-download-qr-${table.id}`}
                >
                  <Download className="h-3 w-3" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteTableId(table.id)}
                  data-testid={`button-delete-table-${table.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Table Dialog */}
      <AlertDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add New Table</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a number or name for the new table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="tableNumber">Table Number</Label>
            <Input
              id="tableNumber"
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              placeholder="e.g., 4, A1, VIP-1"
              data-testid="input-table-number"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-add">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAddTable}
              disabled={!newTableNumber.trim() || addMutation.isPending}
              data-testid="button-confirm-add"
            >
              {addMutation.isPending ? "Adding..." : "Add Table"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTableId} onOpenChange={() => setDeleteTableId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this table? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTableId && deleteMutation.mutate(deleteTableId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
