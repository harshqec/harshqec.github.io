import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const updates = [
  {
    date: 'May 2026',
    title: 'arXiv Preprint Update',
    description:
      'Fault-tolerant syndrome extraction in [[n,1,3]] non-CSS code family generated using measurements on graph states.',
  },
  {
    date: 'March 2026',
    title: 'EECS Symposium, IISER Bhopal',
    description:
      'Presented research on fault-tolerant syndrome extraction in [[n, 1, 3]] graph codes.',
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
              <p className="text-caption text-quantum mb-2">{update.date}</p>
              <p className="text-base text-stardust font-medium mb-1">
                {update.title}
              </p>
              <p className="text-base text-silver leading-relaxed">
                {update.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
