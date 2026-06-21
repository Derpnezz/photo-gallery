import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { getFolderHash } from '../lib/folderHash';
import styles from "../styles/Portfolio.module.css";

const Portfolio: NextPage = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const featuredWorks = [
    {
      title: "Northwest XC",
      folderName: null,
      image: "/portfolio-images/IMG_8444.JPG",
      aspectRatio: "3:2",
    },
    {
      title: "Portraits",
      folderName: "portraits",
      image: "/portfolio-images/portraits.jpg",
      aspectRatio: "3:4",
    },
    {
      title: "Mountain Sunset",
      folderName: null,
      image: "/portfolio-images/mountain-sunset.jpg",
      aspectRatio: "16:9",
    },
    {
      title: "Urban Life",
      folderName: "urban",
      image: "/portfolio-images/urban.jpg",
      aspectRatio: "9:16",
    },
    {
      title: "Abstract",
      folderName: null,
      image: "/portfolio-images/abstract.jpg",
      aspectRatio: "1:1",
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  const getAspectClass = (ratio: string) => {
    const map: { [key: string]: string } = {
      '1:1': styles.square,
      '3:2': styles.landscape,
      '2:3': styles.portrait,
      '4:3': styles.landscape,
      '3:4': styles.portrait,
      '16:9': styles.wide,
      '9:16': styles.tall,
    };
    return map[ratio] || styles.landscape;
  };

  const getGridSpan = (ratio: string) => {
    const map: { [key: string]: { cols: number, rows: number } } = {
      '1:1': { cols: 1, rows: 1 },
      '3:2': { cols: 2, rows: 1 },
      '2:3': { cols: 1, rows: 2 },
      '4:3': { cols: 2, rows: 1 },
      '3:4': { cols: 1, rows: 2 },
      '16:9': { cols: 2, rows: 1 },
      '9:16': { cols: 1, rows: 2 },
    };
    return map[ratio] || { cols: 1, rows: 1 };
  };

  return (
    // Wrap everything in the portfolioContainer class
    <div className={`${styles.container} ${styles.portfolioContainer}`}>
      <Head>
        <title>Gabriel Yee | Photographer</title>
        <meta
          name="description"
          content="Photography portfolio of Gabriel Yee — capturing moments, telling stories."
        />
        <link rel="icon" type="image/png" href="/name_logo.png" />
      </Head>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Gabriel Yee</h1>
          <p className={styles.heroSubtitle}>Photographer &amp; Visual Storyteller</p>
          <div className={styles.heroScroll}>
            <span>↓ Scroll to explore</span>
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className={styles.gallerySection}>
        <h2 className={styles.sectionTitle}>Featured Work</h2>
        <div className={styles.masonryGrid}>
          {featuredWorks.map((work, index) => {
            const linkPath = work.folderName ? `/${getFolderHash(work.folderName)}/${work.folderName}` : null;
            const aspectClass = getAspectClass(work.aspectRatio || '3:2');
            const gridSpan = getGridSpan(work.aspectRatio || '3:2');
            
            const content = (
              <>
                <Image
                  src={work.image}
                  alt={work.title}
                  fill
                  className={`${styles.galleryImage} ${styles.protectedImage}`}
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  quality={85}
                  priority={index < 3}
                  onContextMenu={(e) => e.preventDefault()}
                  draggable={false}
                />
                <div className={styles.imageOverlay}>
                  <span>{work.title}</span>
                  {linkPath && <span className={styles.viewLink}>↗</span>}
                </div>
                <div 
                  className={styles.protectionOverlay}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </>
            );
            
            const itemClass = `${styles.galleryItem} ${aspectClass}`;
            
            if (linkPath) {
              return (
                <Link 
                  key={index} 
                  href={linkPath} 
                  className={itemClass}
                  style={{ 
                    gridColumn: `span ${gridSpan.cols}`,
                    gridRow: `span ${gridSpan.rows}`
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {content}
                </Link>
              );
            }
            
            return (
              <div 
                key={index} 
                className={itemClass}
                style={{ 
                  gridColumn: `span ${gridSpan.cols}`,
                  gridRow: `span ${gridSpan.rows}`
                }}
                onContextMenu={(e) => e.preventDefault()}
              >
                {content}
              </div>
            );
          })}
        </div>
      </section>

      {/* About Section */}
      <section className={styles.about}>
        <div className={styles.aboutContent}>
          <h2 className={styles.sectionTitle}>About Me</h2>
          <p>
            I&apos;m Gabriel Yee, an amateur photographer within the Germantown, MD area.
            I focus and excel at capturing action and movement within shots.
          </p>
          <p>
            At the moment, I&apos;ve been experimenting with iPhone action shots and independently shooting and editing videos.
            As for now, the work I&apos;ve done has been mainly for my school sports teams.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className={styles.contact}>
        <h2 className={styles.sectionTitle}>Let's Work Together</h2>
        <div className={styles.contactGrid}>
          <div className={styles.contactInfo}>
            <h3>Contact Info</h3>
            <p>📧 gabyee.pov@gmail.com</p>
            <p>📞 (###) ###-####</p>
            <p>📍 Germantown, MD</p>
            <div className={styles.socialLinks}>
              <a href="https://instagram.com/gabyee.png">Instagram</a>
              <a href="#">Behance</a>
              <a href="#">LinkedIn</a>
            </div>
          </div>
        </div>
      </section>

      {/* Admin Access */}
      <div className={styles.adminSection}>
        <div className={styles.adminDivider}>
          <span>⚡</span>
        </div>
        <div className={styles.adminAccess}>
          <p className={styles.adminLabel}>Administrator Access</p>
          <Link href="/media-storage" className={styles.adminButton}>
            Manage Media Storage
          </Link>
          <p className={styles.adminNote}>Password protected — for gallery management only</p>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Gabriel Yee. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Portfolio;