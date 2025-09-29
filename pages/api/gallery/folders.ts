
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const photosDir = path.join(process.cwd(), 'public', 'photos');
    
    if (!fs.existsSync(photosDir)) {
      return res.status(404).json({ error: 'Photos directory not found' });
    }

    function getFoldersRecursively(dir: string, relativePath: string = ''): any[] {
      const items = fs.readdirSync(dir);
      const folders: any[] = [];

      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          const folderRelativePath = relativePath ? `${relativePath}/${item}` : item;
          const subFolders = getFoldersRecursively(fullPath, folderRelativePath);
          
          folders.push({
            name: item,
            path: folderRelativePath,
            slug: folderRelativePath.replace(/\s+/g, '-').toLowerCase(),
          });
          
          folders.push(...subFolders);
        }
      });

      return folders.sort((a, b) => a.name.localeCompare(b.name));
    }

    const folders = getFoldersRecursively(photosDir);
    res.status(200).json(folders);
  } catch (error) {
    console.error('Error reading folders:', error);
    res.status(500).json({ error: 'Failed to read folders' });
  }
}
