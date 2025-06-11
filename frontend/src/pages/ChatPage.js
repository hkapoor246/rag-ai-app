// src/pages/ChatPage.js
import React from 'react';
import ChatWindow from '../components/ChatWindow';

// The component now receives all state and functions as props
function ChatPage({ messages, setMessages, selectedModel, setSelectedModel }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
        <label htmlFor="model-select" className="block text-sm font-medium text-gray-300 mb-2">Select AI Model:</label>
        <select
          id="model-select"
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="gpt-4o">GPT-4o (Latest & Best Overall)</option>
          <option value="gpt-4-turbo">GPT-4-Turbo</option>
          <option value="gpt-3.5-turbo">GPT-3.5-Turbo (Fastest)</option>
        </select>
      </div>
      {/* Pass the props down one more level to the ChatWindow */}
      <ChatWindow 
        selectedModel={selectedModel}
        messages={messages}
        setMessages={setMessages}
      />
    </div>
  );
}

export default ChatPage;