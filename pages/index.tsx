import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
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

  return (
    <div className={styles.container}>
      <Head>
        <title>Gabriel Yee | Photographer</title>
        <meta
          name="description"
          content="Photography portfolio of Gabriel Yee — capturing moments, telling stories."
        />
      </Head>

      {/* Hero Section */}
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

      {/* Featured Work / Gallery Preview */}
      <section className={styles.featured}>
        <h2 className={styles.sectionTitle}>Featured Work</h2>
        <div className={styles.galleryGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.galleryItem}>
              <div className={styles.imagePlaceholder} />
              <div className={styles.imageOverlay}>
                <span>Project {i}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section className={styles.about}>
        <div className={styles.aboutContent}>
          <h2 className={styles.sectionTitle}>About Me</h2>
          <p>
            I'm Gabriel Yee, a photographer based in the Pacific Northwest. My work focuses on
            capturing the raw beauty of landscapes, the intimacy of portraits, and the energy of
            live events.
          </p>
          <p>
            With over 5 years of experience, I've worked with clients ranging from outdoor brands
            to local musicians. My approach is simple: be present, be patient, and let the moment
            unfold naturally.
          </p>
        </div>
      </section>

      {/* Contact Section */}
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

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Gabriel Yee. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Portfolio;