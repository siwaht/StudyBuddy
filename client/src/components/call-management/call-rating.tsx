import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface CallRatingProps {
  callId: string;
  currentRating?: number;
  onRatingChange?: (rating: number) => void;
}

export default function CallRating({ callId, currentRating = 0, onRatingChange }: CallRatingProps) {
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(currentRating);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateRatingMutation = useMutation({
    mutationFn: async (rating: number) => {
      return apiRequest(`/api/calls/${callId}/rating`, {
        method: 'PATCH',
        body: JSON.stringify({ rating }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Rating updated",
        description: `Call rated ${selectedRating} star${selectedRating !== 1 ? 's' : ''}`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calls', callId] });
      
      if (onRatingChange) {
        onRatingChange(selectedRating);
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to update rating",
        description: "Please try again",
        variant: "destructive",
      });
      // Reset to current rating on error
      setSelectedRating(currentRating);
    }
  });

  const handleStarClick = (rating: number) => {
    setSelectedRating(rating);
    updateRatingMutation.mutate(rating);
  };

  const handleStarHover = (rating: number) => {
    setHoveredRating(rating);
  };

  const handleMouseLeave = () => {
    setHoveredRating(0);
  };

  const displayRating = hoveredRating || selectedRating;

  return (
    <Card className="shadow-sm" data-testid="call-rating">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Star className="w-5 h-5" />
          Call Rating
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-1" onMouseLeave={handleMouseLeave}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                key={rating}
                variant="ghost"
                size="sm"
                className="p-1 h-auto hover:bg-transparent"
                onClick={() => handleStarClick(rating)}
                onMouseEnter={() => handleStarHover(rating)}
                disabled={updateRatingMutation.isPending}
                data-testid={`star-${rating}`}
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    rating <= displayRating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </Button>
            ))}
          </div>
          
          <div className="text-sm text-muted-foreground">
            {selectedRating > 0 ? (
              <span data-testid="rating-display">
                Current rating: {selectedRating} star{selectedRating !== 1 ? 's' : ''}
              </span>
            ) : (
              <span>Click stars to rate this call</span>
            )}
            {hoveredRating > 0 && hoveredRating !== selectedRating && (
              <span className="ml-2 text-primary">
                ({hoveredRating} star{hoveredRating !== 1 ? 's' : ''})
              </span>
            )}
          </div>
          
          {updateRatingMutation.isPending && (
            <div className="text-xs text-muted-foreground">
              Updating rating...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}