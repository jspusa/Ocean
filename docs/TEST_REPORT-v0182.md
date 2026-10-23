# 0.18.2 GPU 表面繪製優化

日期：2026-10-23。比較基準 `9390a238fc8391d881baa463d0d894d22d1a019c`（0.18.1）。使用者仍回報卡頓，因此本版量測實際 GPU，不沿用前版隔離繪圖的 CPU 結果作為流暢度證據。

## 修改與診斷

在 Chromium／ANGLE SwiftShader 的固定淺礁視角，逐繪圖階段的 GPU timer query 顯示約 98% 的繪圖時間位於海底物件主繪製；資料上傳呼叫沒有相稱的 CPU 等待。主要成本為岩石、珊瑚及礁魚，因而先處理共用大型著色程式的分支成本。

僅為 `(kind, material)` 的 `(0,2)`、`(0,3)`、`(1,6)` 預先編譯三個有界程式。頂點及片段原始碼只把既有 `uKind`、`uMat` 的整數 uniform 宣告換成相同整數常數，其他運算與遠近漸變 discard 原封保留，讓編譯器刪除不適用的分支。每個程式各自初始化當幀共用、物種及 LOD 參數，交錯繪製仍保持原順序；沒有逐物件或逐幀編譯。個別程式編譯失敗時，該組繼續使用原程式，失敗的暫存 GL 資源會釋放，也不會每幀重試。

沒有減少模型、魚群、貼圖解析度、光影、抗鋸齒或更新頻率。附近地圖的必要載入、48 m 預載、128 m 保留範圍及原有方向預測均未修改。原始場景壓縮檔 SHA-256 仍為 `719cee472608b570784271d4004ea47cf3d5c4427eff84d86d00bed72f6d96a6`。

## GPU 計時方法

`surface-gpu-browser.cjs` 在同一 WebGL context，交替使用正式三程式路徑與原程式回退，固定完整淺礁內容、時間與相機；等待已請求的地圖預載全部完成，兩條路徑各暖機一次，再取三輪交替先後的完整影格 `EXT_disjoint_timer_query_webgl2` 中位數。每次讀取完整 RGBA，要求影像及幾何、繪製、陰影數一致；排除 disjoint 樣本。沒有略過繪圖或替換成 spy，計時也沒有納入初次程式編譯成本。解析度皆為 320×240，桌面高畫質及觸控平衡畫質在此實作均保留 4× MSAA。

| 完整影格 GPU，中位 ms | 原程式 | 三個固定程式 | 減少 |
| --- | ---: | ---: | ---: |
| 桌面高畫質 | 9,253.909 | 5,947.259 | 35.7% |
| 觸控平衡畫質 | 7,383.072 | 4,537.389 | 38.5% |

12 個計時樣本全部非 disjoint、零 GL／pageerror、完整 RGBA 差異為 0。每個配置六個影格的幾何及繪製量一致：桌面 1,316,975 個三角形／139 draw／5 個動態陰影 draw，觸控 1,071,909／128／5；沒有把少畫物件當作提升。

這是 SwiftShader 軟體 GPU 的相對結果，並非實體手機／電腦的 FPS、耗電或普遍流暢度驗收。軟體 GPU 的完整影格仍為秒級；成功 compile/link 也不保證所有驅動程式都已完成首次 draw 的延遲編譯。三個額外程式的儲存與啟動成本是本次減少持續繪圖運算的取捨。

## 畫面與回歸

`quality-preserving-performance.cjs --same-geometry` 比較 0.18.1 與本版，桌面／觸控共 **11 個完整內容視角逐 RGBA 位元組相同**：淺礁、外海、7,000 m 海溝、洞窟、遺跡、反向、寬螢幕及直向。包含全部既有與新增礁魚，沒有隱藏內容。解析度、體積光尺寸、4× MSAA、三角形、draw／陰影／上傳次數與位元組完全相同，零 GL／pageerror。程式分開初始化後，淺礁 uniform 呼叫由桌面 253 → 288、觸控 246 → 282；不將較少 API 呼叫當成 GPU 改善條件。

實際 `animate()` 的受控 120 Hz 回呼保留低／高畫質及首頁每 120 回呼渲染 120 次，暫停／背景為 0，模擬時間與游泳位置相同。此項使用 render spy，只驗證排程沒有新增限幀；GPU 計時另由真正 WebGL 測試取得。

新增程式狀態檢查 5/5，覆蓋三程式上限、僅替換兩個常數、交錯回退、每次 draw 的有效 uniform／sampler／24-float instance 資料、下一幀物種／材質／畫質／燈光／深海原點修改，以及編譯／連結失敗清理。既有 render-state 5/5、uniform-submission 4/4、render-efficiency 10/10、pelagic-rendering 4/4、地圖串流 8/8 與四種礁魚檢查通過。

解除凍結後，桌面與觸控各完成六個真正 RAF／WebGL 影格，實際游泳各前進約 1.187 m，生物姿態持續改變；沒有 render spy 或強制幀時間，保持高畫質及 scale 1，零 GL／pageerror，context 未失效。這驗證連續渲染功能，不將軟體 GPU 的秒級回呼當成流暢度通過。

真實網路與 GL 資源的地圖往返檢查亦在桌面／觸控通過：啟動未請求整包場景；目的地未就緒時保留先前完整影像、暫停玩家及模擬時間；離開淺礁後各釋放 258 個遠方網格及其 VAO／buffer，保留生物與船的固定資源。返回後完整淺礁影像 SHA 相同，零 GL／pageerror。建置語法、版本、完整性清單與網站／離線 HTML 的 MIT 包裝檢查全部通過。

獨立 Standards 與 Spec 程式審查均未發現需處理的問題。完整 Wii 功能對等與實體裝置驗收維持原有未完成範圍。

## 重跑

```sh
python3 build.py --pack-only
python3 tests/parity/static_check.py
node tests/parity/surface-programs.cjs
# 在另一個工作目錄以 :8011 提供 0.18.1，比較版以 :8010 提供。
# Playwright 可透過 PLAYWRIGHT_PATH 指定；所有 WebGL 測試依序執行。
node tests/parity/quality-preserving-performance.cjs --original=http://127.0.0.1:8011/ --candidate=http://127.0.0.1:8010/ --same-geometry --baseline=qa/parity/quality-v0181.json --out=qa/parity/quality-surface-programs.json
node tests/parity/surface-gpu-browser.cjs http://127.0.0.1:8010/
node tests/parity/live-frame-smoke.cjs http://127.0.0.1:8010/
node tests/parity/scene-streaming-browser.cjs http://127.0.0.1:8010/
```

GPU 樣本、同 context 的逐像素斷言與環境記錄在 `qa/parity/surface-gpu-browser.json`；跨版本畫面比對在 `qa/parity/quality-surface-programs.json`。QA 大型影像資料不隨網站散布。
