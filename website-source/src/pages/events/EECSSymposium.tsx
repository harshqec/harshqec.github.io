import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, Home } from 'lucide-react'
import ImageLightbox from '../../components/ImageLightbox'

export default function EECSSymposium() {
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1)
  const images = [
    { src: '/images/eecs_symposium_2026_1_full.webp', alt: 'Symposium Session' },
    { src: '/images/eecs_symposium_2026_2_full.webp', alt: 'Symposium Session' }
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
          <h3 className="text-heading-m text-stardust mt-6 mb-2">EECS Symposium 2026</h3>
          <div className="text-quantum font-medium">March 11 - 12, 2026</div>
        </div>

        <div className="text-stardust/80 text-base leading-[1.8] space-y-6">
          <p>
            The <strong>EECS Symposium 2026</strong> was an exhilarating platform for sharing cutting-edge research and fostering academic collaboration. 
            It was a privilege to present my work and engage in thought-provoking discussions with fellow researchers and industry experts.
          </p>
          <p>
            The event provided a unique opportunity to:
          </p>
          <ul className="list-disc pl-5 space-y-3 mb-8">
            <li><strong>Share Research:</strong> Presented ongoing work in quantum computing, receiving valuable feedback from a diverse audience.</li>
            <li><strong>Exchange Ideas:</strong> Participated in interactive sessions that bridged various disciplines within Electrical Engineering and Computer Science.</li>
            <li><strong>Community Engagement:</strong> Connected with the vibrant research community at <strong>IISER Bhopal</strong>, exploring potential avenues for future collaboration.</li>
          </ul>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <figure className="rounded-xl overflow-hidden border border-stardust/10 bg-surface group relative">
              <img onClick={() => setLightboxIndex(0)} src="/images/eecs_symposium_2026_1_thumb.webp" alt="Symposium Session" className="w-full h-auto cursor-pointer transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl" />
            </figure>
            <figure className="rounded-xl overflow-hidden border border-stardust/10 bg-surface group relative">
              <img onClick={() => setLightboxIndex(1)} src="/images/eecs_symposium_2026_2_thumb.webp" alt="Symposium Session" className="w-full h-auto cursor-pointer transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl" />
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
