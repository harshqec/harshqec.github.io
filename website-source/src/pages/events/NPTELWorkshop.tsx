import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, Home } from 'lucide-react'
import ImageLightbox from '../../components/ImageLightbox'

export default function NPTELWorkshop() {
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1)
  const images = [
    ...[1,2,3,4].map(num => ({ src: `/images/nptel_2025_${num}_full.webp`, alt: `NPTEL 2025 Workshop ${num}` })),
    ...[1,2,3,4,5,6].map(num => ({ src: `/images/nptel_2024_${num}_full.webp`, alt: `NPTEL 2024 Workshop ${num}` }))
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
          <h3 className="text-heading-m text-stardust mt-6 mb-2">NPTEL Workshop: Hands-on Quantum Computing</h3>
          <div className="text-quantum font-medium">June 2024 & June 2025</div>
        </div>

        <div className="text-stardust/80 text-base leading-[1.8] space-y-6">
          <p>
            I had the pleasure of organizing and leading sessions at the <strong>NPTEL Workshop on Hands-on Programming for Quantum Computers</strong> held at <strong>IISER Bhopal</strong>. 
            Due to overwhelming interest, the workshop was conducted as an intensive 5-day program in both 2024 and 2025.
          </p>
          <p>My contributions included:</p>
          <ul className="list-disc pl-5 space-y-3 mb-8">
            <li><strong>Quantum Algorithms in Depth:</strong> Delivered comprehensive lectures and hands-on tutorials on core quantum algorithms using the <strong>PennyLane</strong> framework.</li>
            <li><strong>Cloud Infrastructure:</strong> Collaborated with colleagues to implement a custom cloud server API. This platform provided each participant with individual login credentials to access real-time updated materials and perform quantum simulations directly in the cloud.</li>
          </ul>

          <h4 className="text-xl font-semibold text-quantum mt-12 mb-4">2025 Edition Gallery</h4>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            {[1,2,3,4].map((num) => (
              <figure key={num} className="rounded-xl overflow-hidden border border-stardust/10 bg-surface group relative">
                <img onClick={() => setLightboxIndex(num - 1)} src={`/images/nptel_2025_${num}_thumb.webp`} alt={`NPTEL 2025 Workshop ${num}`} className="w-full h-auto cursor-pointer transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl" />
              </figure>
            ))}
          </div>

          <h4 className="text-xl font-semibold text-quantum mt-12 mb-4">2024 Edition Gallery</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map((num) => (
              <figure key={num} className="rounded-xl overflow-hidden border border-stardust/10 bg-surface group relative">
                <img onClick={() => setLightboxIndex(4 + num - 1)} src={`/images/nptel_2024_${num}_thumb.webp`} alt={`NPTEL 2024 Workshop ${num}`} className="w-full h-auto cursor-pointer transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl" />
              </figure>
            ))}
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
