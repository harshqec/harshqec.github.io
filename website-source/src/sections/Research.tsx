import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const researchRows = [
  {
    badge: 'PUBLICATION',
    badgeColor: 'text-quantum',
    title:
      'Bare-ancilla fault-tolerant syndrome extraction: General extensions of distance-three codes and structural criteria for graph codes',
    summary:
      'Accepted for publication in APS Open Science.',
    links: [
      {
        label: 'Journal announcement →',
        href: 'https://journals.aps.org/apsos/accepted/10.1103/4mrw-3qj1',
      },
      { label: 'Read on arXiv →', href: 'https://arxiv.org/abs/2501.12072' },
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

        <div className="flex flex-col gap-5">
          {researchRows.map((row, i) => (
            <div
              key={i}
              className="research-card grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] items-center gap-6 py-4"
            >
              <p
                className={`text-heading-m ${row.badgeColor} md:col-span-2`}
              >
                {row.badge}
              </p>
              <div>
                <h3
                  className="text-base text-stardust mb-3"
                >
                  {row.title}
                </h3>
                <p className="text-base text-stardust/75 leading-[1.7]">
                  {row.summary}
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                {row.links.map((link) =>
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
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
