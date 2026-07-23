import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HistoryView } from './views/HistoryView';
import { AddRefuelingView } from './views/AddRefuelingView';
import { EditRefuelingView } from './views/EditRefuelingView';
import { StatsView } from './views/StatsView';

export const App: React.FC = () => {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<HistoryView />} />
        <Route path="/add" element={<AddRefuelingView />} />
        <Route path="/edit/:id" element={<EditRefuelingView />} />
        <Route path="/stats" element={<StatsView />} />
      </Routes>
      <BottomNav />
    </Router>
  );
};

export default App;
