import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

interface FileMetadata {
  name: string;
  publicPath: string;
  type: 'image' | 'video';
  size: number;
  modified: string;
  isPreview?: boolean; // For preview files
  originalPath?: string; // For previews, link to original
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

const usbBasePath = path.join(os.homedir(), 'Pictures', 'photo-gallery-media');
const outputPath = path.join(process.cwd(), 'public', 'metadata-index.json');
const PREVIEW_DURATION = 15; // seconds

// Check if ffmpeg is available
async function checkFFmpeg(): Promise<boolean> {
  try {
    await execPromise('ffmpeg -version');
    return true;
  } catch {
    console.warn('⚠️ ffmpeg not found. Video previews will not be generated.');
    console.warn('Install ffmpeg to enable video previews: https://ffmpeg.org/download.html');
    return false;
  }
}

// Generate a 15-second preview for a video
async function generateVideoPreview(videoPath: string, previewPath: string): Promise<boolean> {
  try {
    // Check if preview already exists
    if (fs.existsSync(previewPath)) {
      console.log(`✅ Preview already exists: ${path.basename(previewPath)}`);
      return true;
    }

    console.log(`🎬 Generating 15s preview for: ${path.basename(videoPath)}`);
    
    // Use ffmpeg to extract first 15 seconds
    const command = `ffmpeg -i "${videoPath}" -t ${PREVIEW_DURATION} -c copy -movflags +faststart "${previewPath}" -y`;
    
    // -i: input file
    // -t 15: only take 15 seconds
    // -c copy: copy codec (fast, no re-encoding)
    // -movflags +faststart: optimize for web streaming
    // -y: overwrite if exists
    
    await execPromise(command, { maxBuffer: 1024 * 1024 * 100 });
    console.log(`✅ Preview generated: ${path.basename(previewPath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to generate preview for ${path.basename(videoPath)}:`, error);
    return false;
  }
}

function scanDirectory(dirPath: string, baseSlug: string = ''): MetadataIndex {
  const index: MetadataIndex = {};
  const previewsDir = path.join(dirPath, '.previews');

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

            // For videos, check if preview exists
            let previewPublicPath: string | undefined;
            if (isVideo) {
              const previewPath = path.join(currentPath, '.previews', `preview_${item.name}`);
              if (fs.existsSync(previewPath)) {
                previewPublicPath = relativePath ? 
                  `/api/media/${relativePath}/.previews/preview_${item.name}` :
                  `/api/media/.previews/preview_${item.name}`;
              }
            }

            const fileMeta: FileMetadata = {
              name: item.name,
              publicPath: previewPublicPath || publicPath, // Use preview if available
              type: isImage ? 'image' : 'video',
              size: stats.size,
              modified: stats.mtime.toISOString(),
            };

            // Store original path for videos with previews
            if (isVideo && previewPublicPath) {
              fileMeta.originalPath = publicPath;
              fileMeta.isPreview = true;
            }

            files.push(fileMeta);
          } catch (err) {
            console.error(`Error processing file ${item.name}:`, err);
          }
        }
      } else if (item.isDirectory()) {
        if (!['System Volume Information', '$RECYCLE.BIN', '.Trashes', '.previews'].includes(item.name) && !item.name.startsWith('.')) {
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

// Main execution
async function main() {
  console.log('🔍 Scanning directory structure...');
  console.log('📁 Looking for media at:', usbBasePath);

  if (!fs.existsSync(usbBasePath)) {
    console.error('❌ Path not found:', usbBasePath);
    process.exit(1);
  }

  // Check if ffmpeg is available
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    console.log('⚠️ Continuing without video previews (ffmpeg not installed)');
  }

  // First pass: generate previews for all videos
  if (hasFFmpeg) {
    console.log('\n🎬 Generating video previews...');
    const allVideos: string[] = [];
    
    // Find all video files
    function findVideos(dir: string) {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          if (!['System Volume Information', '$RECYCLE.BIN', '.Trashes', '.previews'].includes(item.name) && !item.name.startsWith('.')) {
            findVideos(path.join(dir, item.name));
          }
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(ext)) {
            allVideos.push(path.join(dir, item.name));
          }
        }
      }
    }
    
    findVideos(usbBasePath);
    console.log(`📹 Found ${allVideos.length} videos to process`);
    
    // Generate previews in parallel (but limit concurrency to avoid overload)
    const concurrencyLimit = 3;
    let processed = 0;
    
    for (let i = 0; i < allVideos.length; i += concurrencyLimit) {
      const batch = allVideos.slice(i, i + concurrencyLimit);
      const promises = batch.map(async (videoPath) => {
        const previewDir = path.join(path.dirname(videoPath), '.previews');
        if (!fs.existsSync(previewDir)) {
          fs.mkdirSync(previewDir, { recursive: true });
        }
        const previewPath = path.join(previewDir, `preview_${path.basename(videoPath)}`);
        await generateVideoPreview(videoPath, previewPath);
        processed++;
        console.log(`📊 Progress: ${processed}/${allVideos.length} videos processed`);
      });
      await Promise.all(promises);
    }
  }

  // Second pass: scan directory and build metadata with previews
  console.log('\n📊 Building metadata index...');
  const metadata = scanDirectory(usbBasePath);

  console.log(`✅ Found ${Object.keys(metadata).length} folders`);
  console.log(`💾 Writing metadata to ${outputPath}`);

  fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));

  console.log('✨ Metadata index generated successfully!');
}

// Run the script
main().catch(console.error);