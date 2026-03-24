import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navigation from '../components/Navigation';
import HeroSection from '../sections/HeroSection';
import WhatThisIsSection from '../sections/WhatThisIsSection';
import ExploreSection from '../sections/ExploreSection';
import PinPlaceSection from '../sections/PinPlaceSection';
import TagFriendsSection from '../sections/TagFriendsSection';
import ShareMomentsSection from '../sections/ShareMomentsSection';
import YourNestSection from '../sections/YourNestSection';
import CommunityEventsSection from '../sections/CommunityEventsSection';
import BookPoojaSection from '../sections/BookPoojaSection';
import ForTemplesSection from '../sections/ForTemplesSection';
import FooterSection from '../sections/FooterSection';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Wait for all sections to mount and create their ScrollTriggers
    const timer = setTimeout(() => {
      const pinned = ScrollTrigger.getAll()
        .filter(st => st.vars.pin)
        .sort((a, b) => a.start - b.start);
      
      const maxScroll = ScrollTrigger.maxScroll(window);
      
      if (!maxScroll || pinned.length === 0) return;

      const pinnedRanges = pinned.map(st => ({
        start: st.start / maxScroll,
        end: (st.end ?? st.start) / maxScroll,
        center: (st.start + ((st.end ?? st.start) - st.start) * 0.5) / maxScroll,
      }));

      ScrollTrigger.create({
        snap: {
          snapTo: (value: number) => {
            const inPinned = pinnedRanges.some(
              r => value >= r.start - 0.02 && value <= r.end + 0.02
            );
            if (!inPinned) return value;

            const target = pinnedRanges.reduce(
              (closest, r) =>
                Math.abs(r.center - value) < Math.abs(closest - value)
                  ? r.center
                  : closest,
              pinnedRanges[0]?.center ?? 0
            );
            return target;
          },
          duration: { min: 0.15, max: 0.35 },
          delay: 0,
          ease: 'power2.out',
        },
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

  return (
    <div ref={mainRef} className="relative">
      {/* Grain Overlay */}
      <div className="grain-overlay" />
      
      {/* Navigation */}
      <Navigation />
      
      {/* Sections */}
      <main className="relative">
        <HeroSection className="z-10" />
        <WhatThisIsSection className="z-20" />
        <ExploreSection className="z-30" />
        <PinPlaceSection className="z-40" />
        <TagFriendsSection className="z-50" />
        <ShareMomentsSection className="z-[60]" />
        <YourNestSection className="z-[70]" />
        <CommunityEventsSection className="z-[80]" />
        <BookPoojaSection className="z-[90]" />
        <ForTemplesSection className="z-[100]" />
        <FooterSection className="z-[110]" />
      </main>
    </div>
  );
}
