import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { UploadResult } from "@uppy/core";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import { Upload } from "lucide-react";
import type { MenuItem } from "@/shared/schema";
import { useToast } from "@/hooks/use-toast";

const menuItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.string().min(1, "Price is required"),
  category: z.string().min(1, "Category is required"),
  spiceLevel: z.string().optional(),
  isVegan: z.boolean().default(false),
  isVegetarian: z.boolean().default(false),
  isHalal: z.boolean().default(false),
  isKosher: z.boolean().default(false),
  allergens: z.string().optional(),
  imageUrl: z.string().optional(),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

interface MenuItemFormProps {
  onSubmit: (data: MenuItemFormData) => void;
  onCancel: () => void;
  menuItem?: MenuItem;
}

export function MenuItemForm({ onSubmit, onCancel, menuItem }: MenuItemFormProps) {
  const [imageUrl, setImageUrl] = useState<string | undefined>(menuItem?.imageUrl || undefined);
  const { toast } = useToast();

  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: menuItem?.name || "",
      description: menuItem?.description || "",
      price: menuItem?.price || "",
      category: menuItem?.category || "",
      spiceLevel: menuItem?.spiceLevel || "0",
      isVegan: menuItem?.isVegan || false,
      isVegetarian: menuItem?.isVegetarian || false,
      isHalal: menuItem?.isHalal || false,
      isKosher: menuItem?.isKosher || false,
      allergens: menuItem?.allergens?.join(", ") || "",
      imageUrl: menuItem?.imageUrl || undefined,
    },
  });

  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload");
      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }
      const data = await response.json();
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      console.error("Error getting upload parameters:", error);
      toast({
        title: "Upload Failed",
        description: "Could not prepare image upload. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    try {
      if (result.successful && result.successful.length > 0) {
        const uploadURL = result.successful[0].uploadURL;
        
        if (menuItem?.id) {
          // Updating existing menu item image
          const response = await apiRequest("PUT", `/api/menu-items/${menuItem.id}/image`, {
            imageUrl: uploadURL,
          });
          
          // Read response body exactly once
          let data;
          try {
            data = await response.json();
          } catch {
            // No JSON body (e.g., 204 No Content)
            data = null;
          }
          
          // Now branch on response.ok
          if (!response.ok) {
            const errorMessage = data?.error || data?.message || "Failed to update image";
            throw new Error(errorMessage);
          }
          
          // Success - use parsed data or fall back to uploadURL
          const updatedImageUrl = data?.imageUrl || uploadURL;
          setImageUrl(updatedImageUrl);
          
          toast({
            title: "Image Updated",
            description: "Menu item image has been successfully updated",
          });
        } else {
          // New menu item
          setImageUrl(uploadURL);
          
          toast({
            title: "Image Uploaded",
            description: "Image uploaded successfully. Save the item to complete.",
          });
        }
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Could not upload image. Please try again.",
        variant: "destructive",
      });
      // Re-throw so Uppy knows the upload failed
      throw error;
    }
  };

  const handleFormSubmit = (data: MenuItemFormData) => {
    // Convert comma-separated allergens string to array
    const allergensArray = data.allergens
      ? data.allergens.split(',').map(a => a.trim()).filter(Boolean)
      : [];
    
    onSubmit({
      ...data,
      allergens: allergensArray as any,
      imageUrl,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Classic Burger" data-testid="input-item-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description *</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Delicious burger with fresh ingredients"
                  data-testid="input-item-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Item Image</FormLabel>
          <div className="space-y-4">
            {imageUrl && (
              <div className="relative w-full max-w-xs">
                <img 
                  src={imageUrl} 
                  alt="Menu item" 
                  className="w-full h-48 object-cover rounded-md"
                  data-testid="img-menu-item-preview"
                />
              </div>
            )}
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={10485760}
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              buttonClassName="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {imageUrl ? "Change Image" : "Upload Image"}
            </ObjectUploader>
          </div>
          <FormDescription>
            Upload a high-quality image of the menu item
          </FormDescription>
        </FormItem>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price *</FormLabel>
                <FormControl>
                  <Input {...field} type="number" step="0.01" placeholder="14.99" data-testid="input-item-price" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Appetizers, Main Course, Desserts" data-testid="input-item-category" />
                </FormControl>
                <FormDescription>
                  Create your own categories or use common ones like Appetizers, Main Course, Sides, Drinks, Desserts
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="spiceLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Spice Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-spice-level">
                    <SelectValue placeholder="Select spice level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">Not Spicy</SelectItem>
                  <SelectItem value="1">Mild</SelectItem>
                  <SelectItem value="2">Medium</SelectItem>
                  <SelectItem value="3">Hot</SelectItem>
                  <SelectItem value="4">Very Hot</SelectItem>
                  <SelectItem value="5">Extreme</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <FormLabel>Dietary Options</FormLabel>
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="isVegan"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-vegan"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer">Vegan</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isVegetarian"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-vegetarian"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer">Vegetarian</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isHalal"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-halal"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer">Halal</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isKosher"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-kosher"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer">Kosher</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="allergens"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allergens</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Gluten, Dairy, Nuts (comma separated)" data-testid="input-allergens" />
              </FormControl>
              <FormDescription>
                Enter allergens separated by commas
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" className="flex-1" data-testid="button-save-item">
            Save Item
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1" data-testid="button-cancel">
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
