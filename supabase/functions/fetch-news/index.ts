import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const logs = []
    const log = (msg) => {
        console.log(msg)
        logs.push(msg)
    }

    try {
        // 1. Initialize clients
        const sbUrl = Deno.env.get('SUPABASE_URL')
        const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const geminiKey = Deno.env.get('GEMINI_API_KEY')
        const newsKey = Deno.env.get('NEWS_API_KEY')

        if (!sbUrl || !sbKey) throw new Error('Missing Supabase credentials')
        if (!geminiKey) throw new Error('Missing GEMINI_API_KEY')
        if (!newsKey) throw new Error('Missing NEWS_API_KEY')

        const supabaseClient = createClient(sbUrl, sbKey)
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

        // 2. Fetch News
        const newsUrl = `https://newsapi.org/v2/top-headlines?country=ca&apiKey=${newsKey}&pageSize=10`

        log(`Fetching news from: ${newsUrl}`)
        const newsResponse = await fetch(newsUrl)
        const newsData = await newsResponse.json()

        if (newsData.status !== 'ok') {
            throw new Error(`News API Error: ${newsData.message}`)
        }

        const rawArticles = newsData.articles || []
        log(`Raw articles from API: ${rawArticles.length}`)

        if (rawArticles.length > 0) {
            log(`First article title: ${rawArticles[0].title}`)
        }

        // Relaxed filter: Just need title and URL
        const articles = rawArticles.filter(a => a.title && a.url)
        log(`Articles to process (after filter): ${articles.length}`)

        // 3. Process with Gemini
        const processedTopics = []
        const errors = []

        for (const article of articles.slice(0, 3)) {
            log(`Processing: ${article.title}`)

            // Handle missing description
            const description = article.description || "No description available. Analyze based on title."

            const prompt = `
        Analyze this news article:
        Title: ${article.title}
        Description: ${description}
        Source: ${article.source.name}

        Provide a JSON response with the following fields:
        - topic: A short topic name (e.g., "Housing Crisis", "Carbon Tax")
        - headline: A neutral, catchy headline
        - ai_summary: A 2-3 sentence summary of the event
        - bias_rating: "Left", "Center", or "Right" (estimated based on source and content)
        - key_points: Array of 3 key bullet points
        - tags: Array of 2-3 relevant tags
        - left_emphasis: What a left-leaning perspective might focus on (1 sentence)
        - right_emphasis: What a right-leaning perspective might focus on (1 sentence)
        - common_ground: What both sides agree on (1 sentence)

        Return ONLY raw JSON, no markdown formatting.
      `

            try {
                const result = await model.generateContent(prompt)
                const response = await result.response
                const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim()

                let analysis
                try {
                    analysis = JSON.parse(text)
                } catch (e) {
                    log(`Failed to parse JSON for ${article.title}: ${text}`)
                    continue
                }

                // 4. Insert into Supabase
                const { data: topicData, error: topicError } = await supabaseClient
                    .from('news_topics')
                    .insert({
                        topic: analysis.topic,
                        headline: analysis.headline,
                        ai_summary: analysis.ai_summary,
                        thumbnail_url: article.urlToImage,
                        published_date: article.publishedAt,
                        source_count_left: analysis.bias_rating === 'Left' ? 1 : 0,
                        source_count_centre: analysis.bias_rating === 'Center' ? 1 : 0,
                        source_count_right: analysis.bias_rating === 'Right' ? 1 : 0,
                        left_emphasis: [analysis.left_emphasis],
                        right_emphasis: [analysis.right_emphasis],
                        common_ground: [analysis.common_ground],
                        key_points: analysis.key_points,
                        tags: analysis.tags,
                        is_featured: false
                    })
                    .select()
                    .single()

                if (topicError) {
                    log(`Error inserting topic: ${topicError.message}`)
                    errors.push(topicError)
                    continue
                }

                const { error: articleError } = await supabaseClient
                    .from('news_articles')
                    .insert({
                        topic: analysis.topic,
                        title: article.title,
                        url: article.url,
                        source: article.source.name,
                        source_bias: analysis.bias_rating,
                        published_date: article.publishedAt,
                        thumbnail_url: article.urlToImage,
                        summary: description
                    })

                if (articleError) {
                    log(`Error inserting article: ${articleError.message}`)
                }

                processedTopics.push(topicData)
                log(`Successfully processed: ${analysis.topic}`)

            } catch (e) {
                log(`Error processing article ${article.title}: ${e.message}`)
                errors.push(e.message)
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed: processedTopics.length,
                logs,
                errors
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message, logs }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
