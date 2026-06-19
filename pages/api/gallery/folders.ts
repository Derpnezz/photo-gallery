import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface Folder {
  name: string;
  path: string;
  slug: string;
  type: 'folder' | 'file';
  isDirectory: boolean;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Use os.homedir() to expand ~ properly
  const usbBasePath = path.join(os.homedir(), 'Pictures', 'photo-gallery-media');
  
  console.log('📁 Looking for media at:', usbBasePath);
  
  if (!fs.existsSync(usbBasePath)) {
    console.error('❌ Path not found:', usbBasePath);
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
      slug: item.name,
      type: item.isDirectory() ? 'folder' : 'file',
      isDirectory: item.isDirectory()
    }));

    console.log(`✅ Found ${folders.length} folders/files`);
    res.status(200).json(folders);
    
  } catch (error) {
    console.error('❌ Error reading folders:', error);
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