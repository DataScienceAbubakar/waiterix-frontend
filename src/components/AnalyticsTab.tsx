import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, MessageSquare, Utensils, Clock, Sparkles, Users, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Rating {
  id: string;
  orderId: string;
  restaurantId: string;
  menuItemId: string | null;
  itemRating: number | null;
  serviceRatings: {
    foodQuality?: number;
    serviceSpeed?: number;
    cleanliness?: number;
    staffFriendliness?: number;
  } | null;
  comment: string | null;
  createdAt: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: string;
  category: string;
}

interface MenuItemRating {
  id: string;
  name: string;
  averageRating: number;
  totalRatings: number;
}

interface AnalyticsTabProps {
  restaurantId: string;
}

export function AnalyticsTab({ restaurantId }: AnalyticsTabProps) {
  const [filter, setFilter] = useState<'all' | 'items' | 'service'>('all');

  const { data: ratings = [], isLoading } = useQuery<Rating[]>({
    queryKey: [`/api/restaurants/${restaurantId}/ratings`],
    enabled: !!restaurantId,
  });

  const { data: menuItems = [], isLoading: isMenuItemsLoading } = useQuery<MenuItem[]>({
    queryKey: [`/api/menu-items?restaurantId=${restaurantId}`],
    enabled: !!restaurantId,
  });

  // Calculate statistics
  const itemRatings = ratings.filter(r => r.itemRating !== null && r.menuItemId);
  const serviceRatings = ratings.filter(r => r.serviceRatings && !r.menuItemId);

  const avgItemRating = itemRatings.length > 0
    ? itemRatings.reduce((sum, r) => sum + (r.itemRating || 0), 0) / itemRatings.length
    : 0;

  // Calculate ratings per menu item
  const menuItemRatingsMap = new Map<string, { ratings: number[], name: string }>();
  
  itemRatings.forEach(rating => {
    if (rating.menuItemId && rating.itemRating) {
      const menuItem = menuItems.find(item => item.id === rating.menuItemId);
      if (menuItem) {
        if (!menuItemRatingsMap.has(rating.menuItemId)) {
          menuItemRatingsMap.set(rating.menuItemId, { ratings: [], name: menuItem.name });
        }
        menuItemRatingsMap.get(rating.menuItemId)!.ratings.push(rating.itemRating);
      }
    }
  });

  const menuItemRatings: MenuItemRating[] = Array.from(menuItemRatingsMap.entries()).map(([id, data]) => ({
    id,
    name: data.name,
    averageRating: data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length,
    totalRatings: data.ratings.length,
  })).sort((a, b) => b.averageRating - a.averageRating);

  const calculateAvgServiceRating = (field: keyof NonNullable<Rating['serviceRatings']>) => {
    const validRatings = serviceRatings
      .map(r => r.serviceRatings?.[field])
      .filter((v): v is number => v !== undefined);
    return validRatings.length > 0
      ? validRatings.reduce((sum, v) => sum + v, 0) / validRatings.length
      : 0;
  };

  const avgFoodQuality = calculateAvgServiceRating('foodQuality');
  const avgServiceSpeed = calculateAvgServiceRating('serviceSpeed');
  const avgCleanliness = calculateAvgServiceRating('cleanliness');
  const avgStaffFriendliness = calculateAvgServiceRating('staffFriendliness');

  const filteredRatings = filter === 'all' 
    ? ratings 
    : filter === 'items' 
    ? itemRatings 
    : serviceRatings;

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading || isMenuItemsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-analytics" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4" data-testid="card-total-ratings">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Ratings</p>
              <p className="text-2xl font-bold">{ratings.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4" data-testid="card-avg-item-rating">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Utensils className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Item Rating</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{avgItemRating.toFixed(1)}</p>
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4" data-testid="card-item-ratings">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Item Ratings</p>
              <p className="text-2xl font-bold">{itemRatings.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4" data-testid="card-service-ratings">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Service Ratings</p>
              <p className="text-2xl font-bold">{serviceRatings.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Menu Item Ratings */}
      {menuItemRatings.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Menu Item Ratings</h3>
          <div className="space-y-3">
            {menuItemRatings.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="flex-1">
                  <p className="font-medium" data-testid={`text-menu-item-${item.id}`}>{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.totalRatings} rating{item.totalRatings !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold" data-testid={`text-avg-rating-${item.id}`}>{item.averageRating.toFixed(1)}</span>
                  {renderStars(Math.round(item.averageRating))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Service Quality Metrics */}
      {serviceRatings.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Service Quality Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Food Quality</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{avgFoodQuality.toFixed(1)}</span>
                  {renderStars(Math.round(avgFoodQuality))}
                </div>
              </div>
              <Separator />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Service Speed</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{avgServiceSpeed.toFixed(1)}</span>
                  {renderStars(Math.round(avgServiceSpeed))}
                </div>
              </div>
              <Separator />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cleanliness</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{avgCleanliness.toFixed(1)}</span>
                  {renderStars(Math.round(avgCleanliness))}
                </div>
              </div>
              <Separator />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Staff Friendliness</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{avgStaffFriendliness.toFixed(1)}</span>
                  {renderStars(Math.round(avgStaffFriendliness))}
                </div>
              </div>
              <Separator />
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Filter:</span>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          data-testid="button-filter-all"
        >
          All Ratings
        </Button>
        <Button
          variant={filter === 'items' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('items')}
          data-testid="button-filter-items"
        >
          Menu Items ({itemRatings.length})
        </Button>
        <Button
          variant={filter === 'service' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('service')}
          data-testid="button-filter-service"
        >
          Service ({serviceRatings.length})
        </Button>
      </div>

      {/* Ratings List */}
      {filteredRatings.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Ratings Yet</h3>
          <p className="text-muted-foreground">
            {filter === 'all' 
              ? "No ratings have been submitted yet" 
              : filter === 'items'
              ? "No menu item ratings yet"
              : "No service ratings yet"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRatings.map((rating) => (
            <Card key={rating.id} className="p-4" data-testid={`card-rating-${rating.id}`}>
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    {rating.menuItemId && rating.itemRating && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Utensils className="h-3 w-3" />
                          Menu Item
                        </Badge>
                        {renderStars(rating.itemRating)}
                      </div>
                    )}
                    {rating.serviceRatings && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Service Rating
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(rating.createdAt), "MMM d, yyyy")}
                  </div>
                </div>

                {/* Service Ratings Details */}
                {rating.serviceRatings && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-md">
                    {rating.serviceRatings.foodQuality && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Food Quality</span>
                        {renderStars(rating.serviceRatings.foodQuality)}
                      </div>
                    )}
                    {rating.serviceRatings.serviceSpeed && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Service Speed</span>
                        {renderStars(rating.serviceRatings.serviceSpeed)}
                      </div>
                    )}
                    {rating.serviceRatings.cleanliness && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Cleanliness</span>
                        {renderStars(rating.serviceRatings.cleanliness)}
                      </div>
                    )}
                    {rating.serviceRatings.staffFriendliness && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Staff Friendliness</span>
                        {renderStars(rating.serviceRatings.staffFriendliness)}
                      </div>
                    )}
                  </div>
                )}

                {/* Comment */}
                {rating.comment && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm italic" data-testid={`text-comment-${rating.id}`}>
                      "{rating.comment}"
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
