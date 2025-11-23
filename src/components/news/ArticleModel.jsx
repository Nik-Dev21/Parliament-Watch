import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, ExternalLink, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ArticleModal({ article, onClose }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        if (currentUser) {
          const { data: saved } = await supabase
            .from('saved_articles')
            .select('*')
            .eq('user_email', currentUser.email)
            .eq('article_id', article.id);

          setIsSaved(saved && saved.length > 0);
        }
      } catch (error) {
        console.error("User not authenticated");
      }
    };
    loadUser();
  }, [article.id]);

  const toggleSaveMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.error("Please sign in to save articles");
        return;
      }

      if (isSaved) {
        const { data: saved } = await supabase
          .from('saved_articles')
          .select('id')
          .eq('user_email', user.email)
          .eq('article_id', article.id)
          .single();

        if (saved) {
          await supabase.from('saved_articles').delete().eq('id', saved.id);
        }
      } else {
        await supabase.from('saved_articles').insert({
          user_email: user.email,
          article_id: article.id
        });
      }
    },
    onSuccess: () => {
      setIsSaved(!isSaved);
      queryClient.invalidateQueries({ queryKey: ['saved-articles'] });
      toast.success(isSaved ? 'Article removed from saved' : 'Article saved');
    }
  });

  const getBiasColor = (bias) => {
    if (bias === 'Left') return 'text-blue-500';
    if (bias === 'Right') return 'text-red-500';
    return 'text-gray-500';
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-3xl font-bold text-black mb-3 pr-8">
                {article.title}
              </DialogTitle>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="font-bold">{article.source}</span>
                <span>•</span>
                <span>
                  {article.published_date
                    ? format(new Date(article.published_date), 'MMM d, yyyy')
                    : format(new Date(article.created_date), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="flex items-center gap-3">
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSaveMutation.mutate()}
                className={isSaved ? 'border-black bg-black text-white' : 'border-black'}
              >
                <Bookmark className="w-4 h-4 mr-2" />
                {isSaved ? 'Saved' : 'Save'}
              </Button>
            )}
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="border-black">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Read Original
                </Button>
              </a>
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-black mb-3">Summary</h3>
            <p className="text-gray-700 leading-relaxed">
              {article.summary}
            </p>
          </div>

          {article.key_points && article.key_points.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-black mb-3">Key Points</h3>
              <ul className="space-y-2">
                {article.key_points.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-bold text-black mt-1">•</span>
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {article.bias_rating && (
            <div>
              <h3 className="text-lg font-bold text-black mb-3">Political Lean Analysis</h3>
              <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-gray-600 uppercase tracking-wider">
                    Rating:
                  </span>
                  <span className={`text-lg font-bold ${getBiasColor(article.bias_rating)}`}>
                    {article.bias_rating}
                  </span>
                </div>
                {article.bias_explanation && (
                  <p className="text-gray-700 text-sm">
                    {article.bias_explanation}
                  </p>
                )}
              </div>
            </div>
          )}

          {article.topics && article.topics.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-black mb-3">Topics</h3>
              <div className="flex flex-wrap gap-2">
                {article.topics.map((topic, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="border-black text-black font-medium"
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}