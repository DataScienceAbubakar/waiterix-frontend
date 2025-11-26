import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MenuItemsCSVUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface PreviewItem {
  name: string;
  description: string;
  price: string;
  category: string;
  isVegan: boolean;
  isVegetarian: boolean;
  isHalal: boolean;
  isKosher: boolean;
  spiceLevel: string | null;
  allergens: string[];
  available: boolean;
  imageUrl: string | null;
}

interface PreviewResponse {
  items: PreviewItem[];
  errors: string[];
  totalRows: number;
  validRows: number;
}

interface ImportResponse {
  success: boolean;
  count: number;
  items: any[];
  errors?: string[];
}

export function MenuItemsCSVUpload({ open, onOpenChange, onImportComplete }: MenuItemsCSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(null);
    setIsProcessing(true);

    try {
      const text = await selectedFile.text();
      
      // Validate it's actually CSV
      const parsed = Papa.parse(text, { header: true, preview: 1 });
      if (parsed.errors.length > 0) {
        toast({
          title: "Invalid CSV file",
          description: "The file could not be parsed as CSV",
          variant: "destructive",
        });
        setFile(null);
        setIsProcessing(false);
        return;
      }

      // Send to backend for validation and preview
      const rawResponse = await apiRequest('POST', '/api/menu-items/import/preview', {
        csvData: text,
      });
      const response = await rawResponse.json() as PreviewResponse;

      setPreview(response);
      
      if (response.errors.length > 0) {
        toast({
          title: "Validation errors found",
          description: `${response.validRows} of ${response.totalRows} rows are valid`,
          variant: "default",
        });
      } else {
        toast({
          title: "CSV validated",
          description: `${response.validRows} items ready to import`,
        });
      }
    } catch (error) {
      console.error("Error processing CSV:", error);
      toast({
        title: "Error processing CSV",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive",
      });
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!preview || preview.validRows === 0) return;

    setIsImporting(true);
    try {
      const rawResponse = await apiRequest('POST', '/api/menu-items/import/confirm', {
        items: preview.items,
      });
      const result = await rawResponse.json() as ImportResponse;

      // Check if any items were actually created
      if (result.count === 0) {
        toast({
          title: "Import failed",
          description: result.errors && result.errors.length > 0 
            ? `All items failed: ${result.errors[0]}` 
            : "No items were imported. Check the data format.",
          variant: "destructive",
        });
        return;
      }

      // Some or all items succeeded
      const hasErrors = result.errors && result.errors.length > 0;
      
      if (hasErrors) {
        // Partial success
        toast({
          title: "Import partially successful",
          description: `${result.count} items imported, ${result.errors!.length} failed. Check console for details.`,
          variant: "default",
        });
        console.error("Import errors:", result.errors);
      } else {
        // Complete success
        toast({
          title: "Import successful",
          description: `${result.count} menu items imported successfully`,
        });
      }

      onImportComplete();
      handleClose();
    } catch (error) {
      console.error("Error importing menu items:", error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import items",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setIsProcessing(false);
    setIsImporting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Menu Items from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import menu items. Download your existing items first to see the correct format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <label htmlFor="csv-upload" className="text-sm font-medium">
              Select CSV File
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isProcessing || isImporting}
                data-testid="input-csv-file"
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {file.name}
                </div>
              )}
            </div>
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing CSV file...
            </div>
          )}

          {/* Validation Errors */}
          {preview && preview.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">
                  Found {preview.errors.length} validation error(s):
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {preview.errors.slice(0, 10).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {preview.errors.length > 10 && (
                    <li>... and {preview.errors.length - 10} more</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Valid Items Summary */}
          {preview && preview.validRows > 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>{preview.validRows}</strong> valid items ready to import
                {preview.errors.length > 0 && ` (${preview.errors.length} errors will be skipped)`}
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Table */}
          {preview && preview.items.length > 0 && (
            <div className="border rounded-md">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Dietary</TableHead>
                      <TableHead>Spice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.items.slice(0, 50).map((item, i) => (
                      <TableRow key={i} data-testid={`preview-row-${i}`}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>${item.price}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-sm">
                          {[
                            item.isVegan && 'Vegan',
                            item.isVegetarian && 'Vegetarian',
                            item.isHalal && 'Halal',
                            item.isKosher && 'Kosher',
                          ].filter(Boolean).join(', ') || '-'}
                        </TableCell>
                        <TableCell>
                          {item.spiceLevel || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {preview.items.length > 50 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          ... and {preview.items.length - 50} more items
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* CSV Format Help */}
          {!file && (
            <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
              <div className="font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4" />
                CSV Format Guide
              </div>
              <p>Required columns: name, price, category</p>
              <p>Optional columns: description, isVegan, isVegetarian, isHalal, isKosher, spiceLevel, allergens, available, imageUrl</p>
              <p className="text-muted-foreground">
                Tip: Download your existing menu items to see the exact format
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing || isImporting}
            data-testid="button-cancel-import"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!preview || preview.validRows === 0 || isImporting}
            data-testid="button-confirm-import"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Importing...
              </>
            ) : (
              <>
                Import {preview?.validRows || 0} Items
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
