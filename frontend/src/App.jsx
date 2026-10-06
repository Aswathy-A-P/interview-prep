import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';

export default function App() {
  return (
    <main className="container">
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </main>
  );
}
