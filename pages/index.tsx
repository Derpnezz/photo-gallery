
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import styles from "../styles/Home.module.css";

interface Folder {
  name: string;
  path: string;
  slug: string;
  thumbnail?: string;
}

const Home: NextPage = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/gallery/folders');
      const data = await response.json();
      
      // Get thumbnail for each folder
      const foldersWithThumbnails = await Promise.all(
        data.map(async (folder: Folder) => {
          try {
            const galleryResponse = await fetch(`/api/gallery/${folder.slug}`);
            const galleryData = await galleryResponse.json();
            const firstImage = galleryData.files?.find((file: any) => file.type === 'image');
            
            return {
              ...folder,
              thumbnail: firstImage?.publicPath || '/placeholder.svg'
            };
          } catch {
            return {
              ...folder,
              thumbnail: '/placeholder.svg'
            };
          }
        })
      );
      
      setFolders(foldersWithThumbnails);
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Photo Gallery</title>
        <meta name="description" content="Gabriel Yee's photo gallery" />
        <link rel="icon" href="/replit.svg" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Albums</h1>

        {loading ? (
          <div className={styles.loading}>Loading albums...</div>
        ) : (
          <div className={styles.albumGrid}>
            {folders.map((folder) => (
              <Link key={folder.slug} href={`/gallery/${folder.slug}`} className={styles.albumCard}>
                <div className={styles.folderIcon}>📁</div>
                <span className={styles.folderName}>{folder.name}</span>
              </Link>
            ))}
          </div>
        )}

        {!loading && folders.length === 0 && (
          <div className={styles.emptyState}>
            No albums found. Add some photos to the public/photos directory.
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
