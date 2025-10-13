import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

interface Folder {
  name: string;
  path: string;
  slug: string;
  type: 'folder' | 'file';
  isDirectory: boolean;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const usbBasePath = '/media/ph0to/photo_storage';
  
  if (!fs.existsSync(usbBasePath)) {
    return res.status(404).json({ 
      error: 'USB drive not found',
      path: usbBasePath
    });
  }

  try {
    const items = fs.readdirSync(usbBasePath, { withFileTypes: true });
    
    const filteredItems = items.filter(item => {
      if (item.name === 'System Volume Information' || 
          item.name.startsWith('.') || 
          item.name === '$RECYCLE.BIN' ||
          item.name === '.Trashes') {
        return false;
      }
      return true;
    });

    const folders: Folder[] = filteredItems.map(item => ({
      name: item.name,
      path: path.join(usbBasePath, item.name),
      slug: item.name, // Use raw name for slug
      type: item.isDirectory() ? 'folder' : 'file',
      isDirectory: item.isDirectory()
    }));

    res.status(200).json(folders);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Error reading folders'
    });
  }
}

export const config = {
  api: {
    responseLimit: false,
  },
}
