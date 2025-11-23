import { supabase } from "@/lib/supabase";

export const mpService = {
    async getMPs() {
        const { data, error } = await supabase
            .from('mps')
            .select('*')
            .order('name');

        if (error) throw error;
        return data;
    },

    async fetchAndUpdateMPs() {
        // Mock implementation for now
        console.log("Fetching MPs from OpenParliament...");

        // Check if we have MPs
        const { data: existing } = await supabase
            .from('mps')
            .select('id')
            .limit(1);

        if (!existing || existing.length === 0) {
            // Insert sample MPs
            const sampleMPs = [
                {
                    name: "Justin Trudeau",
                    riding: "Papineau",
                    party: "Liberal",
                    province: "Quebec",
                    photo_url: "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMPPhotos/44/TrudeauJustin_Liberal.jpg"
                },
                {
                    name: "Pierre Poilievre",
                    riding: "Carleton",
                    party: "Conservative",
                    province: "Ontario",
                    photo_url: "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMPPhotos/44/PoilievrePierre_Conservative.jpg"
                },
                {
                    name: "Jagmeet Singh",
                    riding: "Burnaby South",
                    party: "NDP",
                    province: "British Columbia",
                    photo_url: "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMPPhotos/44/SinghJagmeet_NDP.jpg"
                }
            ];

            await supabase.from('mps').insert(sampleMPs);
        }

        return { success: true };
    }
};
