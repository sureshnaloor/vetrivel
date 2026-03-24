import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Send, Download, CheckCircle, Shield, MessageSquare } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface ForTemplesSectionProps {
  className?: string;
}

const ForTemplesSection = ({ className = '' }: ForTemplesSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const headline = headlineRef.current;
    const form = formRef.current;
    const cards = cardsRef.current;

    if (!section || !headline || !form || !cards) return;

    const ctx = gsap.context(() => {
      // Headline reveal
      gsap.fromTo(
        headline,
        { x: '-10vw', opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: headline,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Form reveal
      gsap.fromTo(
        form,
        { x: '10vw', opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: form,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Cards stagger reveal
      const cardElements = cards.querySelectorAll('.info-card');
      gsap.fromTo(
        cardElements,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: cards,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  const infoCards = [
    {
      icon: CheckCircle,
      title: 'Claim',
      description: 'Verify and manage your temple\'s presence on the map.',
    },
    {
      icon: Shield,
      title: 'Verify',
      description: 'Get a verified badge to build trust with visitors.',
    },
    {
      icon: MessageSquare,
      title: 'Support',
      description: 'Access dedicated support for temple administrators.',
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="contact"
      className={`relative py-24 lg:py-32 ${className}`}
      style={{ backgroundColor: 'var(--page-bg)' }}
    >
      <div className="w-full px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* Left Headline */}
          <div
            ref={headlineRef}
            className="lg:w-[45%]"
          >
            <p className="eyebrow mb-4">PARTNER WITH US</p>
            <h2 className="heading-section text-[color:var(--page-fg)] mb-6">
              FOR TEMPLES & TRUSTS
            </h2>
            <p className="body-text mb-8 max-w-md">
              Claim your page, verify details, and connect with your community.
            </p>
            <button className="btn-secondary">
              <Download className="w-4 h-4 mr-2" />
              Download partner kit
            </button>
          </div>

          {/* Right Form */}
          <div
            ref={formRef}
            className="lg:w-[55%]"
          >
            <div className="card-sacred p-8 lg:p-10">
              {isSubmitted ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-display text-2xl text-[color:var(--page-fg)] mb-2">
                    Message Sent!
                  </h3>
                  <p className="body-text">
                    We&apos;ll get back to you within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[color:var(--page-fg)] mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card-bg)] text-[color:var(--page-fg)] focus:outline-none focus:ring-2 focus:ring-[#D13B3B]/30 focus:border-[#D13B3B] transition-all"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[color:var(--page-fg)] mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card-bg)] text-[color:var(--page-fg)] focus:outline-none focus:ring-2 focus:ring-[#D13B3B]/30 focus:border-[#D13B3B] transition-all"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[color:var(--page-fg)] mb-2">
                      Temple / Organization
                    </label>
                    <input
                      type="text"
                      value={formData.organization}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          organization: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card-bg)] text-[color:var(--page-fg)] focus:outline-none focus:ring-2 focus:ring-[#D13B3B]/30 focus:border-[#D13B3B] transition-all"
                      placeholder="Organization name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[color:var(--page-fg)] mb-2">
                      Message
                    </label>
                    <textarea
                      rows={4}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card-bg)] text-[color:var(--page-fg)] focus:outline-none focus:ring-2 focus:ring-[#D13B3B]/30 focus:border-[#D13B3B] transition-all resize-none"
                      placeholder="How can we help?"
                    />
                  </div>
                  <button type="submit" className="btn-primary w-full">
                    <Send className="w-4 h-4 mr-2" />
                    Send message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16"
        >
          {infoCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="info-card card-sacred p-6 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-[color:var(--page-bg)] flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-[#D13B3B]" />
                </div>
                <h3 className="font-display text-lg font-semibold text-[color:var(--page-fg)] mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-[color:var(--page-fg-secondary)]">{card.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ForTemplesSection;
