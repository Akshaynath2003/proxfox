import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { GeminiFace } from '../components/ui/GeminiFace';
import { Send, Mic } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './AIAdvisor.css';

// Initialize Gemini API
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export function AIAdvisor() {
    const [faceState, setFaceState] = useState('idle'); // idle, listening, thinking, speaking
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hello! I am your ProxFox AI Financial Advisor. How can I help you optimize your finances today?' }
    ]);
    const [inputVal, setInputVal] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!inputVal.trim()) return;

        // User message
        const newMsg = { role: 'user', text: inputVal };
        setMessages(prev => [...prev, newMsg]);
        setInputVal('');

        // Trigger AI thinking state
        setFaceState('thinking');

        if (!genAI) {
            setTimeout(() => {
                setFaceState('speaking');
                setMessages(prev => [
                    ...prev,
                    { role: 'assistant', text: "Error: No API Key found. Please add VITE_GEMINI_API_KEY to your .env file." }
                ]);
                setTimeout(() => setFaceState('idle'), 3000);
            }, 1000);
            return;
        }

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `You are a professional, helpful AI financial advisor named ProxFox. Keep your responses concise, focused on personal finance, budgeting, predicting expenses, and saving. Do not use markdown headers, just plain text or simple bullet points. The user says: "${inputVal}"`;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            setFaceState('speaking');
            setMessages(prev => [
                ...prev,
                { role: 'assistant', text: responseText }
            ]);
        } catch (error) {
            console.error("Gemini API Error:", error);
            setFaceState('speaking');
            setMessages(prev => [
                ...prev,
                { role: 'assistant', text: "I'm sorry, I encountered an error connecting to my AI brain. Please try again later." }
            ]);
        }

        setTimeout(() => setFaceState('idle'), 3000);
    };

    const handleMicClick = () => {
        if (faceState === 'listening') {
            setFaceState('idle');
        } else {
            setFaceState('listening');
            // Simulate listening completion
            setTimeout(() => {
                setFaceState('thinking');
                setTimeout(() => setFaceState('idle'), 1000);
            }, 3000);
        }
    };

    return (
        <div className="advisor-page">
            <header className="page-header center-header">
                <h1>AI Financial Advisor</h1>
                <p className="subtitle">Interactive insights powered by Gemini</p>
            </header>

            <div className="advisor-layout">
                {/* Left column: AI Face Visualization */}
                <div className="advisor-visuals">
                    <Card className="face-container-card">
                        <div className="gemini-status">
                            <span className={`status-indicator ${faceState}`}></span>
                            {faceState.charAt(0).toUpperCase() + faceState.slice(1)}...
                        </div>

                        <div className="face-wrapper">
                            <GeminiFace state={faceState} size={180} />
                        </div>

                        <div className="ai-stats">
                            <div className="stat-pill">Analysis Confidence: 98%</div>
                            <div className="stat-pill">Connected to Portfolio</div>
                        </div>
                    </Card>
                </div>

                {/* Right column: Chat Interface */}
                <div className="advisor-chat">
                    <Card className="chat-card-container">
                        <div className="chat-messages">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`message-row ${msg.role}`}>
                                    <div className={`message-bubble ${msg.role}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="chat-input-area">
                            <button
                                className={`mic-btn ${faceState === 'listening' ? 'active' : ''}`}
                                onClick={handleMicClick}
                            >
                                <Mic size={20} />
                            </button>
                            <input
                                type="text"
                                placeholder="Ask about your budget, investments, or expenses..."
                                value={inputVal}
                                onChange={e => setInputVal(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                            />
                            <Button onClick={handleSend} variant="primary" size="sm">
                                <Send size={18} />
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
