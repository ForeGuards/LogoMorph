/*
 * Export Controller
 * Handles ZIP downloads and format conversion requests
 */

import { Request, Response } from 'express';
import { exportService } from '../../services/export/exportService';
import { fileStorageService } from '../../services/storage/fileStorage';
import { ExportItem } from '../../types/export';

/**
 * Export variants as ZIP
 * POST /api/export/zip
 */
export async function exportAsZip(req: Request, res: Response) {
  try {
    const { userId } = req.auth || {};
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
      variantPaths, // Array of storage paths to include
      zipName = 'logo-variants.zip',
      formats = ['png'], // Array of formats to export
      quality = 90,
      dpi = 72,
      organizeFolders = true,
      includeReadme = true,
    } = req.body;

    if (!variantPaths || !Array.isArray(variantPaths) || variantPaths.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'variantPaths array is required',
      });
    }

    // Download all variants from storage
    const items: ExportItem[] = [];
    for (const path of variantPaths) {
      try {
        const buffer = await fileStorageService.downloadFile(path);
        if (buffer) {
          const name = path.split('/').pop() || 'variant.png';
          items.push({ name, buffer, format: 'png' });
        }
      } catch (error) {
        console.error(`Failed to download ${path}:`, error);
      }
    }

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No variants found',
      });
    }

    // Export in multiple formats if requested
    let allExports: ExportItem[] = items;
    if (formats.length > 1) {
      allExports = await exportService.exportMultipleFormats(
        items,
        formats as Array<'png' | 'jpeg' | 'webp'>,
        quality,
      );
    } else if (formats[0] !== 'png') {
      allExports = await exportService.batchExport(items, {
        format: formats[0] as 'png' | 'jpeg' | 'webp',
        quality,
        dpi,
      });
    }

    // Create ZIP archive
    const archive = await exportService.createZipArchive({
      items: allExports,
      zipName,
      organizeFolders,
      includeReadme,
    });

    // Set response headers for download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    // Stream the archive to the response
    archive.pipe(res);

    archive.on('end', () => {
      console.log(`✓ ZIP export completed: ${zipName}`);
    });

    archive.on('error', (error) => {
      console.error('ZIP stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to create ZIP archive',
        });
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during export',
      details:
        process.env.NODE_ENV === 'development'
          ? error instanceof Error
            ? error.message
            : 'Unknown error'
          : undefined,
    });
  }
}

/**
 * Convert single variant to different format
 * POST /api/export/convert
 */
export async function convertFormat(req: Request, res: Response) {
  try {
    const { userId } = req.auth || {};
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
      variantPath, // Storage path of the variant
      targetFormat = 'png',
      quality = 90,
      dpi = 72,
    } = req.body;

    if (!variantPath) {
      return res.status(400).json({
        success: false,
        error: 'variantPath is required',
      });
    }

    if (!['png', 'jpeg', 'webp'].includes(targetFormat)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Must be png, jpeg, or webp',
      });
    }

    // Download variant from storage
    const buffer = await fileStorageService.downloadFile(variantPath);

    if (!buffer) {
      return res.status(404).json({
        success: false,
        error: 'Variant not found',
      });
    }

    // Convert format
    let convertedBuffer: Buffer;
    if (dpi !== 72) {
      convertedBuffer = await exportService.exportWithDPI(
        buffer,
        targetFormat as 'png' | 'jpeg' | 'webp',
        dpi,
        quality,
      );
    } else {
      convertedBuffer = await exportService.convertFormat(
        buffer,
        targetFormat as 'png' | 'jpeg' | 'webp',
        quality,
      );
    }

    // Generate filename
    const originalName = variantPath.split('/').pop() || 'variant';
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const filename = `${nameWithoutExt}.${targetFormat}`;

    // Set content type
    const contentTypes = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    };

    res.setHeader('Content-Type', contentTypes[targetFormat as keyof typeof contentTypes]);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(convertedBuffer);
  } catch (error) {
    console.error('Convert error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during conversion',
      details:
        process.env.NODE_ENV === 'development'
          ? error instanceof Error
            ? error.message
            : 'Unknown error'
          : undefined,
    });
  }
}

/**
 * Get export presets
 * GET /api/export/presets
 */
export async function getExportPresets(req: Request, res: Response) {
  try {
    const presets = exportService.getExportPresets();

    return res.status(200).json({
      success: true,
      data: presets,
    });
  } catch (error) {
    console.error('Get presets error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch export presets',
    });
  }
}

/**
 * Estimate ZIP size
 * POST /api/export/estimate
 */
export async function estimateZipSize(req: Request, res: Response) {
  try {
    const { userId } = req.auth || {};
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { variantPaths, formats = ['png'] } = req.body;

    if (!variantPaths || !Array.isArray(variantPaths)) {
      return res.status(400).json({
        success: false,
        error: 'variantPaths array is required',
      });
    }

    // Rough estimate based on average file sizes
    const avgSizePerVariant = 100 * 1024; // 100KB average
    const formatMultiplier = formats.length;
    const estimatedSize = variantPaths.length * avgSizePerVariant * formatMultiplier;

    return res.status(200).json({
      success: true,
      data: {
        estimatedBytes: estimatedSize,
        estimatedMB: (estimatedSize / (1024 * 1024)).toFixed(2),
        variantCount: variantPaths.length,
        formatCount: formats.length,
        totalFiles: variantPaths.length * formats.length,
      },
    });
  } catch (error) {
    console.error('Estimate error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to estimate size',
    });
  }
}
