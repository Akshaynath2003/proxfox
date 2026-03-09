import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { GeminiFace } from '../components/ui/GeminiFace';
import { Send, Mic } from 'lucide-react';
import { apiUrl, authHeader } from '../utils/api';
import './AIAdvisor.css';

export function AIAdvisor() {
    const [faceState, setFaceState] = useState('idle'); // idle, listening, thinking, speaking
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hello! I am your ProxFox AI Financial Advisor. I have access to your real transaction data and savings goals. How can I help you optimize your finances today?' }
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
        const userText = inputVal;
        setInputVal('');

        // Trigger AI thinking state
        setFaceState('thinking');

        try {
            const res = await fetch(apiUrl('/api/ai/chat'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({
                    message: userText,
                    history: [...messages, newMsg].slice(-8) // send recent context
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setFaceState('speaking');
                setMessages(prev => [
                    ...prev,
                    { role: 'assistant', text: data.reply }
                ]);
            } else {
                const errData = await res.json().catch(() => ({}));
                setFaceState('speaking');
                setMessages(prev => [
                    ...prev,
                    { role: 'assistant', text: errData.message || 'Sorry, I encountered an error. Please try again.' }
                ]);
            }
        } catch (error) {
            console.error("AI Chat Error:", error);
            setFaceState('speaking');
            setMessages(prev => [
                ...prev,
                { role: 'assistant', text: "I'm sorry, I couldn't connect to the AI service. Please check your connection and try again." }
            ]);
        }

        setTimeout(() => setFaceState('idle'), 3000);
    };

    const handleMicClick = () => {
        if (faceState === 'listening') {
            setFaceState('idle');
        } else {
            setFaceState('listening');
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
                <p className="subtitle">Personalized insights powered by Gemini — connected to your real data</p>
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
                            <div className="stat-pill">Connected to Your Data</div>
                            <div className="stat-pill">Powered by Gemini</div>
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
                                placeholder="Ask about your budget, spending habits, or savings goals..."
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
