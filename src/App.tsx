import { Routes, Route, Link } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import Logo from './components/Logo';
import HomePage from './pages/HomePage';
import SitePage from './pages/SitePage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import SecurityPage from './pages/SecurityPage';
import StatusPage from './pages/StatusPage';

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="fixed top-6 left-6 z-[100] sm:top-8 sm:left-8 pointer-events-auto">
        <Link to="/" className="flex items-center gap-2.5 group outline-none select-none">
          <Logo className="w-8 h-8 sm:w-[38px] sm:h-[38px] text-foreground transition-transform duration-300 group-hover:scale-110 drop-shadow-sm" />
          <span className="font-black text-xl sm:text-2xl tracking-tighter text-foreground translate-y-[2px]">droplo</span>
        </Link>
      </div>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/:siteId" element={<SitePage />} />
      </Routes>
    </MotionConfig>
  );
}
