import PageLayout from '../components/PageLayout';

export default function PrivacyPage() {
  return (
    <PageLayout title="隱私政策">
      <p className="text-muted-foreground text-sm">最後更新：2026 年 3 月</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">1. 資料收集</h2>
      <p>我們透過 Firebase Anonymous Authentication 為每位使用者產生匿名識別碼（UID），不收集任何個人身份資訊。</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">2. 上傳內容</h2>
      <p>您上傳的檔案儲存於 Firebase Storage，相關 metadata（網站 ID、檔案數量、上傳時間）儲存於 Firebase Firestore。所有資料預設保留 7 天後自動清除。</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">3. Cookie</h2>
      <p>本服務使用 Firebase 所需的必要 Cookie 進行認證，不使用追蹤型 Cookie 或第三方分析工具。</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">4. 資料共享</h2>
      <p>我們不會將您的資料出售或分享給第三方。上傳的網站為公開存取，任何擁有連結的人皆可瀏覽。</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">5. 資料刪除</h2>
      <p>上傳的網站將於 7 天後自動刪除。如需提前刪除，請聯繫我們。</p>
    </PageLayout>
  );
}
