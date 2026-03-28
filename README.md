# Droplo

**拖曳上傳，立即上線。**

Droplo 是一個零設定的靜態網站託管平台。將你的資料夾或 ZIP 檔拖進瀏覽器，幾秒內取得一個可分享的公開網址 — 不需要帳號、不需要 CLI、不需要任何設定。

> Drop a folder. Get a URL. That's it.

---

## Features

- **拖放即部署** — 拖曳資料夾或 `.zip` 檔案，自動偵測並上傳所有靜態資源
- **即時上線** — 上傳完成後立即取得公開網址，支援一鍵複製與直接開啟
- **零帳號門檻** — 不需要註冊、不需要登入，打開就能用
- **完整靜態支援** — HTML、CSS、JS、圖片、字型、影片、PDF 等 20+ 種 MIME types
- **智慧路徑解析** — 自動偵測 `index.html` 位置，支援巢狀資料夾結構
- **深色 / 淺色主題** — 自動偵測系統偏好，支援手動切換
- **行動裝置友善** — 響應式設計，手機平板都能操作
- **即時進度回饋** — 解壓縮、上傳、儲存三階段進度指示

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Routing | React Router 7 |
| Backend | Firebase Cloud Functions (Node.js 22) |
| Database | Cloud Firestore |
| Storage | Firebase Storage |
| Hosting | Firebase Hosting (CDN) |
| Icons | Lucide React |
| ZIP 處理 | JSZip |

## How It Works

```
使用者拖放資料夾 / ZIP
        │
        ▼
   前端解析檔案結構
   ├─ 資料夾 → WebKit File API 遞迴讀取
   └─ ZIP → JSZip 解壓縮
        │
        ▼
   驗證 index.html 存在
        │
        ▼
   產生唯一 Site ID (8 字元)
        │
        ▼
   並行上傳所有檔案至 Firebase Storage
   路徑: sites/{siteId}/{filePath}
        │
        ▼
   寫入 Firestore metadata
        │
        ▼
   回傳公開網址 → https://droplo.web.app/{siteId}
```

當使用者訪問網站時，Cloud Function `serveSite` 從 Storage 讀取檔案，設定正確的 `Content-Type` 並回應，搭配 1 小時的 CDN 快取。

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- 一個 Firebase 專案（啟用 Firestore、Storage、Hosting、Functions）

### 安裝

```bash
# Clone repo
git clone https://github.com/your-username/droplo.git
cd droplo

# 安裝前端依賴
npm install

# 安裝 Cloud Functions 依賴
cd functions && npm install && cd ..
```

### 環境變數

複製範本並填入你的 Firebase 設定：

```bash
cp .env.example .env.local
```

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

你可以在 [Firebase Console](https://console.firebase.google.com/) > 專案設定中找到這些值。

---

## Development

### 本地開發伺服器

```bash
npm run dev
```

啟動 Vite dev server（預設 `http://localhost:5173`）。開發模式下會自動連接 Firebase Emulators。

### Firebase Emulators

```bash
firebase emulators:start
```

| 服務 | Port |
|------|------|
| Emulator UI | `http://localhost:4000` |
| Firestore | `localhost:8080` |
| Functions | `localhost:5001` |
| Storage | `localhost:9199` |

開發模式下（`import.meta.env.DEV`），前端會自動切換至 emulator 連線，不會接觸到正式環境資料。Vite 的 dev proxy 也會將 `/s/*` 請求代理到本地 Functions emulator。

### 專案結構

```
droplo/
├── src/
│   ├── main.jsx                # React 進入點
│   ├── App.jsx                 # Router 設定
│   ├── index.css               # Tailwind + 主題變數
│   ├── pages/
│   │   ├── HomePage.jsx        # 首頁：拖放上傳介面
│   │   └── ViewPage.jsx        # 網站檢視頁（iframe）
│   ├── components/
│   │   ├── DropZone.jsx        # 拖放區域 UI
│   │   ├── SiteViewer.jsx      # iframe 網站渲染器
│   │   ├── UploadProgress.jsx  # 上傳進度指示器
│   │   ├── ResultCard.jsx      # 完成卡片（含分享連結）
│   │   ├── NotFound.jsx        # 404 頁面
│   │   └── ThemeToggle.jsx     # 深色/淺色切換
│   ├── hooks/
│   │   ├── useUpload.js        # 上傳狀態管理
│   │   └── useTheme.js         # 主題狀態管理
│   └── lib/
│       ├── firebase.js         # Firebase 初始化 + Emulator 連接
│       ├── firestore.js        # Firestore 查詢
│       ├── upload.js           # 上傳核心邏輯（資料夾/ZIP）
│       └── utils.js            # 工具函式（ID 產生、MIME types）
├── functions/
│   └── index.js                # serveSite Cloud Function
├── firebase.json               # Firebase 設定
├── firestore.rules             # Firestore 安全規則
├── storage.rules               # Storage 安全規則
└── vite.config.js              # Vite 設定（含 dev proxy）
```

### 核心模組說明

**上傳流程** ([src/lib/upload.js](src/lib/upload.js))

- `readDroppedFolder()` — 使用 WebKit `webkitGetAsEntry` API 遞迴讀取拖放的資料夾，自動過濾 `.DS_Store` 與 `__MACOSX`
- `uploadSite()` — 處理 ZIP 上傳：解壓縮 → 驗證 → 並行上傳 → 寫入 metadata
- `uploadFolder()` — 處理資料夾上傳：驗證 → 並行上傳 → 寫入 metadata
- `findPrefix()` — 智慧偵測 `index.html` 的相對路徑前綴，處理巢狀結構

**檔案服務** ([functions/index.js](functions/index.js))

- `serveSite` — Cloud Function，接收 `/s/{siteId}/{filePath}` 請求
- 從 Firebase Storage 讀取檔案，設定正確的 MIME type
- 預設回傳 `index.html`，搭配 `Cache-Control: public, max-age=3600`

**安全規則**

- Firestore：sites collection 允許公開讀取與建立，禁止修改與刪除
- Storage：sites 路徑下允許公開讀寫

---

## Deployment

### 建置前端

```bash
npm run build
```

產生最佳化的靜態檔案至 `dist/` 目錄。

### Firebase Hosting Target 設定

本專案使用 hosting target 而非硬編碼 site 名稱，避免將專案特定名稱提交至 git。

首次 clone 後，需要設定 hosting target：

```bash
# 1. 選擇你的 Firebase 專案
firebase use --add

# 2. 設定 hosting target（將 "your-site-name" 替換為你的 Firebase Hosting site 名稱）
firebase target:apply hosting app your-site-name
```

這會產生 `.firebaserc`（已被 `.gitignore` 排除），每個開發者可以指向自己的 Firebase 專案。

### 部署至 Firebase

```bash
# 部署全部（Hosting + Functions + Rules）
firebase deploy

# 或分別部署
firebase deploy --only hosting        # 前端
firebase deploy --only functions      # Cloud Functions
firebase deploy --only firestore      # Firestore 安全規則
firebase deploy --only storage        # Storage 安全規則
```

也可以使用專案提供的部署腳本（見下方）：

```bash
./deploy.sh          # 部署全部
./deploy.sh hosting  # 只部署前端
./deploy.sh functions # 只部署 Cloud Functions
```

> **注意：** `deploy.sh` 包含專案特定設定，不會提交至 git。請參考 `deploy.example.sh` 建立你自己的版本。

### Hosting 設定

Firebase Hosting 設定了兩條 rewrite 規則：

| 路徑 | 目標 | 用途 |
|------|------|------|
| `/s/**` | `serveSite` Cloud Function | 從 Storage 動態回傳使用者上傳的網站檔案 |
| `**` | `/index.html` | SPA fallback，讓 React Router 處理路由 |

Cloud Function 部署在 `asia-east1` 區域，最佳化亞太地區的存取延遲。

### 部署檢查清單

1. 確認 `.env.local` 中的 Firebase 設定正確
2. 設定 hosting target：`firebase target:apply hosting app <your-site-name>`
3. 確認 Firebase 專案已啟用 Firestore、Storage、Hosting、Functions
4. 執行 `npm run build` 確認前端建置成功
5. 執行 `firebase deploy` 或 `./deploy.sh` 部署所有服務
6. 訪問 `https://<your-site>.web.app` 確認正常運作

---

## License

MIT
