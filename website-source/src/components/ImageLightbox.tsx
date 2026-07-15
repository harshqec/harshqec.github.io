import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ImageLightboxProps {
  isOpen: boolean
  onClose: () => void
  images: { src: string; alt: string }[]
  initialIndex: number
}

export default function ImageLightbox({ isOpen, onClose, images, initialIndex }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [isRendered, setIsRendered] = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true)
      setIsClosing(false)
      setCurrentIndex(initialIndex)
      document.body.style.overflow = 'hidden'
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleClose()
        if (e.key === 'ArrowLeft') handlePrev()
        if (e.key === 'ArrowRight') handleNext()
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'unset'
      }
    } else {
      setIsClosing(true)
      const timer = setTimeout(() => {
        setIsRendered(false)
        setIsClosing(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, initialIndex])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  if (!isRendered || images.length === 0) return null

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  // Swipe handlers
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      handleNext()
    }
    if (isRightSwipe) {
      handlePrev()
    }
  }

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <button 
        onClick={handleClose}
        className="absolute top-4 right-4 md:top-8 md:right-8 text-white/70 hover:text-white p-2 transition-colors bg-transparent border-none shadow-none z-50 hover:bg-transparent hover:shadow-none hover:translate-y-0"
        aria-label="Close image"
      >
        <X size={36} />
      </button>

      {images.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 transition-colors bg-transparent border-none shadow-none z-50 hover:bg-transparent hover:shadow-none hover:translate-y-[-50%]"
            aria-label="Previous image"
          >
            <ChevronLeft size={48} />
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 transition-colors bg-transparent border-none shadow-none z-50 hover:bg-transparent hover:shadow-none hover:translate-y-[-50%]"
            aria-label="Next image"
          >
            <ChevronRight size={48} />
          </button>
        </>
      )}

      {/* The image container. Removed w-full h-full and stopPropagation so background clicks work! */}
      <div className={`relative flex items-center justify-center max-w-full max-h-full transition-transform duration-300 ${isClosing ? 'scale-95 translate-y-4' : 'scale-100 translate-y-0'}`}>
        <img 
          key={currentIndex} 
          src={images[currentIndex].src} 
          alt={images[currentIndex].alt || "Full size gallery image"} 
          className="max-w-[95vw] max-h-[85vh] object-contain rounded-md shadow-2xl animate-in fade-in zoom-in-95 duration-300 select-none"
          onClick={(e) => e.stopPropagation()} // Only clicking the actual image prevents closing
        />
        
        {images.length > 1 && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white/80 text-sm tracking-widest font-mono bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-sm pointer-events-none">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  )
}
