# 0.16 自由入海：驗證紀錄

驗證日期：2026-10-17。原有 0.15 驗證保留於 [前版報告](docs/TEST_REPORT-v015.md)。

## 完成的驗證

- 13 組 CPU 規則與幾何測試，共 147 項通過：自由游泳 9、連續海圖 6、大型生物 6、導航 6、深海與存檔 15、地形 LOD 9、海溝幾何 12、深海光照 6、深海動作 5、海溝生物 9、探索 32、選取 14、攝影 18。
- 瀏覽器整合 28 項通過：桌面 1100×740、手機直向 390×844、手機橫向 844×390；編譯場景、GL shader、極簡首頁／設定、一鍵入海、海圖不傳送、鍵盤／觸控、跨舊邊界、回首頁保存、重新載入 7000 m 續玩、大型生物與海溝畫面。沒有 pageerror 或 WebGL 錯誤。
- 介面另檢查 320×568 窄螢幕；首頁沒有水平溢位、重複 ID 或遺失舊 DOM ID。
- 完整重新烘焙場景：481 個 indexed meshes、3647 個共享 instances，約 21.2 MB 壓縮、57.1 MB 解壓，符合現有載入上限。東側 260 m 地形接縫在近／遠 LOD 均吻合，沒有退化面。
- 新增藍鯨與鯨鯊使用獨立鰭／尾動作；路徑以完整身體及尾擺包絡檢查十分鐘，保持固定身分、尺度與連續速度。舊有物種索引不變。

## 方法與範圍

瀏覽器使用 Chromium / SwiftShader，觸控為瀏覽器模擬，非實體手機測試。效能模式使用省電畫質，不把軟體渲染結果當成實際裝置 FPS。鍵盤事件與搖桿事件使用正式操作路徑；跨界、保存與渲染畫面使用明示的受控位置和固定步長。新棲地照片使用實際模型，不冒稱自然遊玩取得。

瀏覽器低階 CDP 拖曳放在原生按鈕點擊測試之後：該 Chromium 測試環境在最小空白頁也會於原始 touch drag 後抑制後續合成 click。測試等候介面重繪後再注入拖曳，不為此修改產品事件處理。

0.15 的「回船部署／潛航器／耗氣強制返船」瀏覽器案例屬舊規格，現在由 free-ocean-browser.cjs 與更新後 navigation.cjs／deepsea.cjs 取代。此版沒有聲稱重跑全部船上支線及每一種實體手把。

## 重現

```sh
python3 build.py
python3 tests/parity/static_check.py
node tests/parity/free-swimming.cjs
node tests/parity/free-ocean-exploration.cjs
node tests/parity/pelagic-life.cjs
node tests/parity/navigation.cjs
node tests/parity/deepsea.cjs
node tests/parity/terrain-lod.cjs
node tests/parity/trench-geometry.cjs
node tests/parity/trench-lighting.cjs
node tests/parity/trench-motion.cjs
node tests/parity/trench-fauna.cjs
node tests/parity/exploration.cjs
node tests/parity/selection.cjs
node tests/parity/photography.cjs
python3 -m http.server 8000
# 另一個終端；可用 PLAYWRIGHT_PATH / CHROME_PATH 指定安裝位置
node tests/parity/free-ocean-browser.cjs http://127.0.0.1:8000/
```

截圖與原始結果輸出於 qa/parity/，不隨網站發布。
