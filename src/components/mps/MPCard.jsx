import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users } from "lucide-react";

export default function MPCard({ mp, onClick }) {
  const partyColors = {
    Liberal: 'border-red-600 text-red-600',
    Conservative: 'border-blue-600 text-blue-600',
    NDP: 'border-orange-600 text-orange-600',
    'Bloc Québécois': 'border-blue-400 text-blue-400',
    Green: 'border-green-600 text-green-600',
    Independent: 'border-gray-600 text-gray-600'
  };

  return (
    <Card 
      className="border-2 border-gray-200 hover:border-black transition-all cursor-pointer group"
      onClick={onClick}
      data-mp-name={mp.name}
    >
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          {mp.photo_url ? (
            <img 
              src={mp.photo_url}
              alt={mp.name}
              className="w-16 h-16 rounded-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center"
            style={{ display: mp.photo_url ? 'none' : 'flex' }}
          >
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-black mb-1 group-hover:underline">
              {mp.name}
            </h3>
            <Badge 
              variant="outline" 
              className={`font-bold ${partyColors[mp.party] || 'border-black text-black'}`}
            >
              {mp.party}
            </Badge>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-black">{mp.riding}</div>
              {mp.province && (
                <div className="text-gray-600">{mp.province}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}