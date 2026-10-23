# 0.18.4 材質載入恢復與失敗清理

日期：2026-10-23。基準 `a5050d00ca637fa8fa51220d8295e4b477abdd27`（0.18.3）。本版處理正式站驗證時實際遇到的載入失敗，保留既有 GPU 優化、完整材質及正常更新頻率。

## 實際故障

正式網址的 Chromium 啟動檢查逾時後，網路探針捕捉到 `assets/shell_nor_gl.jpg?v=0.18.3` 回傳 HTTP 503，畫面顯示「無法載入材質 shell_nor_gl」。原載入器立即拒絕整批 Promise 並刪除待載入 GPU 貼圖，其他圖片仍會執行原有 `onload`，隨後出現 `bindTexture: attempt to use a deleted object` 及 `Texture is immutable` 等 GL 錯誤。此後直接請求原圖及帶重試參數的網址皆已回復 HTTP 200；沒有把一次短暫失敗當成永久不存在的資產。

## 修正

- 網路圖片第一次仍用原網址，失敗時以 150／400 ms 間隔最多再試兩次；只在重試網址加入該次載入的快取識別，保留原有版本、查詢編碼及 fragment。離線 `data:`／`blob:` 失敗不加網址參數、不重試。
- 每批追蹤圖片、重試計時器、目前嘗試及結束狀態。永久失敗或圖片上傳例外時，先標記中止、清除計時器及圖片回呼，再刪除該批新建的 GPU 貼圖；即使舊回呼被延後執行，也不再呼叫 GL。已發出的網路回應可能仍完成，但不會觸碰已刪除資源。
- 九張貼圖全部成功才替換目前集合，之後才釋放舊集合。材質升級失敗保留原貼圖及 `textureFull` 狀態，後續仍可重新升級；沿用既有升級請求合併機制。

原圖、完整／平衡模式的尺寸規則、caustics、mipmap、過濾、重複取樣與 anisotropy 設定不變。成功載入仍是九個圖片請求；沒有新增每幀工作、降低畫質、替代空白貼圖、限幀或改變地圖載入距離。本版不宣稱新的 FPS／耗電改善比例。

## 驗證

`texture-loading.cjs` 直接執行正式載入方法，先在原版重現 **1/6 通過、5 項失敗**，修正後 **6/6 通過**。涵蓋連續兩次暫時失敗後成功、重試上限、版本／編碼／fragment、過期回呼與重試計時器、清理順序、上傳例外、離線資料、原有行動平衡品質、升級合併及失敗後再次升級。獨立生命週期審查另重播成功後的舊回呼與中止後的計時器，未產生 GL 呼叫或新圖片。

`texture-loading-browser.cjs` 對真正圖片請求注入 HTTP 503：第一次失敗後自動恢復啟動；再讓完整材質升級持續失敗，同時扣住其他八張圖片回應，等清理結束才釋放，驗證舊貼圖仍有效且延遲回呼不引發 GL 錯誤。升級使用獨立測試網址，確保瀏覽器的已解碼圖片快取不會略過故障情境。桌面細緻／觸控平衡配置各檢查完整淺礁 RGBA、畫質、render scale 及貼圖品質狀態。

兩種配置皆通過：啟動目標圖片兩次請求後成功，永久失敗三次後停止；原貼圖物件及完整／平衡品質狀態保持，GL／pageerror 皆為 0。失敗前後完整 RGBA 雜湊相同，也各自與 0.18.2 已驗證的相同淺礁視角雜湊相同。語法、完整性清單、MIT 包裝、裝置報告及表面程式回歸通過；獨立 Standards 與 Spec 審查未發現阻擋問題。

繪圖程式及正常更新沿用 [0.18.2 的量測與畫面證據](TEST_REPORT-v0182.md)；裝置回報沿用 [0.18.3 的遊戲版本／P99 修正](TEST_REPORT-v0183.md)。真機長時間效能、完整 Wii 內容及雙人外網同遊維持原有未完成範圍。

## 重跑

```sh
python3 build.py --pack-only
python3 tests/parity/static_check.py
node tests/parity/texture-loading.cjs
node tests/parity/performance-report.cjs
node tests/parity/surface-programs.cjs
# Playwright 可透過 PLAYWRIGHT_PATH 指定，WebGL 測試依序執行。
node tests/parity/texture-loading-browser.cjs http://127.0.0.1:8010/
node tests/parity/performance-report-browser.cjs http://127.0.0.1:8010/
```

故障注入與畫面雜湊記錄在 `qa/parity/texture-loading-browser.json`。瀏覽器與 GPU 使用本環境的 SwiftShader，並非實體手機測試。
