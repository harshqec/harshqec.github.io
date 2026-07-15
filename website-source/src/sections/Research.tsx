import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const researchCards = [
  {
    badge: 'ARXIV PREPRINT 2026',
    badgeColor: 'text-quantum',
    title: 'Fault-tolerant syndrome extraction in [[n,1,3]] non-CSS codes',
    summary:
      'Investigates the construction of bare codes generated using measurements on graph states. Focuses on reducing hardware overhead for near-term fault-tolerant quantum error correction.',
    links: [
      { label: 'Preprint →', href: 'https://arxiv.org/abs/2501.12072' },
      { label: 'PDF →', href: 'https://arxiv.org/pdf/2501.12072' },
    ],
  },
  {
    badge: 'SOFTWARE',
    badgeColor: 'text-quantum-light',
    title: 'Interactive Topological Visualization for MBQC',
    summary:
      'A software suite for real-time visualization and manipulation of complex cluster state graphs, bridging the gap between MBQC mathematics and intuitive UI.',
    links: [
      { label: 'Live Demo →', href: '/interactive-lab' },
      { label: 'Code →', href: 'https://github.com/harshqec/QuantumGraph-Analyzer' },
    ],
  },
  {
    badge: 'ONGOING RESEARCH',
    badgeColor: 'text-silver',
    title: 'Bare Code Construction for Near-Term Hardware',
    summary:
      'Investigating minimal-overhead error correction schemes suitable for pre-threshold quantum devices using optimized measurement patterns on cluster states.',
    status: 'Manuscript in Prep',
  },
]

export default function Research() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const cards = section.querySelectorAll('.research-card')
    gsap.fromTo(
      cards,
      { opacity: 0, y: 40, scale: 0.98 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.7,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      }
    )
  }, [])

  return (
    <section
      id="research"
      ref={sectionRef}
      className="bg-gradient-to-b from-space-soft-light to-space-light section-padding page-padding"
    >
      <div className="max-w-[1100px] mx-auto">
        <p className="text-caption text-quantum mb-4">RESEARCH SPOTLIGHT</p>
        <h2 className="text-display-l text-stardust mb-4">
          Pushing the Boundaries of Quantum Error Correction
        </h2>
        <p className="text-body-large text-stardust/70 mb-12 max-w-[640px]">
          Current research interests and publications in measurement-based quantum computing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {researchCards.map((card, i) => (
            <div
              key={i}
              className="research-card glass-card rounded-2xl p-8 hover:-translate-y-1 hover:border-quantum/40 hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-all duration-300"
            >
              <p className={`text-caption ${card.badgeColor} mb-3`}>
                {card.badge}
              </p>
              <h3 className="text-heading-m text-stardust mb-3">{card.title}</h3>
              <p className="text-base text-stardust/75 leading-[1.7] mb-5">
                {card.summary}
              </p>

              {'links' in card && card.links ? (
                <div className="flex flex-wrap gap-4">
                  {card.links.map((link) =>
                    link.href.startsWith('/') ? (
                      <Link
                        key={link.label}
                        to={link.href}
                        className="text-sm text-quantum hover:underline transition-all"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-quantum hover:underline transition-all"
                      >
                        {link.label}
                      </a>
                    )
                  )}
                </div>
              ) : (
                <p className="text-caption text-silver italic">{card.status}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
