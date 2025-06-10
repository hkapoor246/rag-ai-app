import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

// The component now accepts selectedModel as a prop
function ChatWindow({ selectedModel }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // A ref to the message list div
  const messageListRef = useRef(null);

  // This effect runs whenever the messages array changes
  useEffect(() => {
    // Scroll to the bottom of the message list
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);


  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prevMessages => [...prevMessages, userMessage]);

    setIsLoading(true);
    setInput('');

    try {
      // *** NEW: Send the selected model name in the request body ***
      const response = await axios.post('http://localhost:8000/chat/', {
        question: input,
        model_name: selectedModel // Pass the selected model
      });

      const aiMessage = { sender: 'ai', text: response.data.answer };
      setMessages(prevMessages => [...prevMessages, aiMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = { sender: 'ai', text: 'Sorry, I ran into an error. Please try again.' };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-window">
      {/* Add the ref to the message list div */}
      <div className="message-list" ref={messageListRef}>
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.sender}`}>
            {message.sender === 'ai' ? (
              <ReactMarkdown>{message.text}</ReactMarkdown>
            ) : (
              message.text
            )}
          </div>
        ))}
        {isLoading && (
          <div className="message ai">
            <span className="typing-indicator"></span>
          </div>
        )}
      </div>
      <form className="message-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your document..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}

export default ChatWindow;