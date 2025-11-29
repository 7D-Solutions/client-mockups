# Dropbox Certificate Upload Setup Guide

## Overview
Certificate uploads for gauges are now integrated with your Dropbox Plus (2TB) account. Certificates will be automatically organized in a structured folder hierarchy.

## Folder Structure
Certificates will be stored in an **isolated app folder** organized by gauge:
```
/Apps/Fire-Proof-ERP-Certificates/    (automatically created, isolated from your files)
  └── certificates/
      ├── GB0007/
      │   ├── 2025-10-22_calibration_cert.pdf
      │   ├── 2025-11-15_recalibration.pdf
      │   └── ...
      ├── GB0008/
      │   └── 2025-10-20_certificate.pdf
      └── ...
```

**Benefits**:
- All certificates for a gauge in one folder
- Easy to browse by gauge ID
- Chronological sorting by date prefix
- Automatic duplicate detection prevents re-uploading same certificate

## Setup Steps

### 1. Create Dropbox App (App Folder Access - Secure!)
1. Go to https://www.dropbox.com/developers/apps
2. Click **"Create app"**
3. Choose:
   - **API**: Scoped access
   - **Type of access**: **App folder** ⭐ (IMPORTANT: Choose this for security!)
   - **Name**: `Fire-Proof-ERP-Certificates` (or your preferred name)
4. Click **"Create app"**

**Security Note**: App folder access means the token can ONLY access `/Apps/Fire-Proof-ERP-Certificates/` - your personal files are completely isolated and safe!

### 2. Configure App Permissions
1. In your new app's settings, go to the **Permissions** tab
2. Enable the following permissions:
   - ✅ `files.content.write` - Upload files
   - ✅ `files.content.read` - Read file content
   - ✅ `files.metadata.read` - Get file metadata
   - ✅ `sharing.write` - Create shareable links
3. Click **"Submit"** to save permissions

### 3. Generate Access Token
1. Go to the **Settings** tab
2. Scroll down to **"OAuth 2"** section
3. Under **"Generated access token"**, click **"Generate"**
4. Copy the token (it will look like: `sl.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
5. ⚠️ **IMPORTANT**: Save this token securely - it won't be shown again!

### 4. Configure Backend Environment

#### Development (.env)
Add to `/backend/.env`:
```bash
# Dropbox Configuration (App Folder = isolated access)
DROPBOX_ACCESS_TOKEN=your_token_here_sl.xxxxxxxxxxxxxxx
DROPBOX_ROOT_PATH=/certificates
UPLOAD_TEMP_DIR=./uploads/temp
```

**Note**: Path `/certificates` is relative to your app folder `/Apps/Fire-Proof-ERP-Certificates/`

#### Production (Railway)
Add environment variables in Railway dashboard:
1. Go to your Railway project
2. Select **Backend** service
3. Go to **Variables** tab
4. Add:
   - `DROPBOX_ACCESS_TOKEN` = your_token_here
   - `DROPBOX_ROOT_PATH` = `/certificates`
   - `UPLOAD_TEMP_DIR` = `./uploads/temp`

### 5. Install Dependencies
```bash
cd backend
npm install
```

This will install:
- `dropbox@^10.34.0` - Dropbox SDK
- `multer@^1.4.5-lts.1` - File upload middleware

### 6. Create Upload Directory (Development)
```bash
cd backend
mkdir -p uploads/temp
```

### 7. Restart Services
```bash
# Development
docker-compose restart backend frontend

# Production (Railway)
# Redeploy via Railway dashboard or git push
```

## Testing

### Test Certificate Upload
1. Go to Admin Dashboard → Gauges
2. Click on any gauge to edit
3. In the **"Calibration Certificate"** section, click **"Upload Certificate"**
4. Select a PDF, JPG, PNG, or DOC file (max 10MB)
5. Save the gauge
6. Check your Dropbox folder structure - the file should appear!

### Expected Behavior
- ✅ File uploads to Dropbox in gauge-specific folder (`/certificates/{gaugeId}/`)
- ✅ Duplicate detection prevents re-uploading same certificate
- ✅ Shareable link generated for viewing in app
- ✅ `document_path` field updated in database with Dropbox path
- ✅ Toast notification shows success/failure
- ✅ Temporary file cleaned up after upload

### Duplicate Detection
The system uses SHA-256 file hashing to detect duplicates:
1. Calculates hash of uploaded file
2. Compares with existing certificates in gauge folder
3. If exact duplicate found, upload is rejected with clear error message
4. Shows which file already exists and when it was uploaded

## File Restrictions
- **Max size**: 10MB (configurable via `MAX_FILE_SIZE` env var)
- **Allowed types**: pdf, jpg, jpeg, png, doc, docx (configurable via `ALLOWED_FILE_TYPES` env var)

## API Endpoints

### Upload Certificate
```http
POST /api/gauges/:id/upload-certificate
Content-Type: multipart/form-data
Authorization: Bearer {jwt_token}

FormData:
  certificate: File
```

### Get Certificate Info
```http
GET /api/gauges/:id/certificate
Authorization: Bearer {jwt_token}
```

## Troubleshooting

### "Dropbox service is not available"
- Check that `DROPBOX_ACCESS_TOKEN` is set in environment
- Restart backend service after adding token
- Check logs: `docker logs fireproof-erp-modular-backend-dev -f`

### "Invalid file type"
- Ensure file extension is in `ALLOWED_FILE_TYPES`
- Default: jpg, jpeg, png, pdf, doc, docx

### "File too large"
- Default limit is 10MB
- Change via `MAX_FILE_SIZE` environment variable (in bytes)

### Upload succeeds but file not in Dropbox
- Check Dropbox app permissions (must have write access)
- Verify folder path matches `DROPBOX_ROOT_PATH`
- Check backend logs for errors

### Shareable link not working
- Dropbox may take a few seconds to make link active
- Try refreshing the page
- Link format: `https://www.dropbox.com/...?dl=1` (dl=1 for direct download)

## Security Notes

### 🔒 App Folder Isolation (Recommended Setup)

**What you chose**: App folder access
**What this means**: Token can ONLY access `/Apps/Fire-Proof-ERP-Certificates/`

| Scenario | App Folder (Secure) ✅ | Full Dropbox (Risky) ❌ |
|----------|----------------------|------------------------|
| Token leaked | Only app folder at risk | Entire 2TB at risk |
| Can read your personal files | ❌ No | ✅ Yes |
| Can delete your photos | ❌ No | ✅ Yes |
| Can access work documents | ❌ No | ✅ Yes |
| Isolated from other apps | ✅ Yes | ❌ No |

**Result**: Even if the token is compromised, attackers can ONLY access certificates in the app folder - your 317GB of personal files remain safe! 🛡️

### ⚠️ Access Token Security
- Never commit the access token to Git
- Use environment variables only
- Rotate token if exposed
- Use different tokens for dev/production
- App folder access provides defense in depth

### ⚠️ File Upload Security
- Files are validated by type and size
- Temporary files are cleaned up after upload
- All uploads require authentication (JWT)
- Only operators and admins can upload certificates

## Storage Estimates

With your **2TB Dropbox Plus** plan:
- **Current usage**: 317GB
- **Available**: 1.7TB
- **Average certificate**: ~500KB (PDF)
- **Estimated capacity**: ~3.4 million certificates

You have **plenty** of space! 🎉

## Support

For issues or questions:
1. Check backend logs: `docker logs fireproof-erp-modular-backend-dev -f`
2. Check Dropbox app permissions
3. Verify environment variables are set correctly
4. Test with a small file first (<1MB)
