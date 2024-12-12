// SVGEditor.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Trash2, RotateCcw, ChevronUp, ChevronDown, Eye, EyeOff, Loader, Image } from 'lucide-react';

const SVGEditor = () => {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(12);
  const [circleSize, setCircleSize] = useState(12); // For visual representation
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [placeholderSize, setPlaceholderSize] = useState({ width: 400, height: 300 });
  const [mode, setMode] = useState('draw'); // 'draw' or 'select'
  const [selectedElement, setSelectedElement] = useState(null);
  const [points, setPoints] = useState([]);
  const [isSmoothing, setIsSmoothing] = useState(true); // Toggle for smooth/rough drawing
  const svgRef = useRef(null);

  const handleStrokeWidthClick = () => {
    // Cycle through stroke widths using original sizes: 12 -> 20 -> 30 -> 44 -> 60 -> back to 12
    const widths = [12, 20, 30, 44, 60];
    const currentIndex = widths.indexOf(strokeWidth);
    const nextIndex = (currentIndex + 1) % widths.length;
    const nextWidth = widths[nextIndex];
    setStrokeWidth(nextWidth);
    setCircleSize(nextWidth);
  };

  const getMousePosition = (event) => {
    const svg = svgRef.current;
    const CTM = svg.getScreenCTM();
    return {
      x: (event.clientX - CTM.e) / CTM.a,
      y: (event.clientY - CTM.f) / CTM.d
    };
  };
  const startDrawing = (event) => {
    if (mode !== 'draw') return;
      
    const point = getMousePosition(event);
    setPoints([point]);
    setCurrentPath({
      id: Date.now(),
      points: [point],
      color: currentColor,
      strokeWidth: strokeWidth,
      d: `M ${point.x} ${point.y}`
    });
    setIsDrawing(true);
  };
  
  const draw = (event) => {
    if (!isDrawing || !currentPath || mode !== 'draw') return;
      
    const point = getMousePosition(event);
    const newPoints = [...points, point];
    setPoints(newPoints);
      
    if (isSmoothing && newPoints.length > 2) {
      const smoothPath = getSmoothPath(newPoints);
      setCurrentPath(prev => ({
        ...prev,
        points: newPoints,
        d: smoothPath
      }));
    } else {
      setCurrentPath(prev => ({
        ...prev,
        points: newPoints,
        d: `${prev.d} L ${point.x} ${point.y}`
      }));
    }
  };

  const endDrawing = () => {
    if (currentPath) {
      setPaths([...paths, currentPath]);
      setCurrentPath(null);
    }
    setIsDrawing(false);
  };

  const getSmoothPath = (points) => {
    if (points.length < 3) {
      return `M ${points[0].x} ${points[0].y} L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    }
  
    let path = `M ${points[0].x} ${points[0].y}`;
    
    // Use curve tension to control smoothness (0.2 - 0.4 works well)
    const tension = 0.3;
    
    for (let i = 0; i < points.length - 2; i++) {
      const p0 = i > 0 ? points[i - 1] : points[0];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : p2;
  
      // Calculate control points
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
  
      // Add cubic Bezier curve
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
  
    return path;
  };
  const generateSVG = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/api/generate-svg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate SVG');
      }

      const svgResponse = await fetch(`http://localhost:3000/${data.svg}`);
      const svgText = await svgResponse.text();
      importSVGContent(svgText);

    } catch (err) {
      setError(err.message);
      console.error('Error generating SVG:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const importSVGContent = (svgString) => {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;

    const viewBox = svgElement.getAttribute('viewBox');
    if (viewBox) {
      svgRef.current.setAttribute('viewBox', viewBox);
    }

    const elements = svgElement.querySelectorAll('path, rect, circle, ellipse');
    const newPaths = Array.from(elements).map((el, index) => {
      const type = el.tagName.toLowerCase();
      const commonProps = {
        id: `imported-${Date.now()}-${index}`,
        type: 'imported',
        stroke: el.getAttribute('stroke') || '#000000',
        strokeWidth: parseFloat(el.getAttribute('stroke-width')) || 1,
        fill: el.getAttribute('fill') || 'none',
        d: type === 'path' ? el.getAttribute('d') : null,
        isImported: true
      };

      if (type === 'path') {
        return commonProps;
      } else {
        // Convert other shapes to path data
        const bbox = el.getBBox();
        let pathData;

        if (type === 'rect') {
          pathData = `M ${bbox.x} ${bbox.y} h ${bbox.width} v ${bbox.height} h ${-bbox.width} Z`;
        } else if (type === 'circle') {
          const cx = parseFloat(el.getAttribute('cx'));
          const cy = parseFloat(el.getAttribute('cy'));
          const r = parseFloat(el.getAttribute('r'));
          pathData = `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
        }

        return {
          ...commonProps,
          d: pathData
        };
      }
    }).filter(Boolean);

    setPaths(prevPaths => [...prevPaths, ...newPaths]);
  };
  const deleteSelected = () => {
    if (selectedElement) {
      setPaths(paths.filter(path => path.id !== selectedElement.id));
      setSelectedElement(null);
    }
  };

  const handleSelect = (event) => {
    if (mode !== 'select') return;
    const element = paths.find(p => p.id === parseInt(event.target.id));
    setSelectedElement(element);
  };

  const renderPath = (path) => {
    if (path.type === 'placeholder') {
      return (
        <image
          key={path.id}
          id={path.id.toString()}
          href={path.url}
          x={path.x}
          y={path.y}
          width={path.width}
          height={path.height}
          preserveAspectRatio="none"
          className={mode === 'select' ? 'cursor-pointer' : ''}
          onClick={handleSelect}
        />
      );
    }
    const isSelected = selectedElement && selectedElement.id === path.id;
    return (
      <path
        key={path.id}
        id={path.id.toString()}
        d={path.d}
        stroke={path.color || path.stroke}
        strokeWidth={path.strokeWidth}
        fill="none"  // Force fill to none
        fillRule="evenodd"  // Add fill rule
        strokeLinecap="round"  // Round the line ends
        strokeLinejoin="round"  // Round the line joins
        className={mode === 'select' ? 'cursor-pointer' : ''}
        onClick={handleSelect}
        style={{
          outline: isSelected ? '2px solid #2196f3' : 'none'
        }}
      />
    );
  };
  return (
    <>
      <div className="mb-8 w-full">
        <div className="flex gap-4 items-start">
          <div className="flex-1">
            <input
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="3"
              placeholder="Enter your prompt to generate an SVG..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
          </div>
          <button
            className={`px-6 py-3 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${isLoading ? 'cursor-not-allowed' : ''}`}
            onClick={generateSVG}
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate SVG'
            )}
          </button>
        </div>
      </div>
      <div className="flex justify-center items-start min-h-screen bg-gray-100 p-4">
        <div className="flex gap-4">
          {/* Toolbar */}
          <div className="flex flex-col gap-4 bg-white p-4 rounded-lg shadow">
            {/* Mode Selection */}
            <div className="flex flex-col gap-2">
              <button
                className={`p-2 border rounded ${mode === 'draw' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                onClick={() => setMode('draw')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={24}
                  height={24}
                  viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M18.5 1.15c-.53 0-1.04.19-1.43.58l-5.81 5.82 5.65 5.65 5.82-5.81c.77-.78.77-2.04 0-2.83l-2.84-2.83c-.39-.39-.89-.58-1.39-.58M10.3 8.5l-5.96 5.96c-.78.78-.78 2.04.02 2.85C3.14 18.54 1.9 19.77.67 21h5.66l.86-.86c.78.76 2.03.75 2.81-.02l5.95-5.96"
                  />
                </svg>
              </button>
              <button
                className={`p-2 border rounded ${mode === 'select' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                onClick={() => setMode('select')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 28 28" >
                  <path d="M25.5 16L8.6 2.4C7.6 1.6 6 2.3 6 3.6v21c2.1 5.4 6.5-6.79.2-6.1h9.4c1.3 0 1.9-1.6.9-2.5zm-1.2 1z" />
                </svg>
              </button>
            </div>

            {/* Single Stroke Width Control */}
            <button
              className="relative p-2 border rounded min-w-[48px] min-h-[48px] flex items-center justify-center hover:bg-gray-100"
              onClick={handleStrokeWidthClick}
            >
              <div
                className="absolute rounded-full transition-all duration-200"
                style={{
                  width: `${circleSize/2}px`,
                  height: `${circleSize/2}px`,
                  maxWidth: '40px',
                  maxHeight: '40px',
                  backgroundColor: currentColor
                }}
              />
            </button>

            {/* Color Picker */}
            <input
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="w-12 h-10 p-1 border rounded"
            />

            {/* Delete Button */}
            <button
              className="p-2 border rounded hover:bg-red-100"
              onClick={deleteSelected}
              disabled={!selectedElement}
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>

          {/* Canvas */}
          <div className="bg-white p-4 rounded-lg shadow">
            <svg
              ref={svgRef}
              className="w-[800px] h-[800px] border border-gray-300 rounded bg-white"
              viewBox="0 0 2048 2048"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
            >
              {paths.map(path => renderPath(path))}
              {currentPath && renderPath(currentPath)}
            </svg>
          </div>
        </div>
      </div>
    </>
  );
};

export default SVGEditor;