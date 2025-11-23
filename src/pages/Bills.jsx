import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import BillCard from "../components/bills/BillCard";
import BillModal from "../components/bills/BillModel";
import { fetchBills, fetchPassedBills } from "@/lib/api";
import billSummaries from "@/data/bill_summaries.json";

export default function Bills() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBill, setSelectedBill] = useState(null);
    const [statusFilter, setStatusFilter] = useState("all");

    const { data: billsData = {}, isLoading: isLoadingBills } = useQuery({
        queryKey: ['bills'],
        queryFn: fetchBills,
    });

    const { data: passedBillsData = {}, isLoading: isLoadingPassed } = useQuery({
        queryKey: ['passedBills'],
        queryFn: fetchPassedBills,
    });

    const isLoading = isLoadingBills || isLoadingPassed;

    const passedBillNumbers = new Set((passedBillsData.objects || []).map(b => b.number));

    const bills = (billsData.objects || [])
        .filter(bill => {
            // Filter out pro forma bills (C-1 and S-1 are ceremonial bills with no content)
            return bill.number !== 'C-1' && bill.number !== 'S-1';
        })
        .map(bill => {
            const isPassed = passedBillNumbers.has(bill.number);
            const staticStatus = billSummaries[bill.number]?.status_code;

            // Prioritize API status for passed bills, otherwise fall back to static data or 'Introduced'
            let status_code = staticStatus || 'Introduced';
            if (isPassed) {
                status_code = 'RoyalAssentGiven';
            }

            return {
                ...bill,
                bill_number: bill.number,
                title: bill.short_title?.en || bill.name?.en, // Prioritize short_title
                introduced_date: bill.introduced,
                openparliament_url: `https://openparliament.ca${bill.url}`,
                status: `Session ${bill.session}`,
                summary: billSummaries[bill.number]?.summary || bill.name?.en,
                status_code: status_code
            };
        })
        .sort((a, b) => new Date(b.introduced_date) - new Date(a.introduced_date)); // Sort by date, newest first

    const filteredBills = bills.filter(bill => {
        const matchesSearch = bill.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bill.bill_number?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "passed" && (bill.status_code?.includes('RoyalAssent') || bill.status_code?.includes('Passed'))) ||
            (statusFilter === "pending" && !(bill.status_code?.includes('RoyalAssent') || bill.status_code?.includes('Passed')));

        return matchesSearch && matchesStatus;
    });


    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-black mb-2">
                            Federal Bills
                        </h1>
                        <p className="text-gray-600">
                            Plain-language summaries of Canadian federal legislation
                        </p>
                    </div>
                    <Button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['bills'] })}
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
                                Refresh Bills
                            </>
                        )}
                    </Button>
                </div>

                <div className="mb-6 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                            placeholder="Search bills by number, title, or content..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 border-black"
                        />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-semibold text-gray-700">Filter by Status:</span>
                        <Button
                            variant={statusFilter === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("all")}
                            className={statusFilter === "all" ? "bg-black" : "border-black"}
                        >
                            All Bills
                        </Button>
                        <Button
                            variant={statusFilter === "passed" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("passed")}
                            className={statusFilter === "passed" ? "bg-black" : "border-black"}
                        >
                            Passed
                        </Button>
                        <Button
                            variant={statusFilter === "pending" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("pending")}
                            className={statusFilter === "pending" ? "bg-black" : "border-black"}
                        >
                            Pending
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                            <p className="text-gray-600">Loading bills...</p>
                        </div>
                    ) : filteredBills.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                            <p className="text-gray-600 mb-4">
                                {searchTerm ? 'No bills match your search' : 'No bills yet'}
                            </p>
                            {!searchTerm && (
                                <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['bills'] })} className="bg-black text-white">
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Fetch Bills
                                </Button>
                            )}
                        </div>
                    ) : (
                        filteredBills.map((bill) => (
                            <BillCard
                                key={bill.url}
                                bill={bill}
                                onClick={() => setSelectedBill(bill)}
                            />
                        ))
                    )}
                </div>
            </div>

            {selectedBill && (
                <BillModal
                    bill={selectedBill}
                    onClose={() => setSelectedBill(null)}
                />
            )}
        </div>
    );
}