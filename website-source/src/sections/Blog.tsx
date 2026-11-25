export default function Blog() {
  return (
    <section id="blog" className="bg-gradient-to-b from-white to-black section-padding page-padding">
      <div className="max-w-[1100px] mx-auto flex flex-col items-center text-center py-16">
        <h2 className="text-display-l text-black mb-6">Thoughts & Writings</h2>

        <div className="mt-8 px-12 py-12 flex flex-col items-center max-w-[560px] w-full">
          <div className="mb-6 w-40 h-16 flex items-center justify-center">
            <svg
              className="w-full h-full text-quantum"
              viewBox="0 0 160 64"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M34 46H126"
                pathLength="1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="1"
                strokeDashoffset="1"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  values="1;0;0;1;1"
                  keyTimes="0;0.45;0.5;0.95;1"
                  dur="4s"
                  repeatCount="indefinite"
                />
              </path>
              <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <animateMotion
                  path="M34 46L126 46L34 46"
                  keyPoints="0;0.5;0.5;1;1"
                  keyTimes="0;0.45;0.5;0.95;1"
                  calcMode="linear"
                  dur="4s"
                  repeatCount="indefinite"
                  rotate="auto"
                />
                <path d="M0 0L-5-5L-24-24L-29-19L-10 0L-5 5Z" fill="white" />
                <path d="M-10 0L0 0L-5 5Z" fill="currentColor" />
                <path d="M-24-24L-29-19" />
              </g>
            </svg>
          </div>

          <h3 className="text-heading-m text-stardust mb-3">Coming Soon</h3>
          <p className="text-base text-stardust leading-relaxed">
            I'll be sharing posts on quantum computing, research insights, and
            lessons from the lab. Stay tuned - something is brewing!
          </p>

          <div className="mt-8 flex items-center gap-2 text-caption text-quantum/70 tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-quantum animate-pulse inline-block" />
            In progress
          </div>
        </div>
      </div>
    </section>
  )
}
