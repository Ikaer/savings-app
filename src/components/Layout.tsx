import Link from 'next/link';
import { useRouter } from 'next/router';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();

  const isActive = (path: string) => {
    return router.pathname.startsWith(path);
  };

  return (
    <div>
      <header className="header">
        <div className="container">
          <div className="header-content">
            <Link href="/savings" className="logo">
              Savings Tracker
            </Link>
            <nav className="nav">
              <Link
                href="/savings"
                className={`nav-link ${isActive('/savings') ? 'active' : ''}`}
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="main">
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  );
}
