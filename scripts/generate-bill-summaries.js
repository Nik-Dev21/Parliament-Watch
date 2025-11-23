import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '../src/data/bill_summaries.json');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function fetchBillsList() {
    console.log('Fetching bills list from OpenParliament...');
    const response = await fetch('https://api.openparliament.ca/bills/?session=45-1&format=json&limit=100');
    if (!response.ok) {
        throw new Error(`Failed to fetch bills list: ${response.statusText}`);
    }
    const data = await response.json();
    return data.objects.filter(bill => bill.number !== 'C-1' && bill.number !== 'S-1');
}

async function fetchBillDetails(url) {
    try {
        const response = await fetch(`https://api.openparliament.ca${url}?format=json`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch details for ${url}:`, error);
        return null;
    }
}

async function generateSummaries() {
    try {
        const billsList = await fetchBillsList();
        console.log(`Found ${billsList.length} bills. Fetching details...`);

        const billsData = {};
        const billsForAI = [];

        // Fetch details for each bill to get status_code
        // Process in chunks to be nice to the API
        const CHUNK_SIZE = 5;
        for (let i = 0; i < billsList.length; i += CHUNK_SIZE) {
            const chunk = billsList.slice(i, i + CHUNK_SIZE);
            console.log(`Processing chunk ${i / CHUNK_SIZE + 1}/${Math.ceil(billsList.length / CHUNK_SIZE)}...`);

            await Promise.all(chunk.map(async (bill) => {
                const details = await fetchBillDetails(bill.url);
                billsData[bill.number] = {
                    summary: "", // Will be filled by AI
                    status_code: details?.status_code || "Introduced",
                    name: bill.name.en
                };
                billsForAI.push(`${bill.number}: ${bill.name.en}`);
            }));

            // Small delay
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Prepare the prompt
        const promptList = billsForAI.join('\n');

        const prompt = `
      You are a political analyst. I will provide a list of Canadian federal bills.
      
      For EACH bill in the list, write a 2-3 sentence plain-language summary of what the bill aims to do, based on its title.
      The summary should be neutral, factual, and easy to understand.
      
      Return ONLY a valid JSON object where the key is the bill number (e.g., "C-2") and the value is the summary string.
      Do not include any markdown formatting.

      Bills:
      ${promptList}
    `;

        console.log('Generating summaries with Gemini...');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const summaries = JSON.parse(text);

        // Merge summaries into billsData
        Object.keys(summaries).forEach(number => {
            if (billsData[number]) {
                billsData[number].summary = summaries[number];
            }
        });

        // Ensure directory exists
        await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });

        // Save to file
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(billsData, null, 2));
        console.log(`Successfully saved data for ${Object.keys(billsData).length} bills to ${OUTPUT_FILE}`);

    } catch (error) {
        console.error('Error generating data:', error);
        process.exit(1);
    }
}

generateSummaries();
