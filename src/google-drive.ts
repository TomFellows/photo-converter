import fs from 'fs-extra';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { createInterface } from 'readline';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

export class GoogleDriveService {
  private drive: any;
  private auth: OAuth2Client;
  private initialized: boolean = false;

  constructor(credentialsPath: string, tokenPath?: string) {
    this.auth = new google.auth.OAuth2();
    // Don't call loadCredentials here - it will be called in initialize()
  }

  /**
   * Initialize the service (must be called before use)
   */
  async initialize(credentialsPath: string, tokenPath?: string): Promise<void> {
    if (this.initialized) return;

    try {
      const credentials = await fs.readJson(credentialsPath);

      // Set up OAuth2 client
      this.auth = new google.auth.OAuth2(
        credentials.installed?.client_id || credentials.web?.client_id,
        credentials.installed?.client_secret || credentials.web?.client_secret,
        credentials.installed?.redirect_uris?.[0] || credentials.web?.redirect_uris?.[0] || 'urn:ietf:wg:oauth:2.0:oob',
      );

      // Try to load existing token
      if (tokenPath && (await fs.pathExists(tokenPath))) {
        const token = await fs.readJson(tokenPath);
        this.auth.setCredentials(token);
      } else {
        // Need to authenticate
        await this.authenticate();
      }

      this.drive = google.drive({ version: 'v3', auth: this.auth });
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to load credentials: ${error}`);
    }
  }

  /**
   * Authenticate with Google OAuth2
   */
  private async authenticate(): Promise<void> {
    const scopes = ['https://www.googleapis.com/auth/drive.readonly'];

    const authUrl = this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });

    console.log('🔐 Google Drive authentication required');
    console.log('Please visit this URL to authorize the application:');
    console.log(authUrl);
    console.log('\nAfter authorization, enter the code from the page:');

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const code = await new Promise<string>((resolve) => {
      rl.question('Enter authorization code: ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });

    try {
      const { tokens } = await this.auth.getToken(code);
      this.auth.setCredentials(tokens);

      // Save token for future use
      const tokenPath = './token.json';
      await fs.writeJson(tokenPath, tokens);
      console.log('✅ Authentication successful! Token saved to token.json');
    } catch (error) {
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Extract folder ID from Google Drive URL
   */
  extractFolderIdFromUrl(url: string): string | null {
    // Handle different Google Drive URL formats
    const patterns = [/\/folders\/([a-zA-Z0-9-_]+)/, /id=([a-zA-Z0-9-_]+)/, /\/d\/([a-zA-Z0-9-_]+)/];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * List all TIFF files in a Google Drive folder
   */
  async listTiffFiles(folderId: string): Promise<GoogleDriveFile[]> {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and (mimeType='image/tiff' or mimeType='image/x-tiff' or name contains '.tif' or name contains '.tiff')`,
        fields: 'files(id, name, mimeType, size)',
        pageSize: 1000,
      });

      return response.data.files || [];
    } catch (error) {
      throw new Error(`Failed to list files: ${error}`);
    }
  }

  /**
   * Download a file from Google Drive
   */
  async downloadFile(fileId: string, outputPath: string): Promise<void> {
    try {
      const response = await this.drive.files.get(
        {
          fileId: fileId,
          alt: 'media',
        },
        { responseType: 'stream' },
      );

      const writer = fs.createWriteStream(outputPath);

      return new Promise((resolve, reject) => {
        response.data
          .on('end', () => resolve())
          .on('error', reject)
          .pipe(writer);
      });
    } catch (error) {
      throw new Error(`Failed to download file: ${error}`);
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<GoogleDriveFile> {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size',
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to get file metadata: ${error}`);
    }
  }
}
