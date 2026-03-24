import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Sparkles } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface BookPoojaSectionProps {
  className?: string;
}

const BookPoojaSection = ({ className = '' }: BookPoojaSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const collageRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const photoARef = useRef<HTMLDivElement>(null);
  const photoBRef = useRef<HTMLDivElement>(null);
  const photoCRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const collage = collageRef.current;
    const text = textRef.current;
    const photoA = photoARef.current;
    const photoB = photoBRef.current;
    const photoC = photoCRef.current;

    if (!section || !collage || !text || !photoA || !photoB || !photoC) return;

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
        collage,
        { y: '100vh', opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        photoA,
        { x: '-40vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
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

      scrollTl.fromTo(
        text,
        { x: '50vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0
      );

      // SETTLE (30% - 70%) - hold

      // EXIT (70% - 100%)
      scrollTl.fromTo(
        collage,
        { y: 0, opacity: 1 },
        { y: '-40vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        photoA,
        { x: 0, opacity: 1 },
        { x: '-20vw', opacity: 0, ease: 'power2.in' },
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

      scrollTl.fromTo(
        text,
        { x: 0, opacity: 1 },
        { x: '10vw', opacity: 0, ease: 'power2.in' },
        0.7
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="book"
      className={`section-pinned ${className}`}
      style={{ backgroundColor: 'var(--page-bg)' }}
    >
      {/* Left Collage */}
      <div
        ref={collageRef}
        className="absolute"
        style={{
          left: '6vw',
          top: '12vh',
          width: 'clamp(320px, 46vw, 560px)',
          height: '76vh',
        }}
      >
        {/* Base Map Card */}
        <div className="absolute inset-0 map-card">
          <img
            src="/map-base.jpg"
            alt="Map"
            className="w-full h-full object-cover"
          />
          {/* Pooja booking indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-20 h-20 rounded-full bg-[#D13B3B]/10 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[#D13B3B] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Photo A - Top Left */}
        <div
          ref={photoARef}
          className="absolute photo-card"
          style={{
            left: '-3vw',
            top: '4vh',
            width: 'clamp(140px, 18vw, 220px)',
            height: '160px',
          }}
        >
          <img src="/temple-02.jpg" alt="Temple lanterns" />
        </div>

        {/* Photo B - Bottom Left */}
        <div
          ref={photoBRef}
          className="absolute photo-card"
          style={{
            left: '-2vw',
            top: '44vh',
            width: 'clamp(140px, 18vw, 220px)',
            height: '160px',
          }}
        >
          <img src="/temple-04.jpg" alt="Temple sunset" />
        </div>

        {/* Photo C - Bottom Right */}
        <div
          ref={photoCRef}
          className="absolute photo-card"
          style={{
            left: '28vw',
            top: '50vh',
            width: 'clamp(140px, 18vw, 220px)',
            height: '160px',
          }}
        >
          <img src="/temple-03.jpg" alt="Temple stairs" />
        </div>
      </div>

      {/* Right Text Block */}
      <div
        ref={textRef}
        className="absolute"
        style={{
          left: 'clamp(380px, 56vw, 60vw)',
          top: '26vh',
          width: 'clamp(280px, 36vw, 440px)',
        }}
      >
        <h2 className="heading-section text-[color:var(--page-fg)] mb-6">
          OFFERINGS, MADE SIMPLE.
        </h2>
        <p className="body-text mb-8">
          Book a pooja, leave a note, and receive a confirmation—directly
          through the host&apos;s nest.
        </p>
        <button className="btn-primary">
          <Sparkles className="w-4 h-4 mr-2" />
          Book an offering
        </button>
      </div>
    </section>
  );
};

export default BookPoojaSection;
