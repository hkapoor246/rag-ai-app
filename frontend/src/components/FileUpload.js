import React, { useState } from 'react';
import axios from 'axios';

// Define the styles within the component for simplicity
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  input: {
    marginBottom: '10px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    cursor: 'pointer',
    backgroundColor: '#61dafb',
    border: 'none',
    borderRadius: '5px',
    color: '#282c34',
  },
  message: {
    marginTop: '15px',
    fontSize: '14px',
  },
};

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

      // *** NEW: Call the function passed from the parent page ***
      if (onUploadSuccess) {
        onUploadSuccess();
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage('Error uploading file. Check the console for details.');
    }
  };

  return (
    <div style={styles.container}>
      <input type="file" onChange={handleFileChange} style={styles.input} accept=".pdf" />
      <button onClick={handleUpload} style={styles.button}>
        Upload
      </button>
      {message && <p style={styles.message}>{message}</p>}
    </div>
  );
}

export default FileUpload;