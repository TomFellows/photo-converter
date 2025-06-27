# Photo Convert

A Node.js utility to convert TIFF images to JPG format from local files or Google Drive.

## Installation

```bash
npm install
npm run build
```

## Google Drive Setup

1. **Create a Google Cloud Project:**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the Google Drive API

2. **Create Credentials:**

   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Download the JSON file as `credentials.json`

3. **Place credentials in project:**
   ```bash
   cp credentials.json ./credentials.json
   ```

## Usage

### Local Files

```bash
npm run dev image.tif
npm run dev ./photos --recursive
```

### Google Drive URLs

```bash
# Convert all TIFF files in a Google Drive folder
npm run dev "https://drive.google.com/drive/folders/1ABC123..." --credentials ./credentials.json

# With custom output directory
npm run dev "https://drive.google.com/drive/folders/1ABC123..." --output ./converted --credentials ./credentials.json
```

### Mixed Inputs

```bash
# Convert both local files and Google Drive folders
npm run dev image.tif "https://drive.google.com/drive/folders/1ABC123..." --credentials ./credentials.json
```

## Features

- ✅ Local file and directory processing
- ✅ Google Drive folder processing
- ✅ High-performance image conversion
- ✅ Batch processing
- ✅ Configurable JPEG quality
- ✅ Progress feedback and error handling
- ✅ Automatic cleanup of temporary files

## Google Drive URL Formats Supported

- `https://drive.google.com/drive/folders/FOLDER_ID`
- `https://drive.google.com/open?id=FOLDER_ID`
- `https://drive.google.com/d/FOLDER_ID`

## Requirements

- Node.js 16+
- TypeScript 5+
- Google Cloud Project with Drive API enabled

## License

MIT
