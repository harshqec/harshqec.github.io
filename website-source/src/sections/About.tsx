import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Github, GraduationCap, Linkedin } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const socialLinks = [
  { label: 'Google Scholar', href: 'https://scholar.google.com/citations?hl=en&user=k3HNV8UAAAAJ', icon: GraduationCap },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/harsh-gupta-aa3bbb99/', icon: Linkedin },
  { label: 'GitHub', href: 'https://github.com/harshqec', icon: Github },
  { label: 'ORCID', href: 'https://orcid.org/0009-0000-0507-4146', icon: null },
]

export default function About() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const leftEls = section.querySelectorAll('.about-left-anim')
    const image = section.querySelector('.about-image')

    gsap.fromTo(
      leftEls,
      { opacity: 0, y: 25 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      }
    )

    if (image) {
      gsap.fromTo(
        image,
        { opacity: 0, x: 30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: 'power2.out',
          delay: 0.2,
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      )
    }
  }, [])

  return (
    <section
      id="about"
      ref={sectionRef}
      className="bg-gradient-to-b from-space-sky to-space-mid section-padding page-padding"
    >
      <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-12 md:gap-6 items-center">
        {/* Text column */}
        <div className="order-2 md:order-1">
          <h2 className="about-left-anim text-display-l text-[clamp(1.875rem,3.2vw,3rem)] text-stardust mb-6">
            Where Engineering Meets the Quantum Realm
          </h2>
          <p className="about-left-anim text-lg text-stardust max-w-[560px] leading-[1.7] mb-4">
            I'm Harsh, a PhD student at IISER Bhopal working on quantum error correction using
            measurement-based quantum computing. With an M.Tech in Microelectronics and nearly two
            years of industry experience at Infosys, I bring a unique blend of theoretical depth
            and practical engineering to the quantum frontier.
          </p>
          <p className="about-left-anim text-lg text-silver max-w-[560px] leading-[1.7] mb-6">
            My research focuses on reducing hardware overhead for near-term fault-tolerant quantum
            error correction - because every bit matters, even in a qubit. When I'm not debugging
            quantum circuits, you'll find me exploring mathematics or making music.
          </p>

          <div className="about-left-anim flex flex-wrap gap-3">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                title={link.label}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-nebula bg-white text-black transition-all duration-200 hover:-translate-y-0.5 hover:border-quantum hover:text-quantum focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-quantum-light"
              >
                {link.icon ? <link.icon size={20} aria-hidden="true" /> : <span className="text-xs font-semibold">iD</span>}
              </a>
            ))}
          </div>
        </div>

        {/* Image column */}
        <div className="order-1 md:order-2 flex justify-center md:justify-end">
          <div className="about-image relative">
            <img
              src="/images/headshot.webp"
              alt="Portrait of Harsh, PhD student in Quantum Computing at IISER Bhopal"
              className="w-full max-w-[360px] rounded-t-2xl object-cover hover:scale-[1.02] transition-transform duration-400"
              style={{
                maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
              }}
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
