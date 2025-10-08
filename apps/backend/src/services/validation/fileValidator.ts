/*
 * File Validation Service
 * Validates uploaded files for type, size, dimensions
 * No assumptions - explicit validation with comprehensive error messages
 */

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    type: string;
    size: number;
    width?: number;
    height?: number;
  };
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const DEFAULT_ALLOWED_TYPES = ['image/svg+xml', 'image/png'];
const DEFAULT_MIN_WIDTH = 32;
const DEFAULT_MAX_WIDTH = 8192;
const DEFAULT_MIN_HEIGHT = 32;
const DEFAULT_MAX_HEIGHT = 8192;

export class FileValidatorService {
  private options: Required<FileValidationOptions>;

  constructor(options: FileValidationOptions = {}) {
    this.options = {
      maxSizeBytes: options.maxSizeBytes ?? DEFAULT_MAX_SIZE,
      allowedTypes: options.allowedTypes ?? DEFAULT_ALLOWED_TYPES,
      minWidth: options.minWidth ?? DEFAULT_MIN_WIDTH,
      maxWidth: options.maxWidth ?? DEFAULT_MAX_WIDTH,
      minHeight: options.minHeight ?? DEFAULT_MIN_HEIGHT,
      maxHeight: options.maxHeight ?? DEFAULT_MAX_HEIGHT,
    };
  }

  /**
   * Validate file type, size, and dimensions
   */
  async validateFile(file: Buffer, mimeType: string): Promise<FileValidationResult> {
    // Validate MIME type
    if (!this.options.allowedTypes.includes(mimeType)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${this.options.allowedTypes.join(', ')}`,
      };
    }

    // Validate file size
    if (file.length > this.options.maxSizeBytes) {
      return {
        valid: false,
        error: `File too large. Maximum size: ${this.formatBytes(this.options.maxSizeBytes)}`,
      };
    }

    // Validate dimensions based on file type
    if (mimeType === 'image/svg+xml') {
      return this.validateSVG(file);
    } else if (mimeType === 'image/png') {
      return this.validatePNG(file);
    }

    return {
      valid: false,
      error: 'Unsupported file type',
    };
  }

  /**
   * Validate SVG file
   * Extract viewBox or width/height attributes
   */
  private validateSVG(file: Buffer): FileValidationResult {
    try {
      const svgContent = file.toString('utf-8');

      // Basic SVG structure validation
      if (!svgContent.includes('<svg')) {
        return {
          valid: false,
          error: 'Invalid SVG file: missing <svg> tag',
        };
      }

      // Extract dimensions from viewBox or width/height attributes
      const viewBoxMatch = svgContent.match(/viewBox\s*=\s*["']([^"']+)["']/);
      const widthMatch = svgContent.match(/width\s*=\s*["']?(\d+(?:\.\d+)?)/);
      const heightMatch = svgContent.match(/height\s*=\s*["']?(\d+(?:\.\d+)?)/);

      let width: number | undefined;
      let height: number | undefined;

      if (viewBoxMatch) {
        const [, , , w, h] = viewBoxMatch[1].split(/\s+/);
        width = parseFloat(w);
        height = parseFloat(h);
      } else if (widthMatch && heightMatch) {
        width = parseFloat(widthMatch[1]);
        height = parseFloat(heightMatch[1]);
      }

      // If we can't determine dimensions, accept the file
      // (SVG can be scaled infinitely)
      if (!width || !height) {
        return {
          valid: true,
          details: {
            type: 'image/svg+xml',
            size: file.length,
          },
        };
      }

      // Validate dimensions
      if (width < this.options.minWidth || width > this.options.maxWidth) {
        return {
          valid: false,
          error: `SVG width must be between ${this.options.minWidth}px and ${this.options.maxWidth}px`,
        };
      }

      if (height < this.options.minHeight || height > this.options.maxHeight) {
        return {
          valid: false,
          error: `SVG height must be between ${this.options.minHeight}px and ${this.options.maxHeight}px`,
        };
      }

      return {
        valid: true,
        details: {
          type: 'image/svg+xml',
          size: file.length,
          width,
          height,
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: `SVG validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Validate PNG file
   * Read PNG header to extract dimensions
   */
  private validatePNG(file: Buffer): FileValidationResult {
    try {
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      if (file.length < 24 || file[0] !== 0x89 || file[1] !== 0x50) {
        return {
          valid: false,
          error: 'Invalid PNG file: incorrect signature',
        };
      }

      // Read IHDR chunk (width and height are at bytes 16-23)
      const width = file.readUInt32BE(16);
      const height = file.readUInt32BE(20);

      // Validate dimensions
      if (width < this.options.minWidth || width > this.options.maxWidth) {
        return {
          valid: false,
          error: `PNG width must be between ${this.options.minWidth}px and ${this.options.maxWidth}px`,
        };
      }

      if (height < this.options.minHeight || height > this.options.maxHeight) {
        return {
          valid: false,
          error: `PNG height must be between ${this.options.minHeight}px and ${this.options.maxHeight}px`,
        };
      }

      return {
        valid: true,
        details: {
          type: 'image/png',
          size: file.length,
          width,
          height,
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: `PNG validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const fileValidatorService = new FileValidatorService();
