import { useState } from "react";
import { Plus, X, Tag, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface CallCategorizationProps {
  callId: string;
  currentCategories: string[];
  currentTags: string[];
  onCategoriesChange?: (categories: string[]) => void;
  onTagsChange?: (tags: string[]) => void;
}

const SUGGESTED_CATEGORIES = [
  "Sales Inquiry", "Support Request", "Technical Issue", "Billing Question",
  "Product Demo", "Follow-up", "Complaint", "Compliment", "General Inquiry"
];

const SUGGESTED_TAGS = [
  "urgent", "resolved", "escalated", "follow-up-needed", "satisfied-customer",
  "dissatisfied-customer", "technical", "billing", "new-customer", "returning-customer"
];

export default function CallCategorization({
  callId,
  currentCategories = [],
  currentTags = [],
  onCategoriesChange,
  onTagsChange
}: CallCategorizationProps) {
  const [newCategory, setNewCategory] = useState("");
  const [newTag, setNewTag] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateCategoriesMutation = useMutation({
    mutationFn: async (categories: string[]) => {
      return apiRequest(`/api/calls/${callId}/categories`, {
        method: 'PATCH',
        body: JSON.stringify({ categories }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calls', callId] });
      toast({
        title: "Categories updated",
        description: "Call categories have been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update categories",
        description: "Please try again",
        variant: "destructive",
      });
    }
  });

  const updateTagsMutation = useMutation({
    mutationFn: async (tags: string[]) => {
      return apiRequest(`/api/calls/${callId}/tags`, {
        method: 'PATCH',
        body: JSON.stringify({ tags }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calls', callId] });
      toast({
        title: "Tags updated",
        description: "Call tags have been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update tags",
        description: "Please try again",
        variant: "destructive",
      });
    }
  });

  const addCategory = (category: string) => {
    if (!category.trim() || currentCategories.includes(category.trim())) return;
    
    const newCategories = [...currentCategories, category.trim()];
    updateCategoriesMutation.mutate(newCategories);
    if (onCategoriesChange) onCategoriesChange(newCategories);
    setNewCategory("");
  };

  const removeCategory = (categoryToRemove: string) => {
    const newCategories = currentCategories.filter(cat => cat !== categoryToRemove);
    updateCategoriesMutation.mutate(newCategories);
    if (onCategoriesChange) onCategoriesChange(newCategories);
  };

  const addTag = (tag: string) => {
    if (!tag.trim() || currentTags.includes(tag.trim())) return;
    
    const newTags = [...currentTags, tag.trim()];
    updateTagsMutation.mutate(newTags);
    if (onTagsChange) onTagsChange(newTags);
    setNewTag("");
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = currentTags.filter(tag => tag !== tagToRemove);
    updateTagsMutation.mutate(newTags);
    if (onTagsChange) onTagsChange(newTags);
  };

  return (
    <Card className="shadow-sm" data-testid="call-categorization">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Call Organization</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="categories" className="mt-4 space-y-4">
            <div>
              <Label htmlFor="new-category" className="text-sm font-medium">
                Add Category
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="new-category"
                  placeholder="Enter category name..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCategory(newCategory)}
                  data-testid="input-new-category"
                />
                <Button
                  onClick={() => addCategory(newCategory)}
                  disabled={!newCategory.trim() || updateCategoriesMutation.isPending}
                  data-testid="button-add-category"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Current Categories</Label>
              <div className="flex flex-wrap gap-2 mt-2 min-h-[2rem]">
                {currentCategories.length > 0 ? (
                  currentCategories.map((category, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                      data-testid={`category-${category}`}
                    >
                      <Folder className="w-3 h-3" />
                      {category}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto w-auto p-0 ml-1 hover:bg-transparent"
                        onClick={() => removeCategory(category)}
                        data-testid={`remove-category-${category}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No categories assigned</span>
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Suggested Categories</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {SUGGESTED_CATEGORIES.filter(cat => !currentCategories.includes(cat)).map((category) => (
                  <Button
                    key={category}
                    variant="outline"
                    size="sm"
                    onClick={() => addCategory(category)}
                    disabled={updateCategoriesMutation.isPending}
                    className="text-xs"
                    data-testid={`suggested-category-${category}`}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="tags" className="mt-4 space-y-4">
            <div>
              <Label htmlFor="new-tag" className="text-sm font-medium">
                Add Tag
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="new-tag"
                  placeholder="Enter tag name..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag(newTag)}
                  data-testid="input-new-tag"
                />
                <Button
                  onClick={() => addTag(newTag)}
                  disabled={!newTag.trim() || updateTagsMutation.isPending}
                  data-testid="button-add-tag"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Current Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2 min-h-[2rem]">
                {currentTags.length > 0 ? (
                  currentTags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="flex items-center gap-1"
                      data-testid={`tag-${tag}`}
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto w-auto p-0 ml-1 hover:bg-transparent"
                        onClick={() => removeTag(tag)}
                        data-testid={`remove-tag-${tag}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No tags assigned</span>
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Suggested Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {SUGGESTED_TAGS.filter(tag => !currentTags.includes(tag)).map((tag) => (
                  <Button
                    key={tag}
                    variant="outline"
                    size="sm"
                    onClick={() => addTag(tag)}
                    disabled={updateTagsMutation.isPending}
                    className="text-xs"
                    data-testid={`suggested-tag-${tag}`}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}