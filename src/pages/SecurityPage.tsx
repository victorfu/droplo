import PageLayout from '../components/PageLayout';
import { Shield, Lock, FileCheck, Server } from 'lucide-react';

function SecurityItem({ icon: Icon, title, description }: { icon: typeof Shield; title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <PageLayout title="安全性">
      <p>Droplo 採用多層安全防護機制，確保平台與使用者資料的安全。</p>

      <div className="space-y-6 mt-6">
        <SecurityItem
          icon={Shield}
          title="身份驗證"
          description="所有上傳操作皆需通過 Firebase Authentication，確保每筆資料都可追溯。"
        />
        <SecurityItem
          icon={Lock}
          title="存取控制"
          description="Firebase Security Rules 嚴格限制資料存取：寫入需認證、檔案不可覆蓋、單檔上限 10MB。"
        />
        <SecurityItem
          icon={FileCheck}
          title="檔案驗證"
          description="僅允許上傳靜態網頁資源（31 種副檔名白名單），自動過濾危險檔案類型。"
        />
        <SecurityItem
          icon={Server}
          title="內容安全"
          description="所有回應皆包含安全標頭（CSP、X-Content-Type-Options、X-Frame-Options），防止 XSS 和點擊劫持。"
        />
      </div>

      <h2 className="text-lg font-semibold text-foreground mt-8">回報安全問題</h2>
      <p>如果您發現任何安全漏洞，請透過 GitHub Issues 回報，我們會盡速處理。</p>
    </PageLayout>
  );
}
