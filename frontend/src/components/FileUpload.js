// src/components/FileUpload.js
import React, { useState } from 'react';
import axios from 'axios';

function FileUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setMessage('');
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    setMessage('Uploading and processing...');
    try {
      const response = await axios.post('http://localhost:8000/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(response.data.detail || 'Upload successful!');
      if (onUploadSuccess) { onUploadSuccess(); }
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage('Error uploading file. Check the console.');
    }
  };

  return (
    <div className="space-y-4">
      <input 
        type="file" 
        onChange={handleFileChange} 
        accept=".pdf, .docx, .txt" 
        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      <button onClick={handleUpload} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
        Upload
      </button>
      {message && <p className="text-sm text-center text-gray-300 mt-2">{message}</p>}
    </div>
  );
}
export default FileUpload;