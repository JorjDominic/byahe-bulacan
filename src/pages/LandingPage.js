import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { useApp } from "../context/AppContext";
import ROUTES from "../constants/routes";
import SpotCard from "../components/SpotCard";
import { getAllSpots } from "../services/spotService";

import { Compass, Sparkles, ArrowRight } from "lucide-react";

import Reveal from "../components/landing/Reveal";
import StatsSection from "../components/landing/StatsSection";
import FeatureShowcase from "../components/landing/FeatureShowcase";
import PremiumBanner from "../components/landing/PremiumBanner";

import "../styles/landing-premium.css";

import mainLogo from "../assets/images/byahebulacan.png";
import hero1 from "../assets/images/hero-1.png";
import hero2 from "../assets/images/hero-2.png";
import hero3 from "../assets/images/hero-3.png";
import hero4 from "../assets/images/hero-4.png";
import hero5 from "../assets/images/hero-5.png";

const HERO_IMAGES = [hero1, hero2, hero3, hero4, hero5];

// Lightweight, CSS-animated particle field (no per-frame JS cost).
const PARTICLES = Array.from({ length: 12 }, (_, i) => i);

export default function LandingPage() {
  const { navigate } = useApp();
  const reduceMotion = useReducedMotion();

  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [spots, setSpots] = useState([]);

  // --- unchanged data logic -------------------------------------------------
  useEffect(() => {
    getAllSpots().then((data) => setSpots(data.slice(0, 4)));
  }, []);

  // --- hero photo crossfade (true crossfade instead of fade-to-black) -------
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImgIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // hero copy entrance (runs once on mount; disabled under reduce-motion)
  const rise = (delay) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 26 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
        };

  return (
    <div className="lp">
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="lp-hero">
        {/* crossfading hero backgrounds */}
        {HERO_IMAGES.map((img, i) => (
          <div
            key={i}
            className="lp-hero__bg"
            style={{
              backgroundImage: `url(${img})`,
              opacity: i === currentImgIndex ? 1 : 0,
            }}
          />
        ))}
        <div className="lp-hero__overlay" />
        <div className="lp-hero__grain" />

        {!reduceMotion && (
          <div className="lp-particles">
            {PARTICLES.map((p) => {
              const size = 4 + (p % 4) * 3;
              return (
                <span
                  key={p}
                  className="lp-particle"
                  style={{
                    width: size,
                    height: size,
                    left: `${(p * 8.3 + 4) % 100}%`,
                    bottom: `-${10 + (p % 5) * 4}px`,
                    animationDuration: `${9 + (p % 6) * 2}s`,
                    animationDelay: `${(p % 6) * 1.3}s`,
                  }}
                />
              );
            })}
          </div>
        )}

        <div className="lp-hero__inner">
          {/* LEFT — copy + CTAs */}
          <div className="lp-hero__left">
            <motion.div {...rise(0)}>
              <span className="lp-eyebrow">
                <span className="lp-eyebrow__dot" />
                Province of Bulacan, Philippines
              </span>
            </motion.div>

            <motion.h1 className="lp-hero__title" {...rise(0.12)}>
              Discover the hidden <em>beauty of Bulacan</em>
            </motion.h1>

            <motion.p className="lp-hero__desc" {...rise(0.24)}>
              Your complete travel companion — browse verified tourist spots, plan the perfect
              itinerary, and share your adventures with fellow explorers.
            </motion.p>

            <motion.div className="lp-cta-row" {...rise(0.36)}>
              <button
                className="lp-btn lp-btn--primary lp-btn--lg"
                onClick={() => navigate(ROUTES.BROWSE)}
              >
                <Compass size={19} /> Explore destinations
              </button>
              <button
                className="lp-btn lp-btn--ghost lp-btn--lg"
                onClick={() => navigate(ROUTES.LOGIN)}
              >
                <Sparkles size={18} /> Create free account
              </button>
            </motion.div>
          </div>

          {/* RIGHT — stacked photo cards */}
          <div className="lp-hero__right">
            <div className="lp-hero__glow" />
            <div className="lp-photo-stack">
              <div className="lp-photo-stack__card lp-photo-stack__card--back">
                <img src={HERO_IMAGES[(currentImgIndex + 2) % HERO_IMAGES.length]} alt="" />
              </div>
              <div className="lp-photo-stack__card lp-photo-stack__card--mid">
                <img src={HERO_IMAGES[(currentImgIndex + 1) % HERO_IMAGES.length]} alt="" />
              </div>
              <div className="lp-photo-stack__card lp-photo-stack__card--front">
                <img src={HERO_IMAGES[currentImgIndex]} alt="" />
                <div className="lp-photo-stack__badge">
                  <span className="lp-photo-stack__dot" />
                  Province of Bulacan
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* slide indicators */}
        <div className="lp-hero__dots">
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              className={"lp-dot-ind" + (i === currentImgIndex ? " is-active" : "")}
              onClick={() => setCurrentImgIndex(i)}
            />
          ))}
        </div>

        <div className="lp-scroll-cue"><span /></div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────── */}
      <StatsSection />

      {/* ── FEATURE SHOWCASE ──────────────────────────────────────────── */}
      <FeatureShowcase />

      {/* ── TOP DESTINATIONS (SpotCard untouched) ─────────────────────── */}
      <section className="lp-spots">
        <div className="lp-spots__head">
          <Reveal from="up">
            <span className="lp-kicker">Top destinations</span>
          </Reveal>
          <Reveal from="up" delay={0.05}>
            <h2 className="lp-section-title">Bulacan&rsquo;s most celebrated spots</h2>
          </Reveal>
          <Reveal from="up" delay={0.1}>
            <p className="lp-section-sub">
              A hand-picked look at the province&rsquo;s must-visit attractions.
            </p>
          </Reveal>
        </div>

        <div className="lp-spots__grid">
          {spots.length === 0 ? (
            <p className="lp-spots__empty">Loading spots…</p>
          ) : (
            spots.map((s, i) => (
              <Reveal key={s.id} from="up" delay={i * 0.08}>
                {/* Hover lift lives on this inner wrapper, NOT the Framer Motion
                    element — otherwise the reveal's transform would override it. */}
                <div className="lp-spot-zoom">
                  <SpotCard spot={s} onClick={() => navigate(ROUTES.SPOT(s.id))} />
                </div>
              </Reveal>
            ))
          )}
        </div>

        {spots.length > 0 && (
          <div className="lp-spots__more">
            <button
              className="lp-btn lp-btn--outline-green lp-btn--lg"
              onClick={() => navigate(ROUTES.BROWSE)}
            >
              View all destinations <ArrowRight className="lp-btn__arrow" size={18} />
            </button>
          </div>
        )}
      </section>

      {/* ── PREMIUM ───────────────────────────────────────────────────── */}
      <PremiumBanner />

      {/* ── CTA STRIP ─────────────────────────────────────────────────── */}
      <section className="lp-cta">
        <div className="lp-cta__blob" />
        <div className="lp-cta__inner">
          <Reveal from="up">
            <img className="lp-cta__logo" src={mainLogo} alt="BiyaheBulacan" />
          </Reveal>
          <Reveal from="up" delay={0.05}>
            <h2 className="lp-cta__title">Ready to explore Bulacan?</h2>
          </Reveal>
          <Reveal from="up" delay={0.1}>
            <p className="lp-cta__sub">
              Join thousands of travelers discovering the province&rsquo;s best-kept secrets.
            </p>
          </Reveal>
          <Reveal from="up" delay={0.15}>
            <button
              className="lp-btn lp-btn--primary lp-btn--lg"
              onClick={() => navigate(ROUTES.LOGIN)}
            >
              Get started — it&rsquo;s free <ArrowRight className="lp-btn__arrow" size={18} />
            </button>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <img className="lp-footer__logo" src={mainLogo} alt="BiyaheBulacan" />
        <div>© 2026 BiyaheBulacan — Proudly promoting the heritage and beauty of Bulacan Province.</div>
      </footer>
    </div>
  );
}
