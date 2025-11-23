import React from 'react';
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, ExternalLink, Mail, Phone, Users, Vote, MessageSquare, Activity } from "lucide-react";
import { fetchMPVotes, fetchMPDebates } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

export default function MPModal({ mp, onClose }) {
  const { data: votesData = {} } = useQuery({
    queryKey: ['mp-votes', mp.url],
    queryFn: () => fetchMPVotes(mp.url),
    enabled: !!mp.url,
  });

  const { data: debatesData = {} } = useQuery({
    queryKey: ['mp-debates', mp.url],
    queryFn: () => fetchMPDebates(mp.url),
    enabled: !!mp.url,
  });

  const votes = votesData.objects || [];
  const debates = debatesData.objects || [];

  // Combine and sort activity
  const activity = [
    ...votes.map(v => ({ ...v, type: 'vote', dateObj: new Date(v.date) })),
    ...debates.map(d => ({ ...d, type: 'debate', dateObj: new Date(d.date) }))
  ].sort((a, b) => b.dateObj - a.dateObj);

  const partyColors = {
    Liberal: 'border-red-600 text-red-600 bg-red-50',
    Conservative: 'border-blue-600 text-blue-600 bg-blue-50',
    NDP: 'border-orange-600 text-orange-600 bg-orange-50',
    'Bloc Québécois': 'border-blue-400 text-blue-400 bg-blue-50',
    Green: 'border-green-600 text-green-600 bg-green-50',
    Independent: 'border-gray-600 text-gray-600 bg-gray-50'
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {mp.photo_url ? (
              <img
                src={mp.photo_url}
                alt={mp.name}
                className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ display: mp.photo_url ? 'none' : 'flex' }}
            >
              <Users className="w-10 h-10 text-gray-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-3xl font-bold text-black mb-2">
                {mp.name}
              </DialogTitle>
              <Badge
                variant="outline"
                className={`font-bold text-base ${partyColors[mp.party] || 'border-black text-black'}`}
              >
                {mp.party}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Riding
                  </div>
                  <div className="font-bold text-black">{mp.riding}</div>
                  {mp.province && (
                    <div className="text-sm text-gray-600">{mp.province}</div>
                  )}
                </div>
              </div>
            </div>

            {(mp.email || mp.phone) && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                {mp.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${mp.email}`} className="text-sm text-blue-600 hover:underline">
                      {mp.email}
                    </a>
                  </div>
                )}
                {mp.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${mp.phone}`} className="text-sm text-blue-600 hover:underline">
                      {mp.phone}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {mp.openparliament_url && (
            <div>
              <a
                href={mp.openparliament_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="border-black">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on OpenParliament
                </Button>
              </a>
            </div>
          )}

          {/* Activity Feed */}
          <div>
            <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity in the House of Commons
            </h3>

            <div className="space-y-6 border-l-2 border-gray-100 pl-4 ml-2">
              {activity.length > 0 ? (
                activity.map((item, index) => (
                  <div key={`${item.type}-${index}`} className="relative">
                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-gray-300 border-2 border-white" />

                    <div className="mb-1 text-sm text-gray-500 font-medium">
                      {formatDistanceToNow(item.dateObj, { addSuffix: true })}
                    </div>

                    {item.type === 'vote' ? (
                      <div>
                        <div className="font-medium text-black">
                          Voted <span className={item.vote === 'Y' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                            {item.vote === 'Y' ? 'Yes' : 'No'}
                          </span> on {item.bill_number ? `Bill ${item.bill_number}` : 'Motion'}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {item.description?.en}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium text-black flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-500" />
                          Spoke in the House
                        </div>
                        {item.most_frequent_word?.en && (
                          <div className="text-sm text-gray-600 mt-1 italic">
                            Context: "{item.most_frequent_word.en}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">No recent activity found.</p>
              )}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}