// src/pages/DocumentsPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FileUpload from '../components/FileUpload';
import DocumentVisualization from '../components/DocumentVisualization';

function DocumentsPage() {
  const [visData, setVisData] = useState(null);
  const [isLoadingVis, setIsLoadingVis] = useState(false);
  const [error, setError] = useState('');
  const [documentList, setDocumentList] = useState([]);

  const fetchDocumentList = async () => {
    try {
      const response = await axios.get('http://localhost:8000/documents/list/');
      setDocumentList(response.data);
    } catch (err) { console.error("Error fetching document list:", err); }
  };

  useEffect(() => { fetchDocumentList(); }, []);

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
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="lg:w-1/3 bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Manage Documents</h2>
        <FileUpload onUploadSuccess={fetchDocumentList} />
        <hr className="my-6 border-gray-600" />
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">Uploaded Documents</h3>
          <ul className="space-y-2 h-64 overflow-y-auto pr-2">
            {documentList.length > 0 ? (
              documentList.map((doc, index) => 
                <li key={index} className="bg-gray-700 p-3 rounded-md text-sm truncate">{doc}</li>)
            ) : (
              <li className="text-gray-400">No documents uploaded yet.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="lg:w-2/3 bg-gray-800 p-6 rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Document Visualization</h2>
        <p className="text-gray-400 mb-4">See a 2D map of your document chunks. Similar topics will be closer together.</p>
        <button onClick={fetchVisualizationData} disabled={isLoadingVis} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500">
          {isLoadingVis ? 'Generating...' : 'Visualize Documents'}
        </button>
        {error && <p className="text-red-500 mt-4">{error}</p>}
        {visData && <DocumentVisualization data={visData} />}
      </div>
    </div>
  );
}

export default DocumentsPage;
