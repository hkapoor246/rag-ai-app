import React, { useState, useEffect } from 'react'; // <-- Import useEffect
import axios from 'axios';
import FileUpload from '../components/FileUpload';
import DocumentVisualization from '../components/DocumentVisualization';

function DocumentsPage() {
  const [visData, setVisData] = useState(null);
  const [isLoadingVis, setIsLoadingVis] = useState(false);
  const [error, setError] = useState('');

  // --- NEW STATE FOR DOCUMENT LIST ---
  const [documentList, setDocumentList] = useState([]);

  // --- NEW FUNCTION TO FETCH THE LIST ---
  const fetchDocumentList = async () => {
    try {
      const response = await axios.get('http://localhost:8000/documents/list/');
      setDocumentList(response.data);
    } catch (err) {
      console.error("Error fetching document list:", err);
    }
  };

  // --- NEW: FETCH LIST WHEN PAGE FIRST LOADS ---
  useEffect(() => {
    fetchDocumentList();
  }, []); // The empty array means this effect runs only once on mount


  const fetchVisualizationData = async () => {
    setIsLoadingVis(true);
    setError('');
    setVisData(null);
    try {
      const response = await axios.get('http://localhost:8000/documents/visualize/');
      setVisData(response.data);
    } catch (err) {
      console.error("Error fetching visualization data:", err);
      setError(err.response?.data?.detail || 'Failed to fetch visualization data.');
    } finally {
      setIsLoadingVis(false);
    }
  };

  return (
    <div className="documents-container">
      <div className="documents-left">
        <h2>Upload Documents</h2>
        {/* Pass the fetchDocumentList function as a prop */}
        <FileUpload onUploadSuccess={fetchDocumentList} />
        <hr style={{ margin: '30px 0' }} />
        <div className="document-list-section">
          <h3>Uploaded Documents</h3>
          <ul className="document-list">
            {documentList.length > 0 ? (
              documentList.map((doc, index) => <li key={index}>{doc}</li>)
            ) : (
              <li>No documents uploaded yet.</li>
            )}
          </ul>
        </div>
      </div>
      <div className="documents-right">
        <h2>Document Visualization</h2>
        <p>See a 2D map of your document chunks. Chunks with similar topics will be closer together.</p>
        <button onClick={fetchVisualizationData} disabled={isLoadingVis} style={{padding: '10px 20px', fontSize: '16px', cursor: 'pointer'}}>
          {isLoadingVis ? 'Generating...' : 'Visualize Documents'}
        </button>
        {error && <p style={{ color: 'red', marginTop: '15px' }}>{error}</p>}
        {visData && <DocumentVisualization data={visData} />}
      </div>
    </div>
  );
}

export default DocumentsPage;
