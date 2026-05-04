# Sprint-01 Task #4 - 將人格機率定義移到地點、活動、物件、話題 (CLINE integrator)

> 對應 sprint: `projects/ProjectLivingWorldSim/sprints/sprint-01.md` 任務 #4
> 前置交付: `projects/ProjectLivingWorldSim/app/`
> 本檔自包含。CLINE 用自己的 PLAN 模式決定實作細節；本檔只給 input、output、驗收條件與硬性技術約束。

# INPUT

## 1. Sprint 任務描述

任務：將人格機率定義移到地點、活動、物件、話題

完成度判定方式：

- 地點、活動、物件、話題都可設定人格相性。
- 角色人格數值只作為權重計算來源。
- 移動、活動、物件行動與話題抽選會使用內容項目上的人格相性計算權重。
- 權重摘要會顯示來自內容相性的修正。
- 反向：缺少人格相性設定時使用中性預設，不得崩潰。
- 反向：人格相性不得變成硬限制。

## 2. 使用者回饋

使用者修正設計方向：

> 我要的是地點、活動、物件、話題的觸發，都與人格有關係，且是設置在地點、活動、物件、話題，角色身上的數值是計算權重源，也就是讓定義交給玩家，而不是我們定義。

這代表 Task #3 的固定人格行為映射方向需要被重構。

目前錯誤方向：

```text
系統固定定義：E 提高交談、S 提高物件、J 提高活動、P 提高移動。
```

目標方向：

```text
玩家在內容上定義：這個地點/活動/物件/話題比較容易吸引哪些人格傾向。
角色身上的 I/E/S/N/T/F/J/P 數值只是計算權重的輸入來源。
```

## 3. 設計原則

人格不直接定義「角色應該做什麼」，而是用來匹配內容項目的相性設定。

範例：

```text
地點：熱鬧咖啡廳
人格相性：
E +30
I -10

角色 A：E 90 / I 20
移動到熱鬧咖啡廳的權重提高。

角色 B：E 20 / I 90
移動到熱鬧咖啡廳的權重降低，但不禁止。
```

範例：

```text
話題：哲學
人格相性：
N +35
T +20

N/T 高的角色更容易在活動或交談中抽到這個話題。
```

這樣玩家可以定義自己的世界規則。例如玩家也可以把「健身房」設為 I 高、J 高才容易去，而不是由系統假設健身房一定偏 E 或 S。

## 4. 必要資料模型變更

新增共用人格相性型別。

建議命名：

```ts
export interface PersonalityAffinity {
  I: number;
  E: number;
  S: number;
  N: number;
  T: number;
  F: number;
  J: number;
  P: number;
}
```

建議範圍：

```text
-100 到 100
```

語意：

- `0`：中性，不因該人格傾向加減權重。
- 正數：角色該人格值越高，越提高此內容項目的觸發權重。
- 負數：角色該人格值越高，越降低此內容項目的觸發權重。

新增到以下模型：

```ts
Location.personalityAffinity?: PersonalityAffinity
Activity.personalityAffinity?: PersonalityAffinity
WorldObject.personalityAffinity?: PersonalityAffinity
Topic.personalityAffinity?: PersonalityAffinity
```

缺省值：

```text
全部 0
```

舊資料缺欄位時必須視為全部 0。

## 5. 權重計算要求

需要建立可測試 helper。

建議函式：

```ts
calculatePersonalityAffinityBonus(
  effectivePersonality: Personality,
  affinity?: Partial<PersonalityAffinity>
): { bonus: number; summary: string }
```

建議公式：

```text
traitCentered = (effectivePersonality[trait] - 50) / 50
traitBonus = traitCentered * affinity[trait]
bonus = sum(traitBonus for I/E/S/N/T/F/J/P)
```

說明：

- 角色人格值 50 表示中性，不提供正負修正。
- 角色人格值 100 且相性 +30 時，貢獻 +30。
- 角色人格值 0 且相性 +30 時，貢獻 -30。
- 角色人格值 100 且相性 -30 時，貢獻 -30。
- 最終候選行動仍需保留最低權重，例如 `Math.max(1, weight)`。

CLINE 可調整倍率，但必須保留：

- 相性設定在內容項目上。
- 角色人格是計算來源。
- 中性相性不影響權重。
- 相性不得成為硬限制。

## 6. 各內容項目的使用方式

### 地點 Location

用於移動候選。

```text
移動候選權重 = 地點吸引力 + Location.personalityAffinity bonus + 其他既有修正
```

權重摘要需顯示：

```text
地點吸引力 28.0、地點人格相性：E +24.0、I -8.0
```

### 活動 Activity

用於活動候選與共同活動候選。

```text
活動候選權重 = 活動基礎權重 + Activity.personalityAffinity bonus + 其他既有修正
```

權重摘要需顯示：

```text
活動基礎權重 42.0、活動人格相性：J +18.0、N +10.0
```

### 物件 WorldObject

用於物件行動候選。

```text
物件行動候選權重 = 物件/行動基礎權重 + WorldObject.personalityAffinity bonus + 其他既有修正
```

權重摘要需顯示：

```text
物件人格相性：S +22.0、P +8.0
```

第一版不要求 Action 自己也有人格相性；先放在 WorldObject 即可。

### 話題 Topic

用於話題抽選。

```text
話題抽選權重 = Topic.baseWeight + Topic.personalityAffinity bonus
```

`weightedPickTopic()` 需要能接收角色有效人格，或提供另一個人格化話題抽選函式。

權重摘要若事件有話題，需顯示話題相性，例如：

```text
話題人格相性：N +28.0、T +12.0
```

## 7. UI 需求

在以下編輯器新增「人格相性」區塊：

- Location Editor
- Activity Editor
- Object Editor
- Topic Editor

每個區塊需要顯示 8 個可編輯數值：

- I
- E
- S
- N
- T
- F
- J
- P

建議使用 slider 或 number input。

範圍：

```text
-100 到 100
```

文案建議：

```text
人格相性
設定哪些人格傾向更容易觸發這個項目。角色人格值只是計算來源；相性 0 表示中性。
```

不要把文案寫成固定人格解釋，例如：

```text
E 代表社交，所以提高交談。
```

應寫成玩家可定義語意：

```text
E +30 表示 E 較高的角色更容易觸發此項目。
E -30 表示 E 較高的角色較不容易觸發此項目。
```

## 8. 移除或弱化固定 MBTI 行為映射

Task #3 加入的固定映射需要調整。

不得再把以下規則作為主要機率來源：

- E 固定提高交談。
- S 固定提高物件。
- J 固定提高活動。
- P 固定提高移動。

可以保留少量全域 baseline 行為修正，但不得蓋過玩家在內容項目上的相性定義。建議本任務先移除固定人格映射，或只保留與角色狀態無關的中性 base weight。

驗收時會以內容項目的相性作為主要判斷：

```text
同一角色，目標地點 E 相性高者，移動候選權重較高。
同一角色，目標活動 J 相性高者，活動候選權重較高。
同一角色，目標物件 S 相性高者，物件候選權重較高。
同一角色，目標話題 N 相性高者，話題抽選權重較高。
```

## 9. 舊資料與防呆

必須支援舊資料：

- `personalityAffinity` 缺失時視為全部 0。
- `personalityAffinity` 缺少某些 trait 時該 trait 視為 0。
- 相性值超出 -100 到 100 時 clamp。
- 相性值為 NaN / Infinity 時視為 0 或 clamp 後不產生 NaN。
- 角色人格缺失時仍使用既有 `safePersonality()` 防呆。

Import 舊 JSON 後必須可以 tick。

## 10. 測試要求

需要新增或更新測試，至少覆蓋：

- `calculatePersonalityAffinityBonus()` 對正相性、負相性、中性相性的計算。
- 缺少 `personalityAffinity` 時 bonus 為 0。
- 缺少部分 trait 時不崩潰。
- 地點相性會影響移動候選權重。
- 活動相性會影響活動候選權重。
- 物件相性會影響物件行動候選權重。
- 話題相性會影響話題抽選權重。
- 權重摘要包含 `地點人格相性`、`活動人格相性`、`物件人格相性` 或 `話題人格相性`。
- 舊資料缺相性欄位仍可 build candidates / tick。
- 相性不得讓候選行動完全消失；最低權重仍保留。

測試應聚焦內容相性，不應再把「E 一定提高交談」這種固定 mapping 當主驗收。

## 11. 不要動的東西

- 不要修改工作室層 `AGENTS.md`、`CLAUDE.md`、`doc/*-spec.md`。
- 不要修改 `projects/ProjectLivingWorldSim/doc/game-core.md`。
- 不要修改 `projects/ProjectLivingWorldSim/doc/systems/simulation-loop.md`，除非實作發現規格阻塞且先回報。
- 不要執行 git commit、push、reset、checkout、branch。
- 不要重做整個 UI 架構；在既有三欄工作台內改善。
- 不要新增後端、登入、雲端同步、Unity、3D 或圖片動畫實作。

# OUTPUT

## 12. 交付物

在既有 Web app 中完成以下交付：

- `PersonalityAffinity` 型別或等效結構。
- Location / Activity / WorldObject / Topic 的人格相性欄位。
- 地點、活動、物件、話題編輯器的人格相性 UI。
- Engine 使用內容項目人格相性計算權重。
- 話題抽選使用 Topic 人格相性。
- 權重摘要顯示內容相性造成的修正。
- 移除或弱化固定 MBTI 行為映射。
- 種子資料補上可觀察的人格相性。
- 測試補齊。

## 13. 驗收條件

### 正向

- 玩家可以在地點上設定 I/E/S/N/T/F/J/P 相性。
- 玩家可以在活動上設定 I/E/S/N/T/F/J/P 相性。
- 玩家可以在物件上設定 I/E/S/N/T/F/J/P 相性。
- 玩家可以在話題上設定 I/E/S/N/T/F/J/P 相性。
- 同一角色面對兩個地點時，地點相性較符合角色人格者權重較高。
- 同一角色面對兩個活動時，活動相性較符合角色人格者權重較高。
- 同一角色面對兩個物件時，物件相性較符合角色人格者權重較高。
- 同一角色抽話題時，話題相性較符合角色人格者權重較高。
- 權重摘要能看出修正來自內容項目的人格相性。
- 角色人格值本身只作為計算來源，不再由系統固定解釋成某種行為偏好。
- `npm test` 通過。
- `npm run build` 通過。

### 反向

- 缺少人格相性欄位時不崩潰。
- 人格相性全為 0 時不改變既有 base weight。
- 人格相性為負值時只降低權重，不禁止行動。
- 人格相性值超出範圍時不造成 NaN 或崩潰。
- 舊存檔 import 後仍可 tick。
- 沒有地點、活動、物件或話題時仍依既有防呆產生事件或待機。

## 14. 硬性約束

- 玩家定義在內容項目上的人格相性必須是主要人格機率來源。
- 不得把 MBTI 四字母標籤當成計算來源；必須使用 8 個實際數值。
- 不得讓人格相性成為硬限制。
- `weightSummary` 必須反映實際計算。
- 權重計算 helper 必須可測試。
- 不得破壞現有地點吸引力、活動基礎權重、話題出現權重。
- 不得改動 git 狀態。

## 15. 回報格式

完成後請回報：

- 啟動指令。
- 測試與 build 結果。
- 主要新增 / 修改檔案。
- 人格相性的資料模型與計算公式。
- 地點、活動、物件、話題如何使用人格相性。
- UI 文案改了哪些。
- 是否移除或保留任何固定 MBTI 行為映射；若保留，說明為何不會蓋過玩家定義。
- 尚未完成或有風險的項目。
