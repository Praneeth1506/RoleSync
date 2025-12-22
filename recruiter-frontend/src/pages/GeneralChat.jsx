import React, { useState, useEffect, useRef } from 'react';
import { useRecruiter } from '../context/RecruiterContext.jsx';
import { Send, Loader2, MessageSquare, Bot, User, AlertTriangle, X } from 'lucide-react';
import './GeneralChat.css'; 

const GeneralChat = () => {
    const { sendChatMessage, error, setError } = useRecruiter();
    
    const [messages, setMessages] = useState([
        { 
            sender: 'AI', 
            text: 'Hello! I am your **Recruitment Assistant**. I can help you draft job descriptions, suggest interview questions, or analyze hiring trends. How can I assist you today?',
            id: 'welcome'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [localError, setLocalError] = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // --- CHAT FORMATTING HELPER ---
    const formatMessage = (text) => {
        if (!text) return "";
        // Convert **bold** to <b> tags
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        // Handle basic bullet points
        formatted = formatted.replace(/^\*\s/gm, '• ');
        return <div dangerouslySetInnerHTML={{ __html: formatted }} style={{ whiteSpace: 'pre-wrap' }} />;
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSend = async (e) => {
        e.preventDefault();
        const userMessage = input.trim();

        if (!userMessage || isLoading) return;

        setInput('');
        setLocalError(null);
        setError(null);
        
        const newUserMsg = { sender: 'User', text: userMessage, id: Date.now() };
        setMessages(prev => [...prev, newUserMsg]);
        
        setIsLoading(true);

        try {
            const response = await sendChatMessage('general', userMessage);
            
            // Extract text field safely
            const botText = 
                response.reply || 
                response.message || 
                response.response || 
                response.text || 
                (typeof response === 'string' ? response : null);

            const aiResponse = { 
                sender: 'AI', 
                text: botText || "I received the data, but the response text was empty.", 
                id: Date.now() + 1 
            };
            
            setMessages(prev => [...prev, aiResponse]);

        } catch (err) {
            setLocalError("Connection timed out. Please try again.");
        } finally {
            setIsLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    return (
        <div className="general-chat-container container">
            <header className="chat-header-section">
                <h1 className="page-title">
                    <MessageSquare size={32} className="title-icon" /> 
                    Recruitment Assistant
                </h1>
            </header>
            
            {(localError || error) && (
                <div className="alert-banner error">
                    <AlertTriangle size={18} />
                    <span>{localError || error}</span>
                    <X size={14} className="close-alert" onClick={() => {setLocalError(null); setError(null);}} />
                </div>
            )}

            <div className="chat-window card">
                <div className="message-history">
                    {messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={`message-bubble-wrapper ${msg.sender === 'User' ? 'user-align' : 'ai-align'}`}
                        >
                            <div className="message-avatar">
                                {msg.sender === 'User' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`message-bubble ${msg.sender === 'User' ? 'user-style' : 'ai-style'}`}>
                                <div className="message-content">
                                    {/* USE THE FORMATTER HERE */}
                                    {formatMessage(msg.text)}
                                    <span className="message-timestamp">
                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="message-bubble-wrapper ai-align">
                            <div className="message-avatar bot-loading"><Bot size={16} /></div>
                            <div className="message-bubble ai-style loading">
                                <div className="typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="message-input-area">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        className="chat-input-field"
                        disabled={isLoading}
                    />
                    <button 
                        type="submit" 
                        className="chat-send-button" 
                        disabled={isLoading || !input.trim()}
                    >
                        {isLoading ? <Loader2 className="spin-anim" size={20} /> : <Send size={20} />}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default GeneralChat;