import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { newsService } from "@/services/newsService";

export default function News() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['news-topics'],
    queryFn: newsService.getTopics,
    initialData: [],
  });

  const fetchNewsMutation = useMutation({
    mutationFn: newsService.fetchAndAnalyzeNews,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-topics'] });
      toast.success('News fetched and analyzed');
    },
    onError: (error) => {
      toast.error('Error fetching news: ' + error.message);
    }
  });

  // Filter out topics that might be invalid or empty if needed
  const validTopics = topics.filter(t => t.headline && t.topic);

  const featuredTopic = validTopics.find(t => t.is_featured) || validTopics[0];
  const sideTopics = validTopics.filter(t => t.id !== featuredTopic?.id).slice(0, 4);
  const remainingTopics = validTopics.filter(t => t.id !== featuredTopic?.id).slice(4);

  const totalSources = (featuredTopic?.source_count_left || 0) + (featuredTopic?.source_count_centre || 0) + (featuredTopic?.source_count_right || 0);
  const leftPercent = totalSources > 0 ? Math.round(((featuredTopic?.source_count_left || 0) / totalSources) * 100) : 0;
  const centrePercent = totalSources > 0 ? Math.round(((featuredTopic?.source_count_centre || 0) / totalSources) * 100) : 0;
  const rightPercent = totalSources > 0 ? Math.round(((featuredTopic?.source_count_right || 0) / totalSources) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoading ? (
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading news...</p>
        </div>
      ) : validTopics.length === 0 ? (
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12">
            <p className="text-gray-600 mb-4">
              No news topics yet
            </p>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                Top Story
              </div>
              {featuredTopic && (
                <div
                  className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow h-full flex flex-col"
                  onClick={() => navigate(createPageUrl("Article") + "?id=" + featuredTopic.id)}
                >
                  {featuredTopic.thumbnail_url && (
                    <div className="h-80 bg-gray-100 overflow-hidden shrink-0">
                      <img
                        src={featuredTopic.thumbnail_url}
                        alt={featuredTopic.headline}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      {featuredTopic.tags?.[0] || 'Politics'}
                    </div>
                    <h2 className="text-3xl font-bold text-black mb-4 leading-tight">
                      {featuredTopic.headline}
                    </h2>
                    <p className="text-gray-700 mb-4 leading-relaxed line-clamp-2 flex-1">
                      {featuredTopic.ai_summary}
                    </p>
                    <div className="mt-auto pt-4 border-t">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                        <span className="font-semibold">Source Bias Distribution</span>
                        <span>{totalSources} sources • {featuredTopic.key_points?.length || 0} views</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-500">Left {leftPercent}%</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                          {leftPercent > 0 && (
                            <div className="h-full bg-blue-500" style={{ width: `${leftPercent}%` }} />
                          )}
                          {centrePercent > 0 && (
                            <div className="h-full bg-gray-400" style={{ width: `${centrePercent}%` }} />
                          )}
                          {rightPercent > 0 && (
                            <div className="h-full bg-red-500" style={{ width: `${rightPercent}%` }} />
                          )}
                        </div>
                        <span className="text-xs text-gray-500">Right {rightPercent}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Centre {centrePercent}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                More Headlines
              </div>
              <div className="space-y-4">
                {sideTopics.map(topic => {
                  const total = (topic.source_count_left || 0) + (topic.source_count_centre || 0) + (topic.source_count_right || 0);
                  const lPercent = total > 0 ? Math.round(((topic.source_count_left || 0) / total) * 100) : 0;
                  const cPercent = total > 0 ? Math.round(((topic.source_count_centre || 0) / total) * 100) : 0;
                  const rPercent = total > 0 ? Math.round(((topic.source_count_right || 0) / total) * 100) : 0;

                  return (
                    <div
                      key={topic.id}
                      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(createPageUrl("Article") + "?id=" + topic.id)}
                    >
                      <div className="flex gap-3 mb-3">
                        {topic.thumbnail_url && (
                          <img
                            src={topic.thumbnail_url}
                            alt={topic.headline}
                            className="w-20 h-20 object-cover rounded flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            {topic.tags?.[0] || 'Politics'}
                          </div>
                          <h3 className="font-bold text-sm text-black leading-tight line-clamp-3">
                            {topic.headline}
                          </h3>
                        </div>
                      </div>

                      {/* Source Distribution Bar for Side Articles */}
                      <div className="mt-2">
                        <div className="flex h-1.5 bg-gray-100 rounded-full overflow-hidden w-full mb-1">
                          {lPercent > 0 && (
                            <div className="h-full bg-blue-500" style={{ width: `${lPercent}%` }} />
                          )}
                          {cPercent > 0 && (
                            <div className="h-full bg-gray-400" style={{ width: `${cPercent}%` }} />
                          )}
                          {rPercent > 0 && (
                            <div className="h-full bg-red-500" style={{ width: `${rPercent}%` }} />
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                          <span>{total} sources</span>
                          <span>{topic.published_date ? format(new Date(topic.published_date), 'MMM d') : ''}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {remainingTopics.slice(0, 9).length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                Top News Stories
              </div>
              <div className="text-sm text-gray-600 mb-6">
                Latest developments across multiple perspectives
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {remainingTopics.slice(0, 9).map(topic => (
                  <div
                    key={topic.id}
                    className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(createPageUrl("Article") + "?id=" + topic.id)}
                  >
                    {topic.thumbnail_url ? (
                      <div className="h-48 bg-gray-100 overflow-hidden">
                        <img
                          src={topic.thumbnail_url}
                          alt={topic.headline}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-48 bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-400 text-sm">Image</span>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          {topic.tags?.[0] || 'Politics'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {topic.published_date ? format(new Date(topic.published_date), 'MMM d') : ''}
                        </div>
                      </div>
                      <h3 className="font-bold text-lg text-black mb-2 leading-tight line-clamp-2">
                        {topic.headline}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {topic.ai_summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}