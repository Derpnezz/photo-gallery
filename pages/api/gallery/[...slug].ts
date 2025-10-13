import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

interface MediaFile {
  name: string;
  path?: string;
  publicPath: string;
  type: 'image' | 'video';
  size: number;
  modified: string;
}

interface SubFolder {
  name: string;
  path: string;
  slug: string;
}

interface GalleryData {
  folder: string;
  fullPath: string;
  files: MediaFile[];
  subFolders: SubFolder[];
}

interface FolderMetadata {
  name: string;
  path: string;
  slug: string;
  files: MediaFile[];
  subFolders: string[];
  thumbnail?: string;
}

interface MetadataIndex {
  [key: string]: FolderMetadata;
}

// Load metadata index once at startup
let metadataCache: MetadataIndex | null = null;

function loadMetadataIndex(): MetadataIndex {
  if (metadataCache) return metadataCache;
  
  try {
    const metadataPath = path.join(process.cwd(), 'public', 'metadata-index.json');
    if (fs.existsSync(metadataPath)) {
      const data = fs.readFileSync(metadataPath, 'utf-8');
      metadataCache = JSON.parse(data);
      console.log('✅ Loaded metadata index with', Object.keys(metadataCache).length, 'folders');
      return metadataCache;
    }
  } catch (error) {
    console.error('❌ Error loading metadata index:', error);
  }
  return {};
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;
  
  console.log('🚀 Gallery API called with slug:', slug);
  
  const usbBasePath = '/media/ph0to/photo_storage';
  
  // Try to use cached metadata first
  const metadataIndex = loadMetadataIndex();
  const slugKey = Array.isArray(slug) ? slug.join('/') : (slug || 'root');
  
  // Use metadata index if available
  if (metadataIndex && metadataIndex[slugKey]) {
    const metadata = metadataIndex[slugKey];
    
    const subFolders: SubFolder[] = metadata.subFolders.map(subSlug => {
      const subMeta = metadataIndex[subSlug];
      return {
        name: subMeta?.name || subSlug.split('/').pop() || '',
        path: subMeta?.path || '',
        slug: subSlug
      };
    });

    const galleryData: GalleryData = {
      folder: metadata.name,
      fullPath: metadata.slug,
      files: metadata.files,
      subFolders
    };

    console.log(`⚡ Served from cache: ${metadata.files.length} files, ${subFolders.length} folders`);
    return res.status(200).json(galleryData);
  }

  // Fallback to filesystem scanning if metadata not available
  if (!fs.existsSync(usbBasePath)) {
    return res.status(404).json({ 
      error: 'USB drive not found',
      path: usbBasePath
    });
  }

  try {
    let targetPath = usbBasePath;
    let folderName = 'USB Drive';
    
    // Handle slug array for nested folders
    if (slug && Array.isArray(slug)) {
      // Join all slug parts to form the full path
      const slugPath = slug.join('/');
      targetPath = path.join(usbBasePath, slugPath);
      folderName = slug[slug.length - 1] || 'USB Drive';
    } else if (slug && typeof slug === 'string') {
      // Handle single folder
      targetPath = path.join(usbBasePath, slug);
      folderName = slug;
    }

    console.log('🎯 Target path:', targetPath);
    console.log('📁 Folder name:', folderName);
    
    // Check if target path exists
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ 
        error: 'Folder not found',
        path: targetPath,
        requestedSlug: slug
      });
    }

    // Check if it's actually a directory
    const stats = fs.statSync(targetPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ 
        error: 'Path is not a directory',
        path: targetPath
      });
    }
    
    // Read all items in the directory
    const items = fs.readdirSync(targetPath, { withFileTypes: true });
    
    console.log('📦 Found items:', items.length);
    
    // Get subfolders (excluding system folders)
    const subFolders: SubFolder[] = items
      .filter(item => item.isDirectory())
      .filter(item => !['System Volume Information', '$RECYCLE.BIN', '.Trashes'].includes(item.name) && !item.name.startsWith('.'))
      .map(folder => {
        // Build slug for subfolder - preserve the full path
        const currentSlug = Array.isArray(slug) ? slug.join('/') : (slug || '');
        const folderSlug = currentSlug ? `${currentSlug}/${folder.name}` : folder.name;
        
        return {
          name: folder.name,
          path: path.join(targetPath, folder.name),
          slug: folderSlug
        };
      });

    console.log('📁 Subfolders:', subFolders.map(f => f.name));

    // Get media files (photos and videos)
    const files: MediaFile[] = items
      .filter(item => item.isFile())
      .map(file => {
        const filePath = path.join(targetPath, file.name);
        
        try {
          const stats = fs.statSync(filePath);
          const ext = path.extname(file.name).toLowerCase();
          
          const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext);
          const isVideo = ['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(ext);
          
          if (!isImage && !isVideo) {
            return null;
          }
          
          // Build public path - use the full path from USB base
          const relativePath = targetPath.replace(usbBasePath + '/', '');
          const publicPath = relativePath ? 
            `/api/media/${relativePath}/${file.name}` :
            `/api/media/${file.name}`;
          
          return {
            name: file.name,
            path: filePath,
            publicPath: publicPath,
            type: isImage ? 'image' : 'video',
            size: stats.size,
            modified: stats.mtime.toISOString()
          };
        } catch (error) {
          return null;
        }
      })
      .filter((file): file is MediaFile => file !== null);

    console.log(`✅ Found ${files.length} media files and ${subFolders.length} subfolders`);
    
    const galleryData: GalleryData = {
      folder: folderName,
      fullPath: Array.isArray(slug) ? slug.join('/') : (slug || ''),
      files,
      subFolders
    };

    res.status(200).json(galleryData);
    
  } catch (error) {
    console.error('❌ Error reading gallery:', error);
    res.status(500).json({ 
      error: 'Error reading gallery',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export const config = {
  api: {
    responseLimit: false,
  },
}
