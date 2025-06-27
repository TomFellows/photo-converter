import { URL } from 'url';

export interface ParsedInput {
  type: 'local' | 'google-drive';
  path: string;
  folderId?: string;
}

export class InputParser {
  /**
   * Parse input to determine if it's a local path or Google Drive URL
   */
  static parse(input: string): ParsedInput {
    try {
      const url = new URL(input);

      // Check if it's a Google Drive URL
      if (url.hostname.includes('drive.google.com')) {
        const folderId = this.extractFolderId(input);
        if (folderId) {
          return {
            type: 'google-drive',
            path: input,
            folderId,
          };
        }
      }
    } catch {
      // Not a valid URL, treat as local path
    }

    return {
      type: 'local',
      path: input,
    };
  }

  /**
   * Extract folder ID from Google Drive URL
   */
  private static extractFolderId(url: string): string | null {
    const patterns = [/\/folders\/([a-zA-Z0-9-_]+)/, /id=([a-zA-Z0-9-_]+)/, /\/d\/([a-zA-Z0-9-_]+)/];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }
}
