import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import os from 'os';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path: filePath } = req.query as { path: string[] };
  
  if (!filePath || filePath.length === 0) {
    return res.status(400).json({ error: 'File path required' });
  }

  const usbBasePath = path.join(os.homedir(), 'Pictures', 'photo-gallery-media');
  const requestedPath = path.join(usbBasePath, ...filePath);
  
  // Security check
  const resolvedPath = path.resolve(requestedPath);
  const resolvedUsbPath = path.resolve(usbBasePath);
  
  if (!resolvedPath.startsWith(resolvedUsbPath)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Find the file (with case-insensitive fallback)
  let actualFilePath = findFile(requestedPath);
  
  if (!actualFilePath) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Check if it's a preview file (contains .previews in path)
  const isPreview = actualFilePath.includes('.previews');
  
  // If it's a preview, serve it normally (it's already trimmed)
  // If it's a full video and a download is requested, serve full file
  const isDownload = req.query.download === 'true';
  
  if (isDownload) {
    // Force download of full file
    return serveFullFile(actualFilePath, req, res);
  }

  // For previews, serve normally with streaming support
  return serveFile(actualFilePath, req, res);
}

function findFile(filePath: string): string | null {
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    return null;
  }
  
  const filename = path.basename(filePath);
  const files = fs.readdirSync(dir);
  const match = files.find(f => f.toLowerCase() === filename.toLowerCase());
  
  return match ? path.join(dir, match) : null;
}

function serveFile(filePath: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return res.status(400).json({ error: 'Path is not a file' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.mkv': 'video/x-matroska',
      '.webm': 'video/webm'
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    // Handle range requests for video streaming
    const range = req.headers.range;
    
    if (range && (mimeType.startsWith('video/') || mimeType.startsWith('audio/'))) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunkSize = (end - start) + 1;
      
      const file = fs.createReadStream(filePath, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
      });
      
      file.pipe(res);
    } else {
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', stats.size.toString());
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    }
    
  } catch (error) {
    console.error('Error serving media:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function serveFullFile(filePath: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return res.status(400).json({ error: 'Path is not a file' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.mkv': 'video/x-matroska',
      '.webm': 'video/webm'
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    // Force download with proper headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size.toString());
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving full file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export const config = {
  api: {
    responseLimit: false,
  },
}