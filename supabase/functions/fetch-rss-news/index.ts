import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.18.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RSSItem {
    title: string
    description: string
    link: string
    pubDate: string
    guid: string
    imageUrl?: string
}

function parseRSSFeed(xmlText: string): RSSItem[] {
    const items: RSSItem[] = []

    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    const titleRegex = /<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/is
    const descRegex = /<description[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/is
    const linkRegex = /<link[^>]*>(.*?)<\/link>/is
    const pubDateRegex = /<pub[dD]ate[^>]*>(.*?)<\/pub[dD]ate>/is
    const guidRegex = /<guid[^>]*>(.*?)<\/guid>/is

    const mediaContentRegex = /<media:content[^>]*url=["']([^"']+)["'][^>]*>/i
    const enclosureRegex = /<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image/i
    const mediaThumbnailRegex = /<media:thumbnail[^>]*url=["']([^"']+)["'][^>]*>/i
    const contentEncodedRegex = /<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/is
    const descriptionRegex = /<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/is

    let match
    while ((match = itemRegex.exec(xmlText)) !== null) {
        const itemXml = match[1]

        const titleMatch = titleRegex.exec(itemXml)
        const descMatch = descRegex.exec(itemXml)
        const linkMatch = linkRegex.exec(itemXml)
        const pubDateMatch = pubDateRegex.exec(itemXml)
        const guidMatch = guidRegex.exec(itemXml)

        if (titleMatch && linkMatch && pubDateMatch) {
            const cleanTitle = titleMatch[1]
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/<!\[CDATA\[|\]\]>/g, '')
                .trim()

            const cleanDesc = descMatch ? descMatch[1]
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/<!\[CDATA\[|\]\]>/g, '')
                .replace(/<[^>]+>/g, '')
                .trim() : ''

            const cleanLink = linkMatch[1].trim()
            const cleanGuid = guidMatch ? guidMatch[1].trim() : cleanLink

            let imageUrl: string | undefined

            // 1. Try media:content
            const mediaContentMatch = mediaContentRegex.exec(itemXml)
            if (mediaContentMatch) imageUrl = mediaContentMatch[1]

            // 2. Try enclosure
            if (!imageUrl) {
                const enclosureMatch = enclosureRegex.exec(itemXml)
                if (enclosureMatch) imageUrl = enclosureMatch[1]
            }

            // 3. Try media:thumbnail
            if (!imageUrl) {
                const mediaThumbnailMatch = mediaThumbnailRegex.exec(itemXml)
                if (mediaThumbnailMatch) imageUrl = mediaThumbnailMatch[1]
            }

            // 4. Try extracting from content:encoded
            if (!imageUrl) {
                const contentEncodedMatch = contentEncodedRegex.exec(itemXml)
                if (contentEncodedMatch) {
                    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i
                    const imgMatch = imgRegex.exec(contentEncodedMatch[1])
                    if (imgMatch) imageUrl = imgMatch[1]
                }
            }

            // 5. Try extracting from description
            if (!imageUrl && descMatch) {
                const imgRegex = /<img[^>]+src=["']([^"']+)["']/i
                const imgMatch = imgRegex.exec(descMatch[1])
                if (imgMatch) imageUrl = imgMatch[1]
            }

            items.push({
                title: cleanTitle,
                description: cleanDesc,
                link: cleanLink,
                pubDate: pubDateMatch[1].trim(),
                guid: cleanGuid,
                imageUrl: imageUrl,
            })
        }
    }

    return items
}

async function fetchOgImage(url: string): Promise<string | undefined> {
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.google.com/'
            },
            signal: controller.signal
        })
        clearTimeout(timeoutId)
        if (!res.ok) return undefined
        const html = await res.text()

        // Helper to validate image URL (ignore placeholders)
        const isValidImage = (imgUrl: string) => {
            if (!imgUrl) return false
            if (imgUrl.includes('ogimage-tsun.png')) return false // Toronto Sun placeholder
            if (imgUrl.includes('default-image')) return false
            return true
        }

        // 1. Try JSON-LD (Reliable for Globe and Mail / Toronto Sun)
        const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)
        for (const match of jsonLdMatches) {
            try {
                const json = JSON.parse(match[1])
                const dataItems = Array.isArray(json) ? json : [json]

                for (const data of dataItems) {
                    // Check for ImageObject or Article with image
                    if (data.image) {
                        if (typeof data.image === 'string' && isValidImage(data.image)) return data.image
                        if (data.image.url && isValidImage(data.image.url)) return data.image.url
                        if (Array.isArray(data.image) && data.image[0]) {
                            if (typeof data.image[0] === 'string' && isValidImage(data.image[0])) return data.image[0]
                            if (data.image[0].url && isValidImage(data.image[0].url)) return data.image[0].url
                        }
                    }
                    if (data.thumbnailUrl && isValidImage(data.thumbnailUrl)) return data.thumbnailUrl
                }
            } catch (e) {
                // ignore json parse error
            }
        }

        // 2. Try Meta Tags (og:image, twitter:image)
        const metaTags = html.match(/<meta[^>]+>/g) || []
        for (const tag of metaTags) {
            if (tag.includes('og:image') || tag.includes('twitter:image')) {
                const contentMatch = tag.match(/content=["']([^"']+)["']/i)
                if (contentMatch) {
                    let imgUrl = contentMatch[1]
                    if (imgUrl.startsWith('/')) {
                        const urlObj = new URL(url)
                        imgUrl = `${urlObj.protocol}//${urlObj.host}${imgUrl}`
                    }
                    if (isValidImage(imgUrl)) return imgUrl
                }
            }
        }

        return undefined
    } catch (e: any) {
        console.log(`Error fetching image for ${url}: ${e.message}`)
        return undefined
    }
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const logs: string[] = []
    const log = (msg: string) => {
        console.log(msg)
        logs.push(msg)
    }

    try {
        const sbUrl = Deno.env.get('SUPABASE_URL')
        const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

        if (!sbUrl || !sbKey || !anthropicKey) {
            throw new Error('Missing environment variables')
        }
        const supabase = createClient(sbUrl, sbKey)
        const anthropic = new Anthropic({ apiKey: anthropicKey })

        log('Fetching active news sources...')

        const { data: sources, error: sourcesError } = await supabase
            .from('news_sources')
            .select('*')
            .eq('is_active', true)

        if (sourcesError) throw new Error(sourcesError.message || 'Failed to fetch sources')

        // Filter out unwanted sources
        const validSources = (sources || []).filter(s =>
            !s.name.includes('CP24') && !s.name.includes('CTV News')
        )

        log(`Found ${validSources.length} active sources (after filtering)`)

        const allArticles: Array<RSSItem & { source: any }> = []

        // Fetch RSS feeds
        for (const source of validSources) {
            log(`Fetching RSS from ${source.name}...`)

            try {
                const response = await fetch(source.rss_feed_url, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                })
                if (!response.ok) {
                    log(`Failed to fetch ${source.name}: ${response.status}`)
                    continue
                }

                const xmlText = await response.text()
                const items = parseRSSFeed(xmlText)
                log(`Parsed ${items.length} articles from ${source.name}`)

                // Fetch OG images for items missing images
                // We'll do this in parallel batches to speed it up
                const batchSize = 5
                for (let i = 0; i < items.length; i += batchSize) {
                    const batch = items.slice(i, i + batchSize)
                    await Promise.all(batch.map(async (item) => {
                        if (!item.imageUrl) {
                            // Only try to fetch if missing
                            const ogImage = await fetchOgImage(item.link)
                            if (ogImage) item.imageUrl = ogImage
                        }
                    }))
                }

                // Take ALL articles from each source (no limit)
                items.forEach(item => allArticles.push({ ...item, source }))
            } catch (error: any) {
                log(`Error processing ${source.name}: ${error.message}`)
            }
        }

        log(`Total articles collected: ${allArticles.length}`)

        // Step 1: Group articles by topic using Claude
        log('Grouping articles by topic...')

        // Limit to 300 articles for grouping prompt to avoid token limits, but prioritize recent ones
        // Actually, we should try to send as many as possible.
        // Let's just send titles to save tokens.
        const articleSummaries = allArticles.map((a: any, i: number) =>
            `${i + 1}. ${a.title} (${a.source.name}) - ${a.description?.substring(0, 150)}...`
        ).join('\n')

        log(`Generating grouping for ${allArticles.length} articles...`)

        const groupingSystemPrompt = `
You are analyzing news headlines from Canadian sources with different political biases.
Your job is to find stories that are covered by MULTIPLE sources and group them together.

Instructions:
1. Read the list of articles.
2. Identify stories that are the SAME event/topic covered by at least 2 different sources.
3. Ignore unique stories covered by only 1 source.
4. For each group, provide:
    - "title": A neutral, descriptive title for the event.
    - "article_indices": The numbers (1-based) of the articles in this group.
    - "bias_summary": A brief note on how different sources framed it (optional).

Output format: JSON array of objects.
Example:
[
    { "title": "Bill C-11 Passes Senate", "article_indices": [1, 5, 12], "bias_summary": "CBC focused on..." }
]
`

        const groupingMsg = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 4096,
            system: groupingSystemPrompt + "\n\nIMPORTANT: Output ONLY the raw JSON array. Do not use markdown blocks. Do not include any explanatory text.",
            messages: [
                { role: "user", content: `Articles:\n${articleSummaries}` },
                { role: "assistant", content: "[" }
            ]
        })

        const groupingText = "[" + groupingMsg.content[0].text

        let groups: any[] = []
        try {
            // Attempt to find the JSON array
            const start = groupingText.indexOf('[')
            const end = groupingText.lastIndexOf(']')

            if (start !== -1 && end !== -1) {
                const jsonStr = groupingText.substring(start, end + 1)
                groups = JSON.parse(jsonStr)
            } else {
                throw new Error("No JSON brackets found")
            }
            log(`Identified ${groups.length} topics with 2+ sources`)
        } catch (e: any) {
            console.error("JSON Parse Error:", e.message)
            console.error("Raw Output:", groupingText)
            // Fallback: Return empty array instead of crashing
            groups = []
            log(`Failed to group articles. Returning empty list to prevent crash.`)
        }

        // Step 2: Process each topic group
        const processedTopics = []
        const errors: string[] = []

        for (const group of groups.slice(0, 100)) {
            log(`Processing topic: ${group.topic}`)

            const groupArticles = group.articleIndexes
                .map((idx: number) => allArticles[idx])
                .filter((a: any) => a !== undefined)

            if (groupArticles.length < 2) {
                log(`Skipping ${group.topic} - only ${groupArticles.length} sources`)
                continue
            }

            // Deduplicate articles by source
            const uniqueSources = new Set();
            const uniqueArticles = [];
            for (const article of groupArticles) {
                if (!uniqueSources.has(article.source.name)) {
                    uniqueSources.add(article.source.name);
                    uniqueArticles.push(article);
                }
            }

            if (uniqueArticles.length < 2) {
                log(`Skipping ${group.topic} - only ${uniqueArticles.length} unique sources`)
                continue
            }

            // Count source biases
            const biasCount = { Left: 0, Center: 0, Right: 0 }
            uniqueArticles.forEach((a: any) => {
                if (a.source.bias_rating) biasCount[a.source.bias_rating as keyof typeof biasCount]++
            })

            // Require at least 2 different bias categories (e.g., Left + Right, or Left + Center + Right)
            const biasCategories = Object.values(biasCount).filter(count => count > 0).length
            if (biasCategories < 2) {
                log(`Skipping ${group.topic} - only ${biasCategories} bias category (need 2+)`)
                continue
            }

            // Analyze the topic
            const topicSystemPrompt = `
You are a STRICT Senior News Editor. Your job is to write a comprehensive, neutral news summary based on multiple sources.

CRITICAL FORMATTING RULES:
1. You MUST output exactly 6 paragraphs.
2. DO NOT output a single block of text.
3. DO NOT use markdown headers (like ## or **). Just write the paragraphs separated by double newlines.
4. Each paragraph must correspond to the specific section below.

STRUCTURE:
Paragraph 1 (The Lede): 1-2 sentences summarizing the key who, what, when, where, why, how.
Paragraph 2 (Key Details): Expand on the main event or announcement with specific details.
Paragraph 3 (Official Statements / Quotes): Include quotes from relevant officials, experts, or witnesses.
Paragraph 4 (Additional Context): Provide background info, statistics, or historical context.
Paragraph 5 (Counterpoint / Opposition): Present disagreements, criticisms, or alternative viewpoints.
Paragraph 6 (What Happens Next): Describe future steps, expected outcomes, or implications.

Provide JSON:
{
  "ai_summary": "The full 6-paragraph summary text here. Ensure double newlines \\n\\n between paragraphs.",
  "key_points": ["point 1", "point 2", "point 3"],
  "tags": ["tag1", "tag2", "tag3"],
  "left_emphasis": "What left-leaning sources emphasize (1 sentence)",
  "right_emphasis": "What right-leaning sources emphasize (1 sentence)",
  "common_ground": "What all sources agree on (1 sentence)"
}

Return ONLY JSON, no markdown.
`

            try {
                const analysisMsg = await anthropic.messages.create({
                    model: "claude-3-haiku-20240307",
                    max_tokens: 1024,
                    system: topicSystemPrompt,
                    messages: [
                        { role: "user", content: `Analyze this Canadian news topic covered by multiple sources:\n${uniqueArticles.map((a: any) => `[${a.source.name}] ${a.description || a.title}`).join('\n\n')}` }
                    ]
                })

                const analysisText = analysisMsg.content[0].text.replace(/```json/g, '').replace(/```/g, '').trim()

                let analysis
                try {
                    analysis = JSON.parse(analysisText)
                } catch (e) {
                    log(`Failed to parse analysis for ${group.topic}`)
                    continue
                }

                // Insert topic
                const { data: topicData, error: topicError } = await supabase
                    .from('news_topics')
                    .insert({
                        topic: group.topic,
                        headline: group.headline,
                        ai_summary: analysis.ai_summary,
                        thumbnail_url: uniqueArticles[0].imageUrl,
                        published_date: uniqueArticles[0].pubDate,
                        source_count_left: biasCount.Left,
                        source_count_centre: biasCount.Center,
                        source_count_right: biasCount.Right,
                        left_emphasis: [analysis.left_emphasis],
                        right_emphasis: [analysis.right_emphasis],
                        common_ground: [analysis.common_ground],
                        key_points: analysis.key_points,
                        tags: analysis.tags,
                        is_featured: processedTopics.length === 0
                    })
                    .select()
                    .single()

                if (topicError) {
                    log(`Error inserting topic: ${topicError.message}`)
                    errors.push(topicError.message)
                    continue
                }

                // Insert all articles for this topic
                for (const article of uniqueArticles) {
                    await supabase
                        .from('news_articles')
                        .insert({
                            topic: group.topic,
                            title: article.title,
                            url: article.link,
                            source: article.source.name,
                            source_bias: article.source.bias_rating,
                            published_date: article.pubDate,
                            thumbnail_url: article.imageUrl,
                            summary: article.description
                        })
                }

                processedTopics.push(topicData)
                log(`Successfully processed: ${group.topic} (${groupArticles.length} sources)`)

            } catch (e: any) {
                log(`Error processing ${group.topic}: ${e.message}`)
                errors.push(e.message)
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed: processedTopics.length,
                totalArticles: allArticles.length,
                logs,
                errors
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message || 'Unknown error', logs }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
