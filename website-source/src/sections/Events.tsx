import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Link } from 'react-router'

gsap.registerPlugin(ScrollTrigger)

const events = [
  {
    date: 'March 2026',
    title: 'EECS Symposium 2026',
    description:
      'Participated in the EECS Symposium 2026 at IISER Bhopal, an exciting opportunity to share research, exchange ideas, and engage with the vibrant academic community.',
    link: '/events/eecs-symposium'
  },
  {
    date: 'February 2026',
    title: 'Visit by Prof. Shayan Srinivasa Garani & Ujjain Trip',
    description:
      'Hosted Prof. Shayan Srinivasa Garani (IISc) for a research talk, followed by a cultural visit to Ujjain.',
    link: '/events/guide-visit'
  },
  {
    date: 'June 2025',
    title: 'NPTEL Workshop: Hands-on Quantum Computing (2nd Edition)',
    description:
      'Following the success of the inaugural session, we organized the 2nd edition at IISER Bhopal, expanding the curriculum and cloud simulation platform.',
    link: '/events/nptel-workshop'
  },
  {
    date: 'Feb – Mar 2025',
    title: 'GIAN Course: Sparse Graphs — Treewidth, Planarity, Bounded Expansion',
    description:
      'Attended an intensive GIAN course at IIT Dharwad focused on structural graph theory - treewidth, planarity, bounded expansion, and algorithmic applications.',
    link: '/events/gian-course'
  },
  {
    date: 'December 2024',
    title: 'IISc Fujitsu Quantum Computing Workshop',
    description:
      'Presented a lightning talk on fault-tolerant non-CSS codes at this collaborative event.',
    link: '/events/iisc-fujitsu'
  },
  {
    date: 'June 2024',
    title: 'NPTEL Workshop: Hands-on Quantum Computing',
    description:
      'Organized a 5-day intensive workshop at IISER Bhopal. Led sessions on quantum algorithms using PennyLane and co-implemented a cloud API for simulations.',
    link: '/events/nptel-workshop'
  },
]

export default function Events() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const items = section.querySelectorAll('.timeline-item')
    gsap.fromTo(
      items,
      { opacity: 0, x: -20 },
      {
        opacity: 1,
        x: 0,
        duration: 0.5,
        stagger: 0.1,
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
      id="events"
      ref={sectionRef}
      className="bg-gradient-to-b from-space-mid to-space-soft-light section-padding page-padding"
    >
      <div className="max-w-[1100px] mx-auto">
        <p className="text-caption text-quantum tracking-[0.1em] mb-4">
          EVENTS & PARTICIPATIONS
        </p>
        <h2 className="text-display-l text-stardust mb-4">
          Journey Through My Academic Path
        </h2>
        <p className="text-body-large text-silver max-w-[560px] mb-12">
          Workshops, symposiums, and research gatherings that shaped my journey.
        </p>

        {/* Timeline */}
        <div className="relative pl-8">
          {/* Vertical line */}
          <div
            className="absolute left-[5px] top-2 bottom-2 w-[2px]"
            style={{
              background: 'linear-gradient(180deg, #6B5CE7 0%, #9A9AA8 100%)',
            }}
          />

          <div className="flex flex-col gap-10">
            {events.map((event, i) => (
              <div key={i} className="timeline-item relative">
                {/* Dot */}
                <div className="absolute -left-8 top-1 w-3 h-3 rounded-full bg-quantum border-2 border-space" />

                <p className="text-caption text-quantum mb-1">{event.date}</p>
                {event.link ? (
                  <Link to={event.link} className="hover:text-quantum transition-colors">
                    <h3 className="text-heading-m text-stardust mb-2">{event.title}</h3>
                  </Link>
                ) : (
                  <h3 className="text-heading-m text-stardust mb-2">{event.title}</h3>
                )}
                <p className="text-base text-silver leading-[1.7] max-w-[640px]">
                  {event.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
