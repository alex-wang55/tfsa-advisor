import { NavLink, Outlet } from 'react-router-dom'

export default function App() {
  return (
    <div className="app-shell">
      <nav className="app-nav">
        <span className="brand">📘 TFSA Teacher</span>
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/planner">TFSA Planner</NavLink>
        <NavLink to="/watchlist">Watchlist</NavLink>
        <NavLink to="/profile">Risk Profile</NavLink>
      </nav>
      <div className="disclaimer-banner">
        Educational tool only — not licensed financial or investment advice. Analysis is based on
        public market data and simple rules; always do your own research.
      </div>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
