import PageLayout from '../components/PageLayout';

export default function TermsPage() {
  return (
    <PageLayout title="服務條款">
      <p className="text-muted-foreground text-sm">最後更新：2026 年 3 月</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">1. 服務說明</h2>
      <p>Droplo 提供靜態網站託管服務，使用者可透過拖曳上傳方式將靜態網站部署至本平台。</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">2. 使用規範</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>僅限上傳靜態網頁資源（HTML、CSS、JavaScript、圖片、字型等）</li>
        <li>禁止上傳違法、惡意或侵權內容</li>
        <li>禁止用於釣魚網站、惡意軟體散佈等用途</li>
        <li>單一網站大小上限為 50MB，單檔上限為 10MB</li>
      </ul>

      <h2 className="text-lg font-semibold text-foreground mt-6">3. 內容保留</h2>
      <p>上傳的網站預設保留 7 天，到期後系統將自動清除。當儲存空間不足時，最舊的網站將優先被移除。</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">4. 免責聲明</h2>
      <p>本服務以「現狀」提供，不保證 100% 的可用性。我們保留隨時修改或終止服務的權利。</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">5. 條款變更</h2>
      <p>我們可能會不定期更新本條款，繼續使用本服務即表示您同意最新版本的條款。</p>
    </PageLayout>
  );
}
