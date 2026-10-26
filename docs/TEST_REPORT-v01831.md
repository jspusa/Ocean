# 0.18.31 淺礁海葵材質效能

本輪處理普通游泳在淺礁特定位置的 GPU 峰值。新增一個有界、啟動時預編譯的 kind 3／material 3 fragment program；沿用完整原 vertex shader，只將片段著色器的兩個 selector 宣告改成常數。海葵的 77,760 個三角形、材質方程、擺動、陰影、解析度、品質設定及自動調整均未減量。編譯失敗時沿用原通用程式，影格內不重試編譯。

正式 engine SHA-256：`077165f02196c9085d0a6976f63a26c15ba615c43133a9b97fb9d44dbd046f0b`。共九個預編譯表面程式。完整商用目標仍在進行中。

## 診斷與候選選擇

[0.18.30 普通游泳診斷](parity/NATURAL-SWIM-v01830-DIAGNOSIS.md) 已在固定的空間帶重現完整 renderer GPU 峰值。本輪額外只量實際 sky 之後、水面之前的 opaque 區段：原生桌機正常去返各 30 秒，18／18 檢查、3,852 筆有效結果及一筆停止時 pending；所有 3,853 個 owned queries 清理成功，無 GL／page error。慢速帶去／返 opaque P95 分別 43.49／43.27 ms，三個空間帶均維持 scale 1、2560×1600。這個區段包含貼圖設定、instance upload 與 draw；不能稱純 fragment 時間，也不能與其他 scope 相加作成本比例。

海葵是該區域唯一 kind 3／material 3 批次。獨立候選實驗保留原 VS、只精簡 FS，確認同場景完整 GPU 區間與完整 RGBA；再將此方案加入正式路由。第一輪原型因延後的區塊回收改變駐留條件而中止，保留失敗收據；修正診斷準備，要求完整 keep 已載入、keep 外非固定區塊已正常回收且穩定後才量測。失敗輪不納入改善數字。

## 正式原生 GPU 與影像

`tests/parity/anemone-surface-browser.cjs` 使用正式連結程式，同一 context 只移除／恢復 `3:3` map entry，讓正式路由選原 fallback 或新程式。核對實際 attached VS／FS，固定相機、時間、完整駐留、品質、解析度、MSAA 與其餘工作量；ABBA 四區塊各 25 個完整 renderer queries。所有計時先於影像讀回。這是受控渲染證據，非自然串流、實體手機、遊玩 FPS 或耗電測量。

| 桌機場景，50 筆／模式 | 原 GPU 中位 ms | 新 GPU 中位 ms | 證據 |
|---|---:|---:|---|
| 原卡頓位置 | 46.890 | 11.484 | ★★★★★ 同 context 正式程式、RGBA 一致 |
| 近看海葵 | 24.845 | 9.813 | ★★★★★ 同 context 正式程式、RGBA 一致 |

桌機為 Apple M3 Max／原生 Chrome、2560×1600、quality 2、scale 1、MSAA 4。兩場景共 200 筆有效計時，六張完整 RGBA 零差異；draw、三角形、頂點與陰影提交一致，清理成功。時間差只代表這些固定條件，不外推所有畫面或硬體。

觸控模擬使用同一台 M3 Max、585×1266、quality 1、scale 1、MSAA 2，並非實體手機。200 筆計時均有效，六張 RGBA 完全一致，query／map／settings 清理成功。

| 觸控模擬場景，50 筆／模式 | 原 GPU 中位 ms | 新 GPU 中位 ms | 證據 |
|---|---:|---:|---|
| 原桌機卡頓位置 | 5.154 | 4.982 | ★☆☆☆☆ 此端海葵 drawCount=0，只是控制組 |
| 近看海葵 | 13.552 | 2.613 | ★★★★★ 實際 drawCount=1，RGBA 一致 |

完整成功時序的桌機 harness SHA 為 `329187` 開頭的保留快照；觸控成功版為 `5361bc2d` 開頭。後者修正測試失敗時的 partial 樣本與 query 還原，並將準備上限改為 120 秒真時間。首次觸控準備只允許 600 RAF，在高更新頻率下不夠等待正常五秒區塊回收與穩定期，因此未開始計時即失敗；此失敗保留為 `touch.json`，成功結果另存 `touch-v2.json`，未修改正式串流規則。

## 正常游泳

桌機正常開始後，用真實 W／S 操作各 30 秒、原時鐘／模擬／自然串流／自動畫質，16／16 檢查通過，3,899 筆 valid 及一筆停止時 pending 保留、清理成功。以下慢區以預先定義的 render-eye z∈[3.5,11.5) 選取。原版與新版是分開的自然操作診斷，並非固定負載 A/B；受控 A/B 證據見上節。

| 慢區完整 GPU P95 ms | 0.18.30 | 0.18.31 | 證據 |
|---|---:|---:|---|
| 桌機去程 | 57.299 | 13.972 | ★★★★☆ 兩次均 scale 1／2560×1600 |
| 桌機回程 | 58.779 | 18.248 | ★★★★☆ 原 scale 0.970，新 scale 1 |

新版去程／回程區間最大 GPU 時間為 15.248／19.137 ms，各 83／78 筆。這些是 GPU query 區間，非顯示器 FPS；沒有以此宣稱全部場景不卡頓。

觸控正常去返亦各 30 秒，16／16 檢查、3,915 valid 與一筆停止時 pending，GL／page errors 為零、所有 query 清理及方法還原成功。慢區去／返各 83 筆，GPU P95 為 7.758／7.114 ms，最大 8.598／13.349 ms；均 quality 1、scale 1、585×1266、MSAA 2。兩端所有選定空間帶的完整 render 均位於可信實際輸入窗內。觸控 stage 各有一筆按下前紀錄，沒有落入選定空間帶。兩端在泳程結束後的 settle 會降至 scale .935，不將整份 run 說成始終 scale 1。

## 影像矩陣與量化容差

預設 day 桌機／觸控、低品質 blue 桌機／觸控、預設品質 late 桌機／觸控，共六種配置、十二個場景、三十六張完整 RGBA。三十五張完全一致；唯一差異是桌機 quality 0／blue 近看海葵，1050×656 的 2,755,200 個通道中兩個 B 通道各差 1，比例 7.259e-7。回到 baseline 同圖像 hash；每張 dimensions／conditions／work 均相同，近景確實繪製海葵，六種配置清理全部成功。

這兩個微小差值先觸發原嚴格 exact FAIL，原收據 `desktop-low-blue.json` 與 hash 保留。經雙軸評估後，**先固定** accepted-with-tolerance-v1 政策，再完成全部四個追加配置：候選每張同時 max≤1 且不同通道比例≤1e-5；baseline repeat、未繪製控制、預設 day 維持 exact。完整 RGBA 無裁切、忽略通道或後處理；差異座標／兩值及每張 exact／accepted 標記均保留。新收據另存 `*-policy-v1.json`。不稱全部矩陣 exact，亦未證明差值的編譯器內部成因。

## 自動畫質與已知黑閃回歸

高 DPR 壓力流程完成 1,412 幀，quality 2／MSAA 4／adaptive=true／GL 0。scale 1→.935→.970 的改變瞬間保留可見畫面訊號（maxRGB 106／104），下一個完成幀分別更新至 3526×1983、3658×2057。這驗證已知 deferred-resize 黑閃回歸，沒有外推為所有顯示器、驅動或手機永遠無黑閃。

## 公開交付

公開網站已發布 0.18.31。GitHub Pages 對正式 runtime commit `094bbadbfd3a37c1ba9a1f0db71eefc55912435d` 回報 `built`，建置時間為 2026-10-26 21:55:38 UTC。正式 engine 與受控／自然測量使用的來源相同；manifest SHA-256 為 `622b5471cd4ebbf61f5475858cc7c746e79333f738d8eff87eef104f83d503c6`。

直接從 [公開網址](https://jspusa.github.io/Ocean/) 驗證全部 300 個 manifest 檔案 SHA-256，全部符合。桌機與觸控瀏覽器正常開始遊戲均通過：預設自動畫質、場景編譯與串流完成、九個表面程式無編譯失敗、44 種生物資料、自由探索模式、未自動開啟觀察焦點、GL 0、context 未遺失及操作介面位於可視範圍。觸控方向按鈕為 44×44 CSS px，搖桿為 88×88；觸控為桌機上的瀏覽器模擬，不是實體手機驗證，也不代表已逐一遇見全部生物。

公開入海收據為 `qa/parity/published-v0.18.31-delivery.json`，SHA-256 `7b571614d66d3d24b2e21ce59aa56b47c2973c028619e5b4c6e4b0bcd9c4cbfd`；三項檢查通過，errors 為空。桌機及觸控公開截圖已檢視，畫面與操作介面可見。完整發布證據另存本機 `qa/parity/v01831-anemone/public-release-receipt.json`。此後補寫交付紀錄的文件提交不改動上述 runtime 或 manifest。

## CPU 與審查

正式 Renderer→WebGL 契約先 RED 4／8，再 GREEN 8／8。覆蓋原 VS 與 selector-only FS、預編譯一次、交錯 draws 的 uniforms／samplers／instance 資料、未知組合 fallback、單一編譯失敗與資源清理。完整 CPU 104／104、打包後靜態 68／68 全部首次通過；opaque collector 外部 API fixtures 20 類通過。正式五行修改及測試已完成 AskMatt Spec／Standards 兩軸審查，未解項目各零；診斷工具、影像政策與已完成的受控／自然原始數據也經兩軸獨立核對，無未解項目。完整記錄見 [雙軸審查](parity/REVIEW-v01831.md)。

原始資料：`qa/parity/v01831-anemone/`；原型及 opaque 診斷：`qa/parity/v01830-natural-swim/`。以上 QA 目錄不隨公開網站發布。
