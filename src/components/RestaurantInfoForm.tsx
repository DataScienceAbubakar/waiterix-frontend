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
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import { ImagePlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { languages, Language } from "@/lib/translations";
import { countries } from "@/lib/countries";

const baseRestaurantInfoSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  phone: z.string().optional(),
  hours: z.string().optional(),
  coverImageUrl: z.string().optional(),
  defaultLanguage: z.string().default('en'),
});

const securityFieldsSchema = z.object({
  adminPasscode: z.string().regex(/^\d{6}$/, "Admin passcode must be exactly 6 digits"),
  securityQuestion1: z.string().min(1, "Security question 1 is required"),
  securityAnswer1: z.string().min(1, "Security answer 1 is required"),
  securityQuestion2: z.string().min(1, "Security question 2 is required"),
  securityAnswer2: z.string().min(1, "Security answer 2 is required"),
});

const restaurantInfoWithSecuritySchema = baseRestaurantInfoSchema.merge(securityFieldsSchema);

type RestaurantInfoFormData = z.infer<typeof restaurantInfoWithSecuritySchema>;

interface RestaurantInfoFormProps {
  restaurantId?: string;
  initialData?: Partial<RestaurantInfoFormData>;
  onSubmit: (data: any) => void;
  showSecurityFields?: boolean;
}

export function RestaurantInfoForm({ restaurantId, initialData, onSubmit, showSecurityFields = true }: RestaurantInfoFormProps) {
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>(initialData?.coverImageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  const schema = showSecurityFields ? restaurantInfoWithSecuritySchema : baseRestaurantInfoSchema;
  
  const form = useForm<RestaurantInfoFormData>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      address: initialData?.address || "",
      city: (initialData as any)?.city || "",
      country: (initialData as any)?.country || "",
      phone: initialData?.phone || "",
      hours: initialData?.hours || "",
      coverImageUrl: initialData?.coverImageUrl || "",
      defaultLanguage: (initialData as any)?.defaultLanguage || "en",
      ...(showSecurityFields && {
        adminPasscode: "",
        securityQuestion1: "",
        securityAnswer1: "",
        securityQuestion2: "",
        securityAnswer2: "",
      }),
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest('POST', '/api/objects/upload', {});
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (!restaurantId) {
      toast({
        title: "Error",
        description: "Cannot upload cover image: Restaurant ID is missing",
        variant: "destructive",
      });
      return;
    }

    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      
      setIsUploading(true);
      try {
        const response = await apiRequest('PUT', `/api/restaurant/${restaurantId}/cover-image`, {
          coverImageUrl: uploadURL,
        });
        const data = await response.json();
        
        setCoverImageUrl(data.coverImageUrl);
        form.setValue('coverImageUrl', data.coverImageUrl);
        
        toast({
          title: "Success",
          description: "Cover image uploaded successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to set cover image",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleFormSubmit = (data: RestaurantInfoFormData) => {
    onSubmit({
      ...data,
      coverImageUrl,
    });
  };

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">Restaurant Information</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Restaurant Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="The Golden Bistro" data-testid="input-restaurant-name" />
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
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Brief description of your restaurant"
                    data-testid="input-restaurant-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="123 Main Street" data-testid="input-restaurant-address" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="New York" 
                      data-testid="input-restaurant-city"
                      disabled={!!initialData?.city}
                      className={initialData?.city ? "bg-muted cursor-not-allowed" : ""}
                    />
                  </FormControl>
                  {initialData?.city && (
                    <FormDescription className="text-xs text-muted-foreground">
                      City cannot be changed once set
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={!!initialData?.country}
                  >
                    <FormControl>
                      <SelectTrigger 
                        data-testid="select-restaurant-country"
                        className={initialData?.country ? "bg-muted cursor-not-allowed" : ""}
                      >
                        <SelectValue placeholder="Select a country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.name} data-testid={`country-option-${country.code}`}>
                          <span className="flex items-center gap-2">
                            <span>{country.flag}</span>
                            <span>{country.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    {initialData?.country 
                      ? "Country cannot be changed once set (required for payment processing)"
                      : "Required for payment processing"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="(555) 123-4567" data-testid="input-restaurant-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Operating Hours</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Mon-Sun: 11AM - 10PM" data-testid="input-restaurant-hours" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="defaultLanguage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Language</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-default-language">
                      <SelectValue placeholder="Select a language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code} data-testid={`language-option-${lang.code}`}>
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.nativeName}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  This will be the default language shown to customers when they scan your QR code
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {showSecurityFields && (
            <div className="border-t pt-6 mt-6">
              <h4 className="font-semibold text-base mb-4">Admin Security Setup</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Set up your admin passcode and security questions for account recovery
              </p>

              <FormField
                control={form.control}
                name="adminPasscode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Passcode (6 digits) *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="password" 
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456" 
                        data-testid="input-admin-passcode" 
                      />
                    </FormControl>
                    <FormDescription>
                      You'll use this to access the admin panel and kitchen dashboard
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="securityQuestion1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security Question 1 *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., What was your first pet's name?" 
                        data-testid="input-security-question-1" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="securityAnswer1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Answer 1 *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Your answer (case-insensitive)" 
                        data-testid="input-security-answer-1" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="securityQuestion2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security Question 2 *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., What city were you born in?" 
                        data-testid="input-security-question-2" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="securityAnswer2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Answer 2 *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Your answer (case-insensitive)" 
                        data-testid="input-security-answer-2" 
                      />
                    </FormControl>
                    <FormDescription>
                      Once set, security questions cannot be changed for security reasons
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {restaurantId && (
            <div className="space-y-4">
              <div>
                <FormLabel>Cover Image</FormLabel>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a cover image for your restaurant
                </p>
              </div>
              
              {coverImageUrl && (
                <div className="relative w-full aspect-[21/9] rounded-lg overflow-hidden border">
                  <img
                    src={coverImageUrl}
                    alt="Restaurant cover"
                    className="w-full h-full object-cover"
                    data-testid="img-restaurant-cover"
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
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4 mr-2" />
                    {coverImageUrl ? 'Change Cover Image' : 'Upload Cover Image'}
                  </>
                )}
              </ObjectUploader>
            </div>
          )}

          <Button type="submit" className="w-full" data-testid="button-save-info">
            Save Information
          </Button>
        </form>
      </Form>
    </Card>
  );
}
