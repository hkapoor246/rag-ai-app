// src/components/ChatWindow.js
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

// A new component for displaying a single source
function Source({ source, index }) {
  return (
    <div className="border border-gray-700 rounded-lg p-3 text-sm text-gray-300">
      <p className="font-semibold text-white mb-2">Source {index + 1}: {source.source.split('/').pop()}</p>
      <p className="line-clamp-3">{source.page_content}</p>
    </div>
  );
}

function ChatWindow({ selectedModel }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messageListRef = useRef(null);
  
  // New state to manage which message's sources are visible
  const [visibleSources, setVisibleSources] = useState(null); 

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    
    setIsLoading(true);
    setInput('');
    setVisibleSources(null); // Hide sources when a new message is sent

    try {
      const response = await axios.post('http://localhost:8000/chat/', {
        question: input,
        model_name: selectedModel
      });
      // Add a unique ID to the AI message for tracking sources visibility
      const aiMessage = { sender: 'ai', text: response.data.answer, sources: response.data.sources, id: Date.now() };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = { sender: 'ai', text: 'Sorry, I ran into an error. Please try again.', id: Date.now() };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSources = (messageId) => {
    setVisibleSources(prev => (prev === messageId ? null : messageId));
  };

  return (
    <div className="bg-gray-800 shadow-lg rounded-lg flex flex-col h-[70vh]">
      <div className="flex-grow p-6 space-y-6 overflow-y-auto" ref={messageListRef}>
        {messages.map((message) => (
          <div key={message.id || message.text} className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`p-4 rounded-lg max-w-lg ${message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{message.text}</ReactMarkdown>
              </div>
            </div>
            {message.sender === 'ai' && message.sources && (
              <div className="mt-2 w-full max-w-lg">
                <button onClick={() => toggleSources(message.id)} className="text-xs text-blue-400 hover:underline">
                  {visibleSources === message.id ? 'Hide Sources' : 'View Sources'}
                </button>
                {visibleSources === message.id && (
                  <div className="mt-2 space-y-2">
                    {message.sources.map((source, index) => (
                      <Source key={index} source={source} index={index} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {isLoading && <div className="flex justify-start"><div className="bg-gray-700 p-4 rounded-lg">Thinking...</div></div>}
      </div>
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <form className="flex gap-4" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your document..."
            disabled={isLoading}
            className="flex-grow bg-gray-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatWindow;