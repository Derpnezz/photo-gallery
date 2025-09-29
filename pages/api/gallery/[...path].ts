
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const SUPPORTED_EXTENSIONS = [
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff', '.ico',
  // Videos
  '.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.m4v'
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { path: pathArray } = req.query;
    
    if (!pathArray || !Array.isArray(pathArray)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    const folderPath = pathArray.join('/');
    const fullPath = path.join(process.cwd(), 'public', 'photos', folderPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const items = fs.readdirSync(fullPath);
    const mediaFiles: any[] = [];
    const subFolders: any[] = [];

    items.forEach(item => {
      const fullItemPath = path.join(fullPath, item);
      const stat = fs.statSync(fullItemPath);
      
      if (stat.isDirectory()) {
        subFolders.push({
          name: item,
          path: `${folderPath}/${item}`,
          slug: `${folderPath}/${item}`.replace(/\s+/g, '-').toLowerCase()
        });
      } else {
        const ext = path.extname(item).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          const publicPath = `/photos/${folderPath}/${item}`;
          
          mediaFiles.push({
            name: item,
            path: item,
            publicPath: publicPath,
            type: ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.m4v'].includes(ext) ? 'video' : 'image',
            size: stat.size,
            modified: stat.mtime
          });
        }
      }
    });

    res.status(200).json({
      folder: folderPath,
      files: mediaFiles.sort((a, b) => a.name.localeCompare(b.name)),
      subFolders: subFolders.sort((a, b) => a.name.localeCompare(b.name))
    });
  } catch (error) {
    console.error('Error reading media files:', error);
    res.status(500).json({ error: 'Failed to read media files' });
  }
}
