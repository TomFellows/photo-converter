export interface ConversionOptions {
  quality: number;
  outputDir?: string;
  recursive: boolean;
  overwrite: boolean;
}

export interface ConversionResult {
  inputPath: string;
  outputPath: string;
  success: boolean;
  error?: string;
  processingTime: number;
}

export interface ConversionStats {
  total: number;
  successful: number;
  failed: number;
  totalTime: number;
}
