import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, Home } from 'lucide-react'
import ImageLightbox from '../../components/ImageLightbox'

export default function GianCourse() {
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1)
  const images = [1,2,3,4,5,6,7,8].map(num => ({ src: `/images/dharwad_${num}_full.webp`, alt: `GIAN Course Session ${num}` }));

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
          <h3 className="text-heading-m text-stardust mt-6 mb-2">GIAN Course on Sparse Graphs</h3>
          <div className="text-quantum font-medium">February - March 2025</div>
        </div>

        <div className="text-stardust/80 text-base leading-[1.8] space-y-6">
          <p>
            I participated in the GIAN course on <strong>"Sparse Graphs: Treewidth, Planarity, and Bounded
            Expansion"</strong> hosted at <strong>IIT Dharwad</strong>.
            The course was conducted in an intensive offline mode, featuring 24 hours of lectures and 24
            hours of hands-on tutorials.
          </p>
          <p>
            The curriculum delved into fundamental structural properties of sparse graphs, including planar
            graphs, minor-closed classes, and the theory of bounded expansion.
            It was a valuable experience for understanding how these structural insights lead to efficient
            algorithms for complex computational problems.
          </p>

          <div className="flex flex-wrap gap-4 mt-8">
            <a href="https://sites.google.com/view/giansparsegraph/home" target="_blank"
                rel="noopener noreferrer" className="inline-flex items-center px-6 py-3 border border-stardust/20 text-stardust font-medium rounded-lg hover:border-quantum transition-all duration-250">
              Official Course Website &rarr;
            </a>
            <a href="https://drive.google.com/file/d/1Uiwsxf7RkPkT-EuO7UCnKHP1-3RwETX2/view?pli=1" target="_blank"
                rel="noopener noreferrer" className="inline-flex items-center px-6 py-3 bg-quantum text-stardust font-medium rounded-lg hover:bg-quantum-light transition-all duration-250">
              View Certificate &rarr;
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 mb-12">
            <div className="p-6 rounded-2xl border border-stardust/10 bg-surface">
              <h4 className="text-quantum font-semibold mb-4">Syllabus Highlights</h4>
              <ul className="list-disc pl-5 space-y-2 text-stardust/80">
                <li>Treewidth and Tree-decompositions</li>
                <li>Planar Graphs and Euler's Formula</li>
                <li>Minor-closed Graph Classes</li>
                <li>Bounded Expansion and Shallow Minors</li>
              </ul>
            </div>
            <div className="p-6 rounded-2xl border border-stardust/10 bg-surface">
              <h4 className="text-quantum font-semibold mb-4">Course Objectives</h4>
              <p className="text-stardust/80 mb-4">
                The primary goal was to teach fundamental properties of specialized graph classes and
                illustrate their utility through concrete algorithmic applications, bridging the gap between mathematical theory
                and practical computation.
              </p>
              <p className="text-stardust/80">Organized by <strong>Prof. Sagnik Sen</strong>.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
            {[1,2,3,4,5,6,7,8].map((num) => (
              <figure key={num} className="rounded-xl overflow-hidden border border-stardust/10 bg-surface group relative">
                <img onClick={() => setLightboxIndex(num - 1)} src={`/images/dharwad_${num}_thumb.webp`} alt={`GIAN Course Session ${num}`} className="w-full h-auto cursor-pointer transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl" />
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
