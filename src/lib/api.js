const BASE_URL = "https://api.openparliament.ca";

export const fetchBills = async () => {
    // Fetch bills from the current session (45-1) with a higher limit
    const response = await fetch(`${BASE_URL}/bills/?session=45-1&format=json&limit=100`);
    if (!response.ok) {
        throw new Error("Failed to fetch bills");
    }
    return response.json();
};

export const fetchPassedBills = async () => {
    const response = await fetch(`${BASE_URL}/bills/?session=45-1&format=json&limit=100&status_code=RoyalAssentGiven`);
    if (!response.ok) {
        throw new Error("Failed to fetch passed bills");
    }
    return response.json();
};

export async function fetchMPs() {
    const response = await fetch(`${BASE_URL}/politicians/?format=json&limit=500`);
    if (!response.ok) {
        throw new Error('Failed to fetch MPs');
    }
    return response.json();
}

export async function fetchMPVotes(politicianUrl) {
    if (!politicianUrl) return [];
    // Extract the politician slug from the URL
    const politicianSlug = politicianUrl.split('/').filter(Boolean).pop();
    const response = await fetch(`${BASE_URL}/votes/?format=json&politician=${politicianSlug}&limit=15`);
    if (!response.ok) {
        throw new Error('Failed to fetch MP votes');
    }
    return response.json();
}

export async function fetchBillDetails(billUrl) {
    if (!billUrl) return null;
    const response = await fetch(`${BASE_URL}${billUrl}?format=json`);
    if (!response.ok) {
        throw new Error('Failed to fetch bill details');
    }
    return response.json();
}

export async function fetchBillVotes(billNumber, session) {
    if (!billNumber || !session) return [];
    const response = await fetch(`${BASE_URL}/votes/?format=json&bill=${session}/${billNumber}/&limit=5`);
    if (!response.ok) {
        throw new Error('Failed to fetch bill votes');
    }
    return response.json();
}

export async function fetchMPDebates(politicianUrl) {
    if (!politicianUrl) return [];
    const politicianSlug = politicianUrl.split('/').filter(Boolean).pop();
    const response = await fetch(`${BASE_URL}/debates/?format=json&politician=${politicianSlug}&limit=10`);
    if (!response.ok) {
        throw new Error('Failed to fetch MP debates');
    }
    return response.json();
}

export async function fetchVoteBallots(voteUrl) {
    if (!voteUrl) return [];
    // Ensure we get all ballots
    const response = await fetch(`${BASE_URL}/votes/ballots/?format=json&vote=${voteUrl}&limit=500`);
    if (!response.ok) {
        throw new Error('Failed to fetch vote ballots');
    }
    return response.json();
}

export async function fetchBillSummary(billUrl) {
    if (!billUrl) return null;
    // Use a CORS proxy to fetch the HTML content of the bill page
    // We use the website URL, not the API URL
    const websiteUrl = `https://openparliament.ca${billUrl}`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(websiteUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) return null;
        return await response.text();
    } catch (error) {
        console.error("Failed to fetch bill summary HTML:", error);
        return null;
    }
}

// Fetch debates related to a specific bill
export async function fetchBillDebates(billNumber, session) {
    if (!billNumber || !session) return [];
    try {
        const response = await fetch(`${BASE_URL}/debates/?bill=${session}/${billNumber}&format=json&limit=10`);
        if (!response.ok) return [];
        return response.json();
    } catch (error) {
        console.error("Failed to fetch bill debates:", error);
        return [];
    }
}

// Fetch speeches from a specific debate
export async function fetchDebateSpeeches(debateUrl) {
    if (!debateUrl) return [];
    try {
        const response = await fetch(`${BASE_URL}${debateUrl}speeches/?format=json&limit=50`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.objects || [];
    } catch (error) {
        console.error("Failed to fetch debate speeches:", error);
        return [];
    }
}
