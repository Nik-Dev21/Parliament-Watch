import { supabase } from "@/lib/supabase";

export const billService = {
    async getBills() {
        const { data, error } = await supabase
            .from('bills')
            .select('*')
            .order('introduced_date', { ascending: false });

        if (error) throw error;
        return data;
    },

    async fetchAndAnalyzeBills() {
        // Mock implementation
        console.log("Fetching bills from OpenParliament...");

        // Check if we have bills
        const { data: existing } = await supabase
            .from('bills')
            .select('id')
            .limit(1);

        if (!existing || existing.length === 0) {
            // Insert sample bills
            const sampleBills = [
                {
                    bill_number: "C-11",
                    title: "An Act to amend the Broadcasting Act",
                    summary: "This bill updates the Broadcasting Act to include online streaming services.",
                    why_it_matters: "It aims to ensure Canadian content is promoted on digital platforms.",
                    status: "Royal Assent",
                    introduced_date: new Date().toISOString(),
                    historical_context: "The Broadcasting Act hadn't been updated since 1991.",
                    party_positions: {
                        "Liberal": "Support",
                        "Conservative": "Oppose",
                        "NDP": "Support"
                    },
                    openparliament_url: "https://openparliament.ca/bills/44-1/C-11/"
                },
                {
                    bill_number: "C-18",
                    title: "Online News Act",
                    summary: "Requires tech giants to pay news publishers for content.",
                    why_it_matters: "Supports the sustainability of the Canadian news ecosystem.",
                    status: "Royal Assent",
                    introduced_date: new Date().toISOString(),
                    historical_context: "News revenues have declined significantly with the rise of digital media.",
                    party_positions: {
                        "Liberal": "Support",
                        "Conservative": "Oppose",
                        "NDP": "Support"
                    },
                    openparliament_url: "https://openparliament.ca/bills/44-1/C-18/"
                }
            ];

            await supabase.from('bills').insert(sampleBills);
        }

        return { success: true };
    }
};
