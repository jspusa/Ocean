# 0.18.5 原生 GPU 與每幀負載修正

基線 `152a69c`（0.18.4），驗收規格 [PERFORMANCE-v0185-SPEC.md](parity/PERFORMANCE-v0185-SPEC.md)。使用者本輪要求改善電腦／手機卡頓並繼續自動畫質，沒有增加新內容或變更自由探索、指向／觸控選取。

## 原生 GPU 單變量驗證

Apple M3 Max、Chrome headless、ANGLE Metal；一次僅一個瀏覽器使用 GPU。真 `Renderer.render()`，固定礁景、時間、完整內容，僅切換新增的海床固定程式。ABBA 四段，各暖機 10 幀、完整 frame GPU query 25 次；基線／新版各 50 次。未使用逐 draw query 推算正常負載，也未使用 SwiftShader 數值當實機證據。

| 設定 | 0.18.4 GPU 中位時間 | 海床專用程式 | 實測改善 |
|---|---:|---:|---|
| 1440×900 CSS／DPR2，2880×1800 framebuffer，4x MSAA | 49.135ms | 23.120ms | 52.95% ★★★★★ |
| 390×844 CSS／DPR3 觸控模擬，585×1266 framebuffer，2x MSAA | 12.747ms | 7.911ms | 37.94% ★★★★☆ |

第二列仍使用同一台 M3 Max，並非實體手機測量；未量測整機瓦數、溫度或電池續航，不能把 GPU 時間降幅等同耗電降幅。

腳本 `tests/parity/native-gpu-performance.cjs`，完整樣本 `qa/parity/native-gpu-performance.json`（本機 QA，不納入發布檔）。相同 context 的繪製數、三角形數、MSAA、解析度相同，無 JS／GL error。原生海床 shader 算式不變，僅固定 uKind/uMat，讓編譯器去除無關分支；啟動編譯失敗會回到原有通用程式。

## 完整畫面與更新頻率

- 原生高解析度礁景完整 RGBA：桌機 20,736,000 渠道中 34 個相差 1；反向礁景 99 個相差 1；觸控礁景 1 個、反向 28 個相差 1。外海及海溝全渠道相同。最大差 1/255，沒有解析度／模型／抗鋸齒降級。
- 另一組跨版本的 11 個完整視角涵蓋礁、反向、外海、洞窟、遺址、海溝及直向；全部通過明示原生舍入界線，差異最多 3 個渠道、每渠道 1。幾何、繪製、上傳、MSAA、解析度相同。
- 原有嚴格零差值檢查第一次原生執行在桌機礁景得到 3 個渠道差 1，因此該嚴格執行並未通過。原生測試以明示 `--compiler-rounding` 驗收；既有預設仍要求逐位元組相同，未冒稱這批原生圖完全相同。
- 真 animate() 在受控 120Hz callback 排程：桌機／觸控的低、高畫質及首頁仍各渲染 120 幀；暫停、背景各 0。模擬時間與游泳位置和基線相同，沒有新增 FPS 上限。

## 連續運作與實際自動調節

`native-frame-performance.cjs` 使用真實 RAF、模擬與 WebGL，沒有 GPU timer；每設定 ABBA 四輪新 context，暖機2秒、量測10秒，自動比例關閉以固定解析度。生物正常游動。

| 同一電腦／同設定 | 0.18.4 平均 FPS（兩輪） | 0.18.5 平均 FPS（兩輪） | 穩定度 |
|---|---:|---:|---|
| 桌機2880×1800／4x MSAA | 18.77、18.40 | 38.40、38.20 | P95約66.7→33.4ms ★★★★☆ |
| 觸控模擬585×1266／2x MSAA | 60.00、60.00 | 60.00、60.00 | 維持60Hz上限，無FPS增益宣稱 ★★★ |

真實3840×2160 DPR2自動模式跑24秒，3771×2121依原控制器六次降至2413×1357；每次有效尺寸都符合比例，4x MSAA與quality2維持，970幀、無GL錯誤。這是自動模式調節驗證，未混入上表固定畫質收益。

## CPU 與自動畫質

| 修正 | 可重現證據 | 結果 |
|---|---|---|
| 自動比例套用在有效 framebuffer 上 | 3840×2160 DPR2 原本 .8／.64 被 8MP 上限抵消；scale1 3771×2121 保持，.8→3017×1697、.64→2413×1357 | 10/10 ★★★★★ |
| 指向先投影再檢查遮擋 | 20 隻附近魚、指向空白：LOS 40→0，畫布範圍讀取 20→1；762 個公開 pick UID 和舊版相同 | 9/9 ★★★★★ |
| 深淵固定路線邊界快取 | 9 隻真實 actor、四次 pose：包圍及障礙查詢各108→0；地板／屋頂972次保留，所有狀態相同；變動 context 不快取 | 13/13 ★★★★★ |
| 沒有食物及回游時略過無作用的食物掃描 | 301 隻編譯 life、四次 afterLife：traits1204→0、已隱藏粒子位置寫入192→0；餵食／回游／夥伴／觸碰結果相同 | 同上 ★★★★★ |

MSAA invalidate 的原生 ABBA 沒有可確認收益，已撤回；閉合岩背面剔除只分析，沒有發布。所有幾何與貼圖維持，pack-only 建置仍會重算發布 manifest。

## 重現命令

先將 0.18.4 的已發布來源與素材放在獨立目錄，以 :8766 服務，候選版本用 :8765。不要同時跑其他 GPU 測試。環境變數 `PLAYWRIGHT_PATH` 指向 Playwright；原生測試預設已安裝 Chrome，可用 `CHROME_PATH` 指定。

```sh
node tests/parity/adaptive-resolution.cjs
node tests/parity/selection-efficiency.cjs
node tests/parity/life-idle-efficiency.cjs
node tests/parity/native-gpu-performance.cjs http://127.0.0.1:8765/
node tests/parity/native-frame-performance.cjs
node tests/parity/native-adaptive-browser.cjs http://127.0.0.1:8765/
NATIVE_GPU=1 node tests/parity/quality-preserving-performance.cjs --original=http://127.0.0.1:8766/ --candidate=http://127.0.0.1:8765/ --same-geometry --compiler-rounding
```

## 最終回歸與建置

- `selection-current-browser.cjs`：桌機、390×844及844×390觸控共42項通過，真點擊／短點、遮擋、取消、拖曳、單搖桿與側邊資訊。最初fixture只前進100ms、未跨原120ms UI刷新間隔，以及誤期待已取消的第二搖桿，已修正測試，不改產品流程。
- `free-ocean-browser.cjs`：33項通過，包括真鍵盤／觸控、跨舊地圖邊界、保存並重載7000m游泳位置、外海鯨與深海燈光。
- 中央掃描65份CPU測試。第一次59份通過；本次新快取導致一項晚載入世界回歸，已修復並補可重現測試，`abyss-motion`9/9及807個體的`trajectory-efficiency`6/6通過。燈光舊fake renderer缺繼承而失敗，補正fixture後保留原6個數值斷言；離線包重建後商用包裝檢查通過。合計62份通過，下面3份歷史契約仍失敗。

| 歷史測試 | 基線152a69c與本版相同失敗原因 | 處理 |
|---|---|---|
| deepsea-lifecycle | 仍期待舊研究潛航器回收跳轉，0.16已改自由深海游泳 | 保留失敗紀錄 ★★☆ |
| expedition | 仍期待耗氧與缺氧回船，現行自由探索已移除 | 保留失敗紀錄 ★★☆ |
| story-preservation | 仍要求0.12虎鯨舊棲地，0.17已移到外海 | 保留失敗紀錄 ★★☆ |

以上三份未調整預期，不為了讓舊測試通過恢復已移除玩法。完整基線對照日誌保存於本機QA紀錄；這次不宣稱全歷史測試全綠。

`build.py --pack-only`已產生新版網頁與離線HTML。不同平台的gzip標頭使分區檔名重算；逐一確認177區解壓資料及其餘索引完全相同後，保留既有壓縮bytes／索引，避免要求玩家重下載未變的模型。重新計算281項發布manifest，幾何及素材未變。

## Standards

獨立審查未發現硬性規範違反；1項低優先維護性建議：三處固定shader組合列舉可於日後集中定義。本次保持小範圍熱路徑修改，沒有額外抽象或執行期編譯。

## Spec

獨立審查未發現規格缺口或越界；完整CPU回歸之後另針對晚載入世界的修復追審。發布驗證另以Pages狀態與公開281項SHA-256確認，不能只由本機建置推定線上成功。

程式規範軸：0硬性問題、1低優先建議；規格軸：0功能缺口。這份效能修正不是 Wii 完整內容／功能對等或攝影級擬真驗收。
