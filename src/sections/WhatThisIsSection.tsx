import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Compass, MapPin, Calendar } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface WhatThisIsSectionProps {
  className?: string;
}

const WhatThisIsSection = ({ className = '' }: WhatThisIsSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const textBlockRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const textBlock = textBlockRef.current;
    const cards = cardsRef.current;

    if (!section || !textBlock || !cards) return;

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
        textBlock,
        { x: '-50vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        cards,
        { x: '60vw', opacity: 0, rotation: 2 },
        { x: 0, opacity: 1, rotation: 0, ease: 'none' },
        0
      );

      // SETTLE (30% - 70%) - hold positions

      // EXIT (70% - 100%)
      scrollTl.fromTo(
        textBlock,
        { x: 0, opacity: 1 },
        { x: '-18vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        cards,
        { x: 0, y: 0, opacity: 1 },
        { x: '18vw', y: '10vh', opacity: 0, ease: 'power2.in' },
        0.7
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const featureCards = [
    {
      icon: Compass,
      title: 'Explore',
      description:
        'Discover sacred sites across the world, from ancient temples to hidden shrines.',
      image: '/temple-01.jpg',
    },
    {
      icon: MapPin,
      title: 'Pin & Tag',
      description:
        'Mark places you have visited and tag friends to share the experience.',
      image: '/temple-02.jpg',
    },
    {
      icon: Calendar,
      title: 'Book & Host',
      description:
        'Book pooja services or create your own nest to host visitors.',
      image: '/temple-03.jpg',
    },
  ];

  return (
    <section
      ref={sectionRef}
      className={`section-pinned ${className}`}
      style={{ backgroundColor: 'var(--page-bg)' }}
    >
      {/* Left Text Block */}
      <div
        ref={textBlockRef}
        className="absolute"
        style={{
          left: '7vw',
          top: '18vh',
          width: 'clamp(280px, 34vw, 420px)',
        }}
      >
        <p className="eyebrow mb-4">WHAT THIS IS</p>
        <h2 className="heading-section text-[color:var(--page-fg)] mb-6">
          A LIVING MAP OF THE SACRED
        </h2>
        <p className="body-text">
          Discover temples, shrines, and spiritual sites. Tag friends, share
          photos, book offerings, and host your own space.
        </p>
      </div>

      {/* Right Cards Stack */}
      <div
        ref={cardsRef}
        className="absolute"
        style={{
          left: 'clamp(340px, 46vw, 50vw)',
          top: '16vh',
          width: 'clamp(300px, 44vw, 520px)',
          height: '68vh',
        }}
      >
        {featureCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="absolute card-sacred overflow-hidden"
              style={{
                width: '100%',
                height: '280px',
                transform: `translate(${index * 2.2}vw, ${index * 10}vh)`,
                zIndex: featureCards.length - index,
              }}
            >
              <div className="flex h-full">
                {/* Image */}
                <div className="w-[55%] h-full relative">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                {/* Content */}
                <div className="w-[45%] p-6 flex flex-col justify-center">
                  <Icon className="w-6 h-6 text-[#D13B3B] mb-3" />
                  <h3 className="font-display text-xl font-semibold text-[color:var(--page-fg)] mb-2">
                    {card.title}
                  </h3>
                  <div className="red-rule mb-3" />
                  <p className="text-sm text-[#6E6A63] leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default WhatThisIsSection;
