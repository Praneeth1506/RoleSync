import React, { useState, useEffect, useRef } from 'react';
import { useRecruiter } from '../context/RecruiterContext.jsx';
import { Send, Loader2, User, Bot, MessageSquare } from 'lucide-react';

import './GeneralChat.css'; 

const GeneralChat = () => {
    const { sendChatMessage, error, setError } = useRecruiter();
    
    // State for the chat interface
    const [messages, setMessages] = useState([
        { 
            sender: 'AI', 
            text: 'Hello! I am your AI Assistant. How can I help you with your recruiting tasks today?',
            id: 'welcome'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [localError, setLocalError] = useState(null);

    const messagesEndRef = useRef(null);

    // Function to scroll to the bottom of the chat window
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Scroll whenever messages update
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // --- Send Message Handler ---
    const handleSend = async (e) => {
        e.preventDefault();
        const userMessage = input.trim();

        if (!userMessage || isLoading) return;

        // 1. Clear input and add user message to state
        setInput('');
        setLocalError(null);
        setError(null);
        
        const newUserMsg = { sender: 'User', text: userMessage, id: Date.now() };
        setMessages(prev => [...prev, newUserMsg]);
        
        setIsLoading(true);

        // 2. Call the API (using 'general' chat ID)
        try {
            const response = await sendChatMessage('general', userMessage);
            
            // 3. Add AI response to state
            const aiResponse = { 
                sender: 'AI', 
                text: response.message || response.text || 'Sorry, I received an empty response from the AI.', 
                id: Date.now() + 1 
            };
            
            setMessages(prev => [...prev, aiResponse]);

        } catch (err) {
            console.error("Chat API Error:", err);
            setLocalError(`Failed to get response. Please check network connection or context error.`);
            
        } finally {
            setIsLoading(false);
        }
    };

    // --- Component Rendering ---
    return (
        <div className="general-chat-container container">
            <h1 className="page-title"><MessageSquare size={32} style={{ marginRight: '10px' }}/> General AI Assistant</h1>
            
            {(localError || error) && (
                <div className="alert alert-danger mb-4" style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>
                    {localError || `Context Error: ${error}`}
                </div>
            )}

            <div className="chat-window card">
                <div className="message-history">
                    {messages.map((msg, index) => (
                        <div 
                            key={msg.id || index} 
                            className={`message-bubble ${msg.sender === 'User' ? 'user-message' : 'ai-message'}`}
                        >
                            {/* Removed sender-icon div as per WhatsApp style CSS */}
                            <div className="message-content">
                                <p>{msg.text}</p>
                                {/* Added simulated timestamp */}
                                <span className="message-timestamp">
                                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="message-bubble ai-message loading-bubble">
                            <div className="message-content">
                                <Loader2 size={18} className="spin-anim" />
                                <span style={{ marginLeft: '10px' }}>AI is typing...</span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="message-input-form">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask me anything about recruiting..."
                        className="form-input chat-input"
                        disabled={isLoading}
                    />
                    <button type="submit" className="btn btn-primary chat-send-btn" disabled={isLoading || !input.trim()}>
                        {isLoading ? <Loader2 size={24} className="spin-anim" /> : <Send size={24} />}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default GeneralChat;