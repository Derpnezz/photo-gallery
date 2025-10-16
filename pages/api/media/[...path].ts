import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path: filePath } = req.query as { path: string[] };

  if (!filePath || filePath.length === 0) {
    return res.status(400).json({ error: 'File path required' });
  }

  const usbBasePath = '/media/ph0to/photo_storage';

  // Join all path parts with forward slashes
  const fullPath = path.join(usbBasePath, ...filePath);

  // Security check
  const resolvedPath = path.resolve(fullPath);
  const resolvedUsbPath = path.resolve(usbBasePath);

  if (!resolvedPath.startsWith(resolvedUsbPath)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      return res.status(400).json({ error: 'Path is not a file' });
    }

    const ext = path.extname(fullPath).toLowerCase();
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

    // Set headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size.toString());
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', 'https://xc.gabyee.dev');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const readStream = fs.createReadStream(fullPath);
    readStream.pipe(res);

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export const config = {
  api: {
    responseLimit: false,
  },
}