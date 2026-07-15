import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Atom } from 'lucide-react'
import { Link } from 'react-router'

gsap.registerPlugin(ScrollTrigger)

export default function InteractiveLab() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const textEls = section.querySelectorAll('.lab-text-anim')
    const card = section.querySelector('.lab-card')

    gsap.fromTo(
      textEls,
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

    if (card) {
      gsap.fromTo(
        card,
        { opacity: 0, y: 40, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
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
      id="lab"
      ref={sectionRef}
      className="bg-gradient-to-b from-space-light to-space section-padding page-padding"
    >
      <div className="max-w-[1100px] mx-auto flex flex-col items-center text-center">
        <p className="lab-text-anim text-caption text-quantum mb-4">
          INTERACTIVE LAB
        </p>
        <h2 className="lab-text-anim text-display-l text-stardust mb-4">
          Quantum Graph-Code Analyzer
        </h2>
        <p className="lab-text-anim text-base text-stardust/75 max-w-[640px] leading-[1.7] mb-12">
          A specialized tool designed to generate graph codes using graph states.
          Provides real-time calculations for code distance and an interactive canvas
          for hands-on experimentation with quantum topologies.
        </p>

        {/* Feature card */}
        <div className="lab-card w-full max-w-[720px] rounded-[20px] p-12 backdrop-blur-xl text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(107,92,231,0.15) 0%, rgba(42,42,53,0.8) 100%)',
            border: '1px solid rgba(107,92,231,0.3)',
          }}
        >
          <Atom size={48} className="text-quantum/80 mx-auto mb-6" />
          <h3 className="text-heading-m text-stardust mb-3">
            Generate, Visualize, Analyze
          </h3>
          <p className="text-base text-stardust/70 leading-[1.7] mb-8 max-w-[480px] mx-auto">
            Launch the interactive lab to experiment with graph code distances in real-time.
            Built for researchers exploring quantum topologies.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/interactive-lab"
              className="inline-flex items-center px-7 py-3.5 bg-quantum text-stardust font-medium rounded-lg hover:bg-quantum-light hover:-translate-y-0.5 transition-all duration-250"
            >
              Launch Interactive Lab
            </Link>
            <a
              href="https://github.com/harshqec/QuantumGraph-Analyzer"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-7 py-3.5 border border-stardust/20 text-stardust font-medium rounded-lg hover:border-quantum transition-all duration-250"
            >
              GitHub Source
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
