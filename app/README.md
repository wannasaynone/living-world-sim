# Living World Sim - 文字版可玩原型

一款以文字為第一呈現形式的模擬遊戲。玩家定義角色、話題、物件、地點與活動規則，觀察角色依照這些設定自由行動與互動，產生「自己創造了一個會自己運轉的小型社群」的觀察、編劇與意外感。

## 啟動方式

```bash
cd app
npm install
npm run dev
```

瀏覽器開啟 http://localhost:5173/

## 測試

```bash
cd app
npm test
```

## 專案結構

```
app/src/
├── models/           ← 純 TypeScript domain model
│   ├── types.ts         ← 所有介面定義
│   └── seed-data.ts     ← 種子資料（3角色/2地點/3物件/3活動/5話題）
├── engine/           ← 模擬引擎（與 React 無關，可獨立測試）
│   ├── simulation-engine.ts   ← tick 主循環
│   ├── action-resolver.ts     ← 候選行動 + 權重抽選
│   ├── personality-utils.ts   ← MBTI 標籤、情境修正
│   └── event-generator.ts     ← 產生 EventLogEntry
├── store/            ← Zustand 全域狀態
│   └── world-store.ts
├── components/       ← React UI
│   ├── LeftPanel.tsx      ← 世界資料導覽
│   ├── CenterPanel.tsx    ← 項目編輯器
│   └── RightPanel.tsx     ← 模擬控制 + 事件日誌
├── __tests__/        ← Vitest 測試
├── App.tsx           ← 三欄佈局 + TopBar
├── App.css           ← 全域樣式
├── main.tsx
└── index.css
```

## 技術選型

- TypeScript + React + Vite 6
- 狀態管理：Zustand
- 測試：Vitest
- 不依賴後端，純前端運行

## 功能

- ✅ 角色 / 地點 / 物件 / 活動 / 話題 CRUD
- ✅ 8 個人格傾向 slider (0-100) + MBTI 標籤
- ✅ Simulation tick 引擎（手動 / 自動播放）
- ✅ 權重抽選行動（受個性、狀態、關係影響）
- ✅ 事件日誌（含類型 badge + 詳情面板）
- ✅ 暫時情境修正（每 tick 倒數，到期移除）
- ✅ 防禦性處理（空世界不崩潰、刪除引用清理）
- ✅ 種子資料（開箱即可跑 tick）
- ✅ 匯入 / 匯出 / 重置世界