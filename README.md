# 🏛️ Parliament Watch

**Making Canadian Politics Accessible and Transparent**

Parliament Watch is a comprehensive web platform that brings Canadian federal politics to your fingertips. Get AI-analyzed news from multiple perspectives, track legislation in plain language, explore MP profiles, and ask questions to an intelligent parliamentary chatbot — all in one place.

## 🌟 Features

### 📰 **Bias-Aware News Aggregation**
- Aggregates political news from multiple Canadian sources across the political spectrum
- AI-powered analysis showing how different perspectives cover the same story
- Side-by-side comparison of left-leaning, centrist, and right-leaning viewpoints
- Highlights common ground and unique emphasis from each political perspective
- Clean, modern interface with featured stories and topic cards

### 📜 **Federal Legislation Tracker**
- Plain-language summaries of Canadian bills and legislation
- Real-time status tracking from introduction through Royal Assent
- Filter by status: All Bills, Passed, or Pending
- Detailed voting records with party-by-party breakdowns
- Search by bill number, title, or content
- Direct links to official OpenParliament sources

### 👥 **MPs Directory**
- Searchable directory of all Canadian Members of Parliament
- Filter by party, province, riding, or name
- Official photos and contact information
- Detailed voting records and parliamentary participation
- Recent debate contributions and speeches
- Party affiliation with color-coded badges

### 🤖 **AI Parliamentary Assistant**
- Intelligent chatbot powered by Gemini
- Answers questions about bills, MPs, voting records, and parliamentary procedures
- Grounded in real-time data from OpenParliament API
- Multi-turn conversations with context awareness
- Professional, informative tone with source citations

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Supabase** account (free tier works)
- **Gemini API key**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sbalagan22/Cluade-Hackahton-COMP.git
   cd Cluade-Hackahton-COMP
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env` and fill in your keys:
   ```bash
   cp .env.example .env
   ```
   Then edit the `.env` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GEMINI_API_KEY=your_GEMINI_api_key
   ```

   **Where to find these:**
   - **Supabase**: Dashboard → Project Settings → API

4. **Set up the database**

   Run the SQL schema in your Supabase SQL Editor:
   ```bash
   cat supabase_schema.sql
   ```
   Then paste and execute in Supabase Dashboard → SQL Editor

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:5173`

---

## 📁 Project Structure

```
parliament-watch/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── bills/          # Bill-specific components
│   │   ├── mps/            # MP-specific components  
│   │   ├── news/           # News-specific components
│   │   └── ui/             # Shared UI primitives
│   ├── pages/              # Main application pages
│   │   ├── News.jsx        # News feed page
│   │   ├── Article.jsx     # Article detail view
│   │   ├── Bills.jsx       # Bills tracker
│   │   ├── MPs.jsx         # MPs directory
│   │   ├── Chatbot.jsx     # AI chatbot interface
│   ├── services/           # Business logic & API calls
│   │   ├── newsService.js
│   │   ├── billService.js
│   │   ├── mpService.js
│   │   ├── chatbotService.js
│   ├── lib/                # Utility libraries
│   │   ├── api.js          # OpenParliament API client
│   │   └── supabase.js     # Supabase client
│   ├── data/               # Static data files
│   ├── App.jsx             # Main app component
│   ├── Layout.jsx          # Layout wrapper with navigation
│   └── main.jsx            # Application entry point
├── supabase/
│   ├── functions/          # Supabase Edge Functions
│   │   └── fetch-rss-news/ # RSS aggregation & AI analysis
│   └── *.sql               # Database schema and migration files
├── public/                 # Static assets
├── package.json            # Dependencies
├── vite.config.js          # Vite configuration
└── tailwind.config.js      # Tailwind CSS configuration
```

---

## 🛠️ Technology Stack

### **Frontend**
- **React 18.2** - UI framework
- **Vite 5.0** - Build tool and dev server
- **React Router 6.20** - Client-side routing
- **TailwindCSS 3.3** - Utility-first CSS framework
- **TanStack React Query 5.0** - Data fetching and caching
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **date-fns** - Date formatting

### **Backend & Services**
- **Supabase** - PostgreSQL database and edge functions
- **Google Gemini 2.0 Flash** - AI language model
- **OpenParliament.ca API** - Canadian parliamentary data

### **Development Tools**
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

---

## 🎨 Key Components

### News Feed
- **Aggregation**: Fetches RSS feeds from CBC, CTV, Global News, National Post, Toronto Star
- **AI Analysis**: Groups articles by topic and analyzes political bias
- **Visualization**: Color-coded bias distribution bars showing source breakdown

### Bills Tracker
- **Data Source**: OpenParliament API for real-time bill information
- **Filtering**: Status-based filtering (Passed vs Pending)
- **Search**: Full-text search across bill numbers, titles, and summaries
- **Details**: Modal view with voting records and party positions

### MPs Directory
- **Comprehensive**: All 338 current Members of Parliament
- **Search**: Multi-field search (name, riding, party, province)
- **Profiles**: Detailed modals with voting history and debate participation
- **Party Filtering**: Quick filters for major political parties

### AI Chatbot
- **Intent Classification**: Detects whether questions are about bills, MPs, or votes
- **Data Grounding**: Fetches real data from OpenParliament API
- **Context Awareness**: Maintains conversation history
- **Source Attribution**: Provides links to official sources

---

## 📊 Data Sources

### OpenParliament.ca API
Official Canadian parliamentary data including:
- Current session bills and legislation
- MP information and profiles
- Voting records and results
- Debate transcripts (Hansard)
- Committee information

### RSS News Feeds
Political news aggregated from:
- **CBC News** (Left-leaning)
- **Toronto Star** (Left-leaning)
- **CTV News** (Centre)
- **Global News** (Centre)
- **National Post** (Right-leaning)

### Google Gemini AI
- News summarization and analysis
- Bias detection and comparison
- Conversational responses
- Natural language understanding

---

## 🔧 Configuration

### Environment Variables

All environment variables must be prefixed with `VITE_` to be accessible in the frontend:

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | ✅ Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | ✅ Yes |
| `VITE_GEMINI_API_KEY` | Google Gemini API key | ✅ Yes |

### Supabase Setup

1. Create a new project in [Supabase](https://supabase.com)
2. Run the SQL files located in the `supabase/` directory in the SQL Editor
3. Deploy edge function: `supabase functions deploy fetch-rss-news`

---

## 🚢 Deployment

### Deploy to Netlify (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [Netlify](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Select your GitHub repository

3. **Configure build settings**
   ```
   Build command: npm run build
   Publish directory: dist
   ```

4. **Add environment variables**
   - Site settings → Environment variables
   - Add all `VITE_*` variables

5. **Deploy!**
   
   Your site will be live at `https://your-site-name.netlify.app`

**Note:** A `netlify.toml` file is included for React Router support and optimized caching.

---

## 🧪 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Development Workflow

1. **Start the dev server**: `npm run dev`
2. **Make your changes**: Edit files in `src/`
3. **Test locally**: Browse to `http://localhost:5173`
4. **Build**: `npm run build` to verify production build
5. **Commit**: Push changes to trigger automatic deployment

<div align="center">

Made with ❤️ for Canadian democracy

</div>
