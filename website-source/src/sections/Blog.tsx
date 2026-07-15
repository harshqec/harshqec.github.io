export default function Blog() {
  return (
    <section id="blog" className="bg-gradient-to-b from-space to-space-dark section-padding page-padding">
      <div className="max-w-[1100px] mx-auto flex flex-col items-center text-center py-16">
        <p className="text-caption text-quantum mb-4">BLOG</p>
        <h2 className="text-display-l text-stardust mb-6">Thoughts & Writings</h2>

        <div className="mt-10 glass-card rounded-3xl px-12 py-16 flex flex-col items-center max-w-[560px] w-full">
          {/* Animated pencil icon */}
          <div className="mb-6 relative w-16 h-16 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-quantum/10 animate-ping opacity-60" />
            <svg
              className="w-9 h-9 text-quantum relative z-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>

          <h3 className="text-heading-m text-stardust mb-3">Coming Soon</h3>
          <p className="text-base text-stardust/60 leading-relaxed">
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
