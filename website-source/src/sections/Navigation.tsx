import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Menu, X, GraduationCap, Github } from 'lucide-react'
import gsap from 'gsap'

const navLinks = [
  { label: 'About', href: '#about' },
  { label: 'Events', href: '#events' },
  { label: 'Research', href: '#research' },
  { label: 'Lab', href: '#lab' },
  { label: 'Blog', href: '#blog' },
  { label: 'Contact', href: '#contact' },
]

export default function Navigation() {
  const [_scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')
  const mobileRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const sections = ['hero', 'updates', 'about', 'events', 'research', 'lab', 'contact']
    const observers: IntersectionObserver[] = []

    sections.forEach((id) => {
      const el = document.getElementById(id)
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id)
          }
        },
        { threshold: 0.3 }
      )
      observer.observe(el)
      observers.push(observer)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [])

  useEffect(() => {
    if (mobileOpen && mobileRef.current) {
      const links = mobileRef.current.querySelectorAll('.mobile-link')
      gsap.fromTo(
        links,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' }
      )
    }
  }, [mobileOpen])

  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // If we just navigated to the home page with a hash, try to scroll to it
    if (location.pathname === '/' && location.hash) {
      setTimeout(() => {
        const el = document.querySelector(location.hash)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
  }, [location])

  const scrollTo = (href: string) => {
    setMobileOpen(false)

    if (location.pathname !== '/') {
      navigate('/' + href)
      return
    }

    if (href === '#hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const el = document.querySelector(href)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <>
      <nav
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300 bg-transparent border-b border-transparent"
      >
        <div className="max-w-[1200px] mx-auto h-full flex items-center justify-between page-padding">
          {/* Logo */}
          <button
            onClick={() => scrollTo('#hero')}
            className="font-display font-bold text-xl text-stardust tracking-tight bg-transparent border-none shadow-none hover:bg-transparent hover:shadow-none hover:translate-y-0 px-0 py-0 flex items-center"
          >
            {"Harsh".split('').map((char, i) => (
              <span
                key={i}
                className="inline-block animate-microscope"
                style={{ animationDelay: `${i * 0.4}s` }}
              >
                {char}
              </span>
            ))}
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-7">
            <style>
              {`
                @keyframes nav-wave {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-3px); }
                }
                @keyframes microscope {
                  0%, 15% { transform: scale(1); }
                  35% { transform: scale(1.4); }
                  55%, 100% { transform: scale(1); }
                }
                .animate-nav-wave {
                  animation: nav-wave 4s ease-in-out infinite;
                }
                .animate-microscope {
                  animation: microscope 6s ease-in-out infinite;
                }
              `}
            </style>
            {navLinks.map((link, index) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className={`text-nav font-bold relative pb-1 transition-colors duration-200 bg-transparent border-none shadow-none hover:bg-transparent hover:shadow-none hover:translate-y-0 px-0 pt-0 animate-nav-wave ${activeSection === link.href.slice(1)
                  ? 'text-quantum-light'
                  : 'text-stardust hover:text-white'
                  }`}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {link.label}
                <span
                  className={`absolute bottom-0 left-0 h-[2px] bg-quantum transition-transform duration-250 origin-left ${activeSection === link.href.slice(1) ? 'scale-x-100 w-full' : 'scale-x-0 w-full'
                    }`}
                />
              </button>
            ))}

            {/* External icons */}
            <div className="flex items-center gap-2 ml-2">
              <a
                href="https://scholar.google.com/citations?hl=en&user=k3HNV8UAAAAJ"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-stardust/20 flex items-center justify-center text-stardust/70 hover:text-quantum hover:border-quantum transition-all duration-200"
                aria-label="Google Scholar"
              >
                <GraduationCap size={16} />
              </a>
              <a
                href="https://github.com/harshqec"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-stardust/20 flex items-center justify-center text-stardust/70 hover:text-quantum hover:border-quantum transition-all duration-200"
                aria-label="GitHub"
              >
                <Github size={16} />
              </a>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden text-stardust p-2 bg-transparent border-none shadow-none hover:bg-transparent hover:shadow-none hover:translate-y-0"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          ref={mobileRef}
          className="fixed inset-0 z-[100] bg-space flex flex-col items-center justify-center gap-8"
        >
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-5 right-5 text-stardust p-2 bg-transparent border-none shadow-none hover:bg-transparent hover:shadow-none hover:translate-y-0"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="mobile-link text-heading-m text-stardust hover:text-quantum transition-colors duration-200 bg-transparent border-none shadow-none hover:bg-transparent hover:shadow-none hover:translate-y-0 px-0 py-0"
            >
              {link.label}
            </button>
          ))}
          <div className="mobile-link flex items-center gap-4 mt-4">
            <a
              href="https://scholar.google.com/citations?hl=en&user=k3HNV8UAAAAJ"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stardust/70 hover:text-quantum transition-colors"
              aria-label="Google Scholar"
            >
              <GraduationCap size={20} />
            </a>
            <a
              href="https://github.com/harshqec"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stardust/70 hover:text-quantum transition-colors"
              aria-label="GitHub"
            >
              <Github size={20} />
            </a>
          </div>
        </div>
      )}
    </>
  )
}
