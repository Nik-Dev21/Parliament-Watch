import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import Layout from "./Layout";
import News from "./pages/News";
import Article from "./pages/Article";
import Bills from "./pages/Bills";
import MPs from "./pages/MPs";
import Chatbot from "./pages/Chatbot";

const queryClient = new QueryClient();

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Router>
                <Layout>
                    <Routes>
                        <Route path="/" element={<Navigate to="/news" replace />} />
                        <Route path="/news" element={<News />} />
                        <Route path="/article" element={<Article />} />
                        <Route path="/bills" element={<Bills />} />
                        <Route path="/mps" element={<MPs />} />
                        <Route path="/chatbot" element={<Chatbot />} />
                        <Route path="*" element={<Navigate to="/news" replace />} />
                    </Routes>
                </Layout>
            </Router>
            <Toaster />
        </QueryClientProvider>
    );
}

export default App;
