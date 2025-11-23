import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { chatbotService } from '@/services/chatbotService';

export default function Chatbot() {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hi! I can answer questions about Canadian Parliament, bills, MPs, debates, and committees. What would you like to know?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await chatbotService.sendMessage(userMessage, messages);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.content
            }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ An error occurred processing your question. Please try again.',
                error: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold tracking-tight text-black mb-2">
                        Parliament Assistant
                    </h1>
                    <p className="text-gray-600">
                        Ask questions about Canadian bills, MPs, debates, committees, and parliamentary activities
                    </p>
                </div>

                <div className="bg-white border-2 border-black rounded-lg shadow-lg flex flex-col h-[600px]">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''
                                    }`}
                            >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-black text-white' : 'bg-gray-200 text-black'
                                    }`}>
                                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                                </div>
                                <div
                                    className={`flex-1 max-w-[80%] rounded-lg px-4 py-3 ${msg.role === 'user'
                                        ? 'bg-black text-white'
                                        : msg.error
                                            ? 'bg-red-50 border border-red-200 text-red-800'
                                            : 'bg-gray-100 text-gray-900'
                                        }`}
                                >
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 text-black flex items-center justify-center">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div className="bg-gray-100 rounded-lg px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="p-4 border-t-2 border-black">
                        <div className="flex gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about bills, MPs, debates, committees, or parliamentary activities..."
                                className="flex-1 border-black"
                                disabled={isLoading}
                            />
                            <Button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="bg-black hover:bg-gray-800"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </form>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                    <p>💡 <strong>Tip:</strong> Ask about specific MPs by location (e.g., "all Brampton MPs"), bills, voting records, debates, or committees.</p>
                </div>
            </div>
        </div>
    );
}