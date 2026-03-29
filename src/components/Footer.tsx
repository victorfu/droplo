import { Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border py-10 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start gap-8 sm:gap-12">
        {/* Branding */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground">Droplo</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
            拖曳即可上線的靜態網站託管平台
          </p>
        </div>

        {/* Links */}
        <div className="flex gap-12 sm:gap-16">
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">平台</h4>
            <ul className="space-y-2">
              <li><a href="/terms" className="text-sm text-foreground hover:text-accent transition-colors">服務條款</a></li>
              <li><a href="/privacy" className="text-sm text-foreground hover:text-accent transition-colors">隱私政策</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">信任</h4>
            <ul className="space-y-2">
              <li><a href="/security" className="text-sm text-foreground hover:text-accent transition-colors">安全性</a></li>
              <li><a href="/status" className="text-sm text-foreground hover:text-accent transition-colors">系統狀態</a></li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="sm:text-right">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Droplo
          </p>
        </div>
      </div>
    </footer>
  );
}
