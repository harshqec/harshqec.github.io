import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, Home } from 'lucide-react'
import ImageLightbox from '../../components/ImageLightbox'

export default function GuideVisit() {
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1)
  const images = [
    { src: '/images/iisc_prof_1_full.webp', alt: 'Harsh with Prof. Shayan Garani' },
    { src: '/images/iisc_prof_2_full.webp', alt: 'Visit to Ujjain with Prof. Shayan Garani' },
    { src: '/images/iisc_prof_3_full.webp', alt: 'Memories from the Ujjain trip' }
  ];

  const navigate = useNavigate()

  return (
    <section className="bg-space section-padding page-padding min-h-screen">
      <div className="max-w-[800px] mx-auto pt-24">
        <div className="mb-8">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate(-1)} className="inline-flex items-center text-quantum hover:text-quantum-light transition-colors font-medium bg-transparent border-none shadow-none p-0 hover:bg-transparent hover:shadow-none hover:translate-y-0">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </button>
            <Link to="/" className="inline-flex items-center text-stardust/70 hover:text-stardust transition-colors font-medium">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Link>
          </div>
          <h3 className="text-heading-m text-stardust mt-6 mb-2">Visit by Prof. Shayan Garani & Ujjain Trip</h3>
          <div className="text-quantum font-medium">February 2026</div>
        </div>

        <div className="text-stardust/80 text-base leading-[1.8] space-y-6">
          <p>
            In February 2025, I had the privilege of hosting my guide's guide :), <strong>Prof. Shayan
            Garani</strong>, for a research talk.
            Beyond the academic discussions, we took a short but memorable trip to <strong>Ujjain</strong>,
            exploring its rich cultural and spiritual heritage.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            <figure className="rounded-xl overflow-hidden border border-stardust/10 bg-surface group relative">
              <img onClick={() => setLightboxIndex(0)} src="/images/iisc_prof_1_thumb.webp" alt="Harsh with Prof. Shayan Garani" className="w-full h-auto cursor-pointer transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl" />
            </figure>
            <figure className="rounded-xl overflow-hidden border border-stardust/10 bg-surface group relative">
              <img onClick={() => setLightboxIndex(1)} src="/images/iisc_prof_2_thumb.webp" alt="Visit to Ujjain with Prof. Shayan Garani" className="w-full h-auto cursor-pointer transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl" />
            </figure>
            <figure className="rounded-xl overflow-hidden border border-stardust/10 bg-surface group relative">
              <img onClick={() => setLightboxIndex(2)} src="/images/iisc_prof_3_thumb.webp" alt="Memories from the Ujjain trip" className="w-full h-auto cursor-pointer transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl" />
            </figure>
          </div>

          <div className="mt-12 pt-8 border-t border-stardust/10 flex items-center gap-6">
            <button onClick={() => navigate(-1)} className="inline-flex items-center text-quantum hover:text-quantum-light transition-colors font-medium bg-transparent border-none shadow-none p-0 hover:bg-transparent hover:shadow-none hover:translate-y-0">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </button>
            <Link to="/" className="inline-flex items-center text-stardust/70 hover:text-stardust transition-colors font-medium">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Link>
          </div>
        </div>
      </div>
          <ImageLightbox 
        isOpen={lightboxIndex >= 0} 
        onClose={() => setLightboxIndex(-1)} 
        images={images}
        initialIndex={Math.max(0, lightboxIndex)}
      />
    </section>
  )
}
