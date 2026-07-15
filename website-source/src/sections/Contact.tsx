import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Mail, MapPin, Linkedin, Github, GraduationCap } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const socialIcons = [
  { icon: Linkedin, href: 'https://www.linkedin.com/in/harsh-gupta-aa3bbb99/', label: 'LinkedIn' },
  { icon: Github, href: 'https://github.com/harshqec', label: 'GitHub' },
  { icon: GraduationCap, href: 'https://scholar.google.com/citations?hl=en&user=k3HNV8UAAAAJ', label: 'Google Scholar' },
]

export default function Contact() {
  const sectionRef = useRef<HTMLElement>(null)
  const [formStatus, setFormStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const leftEls = section.querySelectorAll('.contact-left-anim')
    const formCard = section.querySelector('.contact-form-card')

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

    if (formCard) {
      gsap.fromTo(
        formCard,
        { opacity: 0, x: 30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.7,
          ease: 'power2.out',
          delay: 0.15,
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      )
    }
  }, [])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    fetch('https://formspree.io/f/xgorvznp', {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' },
    })
      .then((res) => {
        if (res.ok) {
          setFormStatus('success')
          form.reset()
        } else {
          setFormStatus('error')
        }
      })
      .catch(() => setFormStatus('error'))
  }

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="bg-gradient-to-b from-space-dark to-black section-padding page-padding"
    >
      <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Left column */}
        <div>
          <p className="contact-left-anim text-caption text-quantum tracking-[0.1em] mb-4">
            GET IN TOUCH
          </p>
          <h2 className="contact-left-anim text-display-l text-stardust mb-4">
            Let's Connect
          </h2>
          <p className="contact-left-anim text-base text-silver leading-[1.7] mb-8">
            Interested in collaborating, discussing research, or just want to say hello?
            I'd love to hear from you.
          </p>

          <div className="contact-left-anim flex flex-col gap-4 mb-6">
            <a
              href="mailto:harsh22@iiserb.ac.in"
              className="inline-flex items-center gap-3 text-stardust hover:text-quantum transition-colors"
            >
              <Mail size={18} className="text-quantum" />
              <span className="text-base">harsh22@iiserb.ac.in</span>
            </a>
            <div className="inline-flex items-center gap-3 text-stardust">
              <MapPin size={18} className="text-silver" />
              <span className="text-base">IISER Bhopal, India</span>
            </div>
          </div>

          <div className="contact-left-anim flex items-center gap-3">
            {socialIcons.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-10 h-10 rounded-full border border-nebula flex items-center justify-center text-stardust hover:text-quantum hover:border-quantum hover:-translate-y-0.5 transition-all duration-200"
              >
                <Icon size={18} />
              </a>
            ))}
            <a
              href="https://orcid.org/0009-0000-0507-4146"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="ORCID"
              className="w-10 h-10 rounded-full border border-nebula flex items-center justify-center text-stardust hover:text-quantum hover:border-quantum hover:-translate-y-0.5 transition-all duration-200 font-body font-semibold text-xs"
            >
              ID
            </a>
          </div>
        </div>

        {/* Right column — Form */}
        <div className="contact-form-card glass-card-light rounded-2xl p-10">
          <h3 className="text-heading-m text-stardust mb-6">Send a Message</h3>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="form-name" className="text-caption text-stardust block mb-2">
                FULL NAME
              </label>
              <input
                type="text"
                id="form-name"
                name="name"
                placeholder="Your Name"
                required
                className="w-full bg-space-void border border-white/40 rounded-lg px-4 py-3 text-base font-body text-stardust placeholder:text-silver/50 focus:border-quantum focus:shadow-[0_0_0_3px_rgba(107,92,231,0.15)] focus:outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="form-email" className="text-caption text-stardust block mb-2">
                YOUR EMAIL
              </label>
              <input
                type="email"
                id="form-email"
                name="_replyto"
                placeholder="yourname@email.com"
                required
                className="w-full bg-space-void border border-white/40 rounded-lg px-4 py-3 text-base font-body text-stardust placeholder:text-silver/50 focus:border-quantum focus:shadow-[0_0_0_3px_rgba(107,92,231,0.15)] focus:outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="form-message" className="text-caption text-stardust block mb-2">
                MESSAGE
              </label>
              <textarea
                id="form-message"
                name="message"
                placeholder="How can I help you?"
                rows={5}
                required
                className="w-full bg-space border border-white/40 rounded-lg px-4 py-3 text-base font-body text-stardust placeholder:text-silver/50 focus:border-quantum focus:shadow-[0_0_0_3px_rgba(107,92,231,0.15)] focus:outline-none transition-all resize-vertical"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-quantum text-stardust font-medium rounded-lg hover:bg-quantum-light hover:-translate-y-0.5 transition-all duration-250 mt-2"
            >
              Send Message
            </button>

            {formStatus === 'success' && (
              <p className="text-sm text-quantum font-medium mt-1">
                Thanks for reaching out! I'll get back to you within 24 hours.
              </p>
            )}
            {formStatus === 'error' && (
              <p className="text-sm text-red-500 font-medium mt-1">
                Something went wrong. Please try again.
              </p>
            )}

            <p className="text-caption text-silver mt-1">
              Powered by Formspree. I usually reply within 24 hours.
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}
