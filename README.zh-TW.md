<p align="center">
  <br />
  <img src="./public/favicon.svg" alt="droplo logo" width="120" />
  <br />
</p>

<h1 align="center">droplo</h1>

<p align="center">
  <strong>拖曳上傳，幾秒內上線。最極致、最簡單的靜態網站託管平台。</strong>
</p>

<p align="center">
  <a href="./README.md">English</a> | <strong>繁體中文</strong>
</p>

<br />

## 🚀 什麼是 droplo？

Droplo 是專為開發者、設計師與任何人打造的**零設定**靜態網站託管服務。

忘記繁瑣的命令列 (CLI)、惱人的註冊表單、複雜的 Git 綁定與漫長的 CI/CD 設定吧！你只需要**將網頁資料夾（或 ZIP 檔）直接拖進瀏覽器**，幾秒鐘後，你就會得到一個全世界都能存取的專屬公開網址。

> **"Drop a folder. Get a URL. That's it."**

---

## ✨ 為什麼選擇 droplo？

* **⚡️ 荒謬的速度**：從拖拉放開到網站上線，只要 3 秒鐘。這絕對是全宇宙最快的部署方式。
* **🚫 零帳號門檻**：不需要註冊、不需綁定信用卡帳號、不用登入，打開網頁就能馬上使用。
* **📦 智慧結構解析**：無論你是上傳 `.zip`、巢狀資料夾，還是 React/Vue 建置後的 `dist` 資料夾，droplo 都會自動在裡面找出 `index.html` 的正確位置，並幫你打理好一切。
* **🎨 完美支援現代網頁**：精準支援超過 20+ 種 MIME 類型（HTML, CSS, JS, 字型, 影片, PDF 等），不破圖、不掉字。
* **🌙 極致的原生體驗**：由內而外精心雕琢的流暢 UI / 微動畫，內建深淺色主題無縫切換，並自動適配所有手機與平板裝置。

---

## 🎯 適合誰使用？

1. **🚀 獨立開發者 / 創客 (Indie Hackers)**：需要極速驗證點子、發布 Landing Page，不想在 DevOps 上浪費生命。
2. **🎨 網頁設計師**：不想碰 terminal 指令，只想快速把切好的 HTML/CSS 設計稿變成真實網址，一鍵發給客戶看。
3. **🎓 學生與教育機構**：繳交網頁作業、展示黑客松 (Hackathons) 成果，只需要把作品夾拖進去就搞定！
4. **📈 行銷與企劃人員**：需要機動上線活動促銷頁面 (Campaign Pages)，無需苦苦等待 IT 部門排程協助。

---

## 💻 魔法背後的黑科技 (Under the Hood)

為了讓前端操作像呼吸一樣自然，droplo 的背後採用了強大且現代化的無伺服器 (Serverless) 架構，確保你的網站在獲得極簡部署體驗的同時，也具備了企業級的乘載力與 CDN 全球加速。

* 前端介面搭載 **React 19 + Vite 8 + Tailwind CSS 4** 打造如絲般滑順的視覺體驗。
* 核心拖拉引擎結合 **Web File API (`webkitGetAsEntry`)** 與 **JSZip**，直接在瀏覽器端高效平行處理龐大的檔案樹與解壓縮工作。
* 雲端基礎建設深度整合 **Firebase 生態系 (Storage, Firestore, Cloud Functions, Hosting)**，每次存取皆可享有邊緣 CDN 級別的快取，保證毫秒級的載入速度。

---

## 🛠 深入開發 (For Developers)

Droplo 開源並歡迎開發者親自探索這套 Full-Stack 架構如何實作。你可以輕鬆在本地建立起這個一鍵部署平台。

### 開發環境啟動

```bash
# 1. 複製專案
git clone https://github.com/your-username/droplo.git
cd droplo

# 2. 安裝依賴 (包含前端與 Cloud Functions)
npm install
cd functions && npm install && cd ..

# 3. 複製環境變數範本並填寫你的 Firebase 參數
cp .env.example .env.local

# 4. 啟動 Firebase Emulators 與 Vite 開發伺服器
firebase emulators:start
npm run dev
```

> **安全機制：** 在開發模式下 (`import.meta.env.DEV`)，前端會自動阻斷真實雲端連線並轉向本地端 Emulators，確保不污染 Production 資料。

### 架構與部署指南
* **前端上傳邏輯**：主要實作於 `src/lib/upload.js` (負責並發處理與路徑解析)。
* **動態路由代理**：位於 `functions/index.js`，實作了如何快速擷取 Storage 站點資料並藉由 CDN 送出。
* **部署站台**：執行 `./deploy.sh` (請先參考 `deploy.example.sh` 修改 target 設定)，一鍵部署你的私有化 Droplo 服務！

---

## 📄 License

MIT License
