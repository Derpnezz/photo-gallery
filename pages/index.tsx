import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { getFolderHash } from '../lib/folderHash';
import styles from "../styles/Portfolio.module.css";

const Portfolio: NextPage = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Just list your images - no aspect ratios needed!
  const featuredWorks = [
    { title: "Track & Field", folderName: null, image: "/portfolio-images/2026-track-regionals.png" },
    { title: "Cross Country", folderName: null, image: "/portfolio-images/IMG_8444.JPG" },
    { title: "Track & Field", folderName: null, image: "/portfolio-images/cardinal-classic.png" },
    { title: "Track & Field", folderName: null, image: "/portfolio-images/2026-track-regionals2.png" },
    { title: "Track & Field", folderName: null, image: "/portfolio-images/2026-track-regionals3.png" },
    
    // { title: "______", folderName: null, image: "/portfolio-images/______________" },
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Gabriel Yee | Photographer</title>
        <meta
          name="description"
          content="Photography portfolio of Gabriel Yee"
        />
        <link rel="icon" type="image/png" href="/name_logo.png" />
      </Head>

      {/* HERO */}
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

      {/* GALLERY - Masonry with automatic aspect ratios */}
      <section className={styles.gallerySection}>
        <h2 className={styles.sectionTitle}>Featured Work</h2>
        <div className={styles.masonry}>
          {featuredWorks.map((work, index) => {
            const linkPath = work.folderName 
              ? `/${getFolderHash(work.folderName)}/${work.folderName}` 
              : null;

            const imageElement = (
              <img
                src={work.image}
                alt={work.title}
                loading="lazy"
                className={styles.masonryImage}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
            );

            const content = (
              <>
                {imageElement}
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

            if (linkPath) {
              return (
                <Link 
                  key={index} 
                  href={linkPath} 
                  className={styles.masonryItem}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {content}
                </Link>
              );
            }

            return (
              <div 
                key={index} 
                className={styles.masonryItem}
                onContextMenu={(e) => e.preventDefault()}
              >
                {content}
              </div>
            );
          })}
        </div>
      </section>

      {/* ABOUT */}
      <section className={styles.about}>
        <div className={styles.aboutContent}>
          <h2 className={styles.sectionTitle}>About Me</h2>
          <p>
            I&apos;m Gabriel Yee, an amateur photographer in the Germantown, MD area.
            I focus on capturing action and movement in my shots.
          </p>
          <p>
            I&apos;ve been experimenting with iPhone action photography and 
            independently shooting and editing videos. Most of my work so far 
            has been for my school's sports teams.
          </p>
        </div>
      </section>

      {/* CONTACT */}
      {/*
      <section id="contact" className={styles.contact}>
        <h2 className={styles.sectionTitle}>Let's Work Together</h2>
        <div className={styles.contactGrid}>
          <div className={styles.contactInfo}>
            <h3>Contact</h3>
            <p>📧 gabyee.pov@gmail.com</p>
            <p>📞 (###) ###-####</p>
            <p>📍 Germantown, MD</p>
            <div className={styles.socialLinks}>
              <a href="https://instagram.com/gabyee.png" target="_blank">Instagram</a>
              <a href="#">Behance</a>
              <a href="#">LinkedIn</a>
            </div>
          </div>
          <form className={styles.contactForm} onSubmit={handleSubscribe}>
            <h3>Stay Updated</h3>
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit">Subscribe</button>
            {subscribed && <p className={styles.success}>Thanks for subscribing!</p>}
          </form>
        </div>
      </section>
      */}

      <footer className={styles.footer}>
        {/* ADMIN ACCESS */}
        <div className={styles.adminSection}>
          <div className={styles.adminDivider}>
            <span>✦</span>
          </div>
          <div className={styles.adminAccess}>
            <p className={styles.adminLabel}>Administrator Access</p>
            <Link href="/media-storage" className={styles.adminButton}>
              Manage Media Storage
            </Link>
            <p className={styles.adminNote}>Password protected — for gallery management only</p>
          </div>
        </div>
        <p>© {new Date().getFullYear()} Gabriel Yee. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Portfolio;