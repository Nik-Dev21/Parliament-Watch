import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.18.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { message, history = [] } = await req.json()
        if (!message) {
            throw new Error('Message is required')
        }

        const sbUrl = Deno.env.get('SUPABASE_URL')
        const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

        if (!sbUrl || !sbKey || !anthropicKey) {
            console.error("Missing environment variables")
            throw new Error('Missing environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY)')
        }

        const anthropic = new Anthropic({ apiKey: anthropicKey })

        // Format history for context (last 5 turns)
        const historyContext = history.slice(-5).map((msg: any) =>
            `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`
        ).join("\n");

        // 1. Classify Intent & Extract Search Term
        const classificationSystemPrompt = `
        You are a helpful assistant for a Canadian Parliament app.
        Analyze the user's message and determine what to search for in the OpenParliament API.
        
        Instructions:
        - **Identify Context**: Look at the history carefully for follow-up questions.
        - **Extract Keywords for each type**:
            - "bill": legislation, laws, specific bills (e.g., "C-11", "C-5").
            - "mp": politicians, riding names, city names (e.g., "Liberal", "Trudeau", "Toronto", "Brampton").
              * For location queries (e.g., "Brampton MPs", "all Toronto MPs"), set mp_location_filter to the location name
            - "vote": voting records, "voted yes/no", "passed", "failed".
            - "debate": parliamentary debates, speeches, Hansard.
            - "committee": committees, committee meetings, hearings.
        - **Special Flags**:
            - "filter_bills_passed": true if asking for bills that became law
            - "fetch_individual_votes": true if asking for specific MP voting lists
            - "mp_location_filter": city/riding name if asking for MPs from a location

        Return JSON ONLY:
        {
            "searches": [
                { "type": "bill", "query": "extracted keywords or null" },
                { "type": "mp", "query": "extracted keywords or null" },
                { "type": "vote", "query": "extracted keywords or null" },
                { "type": "debate", "query": "extracted keywords or null" },
                { "type": "committee", "query": "extracted keywords or null" }
            ],
            "context_topic": "brief summary of topic",
            "filter_bills_passed": true/false,
            "fetch_individual_votes": true/false,
            "mp_location_filter": "location name or null"
        }
        `

        const classificationMsg = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 1024,
            system: classificationSystemPrompt,
            messages: [
                { role: "user", content: `Conversation History:\n${historyContext}\n\nCurrent User Message: "${message}"` }
            ]
        });

        const text = classificationMsg.content[0].text;
        let searches = [];
        let contextTopic = "";
        let filterBillsPassed = false;
        let fetchIndividualVotes = false;
        let mpLocationFilter = null;

        try {
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonString = text.substring(jsonStart, jsonEnd + 1);
                const parsed = JSON.parse(jsonString);
                searches = parsed.searches || [];
                contextTopic = parsed.context_topic || "";
                filterBillsPassed = parsed.filter_bills_passed || false;
                fetchIndividualVotes = parsed.fetch_individual_votes || false;
                mpLocationFilter = parsed.mp_location_filter || null;
            } else {
                searches = [{ type: "bill", "query": message }];
            }
        } catch (e) {
            console.error("Failed to parse classification JSON", text);
            searches = [{ type: "bill", "query": message }];
        }

        console.log("Planned Searches:", searches);

        // 2. Fetch Data in Parallel
        const fetchPromises = searches.map(async (search: any) => {
            if (!search.query) return null;

            let url;
            let clientSideFilter = null;

            if (search.type === 'bill') {
                const billMatch = search.query.match(/(?:bill\s*)?([CcSs]-\d+)/i);
                if (billMatch) {
                    url = `https://api.openparliament.ca/bills/?session=45-1&format=json&number=${billMatch[1].toUpperCase()}`;
                } else {
                    url = `https://api.openparliament.ca/bills/?session=45-1&format=json&q=${encodeURIComponent(search.query)}&limit=5`;
                }
            } else if (search.type === 'mp') {
                if (mpLocationFilter) {
                    url = `https://api.openparliament.ca/politicians/?format=json&limit=400`;
                    clientSideFilter = (mp: any) => {
                        const ridingName = mp.current_riding?.name?.en || mp.riding?.name?.en || "";
                        return ridingName.toLowerCase().includes(mpLocationFilter!.toLowerCase());
                    };
                } else {
                    url = `https://api.openparliament.ca/politicians/?format=json&q=${encodeURIComponent(search.query)}&limit=10`;
                }
            } else if (search.type === 'vote') {
                let query = search.query;
                if (query.toLowerCase() === "vote" || query.toLowerCase() === "votes") {
                    if (contextTopic) query = `${contextTopic} vote`;
                }
                url = `https://api.openparliament.ca/votes/?session=45-1&format=json&q=${encodeURIComponent(query)}&limit=5`;
            } else if (search.type === 'debate') {
                url = `https://api.openparliament.ca/debates/?format=json&q=${encodeURIComponent(search.query)}&limit=5`;
            } else if (search.type === 'committee') {
                url = `https://api.openparliament.ca/committees/?format=json&q=${encodeURIComponent(search.query)}&limit=5`;
            }

            if (!url) return null;

            try {
                const res = await fetch(url);
                if (!res.ok) return null;
                const data = await res.json();
                let objects = data.objects || [];

                if (clientSideFilter) {
                    objects = objects.filter(clientSideFilter);
                }

                return { type: search.type, data: objects };
            } catch (err) {
                console.error(`Error fetching ${search.type}:`, err);
                return null;
            }
        });

        const results = await Promise.all(fetchPromises);

        // 3. Process Results
        let contextParts = [];
        let primarySourceUrl = "";

        for (const result of results) {
            if (!result || result.data.length === 0) continue;

            if (result.type === 'bill') {
                const detailedBills = await Promise.all(result.data.map(async (b: any) => {
                    try {
                        const detailRes = await fetch(`https://api.openparliament.ca${b.url}?format=json`);
                        if (detailRes.ok) {
                            const detail = await detailRes.json();
                            return {
                                number: detail.number,
                                title: detail.name?.en || detail.name || "Unknown Title",
                                status: detail.status?.en || detail.status || "Unknown Status",
                                status_code: detail.status_code || "Unknown",
                                law: detail.law || false,
                                vote_urls: detail.vote_urls || [],
                                url: `https://openparliament.ca${detail.url}`
                            };
                        }
                    } catch (e) { }
                    return {
                        number: b.number,
                        title: b.name?.en || b.name || "Unknown Title",
                        url: `https://openparliament.ca${b.url}`
                    };
                }));

                let finalBills = detailedBills;
                if (filterBillsPassed) {
                    finalBills = detailedBills.filter((b: any) => b.law === true || b.status_code === "RoyalAssentGiven");
                }

                contextParts.push(`Found Bills:\n${JSON.stringify(finalBills, null, 2)}`);
                if (!primarySourceUrl && finalBills.length > 0) primarySourceUrl = finalBills[0].url;
            }

            if (result.type === 'mp') {
                const mps = result.data.map((mp: any) => ({
                    name: mp.name,
                    riding: mp.current_riding?.name?.en || "Unknown Riding",
                    party: mp.current_party?.short_name?.en || "Unknown Party",
                    url: `https://openparliament.ca${mp.url}`
                }));
                contextParts.push(`Found MPs:\n${JSON.stringify(mps, null, 2)}`);
                if (!primarySourceUrl && mps.length > 0) primarySourceUrl = mps[0].url;
            }

            // Add other types as needed...
            if (result.type === 'vote' || result.type === 'debate' || result.type === 'committee') {
                contextParts.push(`Found ${result.type}s:\n${JSON.stringify(result.data.slice(0, 5), null, 2)}`);
            }
        }

        const contextData = contextParts.length > 0 ? contextParts.join("\n\n") : "No specific data found.";

        // 4. Generate Answer
        const answerSystemPrompt = `
        You are a professional, knowledgeable assistant with comprehensive information about Canadian Parliament.
        
        Instructions:
        1. **Professional and Direct**: 
           - Provide clear, accurate, professional responses.
           - NO links, NO sources, NO URLs in your response. Present all information directly.
        2. **Use Context**: Use the provided context data to answer.
        3. **Handle Missing Info**: If data is missing, say so or use general knowledge if appropriate.
        
        CRITICAL: Never include URLs or suggest viewing external sources.
        `

        const answerMsg = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 1024,
            system: answerSystemPrompt,
            messages: [
                { role: "user", content: `Conversation History:\n${historyContext}\n\nUser Question: "${message}"\n\nContext Data:\n${contextData}` }
            ]
        });

        const answer = answerMsg.content[0].text;

        return new Response(
            JSON.stringify({
                answer,
                sourceUrl: primarySourceUrl
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error("Edge Function Error:", error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
