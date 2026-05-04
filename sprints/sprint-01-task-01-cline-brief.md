# Sprint-01 Task #1 - 文字版 Living World 可玩原型 (CLINE integrator)

> 對應 sprint: `projects/ProjectLivingWorldSim/sprints/sprint-01.md` 任務 #1
> 本檔自包含。CLINE 用自己的 PLAN 模式決定實作細節；本檔只給 input、output、驗收條件與硬性技術約束。

# INPUT

## 1. Sprint 任務描述

任務：文字版 Living World 可玩原型

完成度判定方式：

- 玩家可以建立角色、地點、物件、活動、話題。
- 角色可依 simulation-loop 規則手動推進 tick。
- 同地點角色有機會互動。
- 事件日誌會顯示時間、角色、地點、活動、物件、話題與結果。
- 反向：未填必要資料時不得造成模擬崩潰。
- 反向：沒有可用行動時角色產生待機事件。

## 2. 專案核心

Game Core：

因為玩家可以定義角色、話題、物件、地點與活動規則，並觀察角色依照這些設定自由行動與互動，產生「自己創造了一個會自己運轉的小型社群」的觀察、編劇與意外感。

第一版只要求文字版本可玩：

- 可以建立與編輯角色。
- 可以建立與編輯話題。
- 可以建立與編輯地點。
- 可以建立與編輯物件。
- 可以定義物件對應行動。
- 可以定義地點內含活動。
- 角色會自動選擇地點、活動、物件行動與互動對象。
- 系統會產生可閱讀的事件日誌。

第一版不要求：

- 角色立繪。
- 地點背景圖。
- 物件圖示。
- 動畫。
- 複雜 UI 演出。
- 即時 3D 或 2D 場景呈現。

核心循環：

```text
自訂內容 -> 自由模擬 -> 觀察事件
```

## 3. Simulation Loop 規格摘錄

每個模擬 tick 依序執行：

1. 推進世界時間。
2. 更新角色狀態與情境修正。
3. 為每個可行動角色建立候選行動清單。
4. 根據角色個性、偏好、狀態、地點、關係與隨機權重選擇行動。
5. 套用行動結果。
6. 產生事件日誌。
7. 等待下一個 tick。

角色候選行動來源：

- 角色自身可執行的基本行動。
- 目前地點提供的活動。
- 目前地點內物件提供的行動。
- 其他角色觸發的互動。

第一版基本行動：

- 前往某個地點。
- 參加目前地點的活動。
- 使用目前地點的物件。
- 與同地點角色交談。
- 暫時無事可做。

角色個性使用 8 個可讀數值表示：

- I：內向
- E：外向
- S：實感
- N：直覺
- T：思考
- F：情感
- J：判斷
- P：感知

每個數值為 0 到 100。系統顯示可以組合出 MBTI 標籤，但模擬判斷使用 8 個實際數值。

情境修正：

```text
基礎個性值 + 情境修正值 + 當前狀態影響
```

情境修正是暫時性的，不直接改寫基礎個性。第一版不處理永久人格成長。

事件日誌至少包含：

- 發生時間。
- 事件類型。
- 參與角色。
- 發生地點。
- 涉及物件。
- 涉及活動。
- 涉及話題。
- 顯示文字。
- 結果摘要。

事件資料預留視覺 cue 欄位：

- `portraitCueId`
- `locationImageCueId`
- `objectImageCueId`
- `animationCueId`
- `soundCueId`

第一版可以不使用這些欄位，但資料格式應允許未來加上演出層。

## 4. 建議技術方向

優先採用 Web App：

- 語言：`TypeScript`
- UI：`React`
- 建置：`Vite`
- 狀態管理：`Zustand` 或等效簡潔 store
- 本地儲存：`IndexedDB`，可用 `Dexie`；若時間不足，可先用 `localStorage`，但資料存取層需可替換
- 測試：`Vitest`

不做：

- 不做 Unity 版本。
- 不做後端。
- 不做登入。
- 不做雲端同步。
- 不做圖片與動畫實作。
- 不做多使用者協作。

## 5. 目標 UI / UX

第一版使用三欄式工作台。

左欄：世界資料導覽

- 角色
- 地點
- 物件
- 活動
- 話題
- 行動規則或資料關聯入口

中欄：目前選取項目編輯器

- 使用表單與選擇器，不要求玩家直接寫 JSON。
- 必填欄位缺失時顯示提示，不能讓模擬崩潰。
- 支援新增、編輯、刪除資料項。

右欄：模擬與事件日誌

- 顯示目前 tick / 世界時間。
- 提供「下一步」手動 tick。
- 提供「自動播放 / 暫停」。
- 顯示事件日誌列表。
- 點選事件可看到事件詳情。

上方可放世界名稱、存檔狀態、匯入、匯出。

## 6. 最小資料模型要求

可依實作需要調整命名，但必須覆蓋以下概念。

### Character

- `id`
- `name`
- `locationId`
- `personality`
  - `I`
  - `E`
  - `S`
  - `N`
  - `T`
  - `F`
  - `J`
  - `P`
- `temporaryModifiers`
- `mood`
- `energy`
- `currentActivityId`
- `recentCharacterId`
- `recentTopicId`
- `topicPreferences`
- `relationshipScores`
- `avatarAssetId`
- `animationProfileId`

### Location

- `id`
- `name`
- `activityIds`
- `objectIds`
- `backgroundAssetId`

### WorldObject

- `id`
- `name`
- `locationId`
- `actionIds`
- `imageAssetId`

### Activity

- `id`
- `name`
- `locationIds`
- `topicIds`
- `effect`
- `animationCueId`

### Topic

- `id`
- `name`
- `category`
- `moodTone`

### Action

- `id`
- `name`
- `sourceType`
- `sourceId`
- `effects`
- `topicIds`

### EventLogEntry

- `id`
- `tick`
- `timeLabel`
- `eventType`
- `characterIds`
- `locationId`
- `objectId`
- `activityId`
- `topicId`
- `displayText`
- `resultSummary`
- `portraitCueId`
- `locationImageCueId`
- `objectImageCueId`
- `animationCueId`
- `soundCueId`

## 7. 模擬行為要求

每次 tick：

- 世界時間增加。
- 每名角色嘗試產生一個行動。
- 若角色沒有所在地點，分配到第一個可用地點或產生可讀的待機事件。
- 若沒有任何地點，仍不得崩潰，產生系統提示事件。
- 若角色所在地點有活動，角色可選擇參加活動。
- 若角色所在地點有物件，角色可選擇使用物件行動。
- 若同地點有其他角色，角色可選擇交談或共同活動。
- 若沒有可用活動、物件或互動，角色產生待機事件。

行動選擇：

- 使用權重抽選，不固定選最高分。
- 權重至少受角色個性、角色狀態、地點、物件、話題、其他角色、隨機值影響。
- 個性只影響權重，不直接禁止行動。

MBTI 標籤：

- 依 I/E、S/N、T/F、J/P 四組較高者組合顯示。
- 若平手，可用任一側，但必須穩定且不造成錯誤。

暫時情境修正：

- 事件可加入暫時修正值與剩餘 tick。
- 每次 tick 後扣減剩餘 tick。
- 到期後移除。

## 8. 種子資料

需要提供可直接按下「下一步」看到結果的種子世界。

至少包含：

- 3 名角色。
- 2 個地點。
- 3 個物件。
- 3 個活動。
- 5 個話題。

種子資料不得寫死在模擬引擎內部；應經由初始化資料或 store 載入，方便未來替換。

## 9. 不要動的東西

- 不要修改工作室層 `AGENTS.md`、`CLAUDE.md`、`doc/*-spec.md`。
- 不要修改 `projects/ProjectLivingWorldSim/doc/game-core.md`。
- 不要修改 `projects/ProjectLivingWorldSim/doc/systems/simulation-loop.md`，除非實作過程發現規格有阻塞且先回報。
- 不要執行 git commit、push、reset、checkout、branch。

# OUTPUT

## 10. 交付物

交付一個可在本機啟動的文字版 Living World Web 原型。

必須包含：

- 可啟動的專案設定。
- 可閱讀的 README 或啟動方式說明。
- 三欄式 UI。
- 角色、地點、物件、活動、話題的 CRUD 或至少新增 / 編輯 / 刪除。
- Simulation tick 引擎。
- 手動 tick。
- 自動播放 / 暫停。
- 事件日誌。
- 種子資料。
- 基本測試或可重複驗證步驟。

## 11. 驗收條件

### 正向

- 使用者啟動 app 後，不需要手動寫資料即可用種子資料跑 tick。
- 使用者可以新增一名角色並設定 8 個人格傾向數值。
- 使用者可以新增地點，並讓角色移動或被分配到該地點。
- 使用者可以新增物件，並設定或關聯至少一種行動。
- 使用者可以新增活動，並關聯到地點。
- 使用者可以新增話題，並在互動事件中看到話題被使用。
- 點擊「下一步」會產生新的事件日誌。
- 開啟自動播放後，事件會持續產生；暫停後停止。
- 同地點至少兩名角色時，有機會產生交談或共同活動事件。
- 事件詳情中可以看到 tick、角色、地點、活動、物件、話題與結果摘要。

### 反向

- 沒有任何角色時，tick 不崩潰。
- 沒有任何地點時，tick 不崩潰。
- 角色缺少可用活動、物件或互動對象時，產生待機事件。
- 刪除地點後，引用該地點的角色不能造成崩潰。
- 刪除話題後，互動事件不能引用不存在的話題造成崩潰。
- 人格數值超出 0 到 100 時，UI 或資料層必須 clamp 或阻止輸入。

## 12. 硬性約束

- 程式碼必須以 TypeScript 型別描述核心 domain model。
- Simulation engine 必須與 React UI 可分離測試，不把全部邏輯塞在 component 內。
- 事件日誌必須是資料結果，不只是在 UI 中直接拼字串。
- 不使用 runtime 後端服務作為第一版必要依賴。
- 不引入重量級 3D / game engine。
- 不把圖片動畫做死；只保留 cue 欄位。
- 不改動 git 狀態。

## 13. 回報格式

完成後請回報：

- 啟動指令。
- 主要新增 / 修改檔案。
- 測試或驗證結果。
- 尚未完成或有風險的項目。
- 若技術選型與本 brief 不同，說明原因。
