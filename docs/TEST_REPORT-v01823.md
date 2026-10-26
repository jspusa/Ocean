# 0.18.23 游泳節奏與極深海運算驗證

基線 `dca9fdbeb77628ac83e079b6aca7704e2ad2bccd`；[規格](parity/FRAME-PACING-v01823-SPEC.md)、[雙軸審查](parity/REVIEW-v01823.md)。本輪最終本機驗證、公開靜態交付及相符正常操作均完成；完整內容、多人、公網及實體裝置驗收範圍保留。

## 本輪修正與 RED

正式 animate 邊界原本只容許 0.001 ms 的時間誤差；0.1 ms 量化的特定 60 Hz 相位會規律漏畫並誤觸畫質下降。改為有界 0.125 ms，沿原 deadline 相位前進，補幀仍採原始時間；沒有改變 120 Hz 物理、游泳速度、觀察計時或 FPS／P95／匯出資料。畫質回升另容許有界的量化及 Float32 精度誤差，原始慢幀平均值降級條件不變。

同一最終 cadence 套件套到舊程式為 11/16，候選 16/16。36 種 floor／nearest／ceil、相位及 ±0.025 ms jitter 組合通過；12 種 60–240 Hz 刷新率保持提交上限，60.01 Hz 30 秒提交 1,799 次，其餘 1,800 次。真正 40 ms 慢幀仍降級。這是 CPU 生產邊界時間模型，沒有宣稱在實體 60 Hz 螢幕重現。

| 定向時間模型 | 舊程式 | 候選 |
|---|---|---|
| 60 Hz／0.1 ms 量化，15 秒提交 | ★☆☆ 600 次 | ★★★ 900 次 |
| 同案例自動畫質 | ★☆☆ scale 0.64，6 次 resize | ★★★ scale 1，零 resize |
| 120 Hz 量化的實際提交間隔 | ★☆☆ 16.7／25／8.3 ms | ★★★ 16.6–16.7 ms |

陰影修正使用原有保守 sunless 判斷，整個可見範圍沒有太陽貢獻時省略靜態／動態太陽陰影 FBO 的綁定、清除及繪製；17 個 shader 字串不變。矩陣仍有效，深處的 force／dirty 及幾何失效留到第一個有日光的完成幀處理。有效 RED 包含深水仍畫 shadow，以及同格改 FOV 離開 sunless 時未重建靜態圖；最終 7/7。

舊 uniform fixture 未重製：先驗證恢復舊 shadow IO 的參考完整雜湊，再僅投影移除已驗證的深水 shadow rows，要求其他呼叫順序與數值完全相同。這是舊 CPU 契約相容證據，像素另由原生 GPU 驗證。

原始 RED、失敗修正嘗試、GREEN 均保留在 `qa/parity/v01823-*`。`cadence-rate-budgets-green.log` 雖名稱含 green，內容是失敗嘗試；正式結果採 `cadence-final.log` 及 `cadence-final-baseline-red.log`。

## 原生受控 GPU

同一台 Apple M3 Max、安裝版 Chrome、同一 GL context 與全部 linked programs，僅切換固定基線／候選的正式 Renderer prototype。先要求 15 個執行時 shader 字串與 surface generator 相同（獨立來源審查另核對含 RAY_VS／RAY_FS 的全部 17 個字串），沒有另編舊 program。固定時間 8、原畫質、scale 1、同幾何／生物／解析度；正式 loader 預載完整 keep set，穩定 550 ms 後量測。每場 ABBA 四塊，每塊 10 次暖機、25 次完整 render GPU query；每個版本每場 50 個原始樣本。所有場景計時完成後才 readPixels／存 PNG，回訪仍核對同內容與資源。

桌機 1440×900／DPR 2／quality 2；觸控 390×844／DPR 3／quality 1。兩組各六場、基線與候選共 24 張完整畫面，12 組 RGBA 逐 byte 全相等，GL error=0，page errors=[]。三個 sunless 場景候選 shadowDraws=0；正常礁區及返回礁區保留 5 次，900 m 場景保留 1 次。

| 場景 | 桌機 GPU 中位數：舊 → 新 | 觸控尺寸 GPU 中位數：舊 → 新 |
|---|---|---|
| 礁區 | ★☆☆ 21.636 → 23.480 ms（+8.52%） | ★☆☆ 4.987 → 5.021 ms（+0.68%） |
| 900 m 生物 | ★☆☆ 4.699 → 4.882 ms（+3.88%） | ★☆☆ 2.356 → 1.710 ms（-27.42%） |
| 海溝頭燈 | ★☆☆ 5.108 → 4.815 ms（-5.74%） | ★☆☆ 2.097 → 2.005 ms（-4.40%） |
| 海溝攝影 | ★☆☆ 5.019 → 5.375 ms（+7.08%） | ★☆☆ 2.266 → 1.650 ms（-27.19%） |
| 海溝關燈 | ★☆☆ 4.416 → 4.771 ms（+8.05%） | ★☆☆ 2.063 → 1.870 ms（-9.34%） |
| 返回礁區 | ★☆☆ 20.978 → 21.107 ms（+0.62%） | ★☆☆ 5.022 → 4.948 ms（-1.47%） |

表中一星表示單機受控計時證據，不是畫質評分；正值代表候選耗時增加。未修改工作量的 900 m 與礁區控制場景也有明顯波動，因此不能把各場差值都歸因於修正，更不能宣稱全面 GPU 加速。確定成果是有界排程回歸修復、sunless 的無效 shadow 工作減少，以及完整像素相同。此測試不代表自然串流、遊戲 FPS、實體手機或耗電。

受控測試啟動時頁面版本仍為 0.18.22，engine 請求固定替換為凍結候選（SHA-256 `77178955662197dcf622331f694f62a684b3b0f69fb47bc1d86835c41b112cfd`）；這是明示的原生 A/B 測試，正式 0.18.23 正常操作及公開發布另列。

完整樣本及圖像：`qa/parity/v01823-shadow-desktop/report.json`、`qa/parity/v01823-shadow-touch/report.json`；保留原始 /tmp 路徑，封存附 artifact-location.json，沒有重寫原報告。

## 最終正常操作與回歸

最終生產來源完成 96/96 套 CPU 回歸、服務 101/101、打包靜態 66/66。179 個場景 chunk 的長度及雜湊先核對再重用，沒有重新烘焙或削減場景。`qa/parity/v01823-final-cpu-results.json`、`v01823-all-server-tests.log`、`v01823-static.log`。

正常桌機／觸控節奏操作共 55/55：首頁、入海、游泳、轉向、暫停、恢復、返回及重載，自動畫質全程開啟，沒有自動中央魚名，GL error=0、errors=[]。短段 active-idle／swimming 提交約 59.87–59.94 次／秒、scale 1；原生 RAF 約 120 Hz。此數據限本機視角與短段期間，不代表普遍 60 FPS，也不代替 CPU 量化 60 Hz 負例。`qa/parity/v01823-render-cadence-browser.json`。

實際視窗 resize／觸控尺寸橫直切換、真正未完成地形請求，以及注入慢樣本觸發的畫質降級／回升皆保留上一完整畫面；下一成功 render 才更換尺寸，GL=0、context 未遺失。`qa/parity/v01823-resize-presentation.json` 及 `.log`。這是已知 resize 黑閃路徑的回歸，不能保證所有裝置或其他黑閃成因。

最終正常海溝流程：桌機 54/54、觸控 68/68，兩份 errors=[]、fatal=null、adaptive=true。實際路線到 7,000 m，六步部署／沿坡記錄／原獅子魚主動選取觀察／回收／回報，含中途重載接續。每端兩次回首頁的第一個完成 sunlit 幀都有 staticShadowUpdates 增量至少 1 且 shadowDraws>0；每個完成幀的四張光照矩陣合法，所有 deep shadow draws 為零。透明 observer 會有少量觀測成本，此流程不當效能計時。

原個體 `mariana_snailfish-001` 的真快門照片由正常相簿解碼為 JPEG，重載後再從首頁設定進相簿重開，SHA-256／bytes／寬高與原照相同；最後正常 start 再完成 30 個淺水遊玩幀。最終證據 `qa/parity/v01823-hadal-desktop-final/report.json`、`v01823-hadal-touch-final/report.json`，含原照與重載原照。初次桌機 53/53 只驗索引跨重載，另保留於 `v01823-hadal-desktop-initial`；獨立 Spec 審查提出此 P2 證據缺口後，補正常重開原圖並完整重跑兩端，沒有把初次結果當最終證據。

已驗證來源 SHA-256：

```text
src/app.js a51b8c93bf2001a225c52c123e6a6131367d6a4ea41e62c4eb2716e0c3f9dcd9
src/engine.js 77178955662197dcf622331f694f62a684b3b0f69fb47bc1d86835c41b112cfd
src/performance.js da009d80bac5d035e8d25d9fca535820b1f3c8f586df8a13c2880310e98c9cb0
tests/parity/hadal-investigation-browser.cjs 72329d6810e35d77ef16b011836cd018436288d19f43f63f72d6bf88e17b29ef
```

## 公開交付

程式提交 `a358dcd2c59746af7e2d60e1cefdf84d1219b335` 已推送 main；Pages 於 `2026-10-26T10:21:45Z` 回報該提交 built、error.message=null。`qa/parity/v01823-runtime-pages-build.json` 保留原始回覆。

| 公開驗證 | 結果與界線 |
|---|---|
| 發布內容 | ★★★ 294/294 長度與 SHA-256 相符，manifest 自身逐 byte 相同；`qa/parity/published-v0.18.23-delivery.json` |
| 預設入海 | ★★★ 桌機／觸控均 0.18.23、adaptive=true、quality 2／1、43 類圖鑑、compiled／streamed=true、8 個 surface programs、GL=0、context 未遺失、無自動中央焦點、errors=[] |
| 正常操作 | ★★★ 桌機／觸控共 55/55，原生入海／游泳／轉向／暫停／恢復／回首頁／重載；`qa/parity/v01823-public-render-cadence-browser.json` |
| 完整海溝 | ★★★ 正式網址觸控 68/68，包含 7,000 m 六步調查、原魚主動選取／真快門／重載後原 JPEG 相同、兩次首個 sunlit 恢復、重載後正常再入水；`qa/parity/v01823-public-hadal-touch/report.json` |

公開海溝的原圖及重載原圖逐 byte 相同，共 41,364 bytes，SHA-256 `03e55c3da37a88cf48ba498d5bf686fe79afd2600c3fb054bf58f6dd01a716ec`；errors=[]、fatal=null、adaptive=true。

公開測試直接使用正式網址，沒有請求替換或代用後端；觸控仍為同一台電腦模擬。公開多人端點仍為 null；沒有以本輪推論完整商用放行。

Manifest SHA-256：`619daa120077a047d51f563176c03247f267537d9624ce1a38bb457b020b98a9`。後續文件提交不改 runtime 或 manifest，指定文件提交的 Pages 建置與代表公開檔案另由 `qa/parity/v01823-final-delivery-receipt.json` 核對。

## 後續可見品質

本輪正常 UI 快門的獅子魚原圖可見大面積粉白，腹部與胸鰭的明暗層次偏弱；照片位於 `qa/parity/v01823-hadal-desktop-initial/report-hadal-photo.jpg`。自然粉白不是錯誤本身，下一輪應固定正常路線、相機距離、曝光與 LOD，區分模型、材質、頭燈及 tone map，再改善輪廓可讀性。既有 [生物參考](parity/TRENCH-FAUNA-REFERENCE.md) 已列透明組織表面近似的界線；完整商用目標保留此視覺工作。
