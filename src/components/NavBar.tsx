import { Link } from "@tanstack/react-router";
import { InwiseLogo } from "@/components/InwiseLogo";

export function NavBar() {
  const navBase =
    "text-[12px] font-semibold uppercase tracking-[0.06em] transition-colors duration-150 hover:text-white whitespace-nowrap";
  const navInactive = `${navBase} text-white/60`;

  return (
    <header className="fixed top-0 left-0 right-0 z-[500000] bg-[#0c0c0c]/98 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <nav className="flex items-center gap-6 h-[60px] w-full text-white">
          <Link to="/" search={{ filter: undefined }} className="flex items-center">
            <InwiseLogo size="sm" />
          </Link>
          <Link to="/" search={{ filter: undefined }} className={navInactive}>Início</Link>
          <Link to="/" search={{ filter: 'movie' }} className={navInactive}>Filmes</Link>
          <Link to="/" search={{ filter: 'series' }} className={navInactive}>Séries</Link>
          <Link to="/" search={{ filter: 'top' }} className={navInactive}>Top IMDb</Link>
        </nav>
      </div>
    </header>
  );
}

export default NavBar;
