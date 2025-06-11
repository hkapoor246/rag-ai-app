 // src/App.js
 import React, { useState } from 'react';
 import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
 import ChatPage from './pages/ChatPage';
 import DocumentsPage from './pages/DocumentsPage';
 
 function App() {
   // --- STATE LIFTED UP TO THE TOP LEVEL ---
   const [messages, setMessages] = useState([]);
   const [selectedModel, setSelectedModel] = useState('gpt-4o');
 
   return (
     <Router>
       <div className="bg-gray-900 text-white min-h-screen font-sans">
         <header className="bg-gray-800 shadow-md">
           <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
             <div className="text-2xl font-bold text-white">
               RAG AI
             </div>
             <div className="flex space-x-4">
               <NavLink to="/" className={({ isActive }) => `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
                 Chat
               </NavLink>
               <NavLink to="/documents" className={({ isActive }) => `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
                 Documents
               </NavLink>
             </div>
           </nav>
         </header>
         <main className="container mx-auto px-6 py-8">
           <Routes>
             {/* Pass the state and the functions to update it down to the ChatPage */}
             <Route 
               path="/" 
               element={<ChatPage 
                 messages={messages} 
                 setMessages={setMessages}
                 selectedModel={selectedModel}
                 setSelectedModel={setSelectedModel}
               />} 
             />
             <Route path="/documents" element={<DocumentsPage />} />
           </Routes>
         </main>
       </div>
     </Router>
   );
 }
 
 export default App;
