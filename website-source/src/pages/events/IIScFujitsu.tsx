import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, Home } from 'lucide-react'
import ImageLightbox from '../../components/ImageLightbox'

export default function IIScFujitsu() {
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1)
  const images = [
    { src: '/images/iisc_fujitsu_1_full.webp', alt: 'Harsh presenting his lightning talk' },
    { src: '/images/iisc_fujitsu_2_full.webp', alt: 'With colleague Mainak at the event' }
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
          <h3 className="text-heading-m text-stardust mt-6 mb-2">IISc Fujitsu Quantum Computing Workshop</h3>
          <div className="text-quantum font-medium">December 2025</div>
        </div>

        <div className="text-stardust/80 text-base leading-[1.8] space-y-6">
          <p>
            Participated in the <strong>IISc Fujitsu Quantum Computing Workshop</strong>, a collaborative
            event focused on the latest advancements in quantum hardware and software.
          </p>
          <p>
            I had the opportunity to present a <strong>Lightning Talk</strong> titled:
            <br/><em>"Fault-tolerance of [[6, 1, 3]] non-CSS code family generated using measurements on graph states"</em>.
            <br/>It was a pleasure to engage with experts from both academia and industry alongside my colleague
            <strong>Mainak Bhattacharyya</strong>.
          </p>

          <div className="flex gap-4 mt-8">
            <a href="https://mllab.csa.iisc.ac.in/fqc/talks.html#harsh_lightning" target="_blank"
                rel="noopener noreferrer" className="inline-flex items-center px-6 py-3 border border-stardust/20 text-stardust font-medium rounded-lg hover:border-quantum transition-all duration-250">
              View Official Abstract &rarr;
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <figure className="rounded-xl overflow-hidden border border-stardust/10 bg-surface group relative">
              <img onClick={() => setLightboxIndex(0)} src="/images/iisc_fujitsu_1_thumb.webp" alt="Harsh presenting his lightning talk" className="w-full h-auto cursor-pointer transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl" />
            </figure>
            <figure className="rounded-xl overflow-hidden border border-stardust/10 bg-surface group relative">
              <img onClick={() => setLightboxIndex(1)} src="/images/iisc_fujitsu_2_thumb.webp" alt="With colleague Mainak at the event" className="w-full h-auto cursor-pointer transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl" />
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
