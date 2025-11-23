import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, Users, Vote, MessageSquare } from "lucide-react";

const navigationItems = [
  {
    title: "News",
    url: createPageUrl("News"),
    icon: FileText,
  },
  {
    title: "Bills",
    url: createPageUrl("Bills"),
    icon: Vote,
  },
  {
    title: "MPs",
    url: createPageUrl("MPs"),
    icon: Users,
  },
  {
    title: "Chatbot",
    url: createPageUrl("Chatbot"),
    icon: MessageSquare,
  },
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        :root {
          --background: 255 255 255;
          --foreground: 0 0 0;
          --card: 255 255 255;
          --card-foreground: 0 0 0;
          --primary: 0 0 0;
          --primary-foreground: 255 255 255;
          --secondary: 245 245 245;
          --secondary-foreground: 0 0 0;
          --muted: 245 245 245;
          --muted-foreground: 115 115 115;
          --accent: 245 245 245;
          --accent-foreground: 0 0 0;
          --border: 229 229 229;
          --radius: 0.375rem;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .political-left {
          color: rgb(59, 130, 246);
        }
        .political-right {
          color: rgb(239, 68, 68);
        }
        .political-centre {
          color: rgb(156, 163, 175);
        }
        .bg-political-left {
          background-color: rgb(59, 130, 246);
        }
        .bg-political-right {
          background-color: rgb(239, 68, 68);
        }
        .bg-political-centre {
          background-color: rgb(156, 163, 175);
        }
      `}</style>

      <nav className="bg-white border-b-2 border-black sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl("News")} className="flex items-center gap-3">
              <div className="text-xl font-bold tracking-tight text-black">
                PARLIAMENT WATCH
              </div>
              <img
                src="/parliament-logo.png"
                alt="Parliament Watch"
                className="h-10 w-auto"
              />
            </Link>

            <div className="flex items-center gap-8">
              {navigationItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md font-semibold text-sm tracking-wide transition-colors ${location.pathname === item.url
                      ? 'bg-black text-white'
                      : 'text-black hover:bg-gray-100'
                    }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <main className="bg-white">
        {children}
      </main>
    </div>
  );
}