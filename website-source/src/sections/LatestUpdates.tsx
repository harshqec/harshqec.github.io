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

    const items = section.querySelectorAll('.update-item')
    gsap.fromTo(
      items,
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
        <div className="w-full glass-card-light !rounded-none p-4 mb-6">
          <h2 className="text-heading-m text-stardust">
            Latest Updates
          </h2>
        </div>
        <ul className="list-disc space-y-5 pl-5 marker:text-quantum-light">
          {updates.map((update, i) => (
            <li
              key={update.title}
              className={`update-item ${i < updates.length - 1 ? 'border-b border-stardust/10 pb-5' : ''}`}
            >
              <h3 className="text-base text-stardust font-medium mb-1">
                {update.title}
              </h3>
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
                        className="text-black hover:underline"
                      >
                        {link.label}
                      </a>
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
