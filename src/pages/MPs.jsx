import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import MPCard from "../components/mps/MPCard";
import MPModal from "../components/mps/MPModel";
import { fetchMPs } from "@/lib/api";

export default function MPs() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMP, setSelectedMP] = useState(null);
  const [partyFilter, setPartyFilter] = useState("all");

  const { data: mpsData = {}, isLoading } = useQuery({
    queryKey: ['mps'],
    queryFn: fetchMPs,
  });

  const mps = (mpsData.objects || []).map(mp => ({
    ...mp,
    photo_url: mp.image ? `https://api.openparliament.ca${mp.image}` : null,
    party: mp.current_party?.short_name?.en,
    riding: mp.current_riding?.name?.en,
    province: mp.current_riding?.province,
  }));

  const parties = [...new Set(mps.map(mp => mp.party).filter(Boolean))].sort();

  const filteredMPs = mps.filter(mp => {
    const matchesSearch =
      mp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mp.riding?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mp.party?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mp.province?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesParty = partyFilter === "all" || mp.party === partyFilter;

    return matchesSearch && matchesParty;
  }).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-black mb-2">
              Members of Parliament
            </h1>
            <p className="text-gray-600">
              Browse Canadian MPs, their ridings, and voting records
            </p>
          </div>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['mps'] })}
            disabled={isLoading}
            className="bg-black hover:bg-gray-800"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh MPs
              </>
            )}
          </Button>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by name, riding, party, or province..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-black"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-gray-700">Filter by Party:</span>
            <Button
              variant={partyFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setPartyFilter("all")}
              className={partyFilter === "all" ? "bg-black" : "border-black"}
            >
              All Parties
            </Button>
            {parties.map(party => (
              <Button
                key={party}
                variant={partyFilter === party ? "default" : "outline"}
                size="sm"
                onClick={() => setPartyFilter(party)}
                className={partyFilter === party ? "bg-black" : "border-black"}
              >
                {party}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading MPs...</p>
            </div>
          ) : filteredMPs.length === 0 ? (
            <div className="col-span-full text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No MPs match your search' : 'No MPs data yet'}
              </p>
              {!searchTerm && (
                <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['mps'] })} className="bg-black text-white">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Fetch MPs
                </Button>
              )}
            </div>
          ) : (
            filteredMPs.map((mp) => (
              <MPCard
                key={mp.url}
                mp={mp}
                onClick={() => setSelectedMP(mp)}
              />
            ))
          )}
        </div>
      </div>

      {selectedMP && (
        <MPModal
          mp={selectedMP}
          onClose={() => setSelectedMP(null)}
        />
      )}
    </div>
  );
}