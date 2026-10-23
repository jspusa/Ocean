# 電腦與手機效能更新驗證

日期：2026-10-23。比較基準為 `948c046a67fb5b7c7b8f77466b4b24171e75be9d`（0.17）。本次只調整執行流程；編譯場景、物種、個體識別與保存格式沒有變更。

## 重現與修改

原版自動畫質需等 90 幀才判斷負載：在 5 FPS 下，三秒後仍完全沒有降載；解析度到 0.64 下限後不再降低特效。現在依有效遊玩時間建立至少六幀、1.2 秒的採樣視窗，先降解析度，再降即時特效等級。單次停頓不會觸發降級，穩定後逐步恢復；失敗的提升會回復並延長等待。手動模式和固定畫質量測保持鎖定。

原版在受控 120 Hz 回呼下，省電、細緻與首頁均繪製 120 幀。現在依遊玩狀態限制工作頻率，時間仍按真實經過時間累積，游泳不因降幀而變慢。互動船上場景維持最多 30 FPS；普通首頁最多 15 FPS。

靜態批次比較上次實際上傳的 Float32 資料，避免相同內容重複送往 GPU。可見性、陰影、場景物件移動與深海相對座標變更都會重新上傳；動態生物仍更新。快取最多約 439 KiB。手機均衡使用既有 FXAA，桌面均衡不再將不支援的 2× MSAA 自動升成 4×；手動細緻保留支援的 4×。

## 相同場景的工作量

真實 WebGL 渲染器，固定時間與鏡頭；省電畫質。桌面 CSS 1100×740／DPR 2，手機模擬 CSS 390×844／DPR 3。每項平台只與自己的原版比較。

| 指標 | 原版 | 修改後 |
| --- | ---: | ---: |
| 120 Hz 下省電模式每秒繪圖 | 120 | 30 |
| 120 Hz 下細緻模式每秒繪圖 | 120 | 60 |
| 120 Hz 下普通首頁每秒繪圖 | 120 | 15 |
| 暫停／背景頁面繪圖 | 0 | 0 |
| 桌面珊瑚礁每幀 bufferSubData 次數 | 114 | 18 |
| 桌面珊瑚礁每幀上傳 bytes | 111,456 | 57,216 |
| 手機珊瑚礁每幀 bufferSubData 次數 | 51 | 16 |
| 手機珊瑚礁每幀上傳 bytes | 52,032 | 44,448 |

桌面珊瑚礁維持 1,077,042 三角形／120 draw calls；手機維持 352,378／57。外海與海溝也保留相同幾何與 draw calls。桌面均衡額外對照在同一 GPU 上從 4× MSAA 降為 FXAA，畫面尺寸與幾何不變。所有固定視角均無 WebGL 錯誤，桌面／手機珊瑚畫面已人工檢視。

## 回歸與限制

- 自動畫質 20/20：低幀率降載、下限切換特效、單次停頓、手動模式、量測鎖定、背景與首頁時間排除、失敗恢復退避；正式排程搭配 60／65／75／90／120／144 Hz 時間戳驗證畫質能恢復，沒有反覆升降。
- 渲染效率 10/10、地形 LOD 9/9、大型生物渲染 4/4。靜態資料失效情境與遠近切換保留。
- 效能瀏覽器腳本通過桌面／手機三個固定海域、均衡抗鋸齒配置、每秒繪圖上下限、暫停／背景及游泳速度檢查。一秒取樣內低／高畫質位移差約 2.3%，位於不同末幀時間邊界；未改變物理步長或速度。
- 自由海洋瀏覽器 33/33：桌面、手機直向與橫向；鍵盤、觸控、連續跨海域、7,000 m 存檔重載、大型生物及深海燈光。無 pageerror。
- 現行自由游泳、選取、水面操作、區域相機、攝影規則測試通過。額外執行的舊 `partner-follow.cjs` 在原版與新版均為 19 項 `OceanTrench is not defined`，輸出完全相同；是測試 fixture 未載入新地形依賴，未列為通過。

瀏覽器使用 Chromium／SwiftShader。手機為觸控模擬；工作量、模擬回呼頻率及 CPU 提交時間都不是實體裝置 FPS、GPU 執行時間或耗電量。不宣稱省電百分比或所有裝置穩定 30／60 FPS。新增快取也不會減少初次下載場景的大小。

## 重跑

```sh
python3 build.py --pack-only
python3 tests/parity/static_check.py
node tests/parity/adaptive-performance.cjs
node tests/parity/render-efficiency.cjs
node tests/parity/terrain-lod.cjs
node tests/parity/pelagic-rendering.cjs
python3 -m http.server 8000
# 另一終端；需安裝 Playwright，可用 PLAYWRIGHT_PATH 指定位置。
# 瀏覽器測試依序執行，避免爭用 GPU。
node tests/parity/runtime-performance.cjs --screenshots --out=qa/parity/performance-after.json
node tests/parity/free-ocean-browser.cjs http://127.0.0.1:8000/
```

本次原始資料在 `qa/parity/performance-baseline.json`、`performance-baseline-balanced-desktop.json` 與 `performance-after.json`，截圖為 `performance-desktop.png`、`performance-mobile.png`。QA 產物不隨網站發布。
