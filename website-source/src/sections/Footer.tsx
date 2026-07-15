const footerLinks = [
  { label: 'About', href: '#about' },
  { label: 'Events', href: '#events' },
  { label: 'Research', href: '#research' },
  { label: 'Lab', href: '#lab' },
  { label: 'Blog', href: '#blog' },
  { label: 'Contact', href: '#contact' },
]

export default function Footer() {
  const scrollTo = (href: string) => {
    const el = document.querySelector(href)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <footer className="bg-space py-12 page-padding">
      <div className="max-w-[1100px] mx-auto flex flex-col items-center gap-6">
        <div className="flex flex-wrap items-center justify-center gap-6">
          {footerLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="text-caption text-silver hover:text-stardust transition-colors duration-200"
            >
              {link.label}
            </button>
          ))}
        </div>
        <p className="text-caption text-stardust/40">
          © 2026 Harsh. Designed for the Quantum era.
        </p>
      </div>
    </footer>
  )
}
