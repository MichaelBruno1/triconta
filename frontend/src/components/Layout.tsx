import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, TrendingUp } from 'lucide-react';

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        padding: '0 20px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36,
            height: 36,
            background: 'linear-gradient(135deg, #14b8a6, #3b82f6)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
          }}>💰</div>
          <span style={{ fontWeight: 800, fontSize: '1.2rem' }} className="gradient-text">Triconta</span>
        </Link>
        <nav style={{ display: 'flex', gap: '4px' }}>
          <Link to="/" className="btn btn-ghost btn-icon" title="Grupos">
            <Home size={18} />
          </Link>
        </nav>
      </header>
      <main style={{ flex: 1, maxWidth: '900px', width: '100%', margin: '0 auto', padding: '24px 16px' }}>
        <Outlet />
      </main>
    </div>
  );
}
