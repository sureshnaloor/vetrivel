import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Plus } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  className?: string;
}

const HeroSection = ({ className = '' }: HeroSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const mapCardRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const subheadlineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [activeTempleIndex, setActiveTempleIndex] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  const temples = [
    {
      name: 'Kedarnath',
      location: 'Uttarakhand, India',
      src: '/temples/kedarnath.jpg',
    },
    {
      name: 'Tirumala',
      location: 'Tirupati, India',
      src: '/temples/tirumala.jpg',
    },
    {
      name: 'Guruvayoor',
      location: 'Kerala, India',
      src: '/temples/guruvayoor.jpg',
    },
    {
      name: 'Mahakaleshwar',
      location: 'Ujjain, India',
      src: '/temples/mahakaleshwar.jpg',
    },
    {
      name: 'Mata Vaishnodevi',
      location: 'Jammu & Kashmir, India',
      src: '/temples/vaishnodevi.jpg',
    },
    {
      name: 'Ayodhya Ram Mandir',
      location: 'Ayodhya, India',
      src: '/temples/ayodhya-ram-mandir.jpg',
    },
  ];

  useEffect(() => {
    if (!temples.length || isUserInteracting) return;

    const interval = window.setInterval(() => {
      setActiveTempleIndex((prev) => (prev + 1) % temples.length);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [temples.length, isUserInteracting]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const mapCard = mapCardRef.current;
    const headline = headlineRef.current;
    const subheadline = subheadlineRef.current;
    const cta = ctaRef.current;

    if (!section || !mapCard || !headline || !subheadline || !cta) return;

    const ctx = gsap.context(() => {
      // Auto-play entrance animation on load
      const loadTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Map card entrance
      loadTl.fromTo(
        mapCard,
        { x: '-60vw', opacity: 0, scale: 0.98 },
        { x: 0, opacity: 1, scale: 1, duration: 0.8 },
        0
      );

      // Headline words entrance
      const words = headline.querySelectorAll('.word');
      loadTl.fromTo(
        words,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.04 },
        0.2
      );

      // Subheadline + CTAs entrance
      loadTl.fromTo(
        [subheadline, cta],
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
        0.5
      );

      // Scroll-driven exit animation (pinned)
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
          onLeaveBack: () => {
            // Reset all elements to visible when scrolling back to top
            gsap.set([mapCard, headline, subheadline, cta], {
              opacity: 1,
              x: 0,
              y: 0,
              rotation: 0,
            });
          },
        },
      });

      // EXIT phase (70% - 100%)
      scrollTl.fromTo(
        mapCard,
        { x: 0, y: 0, rotation: 0, opacity: 1 },
        { x: '-18vw', y: '10vh', rotation: -2, opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        headline,
        { x: 0, opacity: 1 },
        { x: '10vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        subheadline,
        { x: 0, opacity: 1 },
        { x: '10vw', opacity: 0, ease: 'power2.in' },
        0.72
      );

      scrollTl.fromTo(
        cta,
        { y: 0, opacity: 1 },
        { y: '12vh', opacity: 0, ease: 'power2.in' },
        0.75
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const topHeadlineWords = 'PIN THE PLACES'.split(' ');
  const bottomHeadlineWords = 'THAT MOVE YOU'.split(' ');

  return (
    <section
      ref={sectionRef}
      className={`section-pinned ${className}`}
      style={{ backgroundColor: 'var(--page-bg-alt)' }}
    >
      {/* Map Card */}
      <div
        ref={mapCardRef}
        className="absolute map-card"
        style={{
          left: '6vw',
          top: '14vh',
          width: 'clamp(320px, 40vw, 560px)',
          height: 'clamp(400px, 72vh, 640px)',
        }}
      >
        <div
          className="relative w-full h-full temple-mosaic"
          onMouseLeave={() => setIsUserInteracting(false)}
        >
          {temples.map((temple, index) => {
            const isActive = index === activeTempleIndex;

            const baseTransforms = [
              'translate(-10%, -6%) rotate(-3deg)',
              'translate(6%, -14%) rotate(2deg)',
              'translate(-4%, 4%) rotate(1deg)',
              'translate(10%, 10%) rotate(-1deg)',
              'translate(-14%, 12%) rotate(4deg)',
              'translate(4%, -4%) rotate(-2deg)',
            ];

            return (
              <button
                key={temple.name}
                type="button"
                className={`temple-tile ${isActive ? 'temple-tile-active' : ''}`}
                style={{
                  zIndex: isActive ? 40 : 20 + index,
                  transform: isActive
                    ? 'translate(0, -3%) scale(1.06)'
                    : baseTransforms[index % baseTransforms.length],
                }}
                onMouseEnter={() => {
                  setIsUserInteracting(true);
                  setActiveTempleIndex(index);
                }}
              >
                <div className="temple-image-layer">
                  <img src={temple.src} alt={temple.name} />
                  <div className="temple-glass-overlay" />
                </div>
                <div className="temple-label">
                  <p className="eyebrow text-[10px] tracking-[0.18em] text-[#E3D6BF]">
                    SACRED VIEW
                  </p>
                  <p className="temple-name">{temple.name}</p>
                  <p className="temple-location">{temple.location}</p>
                </div>
              </button>
            );
          })}

          <div className="temple-mosaic-caption">
            <p className="eyebrow text-red-400">GRAND HINDU TEMPLES</p>
            <p className="text-[11px] text-teal-800 mt-1">
              Your own sacred spaces. Curated for you.
            </p>
          </div>
        </div>
      </div>

      {/* Headline Block */}
      <div
        ref={headlineRef}
        className="absolute"
        style={{
          left: 'clamp(360px, 54vw, 58vw)',
          top: '26vh',
          width: 'clamp(280px, 38vw, 480px)',
        }}
      >
        <div className="hero-heading-stack">
          <h1 className="heading-hero hero-3d-text hero-heading-top" style={{ color: 'var(--page-fg)' }}>
            {topHeadlineWords.map((word, i) => (
              <span
                key={i}
                className="word inline-block mr-[0.25em]"
                data-shadow={word}
              >
                {word}
              </span>
            ))}
          </h1>
          <h2 className="hero-heading-bottom" style={{ color: 'var(--page-fg)' }}>
            {bottomHeadlineWords.map((word, i) => (
              <span
                key={i}
                className="word inline-block mr-[0.3em]"
                data-shadow={word}
              >
                {word}
              </span>
            ))}
          </h2>
        </div>
      </div>

      {/* Subheadline */}
      <p
        ref={subheadlineRef}
        className="absolute body-text max-w-md"
        style={{
          left: 'clamp(360px, 54vw, 58vw)',
          top: '54vh',
          width: 'clamp(280px, 38vw, 480px)',
        }}
      >
        A map of temples, shrines, and quiet corners—built by travelers, locals,
        and devotees.
      </p>

      {/* CTAs */}
      <div
        ref={ctaRef}
        className="absolute flex items-center gap-4 flex-wrap"
        style={{
          left: 'clamp(360px, 54vw, 58vw)',
          top: '66vh',
          width: 'clamp(280px, 38vw, 480px)',
        }}
      >
        <button className="btn-primary">
          Explore the map
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
        <button className="btn-secondary">
          <Plus className="w-4 h-4 mr-2" />
          Add a place
        </button>
      </div>
    </section>
  );
};

export default HeroSection;
