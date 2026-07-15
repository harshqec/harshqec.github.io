import { Routes, Route } from 'react-router'
import Layout from './components/Layout'
import MainPage from './pages/MainPage'
import GuideVisit from './pages/events/GuideVisit'
import IIScFujitsu from './pages/events/IIScFujitsu'
import GianCourse from './pages/events/GianCourse'
import NPTELWorkshop from './pages/events/NPTELWorkshop'
import EECSSymposium from './pages/events/EECSSymposium'
import QuantumLab from './pages/lab/QuantumLab'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<MainPage />} />
        <Route path="/events/guide-visit" element={<GuideVisit />} />
        <Route path="/events/iisc-fujitsu" element={<IIScFujitsu />} />
        <Route path="/events/gian-course" element={<GianCourse />} />
        <Route path="/events/nptel-workshop" element={<NPTELWorkshop />} />
        <Route path="/events/eecs-symposium" element={<EECSSymposium />} />
      </Route>
      <Route path="/interactive-lab" element={<QuantumLab />} />
    </Routes>
  )
}
