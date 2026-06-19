import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getFolderHash } from '../../lib/folderHash';
import styles from '../../styles/Gallery.module.css';

// Hook to detect mobile devices
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
      return mobileKeywords.some(keyword => userAgent.includes(keyword));
    };
    
    setIsMobile(checkMobile());
  }, []);

  return isMobile;
};

interface MediaFile {
  name: string;
  path: string;
  publicPath: string;
  type: 'image' | 'video';
  size: number;
  modified: string;
}

interface GalleryData {
  folder: string;
  fullPath: string;
  files: MediaFile[];
  subFolders: SubFolder[];
}

interface SubFolder {
  name: string;
  path: string;
  slug: string;
}

type SortOption = 'name' | 'date' | 'size' | 'type';
type FilterOption = 'all' | 'images' | 'videos';

const GalleryPage: NextPage = () => {
  const router = useRouter();
  const { slug } = router.query;
  const [galleryData, setGalleryData] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const gridRef = useRef<HTMLDivElement>(null);
  const [showMobileDownloadModal, setShowMobileDownloadModal] = useState(false);
  const [mobileDownloadMessage, setMobileDownloadMessage] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (slug) {
      const folderPath = Array.isArray(slug) ? slug.join('/') : slug;
      console.log('🔄 Fetching data for slug:', slug, 'Path:', folderPath);
      fetchGalleryData(folderPath);
    }
  }, [slug]);

  // Virtual scrolling with intersection observer
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '200px',
      threshold: 0.01
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.getAttribute('data-index') || '0');
          setVisibleRange(prev => ({
            start: Math.max(0, Math.min(prev.start, index - 10)),
            end: Math.max(prev.end, index + 40)
          }));
        }
      });
    }, options);

    if (gridRef.current) {
      const items = gridRef.current.querySelectorAll('[data-index]');
      items.forEach(item => observer.observe(item));
    }

    return () => observer.disconnect();
  }, [galleryData]);

  const navigateMedia = useCallback((direction: 'prev' | 'next') => {
    if (!selectedMedia || !galleryData) return;

    const displayedFiles = getSortedAndFilteredFiles();
    const currentIndex = displayedFiles.findIndex(file => file.publicPath === selectedMedia.publicPath);
    let newIndex;

    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : displayedFiles.length - 1;
    } else {
      newIndex = currentIndex < displayedFiles.length - 1 ? currentIndex + 1 : 0;
    }

    setSelectedMedia(displayedFiles[newIndex]);
  }, [selectedMedia, galleryData]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedMedia) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          navigateMedia('prev');
          break;
        case 'ArrowRight':
          event.preventDefault();
          navigateMedia('next');
          break;
        case 'Escape':
          event.preventDefault();
          closeLightbox();
          break;
      }
    };

    if (selectedMedia) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedMedia, navigateMedia]);

  const fetchGalleryData = async (folderPath: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching gallery data for path:', folderPath);
      const apiUrl = `/api/gallery/${folderPath}`;
      console.log('🔍 API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      console.log('🔍 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const responseText = await response.text();
        let errorDetails = '';
        
        try {
          const errorData = JSON.parse(responseText);
          errorDetails = errorData.error || 'Unknown error';
          if (errorData.details) {
            errorDetails += ` (${errorData.details})`;
          }
          if (errorData.path) {
            errorDetails += ` at path: ${errorData.path}`;
          }
          console.error('🔍 API Error details:', errorData);
        } catch {
          errorDetails = responseText;
          console.error('🔍 API Error text:', responseText);
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorDetails}`);
      }
      
      const data = await response.json();
      console.log('✅ Gallery data received successfully');
      console.log('📁 Folder:', data.folder);
      console.log('📊 Files count:', data.files?.length);
      console.log('📁 Subfolders count:', data.subFolders?.length);
      
      setGalleryData(data);
    } catch (error) {
      console.error('❌ Error fetching gallery data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  const generateFolderBreadcrumbs = () => {
    if (!galleryData) return [];

    const fullPath = galleryData.fullPath || (Array.isArray(slug) ? slug.join('/') : slug || '');
    
    if (!fullPath) return [];

    const pathParts = fullPath.split('/');
    const breadcrumbs = [];
    let currentPath = '';
    
    pathParts.forEach((part, index) => {
      currentPath += (index > 0 ? '/' : '') + part;
      const hash = getFolderHash(part);
      breadcrumbs.push({
        name: part,
        path: `/${hash}/${currentPath}`
      });
    });
    
    return breadcrumbs;
  };

  const getSortedAndFilteredFiles = () => {
    if (!galleryData) return [];

    let files = [...galleryData.files];

    if (filterBy === 'images') {
      files = files.filter(f => f.type === 'image');
    } else if (filterBy === 'videos') {
      files = files.filter(f => f.type === 'video');
    }

    files.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.modified).getTime() - new Date(a.modified).getTime();
        case 'size':
          return b.size - a.size;
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return files;
  };

  const openLightbox = (media: MediaFile) => {
    setSelectedMedia(media);
  };

  const closeLightbox = () => {
    setSelectedMedia(null);
  };

  const downloadMedia = async (media: MediaFile) => {
    const link = document.createElement('a');
    link.href = media.publicPath;
    link.download = media.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (isMobile) {
      setMobileDownloadMessage('Your file has been downloaded and can be found in your Files app.');
      setShowMobileDownloadModal(true);
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedFiles(new Set());
      setLastSelectedIndex(null);
    }
  };

  const handleFileSelect = (file: MediaFile, index: number, event: React.MouseEvent) => {
    if (!isSelectionMode) return;

    const newSelected = new Set(selectedFiles);

    if (event.shiftKey && lastSelectedIndex !== null) {
      const displayedFiles = getSortedAndFilteredFiles();
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);

      for (let i = start; i <= end; i++) {
        newSelected.add(displayedFiles[i].publicPath);
      }
    } else {
      if (newSelected.has(file.publicPath)) {
        newSelected.delete(file.publicPath);
      } else {
        newSelected.add(file.publicPath);
      }
      setLastSelectedIndex(index);
    }

    setSelectedFiles(newSelected);
  };

  const selectAll = () => {
    const displayedFiles = getSortedAndFilteredFiles();
    setSelectedFiles(new Set(displayedFiles.map(f => f.publicPath)));
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
    setLastSelectedIndex(null);
  };

  const downloadSelectedAsZip = async () => {
    if (selectedFiles.size === 0) return;

    const displayedFiles = getSortedAndFilteredFiles();
    const filesToDownload = displayedFiles.filter(f => selectedFiles.has(f.publicPath));

    const JSZip = (await import('jszip')).default;
    const zip = new (JSZip as any)();

    for (const file of filesToDownload) {
      try {
        const response = await fetch(file.publicPath);
        const blob = await response.blob();
        zip.file(file.name, blob);
      } catch (error) {
        console.error(`Failed to add ${file.name} to zip:`, error);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${galleryData?.folder.split('/').pop() || 'gallery'}-photos.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    if (isMobile) {
      setMobileDownloadMessage(`Your ZIP file with ${selectedFiles.size} photo(s) has been downloaded and can be found in your Files app.`);
      setShowMobileDownloadModal(true);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading gallery...</div>
      </div>
    );
  }

  if (error || !galleryData) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Error Loading Gallery</h2>
          <p>{error || 'Gallery not found'}</p>
          <div className={styles.errorDetails}>
            <p>Current slug: {JSON.stringify(slug)}</p>
            <p>Check the browser console for detailed error information.</p>
          </div>
          <Link href="/media-storage" className={styles.backButton}>
            ← Back to Storage
          </Link>
        </div>
      </div>
    );
  }

  const breadcrumbs = generateFolderBreadcrumbs();

  return (
    <div className={styles.container}>
      <Head>
        <title>{galleryData.folder}</title>
        <meta name="description" content={`Photos from ${galleryData.folder}`} />
        <link rel="icon" href="/placeholder.png" />
      </Head>

      {/* Folder-only breadcrumbs - no home link */}
      {breadcrumbs.length > 0 && (
        <nav className={styles.breadcrumbs}>
          {breadcrumbs.map((crumb, index) => (
            <span key={index}>
              {index < breadcrumbs.length - 1 ? (
                <Link href={crumb.path}>{crumb.name}</Link>
              ) : (
                <span className={styles.currentCrumb}>{crumb.name}</span>
              )}
              {index < breadcrumbs.length - 1 && <span className={styles.separator}> / </span>}
            </span>
          ))}
        </nav>
      )}

      <main className={styles.main}>
        <h1 className={styles.title}>{galleryData.folder}</h1>

        <div className={styles.mediaCount}>
          {galleryData.subFolders?.length > 0 && (
            <span>{galleryData.subFolders.length} folders, </span>
          )}
          {galleryData.files.length} {galleryData.files.length === 1 ? 'item' : 'items'}
        </div>

        {galleryData.subFolders && galleryData.subFolders.length > 0 && (
          <div className={styles.subFoldersSection}>
            <h2 className={styles.sectionTitle}>Folders</h2>
            <div className={styles.subFoldersGrid}>
              {galleryData.subFolders.map((folder) => {
                const hash = getFolderHash(folder.name);
                return (
                  <Link
                    key={folder.slug}
                    href={`/${hash}/${folder.slug}`}
                    className={styles.subFolderCard}
                  >
                    <div className={styles.folderIcon}>📁</div>
                    <span className={styles.folderName}>{folder.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {galleryData.files.length > 0 && (
          <>
            <div className={styles.controlsSection}>
              <div className={styles.sortFilterControls}>
                <div className={styles.controlGroup}>
                  <label htmlFor="sortBy">Sort by:</label>
                  <select
                    id="sortBy"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className={styles.select}
                  >
                    <option value="name">Name</option>
                    <option value="date">Date</option>
                    <option value="size">Size</option>
                    <option value="type">Type</option>
                  </select>
                </div>

                <div className={styles.controlGroup}>
                  <label htmlFor="filterBy">Filter:</label>
                  <select
                    id="filterBy"
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                    className={styles.select}
                  >
                    <option value="all">All Media</option>
                    <option value="images">Images Only</option>
                    <option value="videos">Videos Only</option>
                  </select>
                </div>

                <button
                  className={`${styles.selectionModeButton} ${isSelectionMode ? styles.active : ''}`}
                  onClick={toggleSelectionMode}
                >
                  {isSelectionMode ? '✓ Selection Mode' : 'Select Photos'}
                </button>
              </div>

              {isSelectionMode && (
                <div className={styles.selectionControls}>
                  <span className={styles.selectedCount}>
                    {selectedFiles.size} selected
                  </span>
                  <button
                    className={styles.actionButton}
                    onClick={selectAll}
                  >
                    Select All
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={deselectAll}
                  >
                    Deselect All
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.downloadButton}`}
                    onClick={downloadSelectedAsZip}
                    disabled={selectedFiles.size === 0}
                  >
                    Download ZIP ({selectedFiles.size})
                  </button>
                </div>
              )}
            </div>

            <div className={styles.photosSection}>
              <h2 className={styles.sectionTitle}>Photos</h2>
            </div>
          </>
        )}

        <div className={styles.mediaGrid} ref={gridRef}>
          {getSortedAndFilteredFiles().map((file, index) => {
            const isVisible = index >= visibleRange.start && index <= visibleRange.end;
            
            return (
            <div
              data-index={index}
              key={file.publicPath}
              className={`${styles.mediaItem} ${isSelectionMode ? styles.selectable : ''} ${selectedFiles.has(file.publicPath) ? styles.selected : ''}`}
              onClick={(e) => {
                if (isSelectionMode) {
                  handleFileSelect(file, index, e);
                } else {
                  openLightbox(file);
                }
              }}
            >
              {isSelectionMode && (
                <div className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.publicPath)}
                    onChange={() => {}}
                  />
                </div>
              )}
              {isVisible ? (
                file.type === 'image' ? (
                  <Image
                    src={file.publicPath}
                    alt={file.name}
                    width={300}
                    height={200}
                    className={styles.thumbnail}
                    style={{ objectFit: 'cover' }}
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMwMzEzNCIvPjwvc3ZnPg=="
                    quality={75}
                  />
                ) : (
                  <div className={styles.videoThumbnail}>
                    <video
                      src={file.publicPath}
                      className={styles.thumbnail}
                      style={{ objectFit: 'cover' }}
                      muted
                      preload="metadata"
                      playsInline
                    />
                    <div className={styles.playIcon}>▶</div>
                  </div>
                )
              ) : (
                <div className={styles.placeholder} style={{ aspectRatio: '3/2' }} />
              )}
              <div className={styles.mediaInfo}>
                <div className={styles.mediaName}>{file.name}</div>
              </div>
            </div>
          )})}
        </div>

        {getSortedAndFilteredFiles().length === 0 && galleryData.files.length > 0 && (
          <div className={styles.emptyState}>
            No {filterBy === 'images' ? 'images' : filterBy === 'videos' ? 'videos' : 'media files'} found.
          </div>
        )}

        {galleryData.files.length === 0 && (
          <div className={styles.emptyState}>
            No media files found in this folder.
          </div>
        )}
      </main>

      {selectedMedia && (
        <div className={styles.lightbox} onClick={closeLightbox}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.topControls}>
              <button
                className={styles.infoButton}
                onClick={() => setShowInfoModal(true)}
                title="Info"
              >
                ℹ
              </button>
              <button
                className={styles.downloadButton}
                onClick={() => downloadMedia(selectedMedia)}
                title="Download"
              >
                ⬇
              </button>
              <button className={styles.closeButton} onClick={closeLightbox}>
                ×
              </button>
            </div>

            <button
              className={`${styles.navButton} ${styles.prevButton}`}
              onClick={() => navigateMedia('prev')}
            >
              ‹
            </button>

            <button
              className={`${styles.navButton} ${styles.nextButton}`}
              onClick={() => navigateMedia('next')}
            >
              ›
            </button>

            <div className={styles.mediaContainer}>
              {selectedMedia.type === 'image' ? (
                <Image
                  src={selectedMedia.publicPath}
                  alt={selectedMedia.name}
                  width={1200}
                  height={800}
                  className={styles.lightboxMedia}
                  style={{ objectFit: 'contain' }}
                  priority
                />
              ) : (
                <video
                  src={selectedMedia.publicPath}
                  controls
                  controlsList="nodownload"
                  className={styles.lightboxMedia}
                  style={{ objectFit: 'contain' }}
                  autoPlay
                  playsInline
                  preload="metadata"
                >
                  <source src={selectedMedia.publicPath} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          </div>

          {showInfoModal && (
            <div className={styles.infoModal} onClick={() => setShowInfoModal(false)}>
              <div className={styles.infoModalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.infoModalHeader}>
                  <h3>Media Information</h3>
                  <button
                    className={styles.infoModalClose}
                    onClick={() => setShowInfoModal(false)}
                  >
                    ×
                  </button>
                </div>
                <div className={styles.infoModalBody}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Name:</span>
                    <span className={styles.infoValue}>{selectedMedia.name}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Type:</span>
                    <span className={styles.infoValue}>{selectedMedia.type}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Size:</span>
                    <span className={styles.infoValue}>{(selectedMedia.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Modified:</span>
                    <span className={styles.infoValue}>{new Date(selectedMedia.modified).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showMobileDownloadModal && (
        <div className={styles.mobileDownloadModal} onClick={() => setShowMobileDownloadModal(false)}>
          <div className={styles.mobileDownloadModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.mobileDownloadModalHeader}>
              <h3>Download Complete</h3>
              <button
                className={styles.mobileDownloadModalClose}
                onClick={() => setShowMobileDownloadModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.mobileDownloadModalBody}>
              <p>{mobileDownloadMessage}</p>
            </div>
            <div className={styles.mobileDownloadModalFooter}>
              <button
                className={styles.mobileDownloadModalButton}
                onClick={() => setShowMobileDownloadModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;