import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface RatingDialogProps {
  orderId: string;
  restaurantId: string;
  items: Array<{ id: string; menuItemId: string; name: string; quantity: number }>;
  onClose: () => void;
}

export function RatingDialog({ orderId, restaurantId, items, onClose }: RatingDialogProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState<'items' | 'service'>('items');
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [itemRatings, setItemRatings] = useState<Record<string, number>>({});
  const [serviceRatings, setServiceRatings] = useState({
    foodQuality: 0,
    serviceSpeed: 0,
    cleanliness: 0,
    staffFriendliness: 0,
  });
  const [comment, setComment] = useState('');
  const { toast } = useToast();
  const { t } = useLanguage();

  const createRatingMutation = useMutation({
    mutationFn: async (ratingData: any) => {
      const response = await apiRequest('POST', '/api/ratings', ratingData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit rating');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('thankYou'),
        description: t('ratingSubmittedSuccessfully'),
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (rating: number) => void; label?: string }) => (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-all hover:scale-110 active:scale-95"
            data-testid={`star-${star}`}
          >
            <Star
              className={`h-8 w-8 ${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  const handleNextItem = () => {
    if (currentItemIndex < items.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      setCurrentStep('service');
    }
  };

  const handleSubmit = async () => {
    // Create a rating entry for each menu item
    const ratingPromises = items.map(async (item) => {
      const itemRating = itemRatings[item.menuItemId] || 0;
      if (itemRating === 0) return null; // Skip unrated items

      return createRatingMutation.mutateAsync({
        orderId,
        restaurantId,
        menuItemId: item.menuItemId,
        itemRating,
        serviceRatings: null,
        comment: null,
      });
    });

    // Create one overall service rating
    await createRatingMutation.mutateAsync({
      orderId,
      restaurantId,
      menuItemId: null,
      itemRating: null,
      serviceRatings,
      comment: comment || null,
    });

    await Promise.all(ratingPromises);
  };

  const currentItem = items[currentItemIndex];
  const allItemsRated = items.every(item => itemRatings[item.menuItemId] > 0);
  const allServiceRated = Object.values(serviceRatings).every(rating => rating > 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-rating">
        <DialogHeader>
          <DialogTitle>
            {currentStep === 'items' ? t('rateYourFood') : t('rateOurService')}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'items'
              ? `${t('rateItem')} ${currentItemIndex + 1} ${t('of')} ${items.length}`
              : t('tellUsAboutYourExperience')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {currentStep === 'items' && currentItem && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">{currentItem.name}</h3>
                <StarRating
                  value={itemRatings[currentItem.menuItemId] || 0}
                  onChange={(rating) =>
                    setItemRatings({ ...itemRatings, [currentItem.menuItemId]: rating })
                  }
                />
              </div>

              <div className="flex justify-between gap-2">
                {currentItemIndex > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentItemIndex(currentItemIndex - 1)}
                    data-testid="button-previous-item"
                  >
                    {t('previous')}
                  </Button>
                )}
                <Button
                  onClick={handleNextItem}
                  disabled={!itemRatings[currentItem.menuItemId]}
                  className="ml-auto"
                  data-testid="button-next-item"
                >
                  {currentItemIndex < items.length - 1 ? t('nextItem') : t('rateService')}
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'service' && (
            <div className="space-y-6">
              <StarRating
                label={t('foodQuality')}
                value={serviceRatings.foodQuality}
                onChange={(rating) =>
                  setServiceRatings({ ...serviceRatings, foodQuality: rating })
                }
              />
              <StarRating
                label={t('serviceSpeed')}
                value={serviceRatings.serviceSpeed}
                onChange={(rating) =>
                  setServiceRatings({ ...serviceRatings, serviceSpeed: rating })
                }
              />
              <StarRating
                label={t('cleanliness')}
                value={serviceRatings.cleanliness}
                onChange={(rating) =>
                  setServiceRatings({ ...serviceRatings, cleanliness: rating })
                }
              />
              <StarRating
                label={t('staffFriendliness')}
                value={serviceRatings.staffFriendliness}
                onChange={(rating) =>
                  setServiceRatings({ ...serviceRatings, staffFriendliness: rating })
                }
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('additionalComments')}</label>
                <Textarea
                  placeholder={t('tellUsMoreAboutYourExperience')}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  data-testid="textarea-comment"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('items')}
                  data-testid="button-back-to-items"
                >
                  {t('back')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!allServiceRated || createRatingMutation.isPending}
                  className="ml-auto"
                  data-testid="button-submit-rating"
                >
                  {createRatingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('submitRating')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Listen for custom event to open rating dialog
export function RatingDialogManager() {
  const [dialogProps, setDialogProps] = useState<RatingDialogProps | null>(null);

  useEffect(() => {
    const handleOpenDialog = (event: any) => {
      const { orderId, items, restaurantId } = event.detail;
      setDialogProps({
        orderId,
        restaurantId,
        items,
        onClose: () => setDialogProps(null),
      });
    };

    window.addEventListener('open-rating-dialog', handleOpenDialog);
    return () => window.removeEventListener('open-rating-dialog', handleOpenDialog);
  }, []);

  if (!dialogProps) return null;

  return <RatingDialog {...dialogProps} />;
}
