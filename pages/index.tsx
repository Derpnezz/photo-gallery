
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import styles from "../styles/Home.module.css";

interface Folder {
  name: string;
  path: string;
  slug: string;
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
      setFolders(data);
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
        <meta name="description" content="Dynamic photo gallery with folders and media" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Photo Gallery</h1>

        <p className={styles.description}>
          Browse your photo collections organized by folders
        </p>

        {loading ? (
          <div className={styles.loading}>Loading galleries...</div>
        ) : (
          <div className={styles.grid}>
            {folders.map((folder) => (
              <Link key={folder.slug} href={`/gallery/${folder.slug}`} className={styles.card}>
                <h2>{folder.name} &rarr;</h2>
                <p>View photos in {folder.path}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
