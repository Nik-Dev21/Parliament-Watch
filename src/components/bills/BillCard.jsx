import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";

export default function BillCard({ bill, onClick }) {
  return (
    <Card 
      className="border-2 border-gray-200 hover:border-black transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="border-black text-black font-bold">
                {bill.bill_number}
              </Badge>
              {bill.status && (
                <span className="text-sm text-gray-600">{bill.status}</span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-black mb-2 group-hover:underline">
              {bill.title}
            </h2>
            {bill.introduced_date && (
              <div className="text-sm text-gray-600">
                Introduced: {format(new Date(bill.introduced_date), 'MMM d, yyyy')}
              </div>
            )}
          </div>
          {bill.openparliament_url && (
            <a
              href={bill.openparliament_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-400 hover:text-black transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}
        </div>

        {bill.summary && (
          <p className="text-gray-700 mb-3 line-clamp-3">
            {bill.summary}
          </p>
        )}

        {bill.why_it_matters && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Why It Matters
            </span>
            <p className="text-sm text-gray-700 mt-1 line-clamp-2">
              {bill.why_it_matters}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}