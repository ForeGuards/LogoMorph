'use client';

import { useState, useRef } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { useAuth } from '@clerk/nextjs';
import { parseApiResponse } from '../lib/api';

interface UploadZoneProps {
  onUploadSuccess: () => void;
}

export function UploadZone({ onUploadSuccess }: UploadZoneProps) {
  const { getToken } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedFormats = ['image/svg+xml', 'image/png'];
  const maxSize = 10 * 1024 * 1024; // 10 MB

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    const file = files.item(0);
    if (file) {
      handleFile(file);
    }
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    const file = files?.item(0) ?? null;
    if (file) {
      handleFile(file);
    }
  }

  function handleFile(file: File) {
    setError(null);

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      setError('Please upload an SVG or PNG file');
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setError('File size must be less than 10 MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadFile(file);
  }

  async function uploadFile(file: File) {
    try {
      setUploading(true);
      setError(null);

      const token = await getToken();
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('http://localhost:4000/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await parseApiResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      // Success!
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploadSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleClick() {
    fileInputRef.current?.click();
  }

  return (
    <div className="w-full">
      <div
        className={`
          relative rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-300 overflow-hidden group
          ${isDragging ? 'scale-105' : 'scale-100'}
          ${uploading ? 'pointer-events-none' : ''}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {/* Animated Border */}
        <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
          isDragging 
            ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-[3px]' 
            : 'bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 p-[2px] group-hover:from-blue-400 group-hover:via-purple-400 group-hover:to-pink-400'
        }`}>
          <div className={`h-full w-full rounded-2xl transition-colors duration-300 ${
            isDragging ? 'bg-blue-50/80 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm'
          }`} />
        </div>

        {/* Ripple Effect on Drag */}
        {isDragging && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-400 rounded-full opacity-20 animate-ripple" />
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".svg,.png"
          onChange={handleFileSelect}
        />

        <div className="relative z-10">
          {preview && !uploading ? (
            <div className="space-y-6 animate-scale-in">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 rounded-xl blur-xl opacity-30 animate-pulse" />
                <img src={preview} alt="Preview" className="relative mx-auto max-h-64 object-contain rounded-xl shadow-lg" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-700">Ready to transform!</p>
                <p className="text-sm text-gray-500">Click or drag to replace</p>
              </div>
            </div>
          ) : uploading ? (
            <div className="space-y-6">
              <div className="relative inline-block">
                <div className="w-20 h-20 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-700">Analyzing your logo...</p>
                <p className="text-sm text-gray-500">This will only take a moment</p>
              </div>
              <div className="flex justify-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Animated Icon */}
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <svg
                    className="w-16 h-16 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
              </div>

              {/* Text Content */}
              <div className="space-y-3">
                <p className="text-xl font-semibold text-gray-900">
                  Drop your logo here
                </p>
                <p className="text-base text-gray-600">
                  or{' '}
                  <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    click to browse
                  </span>
                </p>
                <div className="flex items-center justify-center gap-6 pt-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>SVG & PNG</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Max 10 MB</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 glass border-2 border-red-200 rounded-xl animate-slide-down">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium text-red-900">Upload failed</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
