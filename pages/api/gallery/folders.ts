
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const photosDir = path.join(process.cwd(), 'public', 'photos');
    
    if (!fs.existsSync(photosDir)) {
      return res.status(404).json({ error: 'Photos directory not found' });
    }

    const items = fs.readdirSync(photosDir);
    const folders: any[] = [];

    items.forEach(item => {
      const fullPath = path.join(photosDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        folders.push({
          name: item,
          path: item,
          slug: item.replace(/\s+/g, '-').toLowerCase(),
        });
      }
    });

    const sortedFolders = folders.sort((a, b) => a.name.localeCompare(b.name));
    res.status(200).json(sortedFolders);
  } catch (error) {
    console.error('Error reading folders:', error);
    res.status(500).json({ error: 'Failed to read folders' });
  }
}
