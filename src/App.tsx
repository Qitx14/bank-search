import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import InstallGuide from './components/InstallGuide';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <BottomNav />
      <InstallGuide />
    </>
  );
}

export default App;
