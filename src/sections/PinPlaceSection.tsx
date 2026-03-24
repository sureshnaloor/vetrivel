import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MapPin, FileText, Upload } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface PinPlaceSectionProps {
  className?: string;
}

const PinPlaceSection = ({ className = '' }: PinPlaceSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const text = textRef.current;
    const card1 = card1Ref.current;
    const card2 = card2Ref.current;
    const card3 = card3Ref.current;

    if (!section || !text || !card1 || !card2 || !card3) return;

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
        card1,
        { y: '-80vh', opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        card2,
        { x: '60vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0.05
      );

      scrollTl.fromTo(
        card3,
        { y: '80vh', opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
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
        card1,
        { y: 0, opacity: 1 },
        { y: '-30vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        card2,
        { x: 0, opacity: 1 },
        { x: '20vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        card3,
        { y: 0, opacity: 1 },
        { y: '30vh', opacity: 0, ease: 'power2.in' },
        0.7
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const steps = [
    {
      icon: MapPin,
      title: 'Locate',
      description: 'Drop a pin on the map.',
      image: '/temple-01.jpg',
    },
    {
      icon: FileText,
      title: 'Describe',
      description: 'Add photos, hours, and a short story.',
      image: '/temple-02.jpg',
    },
    {
      icon: Upload,
      title: 'Publish',
      description: 'Publish so others can find it.',
      image: '/temple-03.jpg',
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="pin"
      className={`section-pinned ${className}`}
      style={{ backgroundColor: 'var(--page-bg)' }}
    >
      {/* Left Text */}
      <div
        ref={textRef}
        className="absolute"
        style={{
          left: '7vw',
          top: '18vh',
          width: 'clamp(280px, 34vw, 420px)',
        }}
      >
        <p className="eyebrow mb-4">PIN A PLACE</p>
        <h2 className="heading-section text-[color:var(--page-fg)] mb-6">
          ADD A PLACE IN SECONDS
        </h2>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.title} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D13B3B] text-white text-xs flex items-center justify-center font-medium">
                {index + 1}
              </span>
              <p className="text-[color:var(--page-fg)]">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Floating Cards */}
      <div
        className="absolute"
        style={{
          left: 'clamp(340px, 44vw, 48vw)',
          top: '14vh',
          width: 'clamp(320px, 46vw, 520px)',
          height: '72vh',
        }}
      >
        {steps.map((step, index) => {
          const Icon = step.icon;
          const cardRef = index === 0 ? card1Ref : index === 1 ? card2Ref : card3Ref;
          const positions = [
            { top: 0, left: '6vw' },
            { top: '18vh', left: '2vw' },
            { top: '38vh', left: '8vw' },
          ];

          return (
            <div
              key={step.title}
              ref={cardRef}
              className="absolute card-sacred overflow-hidden"
              style={{
                width: 'clamp(260px, 34vw, 380px)',
                height: '200px',
                top: positions[index].top,
                left: positions[index].left,
              }}
            >
              <div className="flex h-full">
                <div className="w-[50%] h-full relative">
                  <img
                    src={step.image}
                    alt={step.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="w-[50%] p-5 flex flex-col justify-center">
                  <Icon className="w-5 h-5 text-[#D13B3B] mb-2" />
                  <h3 className="font-display text-lg font-semibold text-[color:var(--page-fg)] mb-2">
                    {step.title}
                  </h3>
                  <div className="red-rule mb-2" />
                  <p className="text-sm text-[#6E6A63]">{step.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default PinPlaceSection;
