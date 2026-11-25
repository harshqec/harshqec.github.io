import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import gsap from 'gsap'

interface Particle {
  startX: number
  startY: number
  targetX: number
  targetY: number
  travelDuration: number
  width: number
  height: number
  shape: 'rectangle' | 'trapezoid'
  inset: number
  opacity: number
  color: string
  offset: number
}

export default function Hero() {
  const [scholarDark, setScholarDark] = useState(true)
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)

  // Slow down background video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.85
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateScholarColor = () => {
      const currentTime = video.currentTime
      const duration = video.duration
      const inWhiteSegment =
        (currentTime >= 2 && currentTime < 6) ||
        (Number.isFinite(duration) && duration > 0 && currentTime >= duration - 3)
      setScholarDark(!inWhiteSegment)
    }

    video.addEventListener('timeupdate', updateScholarColor)
    video.addEventListener('loadedmetadata', updateScholarColor)
    video.addEventListener('seeked', updateScholarColor)
    updateScholarColor()

    return () => {
      video.removeEventListener('timeupdate', updateScholarColor)
      video.removeEventListener('loadedmetadata', updateScholarColor)
      video.removeEventListener('seeked', updateScholarColor)
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
    for (let i = 0; i < 110; i++) {
      const fromLeft = Math.random() < 0.5
      const shape = Math.random() < 0.3 ? 'trapezoid' : 'rectangle'
      const width = 2.5 + Math.random() * 4.5
      particles.push({
        startX: fromLeft
          ? 0.05 + Math.random() * 0.2
          : 0.75 + Math.random() * 0.2,
        startY: 0.15 + Math.random() * 0.7,
        targetX: 0.45 + Math.random() * 0.1,
        targetY: 0.35 + Math.random() * 0.3,
        travelDuration: fromLeft
          ? 1.2 + Math.random() * 0.6
          : 2 + Math.random() * 0.8,
        width,
        height: 3 + Math.random() * 5,
        shape,
        inset: width * (0.1 + Math.random() * 0.2),
        opacity: 0.15 + Math.random() * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        offset: Math.random() * Math.PI * 2,
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const video = videoRef.current
      const elapsed = video?.currentTime ?? 0

      particles.forEach((p) => {
        if (elapsed >= p.travelDuration) return

        const progress = elapsed / p.travelDuration
        const travelProgress = 1 - Math.pow(1 - progress, 3)
        const fadeStart = p.travelDuration * 0.65
        const fadeProgress =
          elapsed <= fadeStart
            ? 0
            : (elapsed - fadeStart) / (p.travelDuration - fadeStart)
        const opacity = p.opacity * (1 - fadeProgress)
        const x =
          canvas.width * (p.startX + (p.targetX - p.startX) * travelProgress)
        const y =
          canvas.height * (p.startY + (p.targetY - p.startY) * travelProgress)

        ctx.fillStyle =
          p.color === '#6366F1'
            ? `rgba(99, 102, 241, ${opacity})`
            : `rgba(255, 255, 255, ${opacity})`
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(Math.sin(elapsed * 8 + p.offset) * 0.25)
        if (p.shape === 'trapezoid') {
          ctx.beginPath()
          ctx.moveTo(-p.width / 2 + p.inset, -p.height / 2)
          ctx.lineTo(p.width / 2 - p.inset, -p.height / 2)
          ctx.lineTo(p.width / 2, p.height / 2)
          ctx.lineTo(-p.width / 2, p.height / 2)
          ctx.closePath()
          ctx.fill()
        } else {
          ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height)
        }
        ctx.restore()
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
            className={`inline-flex items-center px-7 py-3.5 border font-medium rounded-md transition-colors duration-250 ${scholarDark ? 'border-black/30 text-black' : 'border-stardust/30 text-stardust'}`}
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
