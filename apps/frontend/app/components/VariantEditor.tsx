'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface VariantEditorProps {
  logoUrl: string;
  logoId: string;
  onSave?: (settings: EditorSettings) => void;
  onCancel?: () => void;
}

export interface EditorSettings {
  preset: string;
  alignment:
    | 'center'
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'center-left'
    | 'center-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
  fillMode: 'contain' | 'cover' | 'fit';
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  backgroundColor: string;
  backgroundType: 'solid' | 'gradient-linear' | 'gradient-radial';
  scale: number;
  rotation: number;
}

const PRESETS = [
  { id: 'square-1024', name: 'Square (1024×1024)', width: 1024, height: 1024 },
  { id: 'instagram-post', name: 'Instagram Post', width: 1080, height: 1080 },
  { id: 'instagram-story', name: 'Instagram Story', width: 1080, height: 1920 },
  { id: 'facebook-post', name: 'Facebook Post', width: 1200, height: 630 },
  { id: 'twitter-post', name: 'Twitter Post', width: 1200, height: 675 },
  { id: 'youtube-thumbnail', name: 'YouTube Thumbnail', width: 1280, height: 720 },
];

export function VariantEditor(props: VariantEditorProps) {
  const { logoUrl, onSave, onCancel } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Editor settings
  const [settings, setSettings] = useState<EditorSettings>({
    preset: 'square-1024',
    alignment: 'center',
    fillMode: 'contain',
    marginTop: 50,
    marginRight: 50,
    marginBottom: 50,
    marginLeft: 50,
    backgroundColor: '#ffffff',
    backgroundType: 'solid',
    scale: 1.0,
    rotation: 0,
  });

  // Position state for drag-to-reposition
  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showGuides, setShowGuides] = useState(true);

  // Get current preset dimensions
  const currentPreset = PRESETS.find((p) => p.id === settings.preset) || PRESETS[0]!;
  const canvasWidth = 600; // Display size
  const canvasHeight = (currentPreset.height / currentPreset.width) * canvasWidth;

  // Load logo image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = logoUrl;
    img.onload = () => {
      setLogoImage(img);
      // Center logo initially
      setLogoPosition({
        x: canvasWidth / 2,
        y: canvasHeight / 2,
      });
    };
  }, [logoUrl, canvasWidth, canvasHeight]);

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !logoImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      const gridSize = 50;

      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Calculate logo dimensions with margins
    const marginLeft = (settings.marginLeft / currentPreset.width) * canvas.width;
    const marginRight = (settings.marginRight / currentPreset.width) * canvas.width;
    const marginTop = (settings.marginTop / currentPreset.height) * canvas.height;
    const marginBottom = (settings.marginBottom / currentPreset.height) * canvas.height;

    const availableWidth = canvas.width - marginLeft - marginRight;
    const availableHeight = canvas.height - marginTop - marginBottom;

    // Calculate logo size based on fill mode
    let logoWidth = logoImage.width;
    let logoHeight = logoImage.height;
    const logoAspect = logoWidth / logoHeight;
    const availableAspect = availableWidth / availableHeight;

    if (settings.fillMode === 'contain') {
      if (logoAspect > availableAspect) {
        logoWidth = availableWidth;
        logoHeight = availableWidth / logoAspect;
      } else {
        logoHeight = availableHeight;
        logoWidth = availableHeight * logoAspect;
      }
    } else if (settings.fillMode === 'cover') {
      if (logoAspect < availableAspect) {
        logoWidth = availableWidth;
        logoHeight = availableWidth / logoAspect;
      } else {
        logoHeight = availableHeight;
        logoWidth = availableHeight * logoAspect;
      }
    }

    // Apply scale
    logoWidth *= settings.scale;
    logoHeight *= settings.scale;

    // Draw center guides if enabled
    if (showGuides) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      // Vertical center
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();

      // Horizontal center
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      ctx.setLineDash([]);
    }

    // Save context and apply transformations
    ctx.save();
    ctx.translate(logoPosition.x, logoPosition.y);
    ctx.rotate((settings.rotation * Math.PI) / 180);

    // Draw logo
    ctx.drawImage(logoImage, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight);

    ctx.restore();

    // Draw margin guides
    if (showGuides) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);
      ctx.strokeRect(marginLeft, marginTop, availableWidth, availableHeight);
      ctx.setLineDash([]);
    }
  }, [
    logoImage,
    settings,
    logoPosition,
    showGrid,
    showGuides,
    canvasWidth,
    canvasHeight,
    currentPreset,
  ]);

  // Redraw when settings change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Mouse handlers for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDragging(true);
    setDragStart({ x: x - logoPosition.x, y: y - logoPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setLogoPosition({
      x: x - dragStart.x,
      y: y - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updateSetting = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLogoPosition({ x: canvasWidth / 2, y: canvasHeight / 2 });
    setSettings({
      ...settings,
      scale: 1.0,
      rotation: 0,
      marginTop: 50,
      marginRight: 50,
      marginBottom: 50,
      marginLeft: 50,
    });
  };

  const handleSave = () => {
    if (onSave) {
      onSave(settings);
    }
  };

  return (
    <div className="flex gap-6 p-6 bg-gray-50 rounded-lg">
      {/* Canvas Preview */}
      <div className="flex-1">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Preview</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`px-3 py-1 text-sm rounded ${
                  showGrid ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setShowGuides(!showGuides)}
                className={`px-3 py-1 text-sm rounded ${
                  showGuides ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Guides
              </button>
            </div>
          </div>
          <div className="relative inline-block">
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="border border-gray-300 rounded cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            <p className="mt-2 text-sm text-gray-600 text-center">
              Drag the logo to reposition • Scroll to zoom
            </p>
          </div>
        </div>
      </div>

      {/* Controls Panel */}
      <div className="w-80 space-y-6">
        {/* Preset Selection */}
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Preset</label>
          <select
            value={settings.preset}
            onChange={(e) => updateSetting('preset', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {currentPreset.width} × {currentPreset.height}
          </p>
        </div>

        {/* Margins */}
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Margins (px)</h4>
          <div className="space-y-3">
            {(['marginTop', 'marginRight', 'marginBottom', 'marginLeft'] as const).map((margin) => (
              <div key={margin}>
                <label className="block text-xs text-gray-600 mb-1">
                  {margin.replace('margin', '')}
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={settings[margin]}
                  onChange={(e) => updateSetting(margin, parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0</span>
                  <span className="font-medium">{settings[margin]}</span>
                  <span>200</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transform Controls */}
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Transform</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Scale</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.scale}
                onChange={(e) => updateSetting('scale', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-center text-gray-500 font-medium mt-1">
                {(settings.scale * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Rotation</label>
              <input
                type="range"
                min="-180"
                max="180"
                value={settings.rotation}
                onChange={(e) => updateSetting('rotation', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-center text-gray-500 font-medium mt-1">
                {settings.rotation}°
              </div>
            </div>
          </div>
        </div>

        {/* Background */}
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Background</h4>
          <input
            type="color"
            value={settings.backgroundColor}
            onChange={(e) => updateSetting('backgroundColor', e.target.value)}
            className="w-full h-10 rounded cursor-pointer"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
          >
            Generate
          </button>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
