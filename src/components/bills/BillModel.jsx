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
import { ExternalLink, Calendar, FileText, Vote, Loader2, User, CheckCircle2, Scale } from "lucide-react";
import { format } from "date-fns";
import { fetchBillDetails, fetchBillVotes, fetchVoteBallots, fetchMPs, fetchBillSummary } from "@/lib/api";

export default function BillModal({ bill, onClose }) {
  // Fetch detailed bill info
  const { data: billDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['bill-details', bill.url],
    queryFn: () => fetchBillDetails(bill.url),
    enabled: !!bill.url,
  });

  // Fetch scraped debate summary if API summary is missing
  const { data: scrapedSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['bill-summary-scraped', bill.url],
    queryFn: async () => {
      const html = await fetchBillSummary(bill.url);
      if (!html) return null;
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      // Find the Debate Summary header and get subsequent paragraphs
      const headers = Array.from(doc.querySelectorAll('h2'));
      const summaryHeader = headers.find(h => h.textContent.trim() === 'Debate Summary');

      if (summaryHeader) {
        let content = '';
        let next = summaryHeader.nextElementSibling;
        while (next && next.tagName !== 'H2' && next.tagName !== 'H3') {
          content += next.outerHTML;
          next = next.nextElementSibling;
        }
        return content;
      }
      return null;
    },
    enabled: !!bill.url && !billDetails?.summary?.en && !isLoadingDetails,
  });

  // Fetch bill votes
  const { data: billVotesData, isLoading: isLoadingVotes } = useQuery({
    queryKey: ['bill-votes', bill.number, bill.session],
    queryFn: () => fetchBillVotes(bill.number, bill.session),
    enabled: !!bill.number && !!bill.session,
  });

  // Fetch MPs for party mapping
  const { data: mpsData } = useQuery({
    queryKey: ['mps'],
    queryFn: fetchMPs,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const votes = billVotesData?.objects || [];
  const latestVote = votes[0];

  // Fetch ballots for the latest vote to calculate party breakdown
  const { data: ballotsData, isLoading: isLoadingBallots } = useQuery({
    queryKey: ['vote-ballots', latestVote?.url],
    queryFn: () => fetchVoteBallots(latestVote.url),
    enabled: !!latestVote?.url,
  });

  const mps = mpsData?.objects || [];

  // Create a map of MP URL to Party Name
  const mpPartyMap = React.useMemo(() => {
    const map = {};
    mps.forEach(mp => {
      if (mp.url && mp.current_party?.short_name?.en) {
        map[mp.url] = mp.current_party.short_name.en;
      }
    });
    return map;
  }, [mps]);

  // Calculate party votes dynamically from ballots
  const partyVotes = React.useMemo(() => {
    const ballots = ballotsData?.objects || [];
    if (!ballots.length) return null;

    const counts = {};

    ballots.forEach(b => {
      const party = mpPartyMap[b.politician_url] || 'Independent';
      if (!counts[party]) counts[party] = { yes: 0, no: 0, paired: 0, party };

      if (b.ballot === 'Yes' || b.ballot === 'Y') counts[party].yes++;
      else if (b.ballot === 'No' || b.ballot === 'N') counts[party].no++;
      else if (b.ballot === 'Paired') counts[party].paired++;
    });

    // Sort by total votes (Yes + No) descending
    return Object.values(counts).sort((a, b) => (b.yes + b.no) - (a.yes + a.no));
  }, [ballotsData, mpPartyMap]);

  const partyColors = {
    Liberal: 'bg-red-100 text-red-800 border-red-200',
    Conservative: 'bg-blue-100 text-blue-800 border-blue-200',
    NDP: 'bg-orange-100 text-orange-800 border-orange-200',
    'Bloc Québécois': 'bg-blue-50 text-blue-600 border-blue-100',
    Green: 'bg-green-100 text-green-800 border-green-200',
    Independent: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  // Status badge color based on status code
  const getStatusColor = (statusCode) => {
    if (!statusCode) return 'bg-gray-100 text-gray-800';
    if (statusCode.includes('RoyalAssent')) return 'bg-green-100 text-green-800';
    if (statusCode.includes('Passed')) return 'bg-blue-100 text-blue-800';
    if (statusCode.includes('Reading')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Use API summary, scraped debate summary, or fallback to bill name/AI summary
  const summaryContent = billDetails?.summary?.en || scrapedSummary || bill.summary;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <Badge variant="outline" className="border-black text-black font-bold text-lg px-3 py-1">
                  {bill.bill_number}
                </Badge>
                {billDetails?.status_code && (
                  <Badge className={getStatusColor(billDetails.status_code)}>
                    {billDetails.status_code.replace(/([A-Z])/g, ' $1').trim()}
                  </Badge>
                )}
                {billDetails?.law && (
                  <Badge className="bg-green-600 text-white">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Law
                  </Badge>
                )}
                <span className="text-gray-600 font-medium">Session {bill.session}</span>
              </div>
              <DialogTitle className="text-2xl font-bold text-black leading-tight mb-2">
                {bill.title}
              </DialogTitle>
              {billDetails?.name?.en && billDetails.name.en !== bill.title && (
                <p className="text-sm text-gray-600 italic">{billDetails.name.en}</p>
              )}
            </div>
            {bill.openparliament_url && (
              <a
                href={bill.openparliament_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0"
              >
                <Button variant="outline" className="border-black hover:bg-gray-50">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  OpenParliament
                </Button>
              </a>
            )}
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-8">
            {/* Summary Section */}
            <section>
              <h3 className="text-lg font-bold text-black mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Summary
              </h3>
              {isLoadingDetails || (isLoadingSummary && !summaryContent) ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading summary...
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {summaryContent ? (
                    <div dangerouslySetInnerHTML={{ __html: summaryContent }} />
                  ) : (
                    <p className="italic text-gray-500">
                      No summary available for this bill.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Sponsor Information */}
            {billDetails?.sponsor_politician && (
              <section>
                <h3 className="text-lg font-bold text-black mb-3 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Sponsor
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="font-medium text-black">{billDetails.sponsor_politician.name}</div>
                  {billDetails.sponsor_politician.current_party && (
                    <div className="text-sm text-gray-600 mt-1">
                      {billDetails.sponsor_politician.current_party.short_name} • {billDetails.sponsor_politician.riding_name}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Voting History Section */}
            <section>
              <h3 className="text-lg font-bold text-black mb-3 flex items-center gap-2">
                <Vote className="w-5 h-5" />
                Voting Record
              </h3>

              {isLoadingVotes ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading voting history...
                </div>
              ) : latestVote ? (
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                      <div>
                        <div className="font-bold text-lg mb-1">
                          {latestVote.result}
                        </div>
                        <div className="text-sm text-gray-600">
                          {format(new Date(latestVote.date), 'MMMM d, yyyy')}
                        </div>
                      </div>
                      <Badge
                        className={latestVote.result === 'Passed' ? 'bg-green-600' : 'bg-gray-600'}
                      >
                        {latestVote.result}
                      </Badge>
                    </div>

                    <div className="text-sm text-gray-700 mb-4">
                      {latestVote.description?.en}
                    </div>

                    {isLoadingBallots ? (
                      <div className="flex items-center gap-2 text-gray-500 py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading party breakdown...
                      </div>
                    ) : partyVotes ? (
                      <>
                        <h4 className="font-bold text-sm mb-3">Party Positions</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {partyVotes.map((pv, index) => (
                            <div key={index} className={`p-3 rounded-md border ${partyColors[pv.party] || 'bg-gray-50 border-gray-200'}`}>
                              <div className="font-bold mb-1">{pv.party}</div>
                              <div className="flex gap-3 text-sm">
                                {pv.yes > 0 && <span className="font-medium text-green-700">Yea: {pv.yes}</span>}
                                {pv.no > 0 && <span className="font-medium text-red-700">Nay: {pv.no}</span>}
                                {pv.paired > 0 && <span className="text-gray-600">Paired: {pv.paired}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        No party breakdown available for this vote.
                      </p>
                    )}
                  </div>

                  {votes.length > 1 && (
                    <p className="text-sm text-gray-500 text-center">
                      Showing most recent vote. {votes.length - 1} other vote{votes.length > 2 ? 's' : ''} recorded.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                  <Vote className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No voting records found for this bill</p>
                  <p className="text-sm text-gray-500 mt-1">This bill may not have been voted on yet</p>
                </div>
              )}
            </section>

            {/* Bill Text Links */}
            {(billDetails?.text_docx_url || billDetails?.links?.text) && (
              <section>
                <h3 className="text-lg font-bold text-black mb-3 flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  Bill Text
                </h3>
                <div className="flex gap-3">
                  {billDetails.text_docx_url && (
                    <a href={billDetails.text_docx_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Download DOCX
                      </Button>
                    </a>
                  )}
                  {billDetails.text_pdf_url && (
                    <a href={billDetails.text_pdf_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </a>
                  )}
                  {billDetails.links?.text && (
                    <a href={billDetails.links.text} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        View Full Text
                      </Button>
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* Additional Info */}
            <section className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1 text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Introduced</span>
                </div>
                <div className="font-medium">
                  {bill.introduced_date ? format(new Date(bill.introduced_date), 'MMMM d, yyyy') : 'Unknown'}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1 text-gray-500">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Type</span>
                </div>
                <div className="font-medium">
                  {bill.bill_number?.startsWith('C-') ? 'Government Bill' : bill.bill_number?.startsWith('S-') ? 'Senate Bill' : 'Private Member Bill'}
                </div>
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}