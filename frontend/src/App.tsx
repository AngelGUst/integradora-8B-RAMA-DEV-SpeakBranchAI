import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import SpeakingExercise from './components/speaking/SpeakingExercise';
import QuestionsPage from './pages/admin/QuestionsPage';

function App() {
  return (
    <Routes>
      <Route path="/"                  element={<LandingPage />} />
      <Route path="/speaking"          element={<SpeakingExercise />} />
      <Route path="/admin/questions"   element={<QuestionsPage />} />
      <Route path="*"                  element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
