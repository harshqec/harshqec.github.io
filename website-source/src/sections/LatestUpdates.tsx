import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

type Update = {
  title: string
  description: string
  links?: { label: string; href: string }[]
}

const updates: Update[] = [
  {
    title: 'Paper Accepted in APS Open Science',
    description:
      'APS Open Science accepted our paper, “Bare-ancilla fault-tolerant syndrome extraction: General extensions of distance-three codes and structural criteria for graph codes.”',
    links: [
      {
        label: 'Journal announcement',
        href: 'https://journals.aps.org/apsos/accepted/10.1103/4mrw-3qj1',
      },
      {
        label: 'Read the paper on arXiv',
        href: 'https://arxiv.org/abs/2501.12072',
      },
    ],
  },
  {
    title: 'Poster Accepted at QIP 2027',
    description:
      'My poster has been accepted for presentation at QIP 2027. I hope to see you in Singapore!',
  },
]

export default function LatestUpdates() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const cards = section.querySelectorAll('.update-card')
    gsap.fromTo(
      cards,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    )
  }, [])

  return (
    <section
      id="updates"
      ref={sectionRef}
      className="relative bg-gradient-to-b from-space-dawn to-space-sky section-padding page-padding"
    >
      <div className="max-w-[1100px] mx-auto">
        <h2 className="text-heading-m text-stardust flex items-center gap-2.5 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-quantum inline-block" />
          Latest Updates
        </h2>

        <div className="flex flex-col gap-5">
          {updates.map((update, i) => (
            <div
              key={i}
              className="update-card glass-card-light rounded-xl p-6"
            >
              <p className="text-base text-stardust font-medium mb-1">
                {update.title}
              </p>
              <p className="text-base text-silver leading-relaxed">
                {update.description}
              </p>
              {update.links && (
                <div className="flex flex-wrap gap-x-2 mt-3">
                  {update.links.map((link, index) => (
                    <span key={link.href} className="inline-flex gap-x-2">
                      {index > 0 && <span aria-hidden="true">·</span>}
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-quantum-light hover:underline"
                      >
                        {link.label}
                      </a>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
