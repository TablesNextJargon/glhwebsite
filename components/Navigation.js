import Link from 'next/link';
import { useRouter } from 'next/router';

const links = [
  { href: '/', label: 'Home' },
  { href: '/concerts', label: 'Concerts' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' }
];

export default function Navigation() {
  const router = useRouter();
  return (
    <nav aria-label="Primary" style={{
      backgroundColor: 'var(--nav-bg)',
      padding: '0.5rem',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'center',
        columnGap: '1.5rem',
        rowGap: '0.5rem',
        flexWrap: 'wrap'
      }}>
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`nav-link${router.pathname === href ? ' active' : ''}`}
            aria-current={router.pathname === href ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}