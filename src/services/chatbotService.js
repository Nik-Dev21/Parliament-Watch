import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const chatbotService = {
    async sendMessage(message, history = []) {
        try {
            const { data, error } = await supabase.functions.invoke('parliament-chatbot', {
                body: { message, history }
            });

            if (error) throw error;

            return {
                content: data.answer,
                sourceUrl: data.sourceUrl
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
