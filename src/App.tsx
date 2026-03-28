import { Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import HomePage from './pages/HomePage';
import ViewPage from './pages/ViewPage';

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:siteId" element={<ViewPage />} />
      </Routes>
    </MotionConfig>
  );
}
