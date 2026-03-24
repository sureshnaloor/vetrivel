import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Calendar } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface CommunityEventsSectionProps {
  className?: string;
}

const CommunityEventsSection = ({ className = '' }: CommunityEventsSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const collageRef = useRef<HTMLDivElement>(null);
  const photoARef = useRef<HTMLDivElement>(null);
  const photoBRef = useRef<HTMLDivElement>(null);
  const photoCRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const text = textRef.current;
    const collage = collageRef.current;
    const photoA = photoARef.current;
    const photoB = photoBRef.current;
    const photoC = photoCRef.current;

    if (!section || !text || !collage || !photoA || !photoB || !photoC) return;

    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
        },
      });

      // ENTRANCE (0% - 30%)
      scrollTl.fromTo(
        text,
        { x: '-50vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        collage,
        { x: '60vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        photoA,
        { y: '-60vh', opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.05
      );

      scrollTl.fromTo(
        photoB,
        { y: '60vh', opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.08
      );

      scrollTl.fromTo(
        photoC,
        { x: '40vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0.1
      );

      // SETTLE (30% - 70%) - hold

      // EXIT (70% - 100%)
      scrollTl.fromTo(
        text,
        { x: 0, opacity: 1 },
        { x: '-18vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        collage,
        { x: 0, opacity: 1 },
        { x: '18vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        photoA,
        { y: 0, opacity: 1 },
        { y: '-30vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        photoB,
        { y: 0, opacity: 1 },
        { y: '30vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        photoC,
        { x: 0, opacity: 1 },
        { x: '20vw', opacity: 0, ease: 'power2.in' },
        0.7
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="community"
      className={`section-pinned ${className}`}
      style={{ backgroundColor: 'var(--page-bg)' }}
    >
      {/* Left Text */}
      <div
        ref={textRef}
        className="absolute"
        style={{
          left: '7vw',
          top: '22vh',
          width: 'clamp(280px, 34vw, 420px)',
        }}
      >
        <h2 className="heading-section text-[color:var(--page-fg)] mb-6">
          GATHER. CELEBRATE. PRACTICE.
        </h2>
        <p className="body-text mb-8">
          From festivals to quiet study circles—find events near you or host
          your own.
        </p>
        <button className="btn-secondary">
          <Calendar className="w-4 h-4 mr-2" />
          Browse events
        </button>
      </div>

      {/* Right Collage */}
      <div
        ref={collageRef}
        className="absolute"
        style={{
          left: 'clamp(360px, 46vw, 50vw)',
          top: '10vh',
          width: 'clamp(320px, 48vw, 580px)',
          height: '80vh',
        }}
      >
        {/* Base Map Card */}
        <div className="absolute inset-0 map-card">
          <img
            src="/map-base.jpg"
            alt="Map"
            className="w-full h-full object-cover"
          />
          {/* Event markers */}
          <div className="absolute top-1/3 left-1/4">
            <div className="w-10 h-10 rounded-full bg-[#D13B3B] border-2 border-white flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="absolute bottom-1/3 right-1/3">
            <div className="w-10 h-10 rounded-full bg-[#141414] border-2 border-white flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Photo A - Top Right */}
        <div
          ref={photoARef}
          className="absolute photo-card"
          style={{
            left: '30vw',
            top: '2vh',
            width: 'clamp(140px, 18vw, 220px)',
            height: '160px',
          }}
        >
          <img src="/temple-05.jpg" alt="Temple festival" />
        </div>

        {/* Photo B - Bottom Left */}
        <div
          ref={photoBRef}
          className="absolute photo-card"
          style={{
            left: '-2vw',
            top: '46vh',
            width: 'clamp(140px, 18vw, 220px)',
            height: '160px',
          }}
        >
          <img src="/temple-01.jpg" alt="Temple courtyard" />
        </div>

        {/* Photo C - Bottom Right */}
        <div
          ref={photoCRef}
          className="absolute photo-card"
          style={{
            left: '30vw',
            top: '50vh',
            width: 'clamp(140px, 18vw, 220px)',
            height: '160px',
          }}
        >
          <img src="/temple-06.jpg" alt="Temple garden" />
        </div>
      </div>
    </section>
  );
};

export default CommunityEventsSection;
