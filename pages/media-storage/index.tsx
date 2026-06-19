import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/MediaStorage.module.css';

export default function MediaStorage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check if already authenticated via cookie
  useEffect(() => {
    fetch('/api/auth/check-auth')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setIsAuthenticated(true);
          fetchFolders();
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/check-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setIsAuthenticated(true);
      fetchFolders();
    } else {
      setError('Incorrect password');
    }
  };

  const fetchFolders = async () => {
    try {
        const res = await fetch('/api/gallery/folders');
        const data = await res.json();
        setFolders(data);
    } catch (err) {
        console.error(err);
        setError('Failed to load folders');
    } finally {
        setLoading(false);
    }
    };

  if (loading) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h1>Media Storage Access</h1>
          <p>Enter the password to view all media folders</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={styles.passwordInput}
            />
            <button type="submit" className={styles.loginButton}>
              Access Storage
            </button>
            {error && <p className={styles.error}>{error}</p>}
          </form>
        </div>
      </div>
    );
  }

  // Show the file tree (same as your old homepage)
  return (
    <div className={styles.container}>
      <Head>
        <title>Media Storage</title>
      </Head>
      <main className={styles.main}>
        <h1 className={styles.title}>All Media Folders</h1>
        <div className={styles.folderGrid}>
          {folders.map((folder) => {
            const hash = require('../../lib/folderHash').getFolderHash(folder.name);
            return (
              <Link
                key={folder.slug}
                href={`/${hash}/${folder.name}`}
                className={styles.folderCard}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className={styles.folderIcon}>📁</div>
                <span className={styles.folderName}>{folder.name}</span>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}