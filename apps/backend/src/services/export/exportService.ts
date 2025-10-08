/*
 * Export Service
 * Handles batch export to ZIP and multiple output formats
 * Option 1: Stream-based archiving (pros: memory efficient; cons: complex)
 * Option 2: Buffer-based archiving (pros: simple; cons: memory usage)
 * Option 3: Hybrid approach (pros: balanced; cons: needs careful management)
 * Chosen: Stream-based archiving for better memory efficiency with large exports
 */

import archiver from 'archiver';
import sharp from 'sharp';
import { Readable } from 'stream';

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp' | 'svg';
  quality?: number; // For JPEG/WebP (1-100)
  dpi?: number; // For high-resolution exports
  namingConvention?: 'preset' | 'dimensions' | 'sequential';
  includeMetadata?: boolean;
}

export interface ExportItem {
  name: string;
  buffer: Buffer;
  format: string;
}

export interface BatchExportOptions {
  items: ExportItem[];
  zipName: string;
  organizeFolders?: boolean; // Organize by format or preset
  includeReadme?: boolean;
}

export class ExportService {
  /**
   * Convert image to different format
   */
  async convertFormat(
    inputBuffer: Buffer,
    targetFormat: 'png' | 'jpeg' | 'webp',
    quality: number = 90,
  ): Promise<Buffer> {
    const converter = sharp(inputBuffer);

    switch (targetFormat) {
      case 'png':
        return await converter.png({ quality: 100 }).toBuffer();
      case 'jpeg':
        return await converter.jpeg({ quality }).toBuffer();
      case 'webp':
        return await converter.webp({ quality }).toBuffer();
      default:
        throw new Error(`Unsupported format: ${targetFormat}`);
    }
  }

  /**
   * Export with resolution scaling (DPI)
   */
  async exportWithDPI(
    inputBuffer: Buffer,
    targetFormat: 'png' | 'jpeg' | 'webp',
    dpi: number = 72,
    quality: number = 90,
  ): Promise<Buffer> {
    const metadata = await sharp(inputBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image dimensions');
    }

    // Calculate scale factor for DPI
    // Standard screen DPI is 72, so scale relative to that
    const scaleFactor = dpi / 72;
    const newWidth = Math.round(metadata.width * scaleFactor);
    const newHeight = Math.round(metadata.height * scaleFactor);

    let converter = sharp(inputBuffer).resize(newWidth, newHeight, {
      fit: 'fill',
    });

    switch (targetFormat) {
      case 'png':
        converter = converter.png({ quality: 100 });
        break;
      case 'jpeg':
        converter = converter.jpeg({ quality });
        break;
      case 'webp':
        converter = converter.webp({ quality });
        break;
    }

    return await converter.toBuffer();
  }

  /**
   * Batch export multiple items with different formats
   */
  async batchExport(items: ExportItem[], exportOptions: ExportOptions): Promise<ExportItem[]> {
    const exported: ExportItem[] = [];

    for (const item of items) {
      try {
        let buffer = item.buffer;
        const { format, quality = 90, dpi = 72 } = exportOptions;

        // Convert format if needed
        if (format !== 'svg') {
          if (dpi !== 72) {
            buffer = await this.exportWithDPI(buffer, format, dpi, quality);
          } else {
            buffer = await this.convertFormat(buffer, format, quality);
          }
        }

        // Generate filename based on naming convention
        const filename = this.generateFilename(item.name, format, exportOptions.namingConvention);

        exported.push({
          name: filename,
          buffer,
          format,
        });
      } catch (error) {
        console.error(`Failed to export ${item.name}:`, error);
        // Continue with other items
      }
    }

    return exported;
  }

  /**
   * Create ZIP archive from multiple items
   */
  async createZipArchive(options: BatchExportOptions): Promise<Readable> {
    const { items, organizeFolders = true, includeReadme = true } = options;

    return new Promise((resolve, reject) => {
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Maximum compression
      });

      // Handle errors
      archive.on('error', (err) => {
        reject(err);
      });

      // Organize items by format if requested
      if (organizeFolders) {
        const byFormat = this.organizeByFormat(items);

        for (const [format, formatItems] of Object.entries(byFormat)) {
          for (const item of formatItems) {
            archive.append(item.buffer, {
              name: `${format}/${item.name}`,
            });
          }
        }
      } else {
        // Flat structure
        for (const item of items) {
          archive.append(item.buffer, {
            name: item.name,
          });
        }
      }

      // Add README if requested
      if (includeReadme) {
        const readme = this.generateReadme(items);
        archive.append(readme, { name: 'README.txt' });
      }

      // Finalize the archive
      archive.finalize();

      // Return the stream
      resolve(archive);
    });
  }

  /**
   * Export multiple variants in different formats
   */
  async exportMultipleFormats(
    baseItems: ExportItem[],
    formats: Array<'png' | 'jpeg' | 'webp'>,
    quality: number = 90,
  ): Promise<ExportItem[]> {
    const allExports: ExportItem[] = [];

    for (const format of formats) {
      const exported = await this.batchExport(baseItems, {
        format,
        quality,
        namingConvention: 'preset',
      });
      allExports.push(...exported);
    }

    return allExports;
  }

  /**
   * Generate filename based on naming convention
   */
  private generateFilename(
    baseName: string,
    format: string,
    convention: string = 'preset',
  ): string {
    // Remove existing extension
    const nameWithoutExt = baseName.replace(/\.[^/.]+$/, '');

    switch (convention) {
      case 'dimensions':
        // Extract dimensions from name if present (e.g., "logo_1024x1024")
        return `${nameWithoutExt}.${format}`;
      case 'sequential':
        // Add timestamp for uniqueness
        return `${nameWithoutExt}_${Date.now()}.${format}`;
      case 'preset':
      default:
        return `${nameWithoutExt}.${format}`;
    }
  }

  /**
   * Organize items by format
   */
  private organizeByFormat(items: ExportItem[]): Record<string, ExportItem[]> {
    const organized: Record<string, ExportItem[]> = {};

    for (const item of items) {
      const format = item.format || 'png';
      if (!organized[format]) {
        organized[format] = [];
      }
      organized[format].push(item);
    }

    return organized;
  }

  /**
   * Generate README content for the export
   */
  private generateReadme(items: ExportItem[]): string {
    const formatCounts = items.reduce(
      (acc, item) => {
        acc[item.format] = (acc[item.format] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const readme = `
LogoMorph Export Package
========================

Generated: ${new Date().toLocaleString()}
Total Files: ${items.length}

Formats:
${Object.entries(formatCounts)
  .map(([format, count]) => `- ${format.toUpperCase()}: ${count} file(s)`)
  .join('\n')}

Files Included:
${items.map((item, i) => `${i + 1}. ${item.name}`).join('\n')}

Usage:
------
These logo variants are ready to use for your projects.
Each file is named according to its preset or dimensions.

For best results:
- Use PNG for logos requiring transparency
- Use JPEG for photography-style backgrounds
- Use WebP for modern web applications (smaller file sizes)

Need help? Visit: https://logomorph.com/help

© ${new Date().getFullYear()} LogoMorph
    `.trim();

    return readme;
  }

  /**
   * Get export preset configurations
   */
  getExportPresets() {
    return {
      web: {
        formats: ['png', 'webp'] as const,
        quality: 85,
        dpi: 72,
      },
      print: {
        formats: ['png', 'jpeg'] as const,
        quality: 95,
        dpi: 300,
      },
      social: {
        formats: ['png', 'jpeg'] as const,
        quality: 90,
        dpi: 72,
      },
      allFormats: {
        formats: ['png', 'jpeg', 'webp'] as const,
        quality: 90,
        dpi: 72,
      },
    };
  }

  /**
   * Calculate estimated ZIP size
   */
  estimateZipSize(items: ExportItem[]): number {
    // Rough estimate: sum of all buffer sizes with ~30% compression
    const totalSize = items.reduce((sum, item) => sum + item.buffer.length, 0);
    return Math.round(totalSize * 0.7); // Assume 30% compression
  }
}

export const exportService = new ExportService();
