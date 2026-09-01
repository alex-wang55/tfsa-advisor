import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import DashboardPage from './pages/Dashboard.tsx'
import StockDetailPage from './pages/StockDetail.tsx'
import TfsaPlannerPage from './pages/TfsaPlanner.tsx'
import RiskProfilePage from './pages/RiskProfile.tsx'
import WatchlistPage from './pages/Watchlist.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<DashboardPage />} />
          <Route path="stock/:ticker" element={<StockDetailPage />} />
          <Route path="planner" element={<TfsaPlannerPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="profile" element={<RiskProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
