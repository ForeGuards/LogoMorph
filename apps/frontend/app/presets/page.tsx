'use client';

import { SignedIn, SignedOut, RedirectToSignIn, UserButton } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { parseApiResponse } from '../lib/api';

interface Preset {
  _id: string;
  name: string;
  width: number;
  height: number;
  category?: string;
  description?: string;
  isSystem: boolean;
  isPublic?: boolean;
  createdAt?: number;
}

export default function PresetsPage() {
  const router = useRouter();
  const [presets, setPresets] = useState<{ system: Preset[]; custom: Preset[] }>({
    system: [],
    custom: [],
  });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPreset, setNewPreset] = useState({
    name: '',
    width: 1080,
    height: 1080,
    category: 'custom',
    description: '',
    isPublic: false,
  });

  useEffect(() => {
    fetchPresets();
  }, []);

  async function fetchPresets() {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:4000/api/presets', {
        credentials: 'include',
      });
      const data = await parseApiResponse<{ system: Preset[]; custom: Preset[] }>(response);
      if (response.ok && data.success) {
        setPresets(data.data!);
      }
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePreset() {
    try {
      const response = await fetch('http://localhost:4000/api/presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newPreset),
      });

      const data = await parseApiResponse<unknown>(response);

      if (response.ok && data.success) {
        setShowCreateModal(false);
        setNewPreset({
          name: '',
          width: 1080,
          height: 1080,
          category: 'custom',
          description: '',
          isPublic: false,
        });
        fetchPresets();
      } else {
        alert('Failed to create preset: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating preset:', error);
      alert('Failed to create preset');
    }
  }

  async function handleDeletePreset(presetId: string) {
    if (!confirm('Are you sure you want to delete this preset?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/api/presets/${presetId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await parseApiResponse<unknown>(response);

      if (response.ok && data.success) {
        fetchPresets();
      } else {
        alert('Failed to delete preset: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting preset:', error);
      alert('Failed to delete preset');
    }
  }

  async function handleDuplicatePreset(presetId: string, originalName: string) {
    const newName = prompt(`Enter name for duplicated preset:`, `${originalName} (Copy)`);
    if (!newName) return;

    try {
      const response = await fetch(`http://localhost:4000/api/presets/${presetId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ newName }),
      });

      const data = await parseApiResponse<unknown>(response);

      if (response.ok && data.success) {
        fetchPresets();
      } else {
        alert('Failed to duplicate preset: ' + data.error);
      }
    } catch (error) {
      console.error('Error duplicating preset:', error);
      alert('Failed to duplicate preset');
    }
  }

  return (
    <>
      <SignedIn>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    ← Back
                  </button>
                  <h1 className="text-2xl font-bold text-gray-900">Preset Manager</h1>
                </div>
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Create Button */}
            <div className="mb-6 flex justify-between items-center">
              <p className="text-gray-600">Manage your custom presets for logo variants</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                + Create Custom Preset
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-4 text-gray-600">Loading presets...</p>
              </div>
            ) : (
              <>
                {/* System Presets */}
                <section className="mb-12">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    System Presets ({presets.system.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {presets.system.map((preset) => (
                      <PresetCard
                        key={preset._id}
                        preset={preset}
                        onDuplicate={handleDuplicatePreset}
                      />
                    ))}
                  </div>
                </section>

                {/* Custom Presets */}
                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    My Custom Presets ({presets.custom.length})
                  </h2>
                  {presets.custom.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {presets.custom.map((preset) => (
                        <PresetCard
                          key={preset._id}
                          preset={preset}
                          onDelete={handleDeletePreset}
                          onDuplicate={handleDuplicatePreset}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                      <p className="text-gray-600">No custom presets yet.</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Create your first custom preset to get started!
                      </p>
                    </div>
                  )}
                </section>
              </>
            )}
          </main>

          {/* Create Preset Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Create Custom Preset</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={newPreset.name}
                      onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="My Custom Size"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Width (px)
                      </label>
                      <input
                        type="number"
                        value={newPreset.width}
                        onChange={(e) =>
                          setNewPreset({ ...newPreset, width: parseInt(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Height (px)
                      </label>
                      <input
                        type="number"
                        value={newPreset.height}
                        onChange={(e) =>
                          setNewPreset({ ...newPreset, height: parseInt(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      value={newPreset.description}
                      onChange={(e) => setNewPreset({ ...newPreset, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={2}
                      placeholder="Description of your preset..."
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newPreset.isPublic}
                      onChange={(e) => setNewPreset({ ...newPreset, isPublic: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm text-gray-700">
                      Make public (others can use this preset)
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePreset}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

function PresetCard({
  preset,
  onDelete,
  onDuplicate,
}: {
  preset: Preset;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string, name: string) => void;
}) {
  const getCategoryBadgeColor = (category?: string) => {
    switch (category) {
      case 'web':
        return 'bg-blue-100 text-blue-800';
      case 'social':
        return 'bg-purple-100 text-purple-800';
      case 'mobile':
        return 'bg-green-100 text-green-800';
      case 'print':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900">{preset.name}</h3>
        {preset.isSystem && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">System</span>
        )}
      </div>

      <div className="text-sm text-gray-600 mb-3">
        {preset.width} × {preset.height}
      </div>

      {preset.category && (
        <span
          className={`inline-block text-xs px-2 py-1 rounded mb-3 ${getCategoryBadgeColor(preset.category)}`}
        >
          {preset.category}
        </span>
      )}

      {preset.description && <p className="text-sm text-gray-600 mb-3">{preset.description}</p>}

      <div className="flex gap-2 mt-4">
        {onDuplicate && (
          <button
            onClick={() => onDuplicate(preset._id, preset.name)}
            className="flex-1 text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 transition"
          >
            Duplicate
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(preset._id)}
            className="flex-1 text-sm px-3 py-1.5 text-red-600 border border-red-300 rounded hover:bg-red-50 transition"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
