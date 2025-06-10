import React from 'react';
import Plot from 'react-plotly.js';

function DocumentVisualization({ data }) {
  // Prepare data for Plotly
  const plotData = {
    x: data.map(p => p.x),
    y: data.map(p => p.y),
    text: data.map(p => `Source: ${p.source}<br>Chunk: ${p.text.substring(0, 200)}...`), // Hover text
    mode: 'markers',
    type: 'scatter',
    marker: { size: 12, color: 'rgba(97, 218, 251, 0.8)' },
    hoverinfo: 'text'
  };

  const layout = {
    title: 'Document Chunk Similarity (t-SNE)',
    paper_bgcolor: '#282c34',
    plot_bgcolor: '#282c34',
    font: {
        color: 'white'
    },
    xaxis: {
        showgrid: false,
        zeroline: false,
        showticklabels: false,
    },
    yaxis: {
        showgrid: false,
        zeroline: false,
        showticklabels: false,
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <Plot
        data={[plotData]}
        layout={layout}
        style={{ width: '100%', height: '70vh' }}
      />
    </div>
  );
}

export default DocumentVisualization;
