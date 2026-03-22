
import * as fs from 'fs';
import * as path from 'path';

interface FileMetadata {
  name: string;
  publicPath: string;
  type: 'image' | 'video';
  size: number;
  modified: string;
}

interface FolderMetadata {
  name: string;
  path: string;
  slug: string;
  files: FileMetadata[];
  subFolders: string[];
  thumbnail?: string;
}

interface MetadataIndex {
  [key: string]: FolderMetadata;
}

const usbBasePath = '~/Pictures/photo-gallery-media';
const outputPath = path.join(process.cwd(), 'public', 'metadata-index.json');

function scanDirectory(dirPath: string, baseSlug: string = ''): MetadataIndex {
  const index: MetadataIndex = {};

  function scan(currentPath: string, currentSlug: string) {
    if (!fs.existsSync(currentPath)) return;

    const items = fs.readdirSync(currentPath, { withFileTypes: true });
    
    const files: FileMetadata[] = [];
    const subFolders: string[] = [];

    // Process files
    items.forEach(item => {
      if (item.isFile()) {
        const filePath = path.join(currentPath, item.name);
        const ext = path.extname(item.name).toLowerCase();
        
        const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext);
        const isVideo = ['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(ext);
        
        if (isImage || isVideo) {
          try {
            const stats = fs.statSync(filePath);
            const relativePath = currentPath.replace(usbBasePath + '/', '');
            const publicPath = relativePath ? 
              `/api/media/${relativePath}/${item.name}` :
              `/api/media/${item.name}`;

            files.push({
              name: item.name,
              publicPath,
              type: isImage ? 'image' : 'video',
              size: stats.size,
              modified: stats.mtime.toISOString()
            });
          } catch (err) {
            console.error(`Error processing file ${item.name}:`, err);
          }
        }
      } else if (item.isDirectory()) {
        if (!['System Volume Information', '$RECYCLE.BIN', '.Trashes'].includes(item.name) && !item.name.startsWith('.')) {
          const subSlug = currentSlug ? `${currentSlug}/${item.name}` : item.name;
          subFolders.push(subSlug);
          scan(path.join(currentPath, item.name), subSlug);
        }
      }
    });

    // Store folder metadata
    const folderName = currentSlug.split('/').pop() || 'root';
    const thumbnail = files.find(f => f.type === 'image')?.publicPath;
    
    index[currentSlug || 'root'] = {
      name: folderName,
      path: currentPath,
      slug: currentSlug,
      files,
      subFolders,
      thumbnail
    };
  }

  scan(dirPath, baseSlug);
  return index;
}

console.log('🔍 Scanning directory structure...');
const metadata = scanDirectory(usbBasePath);

console.log(`✅ Found ${Object.keys(metadata).length} folders`);
console.log(`💾 Writing metadata to ${outputPath}`);

fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));

console.log('✨ Metadata index generated successfully!');
