import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import { GoogleDriveService } from './google-drive';
import { ConversionOptions, ConversionResult, ConversionStats } from './types';
import { InputParser } from './url-parser';

export class ImageConverter {
  private options: ConversionOptions;
  private googleDriveService?: GoogleDriveService;

  constructor(options: ConversionOptions, googleDriveService?: GoogleDriveService) {
    this.options = options;
    this.googleDriveService = googleDriveService;
  }

  /**
   * Process input (local files or Google Drive URLs)
   */
  async processInput(inputs: string[]): Promise<ConversionStats> {
    const allFiles: string[] = [];
    const tempDir = path.join(process.cwd(), '.temp-downloads');

    try {
      // Create temp directory for downloads
      await fs.ensureDir(tempDir);

      for (const input of inputs) {
        const parsed = InputParser.parse(input);
        console.log(`Processing input: ${input} (type: ${parsed.type})`);

        if (parsed.type === 'google-drive') {
          if (!this.googleDriveService) {
            throw new Error('Google Drive service not initialized. Please provide credentials.');
          }

          const files = await this.processGoogleDriveFolder(parsed.folderId!, tempDir);
          allFiles.push(...files);
        } else {
          const files = await this.processLocalPath(parsed.path);
          allFiles.push(...files);
        }
      }

      if (allFiles.length === 0) {
        console.log('No TIFF files found to convert.');
        return { total: 0, successful: 0, failed: 0, totalTime: 0 };
      }

      console.log(`Found ${allFiles.length} TIFF file(s) to convert.`);

      // Convert all files
      const stats = await this.convertFiles(allFiles);

      return stats;
    } finally {
      // Clean up temp directory
      if (await fs.pathExists(tempDir)) {
        await fs.remove(tempDir);
      }
    }
  }

  /**
   * Process Google Drive folder
   */
  private async processGoogleDriveFolder(folderId: string, tempDir: string): Promise<string[]> {
    console.log('Fetching files from Google Drive...');

    if (!this.googleDriveService || !this.googleDriveService.isInitialized()) {
      throw new Error('Google Drive service not properly initialized. Please provide valid credentials.');
    }

    const files = await this.googleDriveService.listTiffFiles(folderId);
    const downloadedFiles: string[] = [];

    for (const file of files) {
      console.log(`Downloading: ${file.name}`);
      const tempPath = path.join(tempDir, file.name);
      await this.googleDriveService.downloadFile(file.id, tempPath);
      downloadedFiles.push(tempPath);
    }

    return downloadedFiles;
  }

  /**
   * Process local path (file or directory)
   */
  private async processLocalPath(inputPath: string): Promise<string[]> {
    const resolvedPath = path.resolve(inputPath);

    if (!(await fs.pathExists(resolvedPath))) {
      throw new Error(`Path does not exist: ${inputPath}`);
    }

    const stats = await fs.stat(resolvedPath);

    if (stats.isFile()) {
      return [resolvedPath];
    } else if (stats.isDirectory()) {
      return await this.findTiffFiles(resolvedPath);
    }

    return [];
  }

  /**
   * Convert a single TIFF file to JPG
   */
  async convertFile(inputPath: string): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      // Validate input file
      if (!(await this.isValidTiffFile(inputPath))) {
        throw new Error('Input file is not a valid TIFF image');
      }

      // Generate output path
      const outputPath = this.generateOutputPath(inputPath);

      // Ensure output directory exists
      await fs.ensureDir(path.dirname(outputPath));

      // Convert the image
      await sharp(inputPath).jpeg({ quality: this.options.quality }).toFile(outputPath);

      const processingTime = Date.now() - startTime;

      return {
        inputPath,
        outputPath,
        success: true,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      return {
        inputPath,
        outputPath: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * Convert multiple files
   */
  async convertFiles(inputPaths: string[]): Promise<ConversionStats> {
    const stats: ConversionStats = {
      total: inputPaths.length,
      successful: 0,
      failed: 0,
      totalTime: 0,
    };

    const startTime = Date.now();

    for (const inputPath of inputPaths) {
      console.log(`Converting: ${path.basename(inputPath)}`);

      const result = await this.convertFile(inputPath);

      if (result.success) {
        stats.successful++;
        console.log(`✓ Success: ${path.basename(result.outputPath)}`);
      } else {
        stats.failed++;
        console.log(`✗ Failed: ${result.error}`);
      }
    }

    stats.totalTime = Date.now() - startTime;
    return stats;
  }

  /**
   * Check if file is a valid TIFF image
   */
  private async isValidTiffFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) return false;

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.tif' && ext !== '.tiff') return false;

      // Try to read image metadata to validate it's actually a TIFF
      const metadata = await sharp(filePath).metadata();
      return metadata.format === 'tiff';
    } catch {
      return false;
    }
  }

  /**
   * Generate output path for converted file
   */
  private generateOutputPath(inputPath: string): string {
    const dir = this.options.outputDir || path.dirname(inputPath);
    const basename = path.basename(inputPath, path.extname(inputPath));
    return path.join(dir, `${basename}.jpg`);
  }

  /**
   * Find all TIFF files in a directory (recursively if needed)
   */
  async findTiffFiles(directory: string): Promise<string[]> {
    const files: string[] = [];

    if (this.options.recursive) {
      // Recursive search
      const items = await fs.readdir(directory, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(directory, item.name);

        if (item.isDirectory()) {
          const subFiles = await this.findTiffFiles(fullPath);
          files.push(...subFiles);
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (ext === '.tif' || ext === '.tiff') {
            files.push(fullPath);
          }
        }
      }
    } else {
      // Non-recursive search
      const items = await fs.readdir(directory, { withFileTypes: true });

      for (const item of items) {
        if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (ext === '.tif' || ext === '.tiff') {
            files.push(path.join(directory, item.name));
          }
        }
      }
    }

    return files;
  }
}
