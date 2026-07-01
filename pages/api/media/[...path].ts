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

  return serveFile(actualFilePath, req, res);
}

function findFile(filePath: string): string | null {
  // Check exact path first
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  
  // Try case-insensitive match
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
    const isVideo = mimeType.startsWith('video/') || mimeType.startsWith('audio/');
    
    // For videos: only serve first 15 seconds, or full file if requested via download
    if (isVideo) {
      // Check if this is a download request (via query param)
      const isDownload = req.query.download === 'true';
      
      // Get the video duration (we need to parse it or estimate based on file size)
      // For MP4 files, we can try to read the duration from metadata
      // But a simpler approach: limit to ~15 seconds worth of data
      // Average bitrate assumption: 5 Mbps = 625 KB/s, so 15 seconds ≈ 9.4 MB
      // For higher quality, we'll use a larger limit
      const FIFTEEN_SECONDS_BYTES = 15 * 1024 * 1024; // 15 MB (covers most videos at reasonable quality)
      
      // If the file is smaller than 15MB, serve the whole thing
      if (stats.size <= FIFTEEN_SECONDS_BYTES) {
        console.log(`📹 Video file (${(stats.size / 1024 / 1024).toFixed(1)}MB) is small enough, serving full file`);
        return streamFile(filePath, mimeType, stats, req, res);
      }
      
      // For larger files, only serve the first portion
      console.log(`📹 Large video (${(stats.size / 1024 / 1024).toFixed(1)}MB) - limiting to first ~15 seconds`);
      
      // If downloading full file, serve with download header
      if (isDownload) {
        console.log(`⬇️ Download requested - serving full file`);
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
        return streamFile(filePath, mimeType, stats, req, res);
      }
      
      // Streaming: only serve first 15MB
      const range = req.headers.range;
      
      if (range) {
        // Handle partial range requests (for seeking within the first 15 seconds)
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        let end = parts[1] ? parseInt(parts[1], 10) : Math.min(FIFTEEN_SECONDS_BYTES, stats.size - 1);
        end = Math.min(end, FIFTEEN_SECONDS_BYTES - 1);
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
          // Tell the player this is only a partial preview
          'X-Video-Preview': '15-seconds',
          'X-Full-Version': 'Download the full file to view the entire video'
        });
        
        file.pipe(res);
      } else {
        // No range header - serve first 15 seconds
        const end = Math.min(FIFTEEN_SECONDS_BYTES, stats.size - 1);
        const file = fs.createReadStream(filePath, { end });
        
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Length', (end + 1).toString());
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
        res.setHeader('Accept-Ranges', 'bytes');
        // Custom headers to indicate preview
        res.setHeader('X-Video-Preview', '15-seconds');
        res.setHeader('X-Full-Version', 'Download the full file to view the entire video');
        
        file.pipe(res);
      }
    } else {
      // For images, serve normally
      return streamFile(filePath, mimeType, stats, req, res);
    }
    
  } catch (error) {
    console.error('Error serving media:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function streamFile(filePath: string, mimeType: string, stats: fs.Stats, req: NextApiRequest, res: NextApiResponse) {
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
}

export const config = {
  api: {
    responseLimit: false,
  },
}