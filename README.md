<p align="center">
  <br />
  <img src="./public/favicon.svg" alt="droplo logo" width="120" />
  <br />
</p>

<h1 align="center">droplo</h1>

<p align="center">
  <strong>Drop a folder, get a URL. The fastest & simplest static site hosting platform.</strong>
</p>

<p align="center">
 <strong>English</strong> | <a href="./README.zh-TW.md">繁體中文</a>
</p>

<br />

## 🚀 What is droplo?

Droplo is a **zero-config** static website hosting service designed for developers, designers, and everyone in between.

Forget about tedious Command Line Interfaces (CLIs), annoying registration forms, complex Git integrations, and long CI/CD pipelines! Just **drag and drop your website folder (or ZIP file) straight into the browser**. Within seconds, you'll receive a dedicated public URL accessible from anywhere in the world.

> **"Drop a folder. Get a URL. That's it."**

---

## ✨ Why droplo?

* **⚡️ Ludicrous Speed**: From drag-and-drop to live online in just 3 seconds. It might just be the fastest deployment tool in the universe.
* **🚫 Zero Friction**: No sign-ups required, no credit cards to link, and absolutely no login walls. Open the page and start deploying immediately.
* **📦 Smart Structure Parsing**: Whether you upload a `.zip`, nested folders, or a compiled `dist` directory from React or Vue, droplo automatically detects the `index.html` and handles all routing magically.
* **🎨 Modern Web Ready**: Accurately supports 20+ MIME types (HTML, CSS, JS, Fonts, Videos, PDFs, etc.) ensuring your site renders flawlessly.
* **🌙 Ultimate Native Feel**: Polished UI with buttery smooth micro-animations, built-in seamless light/dark mode switching, and full responsiveness across mobile and tablet devices.

---

## 🎯 Who is this for?

1. **🚀 Indie Hackers & Creators**: For those who need to quickly validate ideas or launch landing pages without wasting precious hours on DevOps.
2. **🎨 Web Designers**: Skip the terminal setup and instantly turn polished HTML/CSS designs into live URLs to share directly with clients.
3. **🎓 Students & Education**: Perfect for submitting web development assignments, or presenting Hackathon outcomes. Just drop the project folder in and you're good to go.
4. **📈 Marketers & Planners**: Need to urgently publish a campaign page or targeted promotion? Get it live instantly without waiting for IT schedules.

---

## 💻 Under the Hood

To make the workflow feel as intuitive as breathing, droplo relies on a robust and modern Serverless architecture under the hood. This ensures that while you get an effortless deployment experience, your sites also achieve enterprise-grade scalability and global CDN availability.

* **Silky Smooth Frontend**: Built entirely on **React 19 + Vite 8 + Tailwind CSS 4**.
* **Browser-Native Parallel Engine**: Leverages the **Web File API (`webkitGetAsEntry`)** alongside **JSZip** to efficiently parse massive file trees and decompress assets via parallel execution directly in the browser window.
* **Firebase Ecosystem Integration**: Deeply integrated with **Storage, Firestore, Cloud Functions, and Hosting**. Every served site is edge CDN-cached, guaranteeing millisecond response times.

---

## 🛠 For Developers

Droplo is open-source! We welcome developers to explore how this full-stack architecture is implemented. You can easily build this one-click deployment platform locally.

### Local Environment Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-username/droplo.git
cd droplo

# 2. Install dependencies (Frontend & Cloud Functions)
npm install
cd functions && npm install && cd ..

# 3. Copy the environment variables template and fill in your Firebase params
cp .env.example .env.local

# 4. Start Firebase Emulators & Vite Dev Server
firebase emulators:start
npm run dev
```

> **Security Note:** In development mode (`import.meta.env.DEV`), the frontend automatically reroutes all backend traffic to the local Emulators, ensuring you never pollute Production data.

### Architecture & Deployment Guide
* **Frontend Upload Logic**: Primarily lives in `src/lib/upload.js` (Handles concurrency and path resolving).
* **Dynamic Route Proxying**: Found in `functions/index.js`, implementing rapid site asset fetching from Storage through the CDN.
* **Deploy Your Own Droplo**: Run `./deploy.sh` (Remember to tweak target settings using `deploy.example.sh` first) to deploy your very own private Droplo service!

---

## 📄 License

MIT License
