import React, { useRef, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export const GenreNetworkGraph = ({ data }) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const graphRef = useRef(null);

  // Measure container size dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observeTarget = containerRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });

    resizeObserver.observe(observeTarget);
    return () => {
      resizeObserver.unobserve(observeTarget);
    };
  }, []);

  // Re-center graph when data changes
  useEffect(() => {
    if (graphRef.current) {
      // Small timeout to allow the force engine to settle initially
      setTimeout(() => {
        graphRef.current.zoomToFit(400, 50); // 400ms duration, 50px padding
      }, 800);
    }
  }, [data]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '500px', backgroundColor: '#fafafa', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      <ForceGraph2D
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={data}
        nodeLabel={(node) => {
          const artistList = node.artists && node.artists.length > 0 
            ? `<div style="font-size: 0.8rem; color: #cbd5e1; margin-top: 4px; max-width: 250px; white-space: normal; line-height: 1.4;">${node.artists.join(', ')}</div>` 
            : '';
          return `<div style="background-color: rgba(15, 23, 42, 0.95); padding: 8px 12px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-family: sans-serif; color: white;">
            <div style="font-weight: bold; font-size: 0.95rem;">${node.name}</div>
            ${artistList}
          </div>`;
        }}
        nodeColor={() => '#0f172a'} // dark modern color for nodes
        nodeRelSize={4}
        nodeVal={(node) => Math.sqrt(node.val) * 2} // visually scale area to frequency
        linkWidth={(link) => Math.sqrt(link.weight)}
        linkColor={() => 'rgba(148, 163, 184, 0.4)'} // subtle line color
        d3VelocityDecay={0.1}
        cooldownTicks={100}
        onEngineStop={() => {
          if (graphRef.current) {
            graphRef.current.zoomToFit(400, 50);
          }
        }}
      />
    </div>
  );
};
