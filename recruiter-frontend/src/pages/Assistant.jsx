import React, { useState } from 'react';
import { useRecruiter } from '../context/RecruiterContext.jsx';

const Assistant = () => {
  const { jobDescriptions } = useRecruiter();
  const [selectedJobId, setSelectedJobId] = useState('');
  const [chatStarted, setChatStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const startChat = () => {
    if(!selectedJobId) return;
    const jd = jobDescriptions.find(j => j.id.toString() === selectedJobId);
    setChatStarted(true);
    setMessages([{ sender: 'bot', text: `Hi! I'm ready to help you with the "${jd.title}" role.` }]);
  };

  const sendMsg = (e) => {
    e.preventDefault();
    if(!input.trim()) return;
    setMessages(prev => [...prev, { sender: 'user', text: input }]);
    setInput('');
    setTimeout(() => {
        setMessages(prev => [...prev, { sender: 'bot', text: "I am a mock AI. I received your message." }]);
    }, 800);
  };

  if (!chatStarted) {
    return (
      <div className="card" style={{ maxWidth: '500px', margin: 'auto', textAlign: 'center' }}>
        <h2>AI Assistant</h2>
        <p>Select a job role to start chatting.</p>
        <select className="form-select" style={{ marginBottom: '15px' }} value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}>
            <option value="">-- Select Role --</option>
            {jobDescriptions.map(jd => <option key={jd.id} value={jd.id}>{jd.title}</option>)}
        </select>
        <button className="btn" onClick={startChat} disabled={!selectedJobId}>Start Chat</button>
      </div>
    );
  }

  return (
    <div className="card" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
       <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', display:'flex', justifyContent:'space-between'}}>
           <strong>Chat Session</strong>
           <button style={{border:'none', background:'none', color:'red', cursor:'pointer'}} onClick={() => setChatStarted(false)}>Close</button>
       </div>
       <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display:'flex', flexDirection:'column', gap:'10px' }}>
           {messages.map((m, i) => (
               <div key={i} style={{ 
                   alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                   background: m.sender === 'user' ? '#0056b3' : '#eee',
                   color: m.sender === 'user' ? '#fff' : '#000',
                   padding: '8px 12px', borderRadius: '15px', maxWidth: '70%'
               }}>{m.text}</div>
           ))}
       </div>
       <form onSubmit={sendMsg} style={{ display: 'flex', gap: '10px', paddingTop: '10px' }}>
           <input className="form-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." />
           <button className="btn">Send</button>
       </form>
    </div>
  );
};

export default Assistant;