
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import styles from '../../styles/Gallery.module.css';

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
  files: MediaFile[];
  subFolders: SubFolder[];
}

interface SubFolder {
  name: string;
  path: string;
  slug: string;
}

const GalleryPage: NextPage = () => {
  const router = useRouter();
  const { slug } = router.query;
  const [galleryData, setGalleryData] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug && Array.isArray(slug)) {
      fetchGalleryData(slug.join('/'));
    }
  }, [slug]);

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
  }, [selectedMedia]);

  const fetchGalleryData = async (folderPath: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/gallery/${folderPath}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch gallery data');
      }
      
      const data = await response.json();
      setGalleryData(data);
    } catch (error) {
      console.error('Error fetching gallery data:', error);
      setError('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  const generateBreadcrumbs = () => {
    if (!galleryData) return [];
    
    const pathParts = galleryData.folder.split('/');
    const breadcrumbs = [{ name: 'Home', path: '/' }];
    
    let currentPath = '';
    pathParts.forEach((part, index) => {
      currentPath += (index > 0 ? '/' : '') + part;
      const slug = currentPath.replace(/\s+/g, '-').toLowerCase();
      breadcrumbs.push({
        name: part,
        path: `/gallery/${slug}`
      });
    });
    
    return breadcrumbs;
  };

  const openLightbox = (media: MediaFile) => {
    setSelectedMedia(media);
  };

  const closeLightbox = () => {
    setSelectedMedia(null);
  };

  const navigateMedia = (direction: 'prev' | 'next') => {
    if (!selectedMedia || !galleryData) return;
    
    const currentIndex = galleryData.files.findIndex(file => file.publicPath === selectedMedia.publicPath);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : galleryData.files.length - 1;
    } else {
      newIndex = currentIndex < galleryData.files.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedMedia(galleryData.files[newIndex]);
  };

  const downloadMedia = (media: MediaFile) => {
    const link = document.createElement('a');
    link.href = media.publicPath;
    link.download = media.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          {error || 'Gallery not found'}
          <Link href="/" className={styles.backButton}>
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const breadcrumbs = generateBreadcrumbs();

  return (
    <div className={styles.container}>
      <Head>
        <title>{galleryData.folder} - Photo Gallery</title>
        <meta name="description" content={`Photos from ${galleryData.folder}`} />
      </Head>

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
              {galleryData.subFolders.map((folder) => (
                <Link 
                  key={folder.slug} 
                  href={`/gallery/${folder.slug}`} 
                  className={styles.subFolderCard}
                >
                  <div className={styles.folderIcon}>📁</div>
                  <span className={styles.folderName}>{folder.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {galleryData.files.length > 0 && (
          <div className={styles.photosSection}>
            <h2 className={styles.sectionTitle}>Photos</h2>
          </div>
        )}

        <div className={styles.mediaGrid}>
          {galleryData.files.map((file) => (
            <div
              key={file.publicPath}
              className={styles.mediaItem}
              onClick={() => openLightbox(file)}
            >
              {file.type === 'image' ? (
                <Image
                  src={file.publicPath}
                  alt={file.name}
                  width={300}
                  height={200}
                  className={styles.thumbnail}
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div className={styles.videoThumbnail}>
                  <video
                    src={file.publicPath}
                    className={styles.thumbnail}
                    style={{ objectFit: 'cover' }}
                  />
                  <div className={styles.playIcon}>▶</div>
                </div>
              )}
              <div className={styles.mediaInfo}>
                <div className={styles.mediaName}>{file.name}</div>
              </div>
            </div>
          ))}
        </div>

        {galleryData.files.length === 0 && (
          <div className={styles.emptyState}>
            No media files found in this folder.
          </div>
        )}
      </main>

      {selectedMedia && (
        <div className={styles.lightbox} onClick={closeLightbox}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            {/* Top Controls */}
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
            
            {/* Navigation Arrows */}
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
                />
              ) : (
                <video
                  src={selectedMedia.publicPath}
                  controls
                  className={styles.lightboxMedia}
                  style={{ objectFit: 'contain' }}
                />
              )}
            </div>
          </div>

          {/* Info Modal */}
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
    </div>
  );
};

export default GalleryPage;
