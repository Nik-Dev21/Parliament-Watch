import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export const chatbotService = {
    async sendMessage(message, history = []) {
        try {
            if (!GEMINI_API_KEY) {
                throw new Error("Missing GEMINI_API_KEY in environment variables");
            }

            // Format history for context (last 5 turns to capture more context)
            const historyContext = history.slice(-5).map(msg =>
                `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`
            ).join("\n");

            // 1. Classify Intent & Extract Search Terms
            const classificationPrompt = `
            You are a helpful assistant for a Canadian Parliament app.
            Analyze the user's message and determine what to search for in the OpenParliament API.
            
            Conversation History:
            ${historyContext}

            Current User Message: "${message}"

            Instructions:
            - **Identify Context**: Look at the history carefully for follow-up questions.
            - **Extract Keywords for each type**:
                - "bill": legislation, laws, specific bills (e.g., "C-11", "C-5").
                - "mp": politicians, riding names, city names (e.g., "Liberal", "Trudeau", "Toronto", "Brampton").
                  * For location queries (e.g., "Brampton MPs", "all Toronto MPs"), set mp_location_filter to the location name
                  * The location could be a city, riding, or region
                - "vote": voting records, "voted yes/no", "passed", "failed".
                - "debate": parliamentary debates, speeches, Hansard.
                - "committee": committees, committee meetings, hearings.
            - **Special Flags**:
                - "filter_bills_passed": true if asking for bills that became law
                - "fetch_individual_votes": true if asking for specific MP voting lists
                - "mp_location_filter": city/riding name if asking for MPs from a location (e.g., "Brampton", "Toronto")

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
            `;

            const classificationResult = await model.generateContent(classificationPrompt);
            const text = classificationResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

            let searches = [];
            let contextTopic = "";
            let filterBillsPassed = false;
            let fetchIndividualVotes = false;
            let mpLocationFilter = null;
            try {
                const parsed = JSON.parse(text);
                searches = parsed.searches || [];
                contextTopic = parsed.context_topic || "";
                filterBillsPassed = parsed.filter_bills_passed || false;
                fetchIndividualVotes = parsed.fetch_individual_votes || false;
                mpLocationFilter = parsed.mp_location_filter || null;
            } catch (e) {
                console.error("Failed to parse classification JSON", text);
                searches = [{ type: "bill", "query": message }];
            }

            console.log("Planned Searches:", searches, "Topic:", contextTopic, "FilterPassed:", filterBillsPassed, "FetchVotes:", fetchIndividualVotes, "MPLocation:", mpLocationFilter);

            // 2. Fetch Data in Parallel
            const fetchPromises = searches.map(async (search) => {
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
                    // If we have a location filter, fetch more MPs and filter client-side
                    if (mpLocationFilter) {
                        url = `https://api.openparliament.ca/politicians/?format=json&limit=400`;
                        clientSideFilter = (mp) => {
                            const ridingName = mp.current_riding?.name?.en || mp.riding?.name?.en || "";
                            return ridingName.toLowerCase().includes(mpLocationFilter.toLowerCase());
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

                console.log(`Fetching ${search.type}: ${url}`);
                try {
                    const res = await fetch(url);
                    if (!res.ok) return null;
                    const data = await res.json();
                    let objects = data.objects || [];

                    // Apply client-side filter if needed
                    if (clientSideFilter) {
                        objects = objects.filter(clientSideFilter);
                        console.log(`Filtered ${search.type} to ${objects.length} results`);
                    }

                    return { type: search.type, data: objects };
                } catch (err) {
                    console.error(`Error fetching ${search.type}:`, err);
                    return null;
                }
            });

            const results = await Promise.all(fetchPromises);

            // 3. Process Results into Context
            let contextParts = [];
            let primarySourceUrl = "";

            // Process results sequentially to handle async operations
            for (const result of results) {
                if (!result || result.data.length === 0) continue;

                if (result.type === 'bill') {
                    // Fetch detailed bill info for each bill
                    const detailedBills = await Promise.all(result.data.map(async (b) => {
                        try {
                            // Fetch the detailed endpoint
                            const detailRes = await fetch(`https://api.openparliament.ca${b.url}?format=json`);
                            if (detailRes.ok) {
                                const detail = await detailRes.json();
                                return {
                                    number: detail.number,
                                    title: detail.name?.en || detail.name || "Unknown Title",
                                    short_title: detail.short_title?.en || detail.short_title || "No Short Title",
                                    status: detail.status?.en || detail.status || "Unknown Status",
                                    status_code: detail.status_code || "Unknown",
                                    sponsor_politician_url: detail.sponsor_politician_url || null,
                                    law: detail.law || false,
                                    introduction_date: detail.introduced,
                                    vote_urls: detail.vote_urls || [],
                                    url: `https://openparliament.ca${detail.url}`
                                };
                            }
                        } catch (e) {
                            console.error("Failed to fetch bill detail", e);
                        }
                        // Fallback to basic data if detail fetch fails
                        return {
                            number: b.number,
                            title: b.name?.en || b.name || "Unknown Title",
                            short_title: b.short_title?.en || b.short_title || "No Short Title",
                            status: "Unable to fetch status",
                            introduction_date: b.introduced,
                            url: `https://openparliament.ca${b.url}`
                        };
                    }));

                    // Filter by status if requested
                    let finalBills = detailedBills;
                    if (filterBillsPassed) {
                        finalBills = detailedBills.filter(b => b.law === true || b.status_code === "RoyalAssentGiven" || (b.status && b.status.toLowerCase().includes("law")));
                        console.log(`Filtered bills: ${detailedBills.length} -> ${finalBills.length} passed bills`);
                    }

                    // Store vote URLs from the first bill for potential use
                    const billVoteUrls = finalBills.length > 0 && finalBills[0].vote_urls ? finalBills[0].vote_urls : [];

                    contextParts.push(`Found Bills:\n${JSON.stringify(finalBills, null, 2)}`);
                    if (!primarySourceUrl && finalBills.length > 0) primarySourceUrl = finalBills[0].url;

                    // Always fetch vote details when bill has votes - include full ballot data
                    if (billVoteUrls.length > 0) {
                        console.log(`Auto-fetching ${billVoteUrls.length} votes for Bill ${finalBills[0].number} with full details`);
                        const billVotes = await Promise.all(billVoteUrls.slice(0, 5).map(async (voteUrl) => {
                            try {
                                const detailRes = await fetch(`https://api.openparliament.ca${voteUrl}?format=json`);
                                if (detailRes.ok) {
                                    const detail = await detailRes.json();
                                    return {
                                        date: detail.date,
                                        result: detail.result,
                                        description: detail.description?.en || detail.description || "No Description",
                                        bill: finalBills[0].number,
                                        party_votes: detail.party_votes || [],
                                        ballot: detail.ballot || [],  // Always include full ballot
                                        url: `https://openparliament.ca${voteUrl}`
                                    };
                                }
                            } catch (e) {
                                console.error("Failed to fetch bill vote", e);
                            }
                            return null;
                        }));

                        const validVotes = billVotes.filter(v => v !== null);
                        if (validVotes.length > 0) {
                            contextParts.push(`Found ${validVotes.length} votes for Bill ${finalBills[0].number} (with complete voting details including individual MP ballots):\n${JSON.stringify(validVotes, null, 2)}`);
                        }
                    }
                }

                if (result.type === 'mp') {
                    const mps = result.data.map(mp => ({
                        name: mp.name,
                        riding: mp.current_riding?.name?.en || mp.current_riding?.name || mp.riding?.name?.en || "Unknown Riding",
                        party: mp.current_party?.short_name?.en || mp.current_party?.short_name || mp.party_name?.en || "Unknown Party",
                        url: `https://openparliament.ca${mp.url}`
                    }));
                    contextParts.push(`Found ${mps.length} MPs${mpLocationFilter ? ` in ${mpLocationFilter}` : ''}:\n${JSON.stringify(mps, null, 2)}`);
                    if (!primarySourceUrl && mps.length > 0) primarySourceUrl = mps[0].url;
                }

                if (result.type === 'debate') {
                    const debates = result.data.map(d => ({
                        date: d.date,
                        title: d.heading?.en || d.heading || "No Title",
                        url: `https://openparliament.ca${d.url}`
                    }));
                    contextParts.push(`Found Debates:\n${JSON.stringify(debates, null, 2)}`);
                    if (!primarySourceUrl && debates.length > 0) primarySourceUrl = debates[0].url;
                }

                if (result.type === 'committee') {
                    const committees = result.data.map(c => ({
                        name: c.name?.en || c.name || "Unknown Committee",
                        short_name: c.short_name?.en || c.short_name || "",
                        url: `https://openparliament.ca${c.url}`
                    }));
                    contextParts.push(`Found Committees:\n${JSON.stringify(committees, null, 2)}`);
                    if (!primarySourceUrl && committees.length > 0) primarySourceUrl = committees[0].url;
                }

                if (result.type === 'vote') {
                    // If user wants individual MP votes, fetch detailed vote data
                    if (fetchIndividualVotes && result.data.length > 0) {
                        const detailedVotes = await Promise.all(result.data.slice(0, 3).map(async (v) => {
                            try {
                                const detailRes = await fetch(`https://api.openparliament.ca${v.url}?format=json`);
                                if (detailRes.ok) {
                                    const detail = await detailRes.json();
                                    return {
                                        date: v.date,
                                        result: v.result,
                                        description: v.description?.en || v.description || "No Description",
                                        bill: v.bill ? v.bill.number : "N/A",
                                        party_votes: detail.party_votes || [],
                                        ballot: detail.ballot || [],  // Individual MP votes
                                        url: `https://openparliament.ca${v.url}`
                                    };
                                }
                            } catch (e) {
                                console.error("Failed to fetch vote detail", e);
                            }
                            return {
                                date: v.date,
                                result: v.result,
                                description: v.description?.en || v.description || "No Description",
                                bill: v.bill ? v.bill.number : "N/A",
                                url: `https://openparliament.ca${v.url}`
                            };
                        }));
                        contextParts.push(`Found Votes (with individual MP ballots):\n${JSON.stringify(detailedVotes, null, 2)}`);
                        if (!primarySourceUrl) primarySourceUrl = detailedVotes[0].url;
                    } else {
                        // Filter votes to ensure they actually relate to the context topic if it's a bill
                        let votes = result.data.map(v => ({
                            date: v.date,
                            result: v.result,
                            description: v.description?.en || v.description || "No Description",
                            bill: v.bill ? v.bill.number : "N/A",
                            url: `https://openparliament.ca${v.url}`
                        }));

                        // If we have a specific bill context (e.g. C-5), filter out votes that are NOT for this bill
                        // unless the vote description explicitly mentions it.
                        if (contextTopic) {
                            const billNumMatch = contextTopic.match(/([CcSs]-\d+)/);
                            if (billNumMatch) {
                                const billNum = billNumMatch[1].toUpperCase();
                                votes = votes.filter(v => {
                                    const billMatch = v.bill === billNum;
                                    const descMatch = v.description.includes(billNum);
                                    return billMatch || descMatch;
                                });
                            }
                        }

                        if (votes.length > 0) {
                            contextParts.push(`Found Votes:\n${JSON.stringify(votes, null, 2)}`);
                            if (!primarySourceUrl) primarySourceUrl = votes[0].url;
                        } else if (contextTopic && result.data.length > 0) {
                            // We found votes but filtered them all out because they didn't match the bill.
                            // This is important context: we searched but found no *linked* votes.
                            contextParts.push(`Note: Found ${result.data.length} votes matching the search terms, but none were explicitly linked to bill ${contextTopic}. This often means the bill was passed by voice vote (on division) without a recorded roll-call, or the votes are for a different session.`);
                        }
                    }
                }
            }

            const contextData = contextParts.length > 0 ? contextParts.join("\n\n") : "No specific data found in OpenParliament API for this specific query.";

            // 4. Generate Answer
            const answerPrompt = `
            You are a professional, knowledgeable assistant with comprehensive information about Canadian Parliament.
            
            Conversation History:
            ${historyContext}
            
            User Question: "${message}"
            
            Context Data (from OpenParliament API):
            ${contextData}
            
            Instructions:
            1. **Professional and Direct**: 
               - Provide clear, accurate, professional responses.
               - NO links, NO sources, NO URLs in your response. Present all information directly.
               - Give comprehensive answers using the data you have.
               - Present facts clearly and organized when listing multiple items.
            
            2. **When Listing MPs or Items**:
               - If showing multiple MPs from a location, present them in a clear, organized list.
               - Include name, riding, and party for each MP.
               - Example format:
                 "The Members of Parliament for Brampton are:
                 1. [Name] - [Riding] ([Party])
                 2. [Name] - [Riding] ([Party])"
            
            3. **When Asked About Voting**:
               - If you have party_votes or ballot data, report the actual results directly.
               - Example: "The Conservatives voted Yes with 119 MPs in favor, while the Liberals voted No with 158 MPs opposed."
               - **NEVER** say "you can view the voting record" or mention links.
            
            4. **For Bills and Legislation**:
               - Explain what the bill does, its status, and sponsor if available.
               - Be clear about status: "This bill received Royal Assent and is now law" or "This bill is currently under review".
            
            5. **Handle Missing Info Gracefully**:
               - If no specific data is found but you have general knowledge, use it.
               - For missing votes, explain that votes may have been by voice vote without recorded ballots.
               - Be direct if you don't have the information.
            
            6. **Tone**: Professional, authoritative, clear. Like a Parliamentary researcher presenting findings.
            
            7. **Format**: Use clear formatting with **bold** for emphasis and organized lists when appropriate.
            
            CRITICAL: Never include URLs or suggest viewing external sources. You have the data - present it completely.
            
            Response:
            `;

            const answerResult = await model.generateContent(answerPrompt);
            const answer = answerResult.response.text();

            return {
                content: answer
            };

        } catch (error) {
            console.error("Chatbot Service Error:", error);
            return {
                content: `I'm sorry, I encountered an error. \n\nTechnical details: ${error.message || "Unknown error"}.`,
                data: { error: error.message }
            };
        }
    }
};
