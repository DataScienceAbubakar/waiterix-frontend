import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Trash2, X, Plus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FaqKnowledgeBase } from "@/shared/schema";

interface FAQManagementPanelProps {
  restaurantId: string;
}

export function FAQManagementPanel({ restaurantId }: FAQManagementPanelProps) {
  const { toast } = useToast();
  const [editingFaq, setEditingFaq] = useState<FaqKnowledgeBase | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [editKeywords, setEditKeywords] = useState("");

  // Fetch all FAQs
  const { data: faqs = [], isLoading } = useQuery<FaqKnowledgeBase[]>({
    queryKey: ['/api/faqs'],
  });

  // Update FAQ mutation
  const updateFaqMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/faqs/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faqs'] });
      setEditingFaq(null);
      toast({
        title: "Success",
        description: "FAQ updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete FAQ mutation
  const deleteFaqMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/faqs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faqs'] });
      toast({
        title: "Success",
        description: "FAQ deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (faq: FaqKnowledgeBase) => {
    setEditingFaq(faq);
    setEditQuestion(faq.question);
    setEditAnswer(faq.answer);
    setEditKeywords((faq.keywords || []).join(', '));
  };

  const handleSave = () => {
    if (!editingFaq) return;

    const keywords = editKeywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    updateFaqMutation.mutate({
      id: editingFaq.id,
      data: {
        question: editQuestion,
        answer: editAnswer,
        keywords,
      },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this FAQ? This cannot be undone.')) {
      deleteFaqMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading FAQs...</div>
      </div>
    );
  }

  if (faqs.length === 0) {
    return (
      <Card data-testid="card-faq-empty">
        <CardHeader>
          <CardTitle>FAQ Knowledge Base</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-2">No FAQs yet</p>
            <p className="text-sm">
              FAQs are automatically created when you answer customer questions.
              They help the AI Waiter provide faster, more accurate responses.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold" data-testid="text-faq-title">FAQ Knowledge Base</h2>
          <Badge variant="secondary" data-testid="badge-faq-count">
            {faqs.length} {faqs.length === 1 ? 'FAQ' : 'FAQs'}
          </Badge>
        </div>

        <div className="space-y-3">
          {faqs.map((faq) => (
            <Card key={faq.id} className="hover-elevate" data-testid={`card-faq-${faq.id}`}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="font-medium text-sm text-muted-foreground">Question</p>
                        <p className="font-medium" data-testid={`text-question-${faq.id}`}>{faq.question}</p>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-muted-foreground">Answer</p>
                        <p className="text-sm" data-testid={`text-answer-${faq.id}`}>{faq.answer}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditClick(faq)}
                        data-testid={`button-edit-${faq.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(faq.id)}
                        disabled={deleteFaqMutation.isPending}
                        data-testid={`button-delete-${faq.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">Keywords:</span>
                    {(faq.keywords || []).map((keyword, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs" data-testid={`badge-keyword-${faq.id}-${idx}`}>
                        {keyword}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span data-testid={`text-usage-${faq.id}`}>Used {faq.usageCount || 0} times</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Edit FAQ Dialog */}
      <Dialog open={!!editingFaq} onOpenChange={(open) => !open && setEditingFaq(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-faq">
          <DialogHeader>
            <DialogTitle>Edit FAQ</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Question</label>
              <Textarea
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                placeholder="Enter the question..."
                className="min-h-[60px]"
                data-testid="input-edit-question"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Answer</label>
              <Textarea
                value={editAnswer}
                onChange={(e) => setEditAnswer(e.target.value)}
                placeholder="Enter the answer..."
                className="min-h-[100px]"
                data-testid="input-edit-answer"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Keywords (comma-separated)</label>
              <Input
                value={editKeywords}
                onChange={(e) => setEditKeywords(e.target.value)}
                placeholder="e.g., gluten, allergen, vegan, spicy"
                data-testid="input-edit-keywords"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Keywords help the AI match customer questions to this FAQ
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingFaq(null)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateFaqMutation.isPending || !editQuestion.trim() || !editAnswer.trim()}
              data-testid="button-save-faq"
            >
              {updateFaqMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
