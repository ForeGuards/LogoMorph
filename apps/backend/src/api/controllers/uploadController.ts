/*
 * Upload Controller
 * Handles logo file uploads with validation, storage, and Convex integration
 */

import type { Request, Response } from 'express';
import type { UploadedFile } from 'express-fileupload';
import { fileValidatorService } from '../../services/validation/fileValidator';
import { fileStorageService } from '../../services/storage/fileStorage';
import { logoAnalyzerService } from '../../services/analysis/logoAnalyzer';

// TODO: Replace with Supabase client
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

/**
 * Upload logo file
 * POST /api/upload
 */
export async function uploadLogo(req: Request, res: Response) {
  try {
    // Get user ID from Clerk auth
    const { userId } = req.auth || {};
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Check if file was uploaded
    if (!req.files || !req.files.logo) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Expected file field: "logo"',
      });
    }

    const file = req.files.logo as UploadedFile;

    // Validate file
    const validation = await fileValidatorService.validateFile(file.data, file.mimetype);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // Upload to storage
    const uploadResult = await fileStorageService.uploadFile({
      userId,
      file: file.data,
      filename: file.name,
      contentType: file.mimetype,
    });

    // Analyze logo to extract metadata
    const analysis = await logoAnalyzerService.analyzeLogo(file.data, file.mimetype);

    // TODO: Store in Supabase database with complete analysis
    // const { data: logo, error } = await supabase
    //   .from('logos')
    //   .insert({
    //     clerk_user_id: userId,
    //     filename: file.name,
    //     storage_path: uploadResult.path,
    //     storage_url: uploadResult.url,
    //     format: file.mimetype === 'image/svg+xml' ? 'svg' : 'png',
    //     metadata: {
    //       width: analysis.width,
    //       height: analysis.height,
    //       size: uploadResult.size,
    //       boundingBox: analysis.boundingBox,
    //       colorPalette: analysis.colorPalette,
    //     },
    //   })
    //   .select()
    //   .single();
    // if (error) throw error;
    const logoId = 'temp-' + Date.now(); // Temporary stub

    // Return success response with analysis
    return res.status(201).json({
      success: true,
      data: {
        logoId,
        filename: file.name,
        url: uploadResult.url,
        format: file.mimetype === 'image/svg+xml' ? 'svg' : 'png',
        metadata: {
          width: analysis.width,
          height: analysis.height,
          size: uploadResult.size,
          aspectRatio: analysis.aspectRatio,
          boundingBox: analysis.boundingBox,
          colorPalette: analysis.colorPalette,
          safeMargins: analysis.safeMargins,
          hasText: analysis.hasText,
          hasAlpha: analysis.hasAlpha,
        },
        analysis: {
          svgData: analysis.svgData,
          pngData: analysis.pngData,
        },
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during upload',
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
 * Analyze logo without uploading
 * POST /api/analyze
 */
export async function analyzeLogo(req: Request, res: Response) {
  try {
    // Get user ID from Clerk auth
    const { userId } = req.auth || {};
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Check if file was uploaded
    if (!req.files || !req.files.logo) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Expected file field: "logo"',
      });
    }

    const file = req.files.logo as UploadedFile;

    // Validate file
    const validation = await fileValidatorService.validateFile(file.data, file.mimetype);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // Analyze logo
    const analysis = await logoAnalyzerService.analyzeLogo(file.data, file.mimetype);

    // Return analysis without storing
    return res.status(200).json({
      success: true,
      data: {
        filename: file.name,
        format: file.mimetype === 'image/svg+xml' ? 'svg' : 'png',
        analysis: {
          width: analysis.width,
          height: analysis.height,
          aspectRatio: analysis.aspectRatio,
          boundingBox: analysis.boundingBox,
          colorPalette: analysis.colorPalette,
          safeMargins: analysis.safeMargins,
          hasText: analysis.hasText,
          hasAlpha: analysis.hasAlpha,
          svgData: analysis.svgData,
          pngData: analysis.pngData,
        },
      },
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during analysis',
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
 * Get user's uploaded logos
 * GET /api/logos
 */
export async function getUserLogos(req: Request, res: Response) {
  try {
    const { userId } = req.auth || {};
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // TODO: Fetch from Supabase
    // const { data: logos, error } = await supabase
    //   .from('logos')
    //   .select('*')
    //   .eq('clerk_user_id', userId)
    //   .order('created_at', { ascending: false });
    // if (error) throw error;
    const logos: any[] = []; // Temporary stub

    return res.status(200).json({
      success: true,
      data: logos,
    });
  } catch (error) {
    console.error('Get logos error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve logos',
    });
  }
}

/**
 * Delete a logo
 * DELETE /api/logos/:logoId
 */
export async function deleteLogo(req: Request, res: Response) {
  try {
    const { userId } = req.auth || {};
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { logoId } = req.params;

    // TODO: Get logo from Supabase to verify ownership
    // const { data: logo, error } = await supabase
    //   .from('logos')
    //   .select('*')
    //   .eq('id', logoId)
    //   .single();
    // if (error) throw error;
    const logo: any = null; // Temporary stub

    if (!logo) {
      return res.status(404).json({
        success: false,
        error: 'Logo not found',
      });
    }

    if (logo.clerkUserId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not own this logo',
      });
    }

    // Delete from storage
    await fileStorageService.deleteFile(logo.storagePath);

    // TODO: Delete from Supabase database
    // const { error: deleteError } = await supabase
    //   .from('logos')
    //   .delete()
    //   .eq('id', logoId);
    // if (deleteError) throw deleteError;

    return res.status(200).json({
      success: true,
      message: 'Logo deleted successfully',
    });
  } catch (error) {
    console.error('Delete logo error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete logo',
    });
  }
}
