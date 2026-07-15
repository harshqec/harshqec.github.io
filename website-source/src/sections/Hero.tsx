import { useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import gsap from 'gsap'

interface Particle {
  x: number
  y: number
  size: number
  speedY: number
  speedX: number
  opacity: number
  color: string
  offset: number
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)

  // Slow down background video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.8
    }
  }, [])

  // Particle canvas animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Initialize particles
    const colors = ['#6366F1', '#FFFFFF']
    const particles: Particle[] = []
    for (let i = 0; i < 55; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 1 + Math.random() * 1.5,
        speedY: -(0.3 + Math.random() * 0.5),
        speedX: 0.2 + Math.random() * 0.3,
        opacity: 0.15 + Math.random() * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        offset: Math.random() * Math.PI * 2,
      })
    }
    particlesRef.current = particles

    let time = 0
    const animate = () => {
      time++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        p.y += p.speedY
        p.x += Math.sin(time * 0.008 + p.offset) * p.speedX * 0.5

        if (p.y < -5) {
          p.y = canvas.height + 5
          p.x = Math.random() * canvas.width
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle =
          p.color === '#6366F1'
            ? `rgba(99, 102, 241, ${p.opacity})`
            : `rgba(255, 255, 255, ${p.opacity})`
        ctx.fill()
      })

      animFrameRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // Entrance animation
  useEffect(() => {
    const ctx = contentRef.current
    if (!ctx) return

    const els = ctx.querySelectorAll('.hero-anim')
    const titleChars = ctx.querySelectorAll('.title-char')
    
    // Set initial state for non-title elements
    gsap.set(els, { opacity: 0, y: 25 })
    
    // Set initial state for title characters (scattered like glass pieces)
    titleChars.forEach((char) => {
      const angle = Math.random() * Math.PI * 2
      const distance = Math.max(window.innerWidth, window.innerHeight)
      gsap.set(char, {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rotation: (Math.random() - 0.5) * 540,
        opacity: 0,
        scale: 0.5
      })
    })

    const tl = gsap.timeline({ delay: 0.6 })
    
    // Gather title characters
    tl.to(titleChars, {
      x: 0,
      y: 0,
      rotation: 0,
      opacity: 1,
      scale: 1,
      duration: 1.5,
      stagger: {
        each: 0.03,
        from: "random"
      },
      ease: "power4.out"
    })
    // Animate rest of the content
    .to(els, { 
      opacity: 1, 
      y: 0, 
      duration: 0.8, 
      stagger: 0.2,
      ease: 'power3.out' 
    }, "-=0.8")
  }, [])

  // Scroll indicator fade
  useEffect(() => {
    const handleScroll = () => {
      if (scrollIndicatorRef.current) {
        scrollIndicatorRef.current.style.opacity =
          window.scrollY > 100 ? '0' : '1'
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative w-full min-h-[100dvh] overflow-hidden bg-space flex items-center justify-center"
    >
      {/* Video background */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover object-top z-0"
        aria-hidden="true"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            'linear-gradient(180deg, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0.02) 40%, rgba(71,85,105,0.6) 85%, rgba(71,85,105,1) 100%)',
        }}
      />

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-[2] pointer-events-none"
        aria-hidden="true"
      />

      {/* Content */}
      <div
        ref={contentRef}
        className="relative z-[3] flex flex-col items-center text-center px-6 max-w-[700px]"
      >
        <h1 className="text-display-xl text-stardust mb-8" style={{ textShadow: '0 2px 40px rgba(0,0,0,0.5)' }}>
          {"Hi, I'm Harsh".split('').map((char, i) => (
            <span key={i} className="title-char inline-block whitespace-pre">
              {char}
            </span>
          ))}
          <span className="title-char inline-block text-quantum">.</span>
        </h1>

        <div className="hero-anim bg-black/10 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl mb-8 w-full">
          {/* <p className="text-caption text-stardust font-bold tracking-[0.2em] mb-4">
            PHD STUDENT · QUANTUM COMPUTING · IISER BHOPAL
          </p> */}

          <p className="text-body-large text-stardust/90 font-medium mb-4">
            Exploring quantum error correction through measurement-based quantum computing.
          </p>

          <p className="text-base text-stardust/85 leading-[1.7]">
            Engineer with a passion for mathematics and music. Nearly two years at Infosys.
            M.Tech in Microelectronics. Currently pursuing a Ph.D. at IISER Bhopal.
          </p>
        </div>

        <div className="hero-anim flex flex-wrap items-center justify-center gap-4 mt-8">
          <a
            href="https://drive.google.com/file/d/13V5qfZjASv-9JiqI2I3nbUdcPs2RYdRC/view?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-7 py-3.5 bg-quantum text-stardust font-medium rounded-md hover:bg-quantum-light hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(107,92,231,0.3)] transition-all duration-250"
          >
            Download CV
          </a>
          <a
            href="https://scholar.google.com/citations?hl=en&user=k3HNV8UAAAAJ"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-7 py-3.5 border border-stardust/30 text-stardust font-medium rounded-md hover:border-quantum hover:text-quantum-light transition-all duration-250"
          >
            Google Scholar →
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollIndicatorRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[3] transition-opacity duration-300"
      >
        <ChevronDown size={20} className="text-silver animate-bounce-slow" />
      </div>
    </section>
  )
}
