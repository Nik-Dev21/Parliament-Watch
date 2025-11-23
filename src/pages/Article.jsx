import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, ImageIcon, Bookmark } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Article() {
  const navigate = useNavigate();
  const [topicId, setTopicId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTopicId(params.get('id'));
  }, []);

  const { data: topic, isLoading: loadingTopic } = useQuery({
    queryKey: ['topic', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_topics')
        .select('*')
        .eq('id', topicId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!topicId,
  });

  const { data: sources = [], isLoading: loadingSources } = useQuery({
    queryKey: ['topic-sources', topic?.topic],
    queryFn: async () => {
      if (!topic) return [];
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('topic', topic.topic);
      if (error) throw error;
      return data;
    },
    enabled: !!topic,
    initialData: [],
  });

  if (!topicId || loadingTopic) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-96 w-full mb-6" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-center text-gray-600">Topic not found</p>
        </div>
      </div>
    );
  }

  const hasLeftAndRight = (topic.source_count_left > 0) && (topic.source_count_right > 0);
  const totalSources = (topic.source_count_left || 0) + (topic.source_count_centre || 0) + (topic.source_count_right || 0);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl("News"))}
          className="mb-6 border-black"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to News
        </Button>

        {topic.thumbnail_url ? (
          <div className="relative bg-gray-100 h-96 rounded-lg overflow-hidden mb-6">
            <img
              src={topic.thumbnail_url}
              alt={topic.headline}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.classList.add('flex', 'items-center', 'justify-center');
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center" style={{ display: 'none' }}>
              <ImageIcon className="w-16 h-16 text-gray-300" />
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 h-96 rounded-lg flex items-center justify-center mb-6">
            <ImageIcon className="w-16 h-16 text-gray-300" />
          </div>
        )}

        {topic.published_date && (
          <div className="text-sm text-gray-600 mb-2">
            {format(new Date(topic.published_date), 'MMMM d, yyyy')}
          </div>
        )}

        <h1 className="text-5xl font-bold text-black mb-6 leading-tight">
          {topic.headline}
        </h1>

        {totalSources > 0 && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-600 uppercase tracking-wider">
                Coverage: {totalSources} {totalSources === 1 ? 'Source' : 'Sources'}
              </span>
              <div className="flex items-center gap-4 text-sm">
                {topic.source_count_left > 0 && (
                  <span className="font-bold political-left">
                    {topic.source_count_left} Left
                  </span>
                )}
                {topic.source_count_centre > 0 && (
                  <span className="font-bold political-centre">
                    {topic.source_count_centre} Centre
                  </span>
                )}
                {topic.source_count_right > 0 && (
                  <span className="font-bold political-right">
                    {topic.source_count_right} Right
                  </span>
                )}
              </div>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
              {topic.source_count_left > 0 && (
                <div
                  className="h-full bg-political-left"
                  style={{ width: `${(topic.source_count_left / totalSources) * 100}%` }}
                />
              )}
              {topic.source_count_centre > 0 && (
                <div
                  className="h-full bg-political-centre"
                  style={{ width: `${(topic.source_count_centre / totalSources) * 100}%` }}
                />
              )}
              {topic.source_count_right > 0 && (
                <div
                  className="h-full bg-political-right"
                  style={{ width: `${(topic.source_count_right / totalSources) * 100}%` }}
                />
              )}
            </div>
          </div>
        )}

        <div className="prose prose-lg max-w-none mb-8">
          <p className="text-xl text-gray-700 leading-relaxed">
            {topic.ai_summary}
          </p>
        </div>

        {topic.key_points && topic.key_points.length > 0 && (
          <Card className="border-2 border-gray-200 p-6 mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">Key Points</h2>
            <ul className="space-y-3">
              {topic.key_points.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="font-bold text-black text-xl mt-1">•</span>
                  <span className="text-gray-700 text-lg">{point}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {hasLeftAndRight && (
          <Card className="border-2 border-black p-6 mb-8">
            <h2 className="text-2xl font-bold text-black mb-6">Bias Breakdown</h2>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {topic.left_emphasis && topic.left_emphasis.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <h3 className="text-lg font-bold political-left mb-3">
                    Left Sources Emphasize
                  </h3>
                  <ul className="space-y-2">
                    {topic.left_emphasis.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="political-left font-bold mt-0.5">•</span>
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {topic.right_emphasis && topic.right_emphasis.length > 0 && (
                <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200">
                  <h3 className="text-lg font-bold political-right mb-3">
                    Right Sources Emphasize
                  </h3>
                  <ul className="space-y-2">
                    {topic.right_emphasis.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="political-right font-bold mt-0.5">•</span>
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {topic.common_ground && topic.common_ground.length > 0 && (
              <div className="p-4 bg-gray-100 rounded-lg border-2 border-gray-300">
                <h3 className="text-lg font-bold text-black mb-3">Common Ground</h3>
                <ul className="space-y-2">
                  {topic.common_ground.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-black font-bold mt-0.5">•</span>
                      <span className="text-gray-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {sources.length > 0 && (
          <Card className="border-2 border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-black mb-4">
              Source Articles ({sources.length})
            </h2>
            <div className="space-y-3">
              {sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-black transition-colors group"
                >
                  <div className="flex-1">
                    <div className="font-bold text-black group-hover:underline mb-1">
                      {source.source}
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-1">
                      {source.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={
                        source.source_bias === 'Left' ? 'border-blue-500 text-blue-500' :
                          source.source_bias === 'Right' ? 'border-red-500 text-red-500' :
                            'border-gray-500 text-gray-500'
                      }
                    >
                      {source.source_bias}
                    </Badge>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-black" />
                  </div>
                </a>
              ))}
            </div>
          </Card>
        )}

        {topic.tags && topic.tags.length > 0 && (
          <div className="mt-8">
            <div className="flex flex-wrap gap-2">
              {topic.tags.map((tag, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="border-black text-black font-medium"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}