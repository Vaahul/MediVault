import Navbar from '../components/Navbar.jsx'
import Hero from '../components/Hero.jsx'
import Features from '../components/Features.jsx'
import HowItWorks from '../components/HowItWorks.jsx'
import UserRoles from '../components/UserRoles.jsx'
import FinalCTA from '../components/FinalCTA.jsx'
import Footer from '../components/Footer.jsx'

export default function Landingpage() {
  return (
    <div className="landing">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <UserRoles />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
