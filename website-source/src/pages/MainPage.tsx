import Hero from '../sections/Hero'
import LatestUpdates from '../sections/LatestUpdates'
import About from '../sections/About'
import Events from '../sections/Events'
import Research from '../sections/Research'
import InteractiveLab from '../sections/InteractiveLab'
import Blog from '../sections/Blog'
import Contact from '../sections/Contact'

export default function MainPage() {
  return (
    <main>
      <Hero />
      <LatestUpdates />
      <About />
      <Events />
      <Research />
      <InteractiveLab />
      <Blog />
      <Contact />
    </main>
  )
}
