import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { getFolderHash } from '../lib/folderHash';
import styles from "../styles/Portfolio.module.css";

const Portfolio: NextPage = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  // Define your featured works with folder names (not pre-computed links)
  const featuredWorks = [
    /*
    {
      title: "Northwest Track",
      folderName: "northwest-tf",  // Store folder name instead of link
      image: "/portfolio-images/cardinal-classic.png",
    },
    */
    {
      title: "Northwest XC",
      folderName: null,  // No link - just a photo
      image: "/portfolio-images/IMG_8444.JPG",
    },
    {
      title: "Portraits",
      folderName: null,
      image: "/portfolio-images/cardinal-classic.png",
    },
    {
      title: "Mountain Sunset",
      folderName: null,  // No link - just decoration
      image: "/portfolio-images/mountain-sunset.jpg",
    },
    {
      title: "Abstract",
      folderName: null,  // No link
      image: "/portfolio-images/abstract.jpg",
    },
  ];

  return (
    <div className={styles.container}>
      <Head>
        <title>Gabriel Yee | Photographer</title>
        <meta
          name="description"
          content="Photography portfolio of Gabriel Yee — capturing moments, telling stories."
        />
        <link rel="icon" type="image/png" href="/name_logo.png" />
      </Head>

      {/* Hero Section */}
      { /*
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Gabriel Yee</h1>
          <p className={styles.heroSubtitle}>Photographer & Visual Storyteller</p>
          <div className={styles.heroButtons}>
            <Link href="/media-storage" className={styles.primaryButton}>
              Access Storage
            </Link>
            <Link href="#contact" className={styles.secondaryButton}>
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
      */ }

      {/* Featured Work / Gallery Preview */}
      <section className={styles.featured}>
        <h1 className={styles.sectionTitleLarge}>Gabriel Yee</h1>
        <div className={styles.heroButtons}>
            <Link href="/media-storage" className={styles.primaryButton}>
              Access Storage
            </Link>
          </div>
        <h2 className={styles.sectionTitle}>Featured Work</h2>
        <div className={styles.galleryGrid}>
          {featuredWorks.map((work, index) => {
            // Calculate hash here if folderName exists
            const linkPath = work.folderName ? `/${getFolderHash(work.folderName)}/${work.folderName}` : null;
            
            const content = (
              <>
                <Image
                  src={work.image}
                  alt={work.title}
                  fill
                  className={styles.galleryImage}
                  style={{ objectFit: 'cover' }}
                />
                <div className={styles.imageOverlay}>
                  <span>{work.title}</span>
                </div>
              </>
            );
            
            // If it has a link, wrap in Link component
            if (linkPath) {
              return (
                <Link key={index} href={linkPath} className={styles.galleryItem}>
                  {content}
                </Link>
              );
            }
            
            // If no link, render as a div (no click)
            return (
              <div key={index} className={styles.galleryItem}>
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
            I'm Gabriel Yee, an amateur photographer within the Germantown, MD area.
            I focus and excel at capturing action and movement within shots.
          </p>
          <p>
            At the moment, I've been experimenting with iPhone action shots and independently shooting and editing videos.
            As for now, the work I've done has been mainly for my school sports teams.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      { /*
      <section id="contact" className={styles.contact}>
        <h2 className={styles.sectionTitle}>Let's Work Together</h2>
        <div className={styles.contactGrid}>
          <div className={styles.contactInfo}>
            <h3>Contact Info</h3>
            <p>📧 gabriel@yee.photography</p>
            <p>📞 (555) 123-4567</p>
            <p>📍 Portland, OR</p>
            <div className={styles.socialLinks}>
              <a href="#">Instagram</a>
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
            <button type="submit">Subscribe to Newsletter</button>
            {subscribed && <p className={styles.success}>Thanks for subscribing!</p>}
          </form>
        </div>
      </section>
      */ }

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Gabriel Yee. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Portfolio;