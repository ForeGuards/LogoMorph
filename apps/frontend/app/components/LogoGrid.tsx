'use client';

import { useState } from 'react';
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {logos.map((logo) => (
        <div
          key={logo._id}
          className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          {/* Logo Preview */}
          <div className="aspect-square bg-gray-50 flex items-center justify-center p-6">
            <img
              src={logo.storageUrl}
              alt={logo.filename}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Logo Info */}
          <div className="p-4 space-y-3">
            {/* Filename */}
            <div>
              <h3 className="font-medium text-gray-900 truncate" title={logo.filename}>
                {logo.filename}
              </h3>
              <p className="text-sm text-gray-500">{logo.format.toUpperCase()}</p>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {logo.metadata.width && logo.metadata.height && (
                <span>
                  {logo.metadata.width} × {logo.metadata.height}
                </span>
              )}
              <span>{formatFileSize(logo.metadata.size)}</span>
            </div>

            {/* Color Palette */}
            {logo.metadata.colorPalette && logo.metadata.colorPalette.length > 0 && (
              <div className="flex items-center gap-1">
                {logo.metadata.colorPalette.slice(0, 5).map((color, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            )}

            {/* Upload Date */}
            <p className="text-xs text-gray-500">{formatDate(logo._creationTime)}</p>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              <button
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => router.push(`/editor/${logo._id}`)}
              >
                Edit & Generate
              </button>
              <button
                className="w-full px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleDelete(logo._id)}
                disabled={deleting === logo._id}
              >
                {deleting === logo._id ? (
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
