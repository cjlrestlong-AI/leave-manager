# 員工同事假期管理網站（leave-manager）

純前端實作的同事假期／休假管理工具。採用 **React 18 + Vite + TypeScript（strict）**，手寫 CSS 設計令牌（不使用 UI 框架），預設純本地儲存，可選接駁 **Supabase** 作雲端同步。

## 目錄結構

- `app/` — 前端源碼（Vite 專案）。開發與構建皆在此目錄內進行。
- `site/` — 生產構建產物（純靜態檔，可直接託管或部署至 GitHub Pages）。

## 本地開發

```bash
cd app
npm install
npm run dev       # 啟動開發伺服器
npm run build     # 構建至 ../site（輸出目錄依 vite.config.ts 設定）
npm run preview   # 本地預覽構建結果
npm test          # 執行單元測試（Vitest）
```

## 部署

`site/` 為純靜態檔，可上傳任意靜態託管服務（GitHub Pages、WorkBuddy 發布等）。`app/vite.config.ts` 已將 `base` 設為 `'./'`（相對路徑），便於以子路徑方式部署。

## 技術棧

React 18 · Vite 5 · TypeScript（strict）· Vitest · 手寫 CSS 設計令牌 · 可選 Supabase 雲端同步。

## 隱私與安全

- 預設所有資料僅儲存於瀏覽器本機（localStorage），不會上傳任何伺服器。
- 啟用 Supabase 雲端同步時，請於設定頁面自行填寫專屬 URL 與 anon key，並建議開啟 Row Level Security（RLS）。
- 本倉庫不含任何密鑰或個人資料；`.env` 等機敏檔已被 `.gitignore` 排除。

## 備註

本倉庫由 WorkBuddy 協助建立並推送。
