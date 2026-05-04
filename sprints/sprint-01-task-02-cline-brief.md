# Sprint-01 Task #2 - 資料關聯語意與權重編輯 UI 改善 (CLINE integrator)

> 對應 sprint: `projects/ProjectLivingWorldSim/sprints/sprint-01.md` 任務 #2
> 前置交付: `projects/ProjectLivingWorldSim/app/`
> 本檔自包含。CLINE 用自己的 PLAN 模式決定實作細節；本檔只給 input、output、驗收條件與硬性技術約束。

# INPUT

## 1. Sprint 任務描述

任務：資料關聯語意與權重編輯 UI 改善

完成度判定方式：

- 活動頁不再讓玩家困惑地編輯關聯地點。
- 活動的話題欄位改以「可能引出的話題」呈現。
- 玩家可以設定地點吸引力、活動基礎權重、話題出現權重。
- `simulation-loop` 會使用這些權重影響移動、活動與話題抽選。
- 反向：刪除或缺少權重欄位時不得造成模擬崩潰。
- 反向：舊存檔或舊種子資料可用預設權重補齊。

## 2. 使用者回饋

目前可玩版已成立，但使用者提出兩個 UX 問題：

1. 看不懂為什麼活動需要有「關聯地點」跟「關聯話題」，不確定這是否代表角色會持續聊下去。
2. 目前看不出來地點、活動、話題的選擇權重怎麼設置。

本任務目標是修正這兩個理解斷點，讓玩家知道資料關聯如何影響模擬。

## 3. 設計語意

第一版語意應調整為：

- 地點決定「這裡有哪些活動」。
- 活動決定「這個活動可能引出哪些話題」。
- 話題不是持續對話 thread，只是活動事件或互動事件可以抽到的內容素材。
- 持續對話、對話串、長期聊天狀態不屬於本任務。

範例：

```text
活動：喝咖啡
可能引出的話題：
- 咖啡口味
- 工作
- 天氣
```

事件可能顯示：

```text
Mina 在咖啡廳喝咖啡，順口提到了工作。
```

這不代表角色進入一段持續聊天，只代表該事件抽到「工作」作為話題素材。

## 4. 既有技術狀態

目前 app 位於：

```text
projects/ProjectLivingWorldSim/app/
```

目前已知結構：

- `src/models/types.ts`：domain model
- `src/models/seed-data.ts`：種子資料
- `src/engine/simulation-engine.ts`：tick 主循環
- `src/engine/action-resolver.ts`：候選行動生成與權重抽選
- `src/engine/personality-utils.ts`：MBTI 與 clamp
- `src/engine/event-generator.ts`：事件日誌產生
- `src/store/world-store.ts`：Zustand store + CRUD
- `src/components/LeftPanel.tsx`：左欄資料導覽
- `src/components/CenterPanel.tsx`：中欄編輯器
- `src/components/RightPanel.tsx`：右欄模擬控制與事件日誌

目前測試與 build 在 Codex 驗收時通過：

```text
npm test -> 19/19 passed
npm run build -> passed
```

## 5. 必要資料模型變更

可依實作風格調整命名，但必須覆蓋以下欄位。

### Location

新增：

```ts
visitWeight: number
```

語意：地點吸引力。影響角色移動到該地點的候選行動權重。

建議範圍：

```text
0-100
```

缺省值：

```text
50
```

### Activity

新增：

```ts
baseWeight: number
```

語意：活動基礎權重。影響角色在目前地點選擇此活動的候選行動權重。

建議範圍：

```text
0-100
```

缺省值：

```text
50
```

保留：

```ts
topicIds: string[]
```

但 UI 文案必須改成：

```text
可能引出的話題
```

活動頁不要再呈現「關聯地點」為主要編輯欄位。若保留內部 `locationIds` 作相容用途，UI 不應要求玩家在活動頁維護它；地點與活動的主要關係由 Location 的 `activityIds` 管理。

### Topic

新增：

```ts
baseWeight: number
```

語意：話題出現權重。影響從候選話題中抽到該話題的機率。

建議範圍：

```text
0-100
```

缺省值：

```text
50
```

## 6. UI 需求

### Location Editor

地點編輯器需要顯示：

- 地點名稱
- 吸引力
- 可用活動
- 包含物件

文案範例：

```text
吸引力
影響角色移動到這個地點的機率。
```

不需要長篇教學文字，但欄位名稱要能讓玩家理解。

### Activity Editor

活動編輯器需要顯示：

- 活動名稱
- 基礎權重
- 心情效果
- 精力效果
- 可能引出的話題

文案範例：

```text
基礎權重
影響角色在可用活動中選到此活動的機率。
```

```text
可能引出的話題
活動事件或共同活動事件可能抽到的話題素材。
```

不要再顯示「關聯地點」作為玩家主要編輯區塊。玩家若要設定某地點有哪些活動，應在地點頁操作「可用活動」。

### Topic Editor

話題編輯器需要顯示：

- 話題名稱
- 分類
- 情緒傾向
- 出現權重

文案範例：

```text
出現權重
影響此話題在活動或交談事件中被抽到的機率。
```

### RightPanel / Event Log

事件日誌或事件詳情需要讓玩家看出權重真的在影響選擇。

最小可接受做法：

- 事件詳情新增「選擇原因」或「權重摘要」欄位。
- 顯示該事件的基礎權重來源，例如：

```text
權重摘要：活動基礎權重 70，角色偏好 +10，隨機修正 +4
```

若完整 breakdown 太大，至少要顯示：

```text
權重摘要：本次活動受「活動基礎權重」與角色狀態影響。
```

但建議輸出可資料化的簡短摘要，不只 UI 硬寫。

## 7. 模擬規則要求

### 地點吸引力

角色產生移動候選行動時，目標地點的 `visitWeight` 必須影響候選行動 weight。

範例：

```text
移動候選 weight = 原本移動權重 + 地點吸引力修正 + 個性/精力/隨機修正
```

### 活動基礎權重

角色產生活動候選行動時，活動的 `baseWeight` 必須影響候選行動 weight。

範例：

```text
活動候選 weight = 活動基礎權重 + 角色個性/心情/話題偏好/隨機修正
```

### 話題出現權重

從 `activity.topicIds`、`action.topicIds`、角色偏好話題或全域話題中抽話題時，應使用 `topic.baseWeight` 做 weighted pick。

若話題缺少 `baseWeight`：

```text
使用 50
```

若所有候選話題權重都為 0：

```text
可退回平均隨機或不選話題，但不得崩潰。
```

### 權重缺省與相容

所有新增權重欄位都必須有防呆：

- 舊資料沒有 `visitWeight` 時，以 50 處理。
- 舊資料沒有 `baseWeight` 時，以 50 處理。
- UI 輸入超出 0-100 時 clamp 或阻止。
- import 舊 JSON 後仍可正常 tick。

## 8. 種子資料更新

種子資料需要加入可觀察的權重差異。

範例方向：

- 咖啡廳 `visitWeight` 高於公園。
- 喝咖啡 `baseWeight` 高於閱讀。
- 咖啡口味話題 `baseWeight` 高於冷門話題。

數值不必照範例，但需能讓人理解權重存在。

## 9. 不要動的東西

- 不要修改工作室層 `AGENTS.md`、`CLAUDE.md`、`doc/*-spec.md`。
- 不要修改 `projects/ProjectLivingWorldSim/doc/game-core.md`。
- 不要修改 `projects/ProjectLivingWorldSim/doc/systems/simulation-loop.md`，除非實作發現規格阻塞且先回報。
- 不要執行 git commit、push、reset、checkout、branch。
- 不要重做整個 UI 架構；在既有三欄工作台內改善。
- 不要新增後端、登入、雲端同步、Unity、3D 或圖片動畫實作。

# OUTPUT

## 10. 交付物

在既有 Web app 中完成以下交付：

- 地點吸引力欄位與 UI。
- 活動基礎權重欄位與 UI。
- 話題出現權重欄位與 UI。
- 活動頁文案改為「可能引出的話題」。
- 活動頁不再把「關聯地點」當成主要編輯欄位。
- 模擬引擎使用上述權重。
- 事件日誌或事件詳情呈現選擇原因 / 權重摘要。
- 種子資料補齊權重。
- 測試補齊或更新。

## 11. 驗收條件

### 正向

- 使用者能在地點編輯器設定吸引力。
- 使用者能在活動編輯器設定基礎權重。
- 使用者能在話題編輯器設定出現權重。
- 使用者在活動編輯器看到「可能引出的話題」，不再看到令人誤解的「關聯話題」。
- 使用者在活動編輯器不需要管理「關聯地點」。
- 地點頁仍可管理該地點有哪些活動。
- 高 `visitWeight` 地點會使移動候選行動 weight 較高。
- 高 `baseWeight` 活動會使活動候選行動 weight 較高。
- 高 `baseWeight` 話題會在 weighted topic pick 中較容易被抽到。
- 事件詳情或日誌可看到權重或選擇原因摘要。
- `npm test` 通過。
- `npm run build` 通過。

### 反向

- 舊資料缺少地點吸引力時，tick 不崩潰。
- 舊資料缺少活動基礎權重時，tick 不崩潰。
- 舊資料缺少話題出現權重時，tick 不崩潰。
- 權重為 0 時不造成 NaN 或抽選錯誤。
- 所有候選話題權重為 0 時不崩潰。
- 刪除話題後，活動的「可能引出的話題」不引用不存在項目造成崩潰。
- 權重輸入超過 0-100 時會被 clamp 或阻止。

## 12. 硬性約束

- Simulation engine 與 action resolver 的權重邏輯必須可測試，不要只藏在 React component。
- 權重摘要應來自資料或 engine 結果，不要只在 UI 寫固定說明假裝有權重。
- 新欄位必須 TypeScript 型別化。
- 不得破壞現有種子世界可直接 tick 的能力。
- 不得移除現有 import/export 功能。
- 不得改動 git 狀態。

## 13. 回報格式

完成後請回報：

- 啟動指令。
- 測試與 build 結果。
- 主要新增 / 修改檔案。
- 權重欄位如何影響 simulation 的摘要。
- UI 文案改了哪些。
- 尚未完成或有風險的項目。
