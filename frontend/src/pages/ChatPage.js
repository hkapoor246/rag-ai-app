import React, { useState } from 'react';
import ChatWindow from '../components/ChatWindow';

function ChatPage() {
  // State to hold the currently selected model
  const [selectedModel, setSelectedModel] = useState('gpt-4o');

  return (
    <div>
      <div className="model-selector">
        <label htmlFor="model-select">Select AI Model: </label>
        <select 
          id="model-select" 
          value={selectedModel} 
          onChange={e => setSelectedModel(e.target.value)}
        >
          <option value="gpt-4o">GPT-4o (Best Quality)</option>
          <option value="gpt-3.5-turbo">GPT-3.5-Turbo (Fastest)</option>
        </select>
      </div>
      {/* Pass the selected model down to the ChatWindow as a prop */}
      <ChatWindow selectedModel={selectedModel} />
    </div>
  );
}

export default ChatPage;