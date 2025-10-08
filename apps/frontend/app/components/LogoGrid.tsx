'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { parseApiResponse } from '../lib/api';
import { useRouter } from 'next/navigation';

export interface Logo {
  _id: string;
  filename: string;
  storageUrl: string;
  format: string;
  metadata: {
    width?: number;
    height?: number;
    size: number;
    colorPalette?: string[];
  };
  _creationTime: number;
}

interface LogoGridProps {
  logos: Logo[];
  onDelete: () => void;
}

export function LogoGrid({ logos, onDelete }: LogoGridProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  async function handleDelete(logoId: string) {
    if (!confirm('Are you sure you want to delete this logo?')) {
      return;
    }

    try {
      setDeleting(logoId);
      const token = await getToken();
      const response = await fetch(`http://localhost:4000/api/logos/${logoId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseApiResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Delete failed');
      }

      onDelete();
    } catch (error) {
      console.error('Failed to delete logo:', error);
      alert('Failed to delete logo');
    } finally {
      setDeleting(null);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>, logoId: string) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {logos.map((logo, index) => (
        <div
          key={logo._id}
          className="group relative tilt-card animate-slide-up"
          style={{ animationDelay: `${index * 50}ms` }}
          onMouseMove={(e) => handleCardMouseMove(e, logo._id)}
          onMouseLeave={handleCardMouseLeave}
          onMouseEnter={() => setHoveredCard(logo._id)}
        >
          {/* Glow Effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300" />
          
          <div className="relative glass rounded-2xl overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-300">
            {/* Logo Preview */}
            <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8 overflow-hidden">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
                <div className="absolute top-0 left-0 w-full h-full">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-20"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
                        animationDelay: `${Math.random() * 2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
              
              <img
                src={logo.storageUrl}
                alt={logo.filename}
                className="relative z-10 max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500"
              />
            </div>

            {/* Logo Info */}
            <div className="relative p-6 space-y-4 bg-white/80 backdrop-blur-sm">
              {/* Filename */}
              <div>
                <h3 className="font-bold text-lg text-gray-900 truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all" title={logo.filename}>
                  {logo.filename}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                    {logo.format.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">{formatDate(logo._creationTime)}</span>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {logo.metadata.width && logo.metadata.height && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    <span className="font-medium">{logo.metadata.width} × {logo.metadata.height}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">{formatFileSize(logo.metadata.size)}</span>
                </div>
              </div>

              {/* Color Palette */}
              {logo.metadata.colorPalette && logo.metadata.colorPalette.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Colors:</span>
                  <div className="flex items-center gap-1.5">
                    {logo.metadata.colorPalette.slice(0, 5).map((color, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-lg border-2 border-white shadow-sm group-hover:scale-110 transition-transform"
                        style={{ 
                          backgroundColor: color,
                          transitionDelay: `${i * 50}ms`
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
                <button
                  className="group/btn relative w-full px-4 py-3 font-semibold text-white overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all"
                  onClick={() => router.push(`/editor/${logo._id}`)}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 transition-transform group-hover/btn:scale-105" />
                  <span className="relative flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Variants
                  </span>
                </button>
                <button
                  className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleDelete(logo._id)}
                  disabled={deleting === logo._id}
                >
                  {deleting === logo._id ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </div>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
