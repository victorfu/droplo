import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import Footer from './Footer';

export default function PageLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background bg-dot-pattern flex flex-col relative">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, hsl(252 87% 64% / 0.07), transparent)',
        }}
      />
      <ThemeToggle />
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 pt-20 sm:pt-32 pb-8 sm:pb-16">
        <div className="w-full max-w-2xl">
          <Link to="/" className="text-sm text-accent hover:text-accent/80 transition-colors mb-6 inline-block">
            &larr; 返回首頁
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">{title}</h1>
          <div className="prose prose-sm text-foreground/90 space-y-4">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
