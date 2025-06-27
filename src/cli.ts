#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import { ImageConverter } from './converter';
import { GoogleDriveService } from './google-drive';
import { ConversionOptions } from './types';

const program = new Command();

program
  .name('photo-convert')
  .description('Convert TIFF images to JPG format from local files or Google Drive')
  .version('1.0.0')
  .option('-q, --quality <number>', 'JPEG quality (1-100)', '80')
  .option('-o, --output <dir>', 'Output directory (defaults to input directory)')
  .option('-r, --recursive', 'Process subdirectories recursively', false)
  .option('--overwrite', 'Overwrite existing files', false)
  .option('--credentials <path>', 'Path to Google Drive credentials JSON file')
  .option('--token <path>', 'Path to Google Drive token JSON file')
  .argument('<paths...>', 'TIFF files, directories, or Google Drive URLs to convert')
  .action(async (paths: string[], options: any) => {
    try {
      // Debug: Show received options
      console.log('Debug - Received options:', {
        quality: options.quality,
        output: options.output,
        recursive: options.recursive,
        overwrite: options.overwrite,
        credentials: options.credentials,
        token: options.token,
      });

      const conversionOptions: ConversionOptions = {
        quality: parseInt(options.quality),
        outputDir: options.output,
        recursive: options.recursive,
        overwrite: options.overwrite,
      };

      // Validate quality option
      if (conversionOptions.quality < 1 || conversionOptions.quality > 100) {
        console.error('Error: Quality must be between 1 and 100');
        process.exit(1);
      }

      // Initialize Google Drive service if credentials provided
      let googleDriveService: GoogleDriveService | undefined;
      if (options.credentials) {
        console.log(`Loading Google Drive credentials from: ${options.credentials}`);

        if (!(await fs.pathExists(options.credentials))) {
          console.error('Error: Google Drive credentials file not found');
          process.exit(1);
        }

        try {
          googleDriveService = new GoogleDriveService(options.credentials, options.token);
          // Initialize the service
          await googleDriveService.initialize(options.credentials, options.token);
          console.log('✓ Google Drive service initialized successfully');
        } catch (error) {
          console.error('Error initializing Google Drive service:', error);
          process.exit(1);
        }
      }

      const converter = new ImageConverter(conversionOptions, googleDriveService);

      // Process all inputs
      const stats = await converter.processInput(paths);

      // Print summary
      console.log('\n=== Conversion Summary ===');
      console.log(`Total files: ${stats.total}`);
      console.log(`Successful: ${stats.successful}`);
      console.log(`Failed: ${stats.failed}`);
      console.log(`Total time: ${(stats.totalTime / 1000).toFixed(2)}s`);

      if (stats.failed > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();
