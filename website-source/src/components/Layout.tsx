import { Outlet } from 'react-router'
import Navigation from '../sections/Navigation'
import Footer from '../sections/Footer'

export default function Layout() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <Navigation />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}
