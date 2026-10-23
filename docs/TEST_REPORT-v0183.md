# 0.18.3 裝置效能報告與發布證據

日期：2026-10-23。基準 `cb65e02f058e905d486df9c2a783dfa2064e20f2`（0.18.2）。本版修正用於追查實機卡頓的報告識別，沒有新增幀率改善數字。

## 問題與修正

原本 `OceanPerformance.finish()` 以 `OPEN_WORLD.version` 填入遊戲版本。這是場景資料版本，目前為 `0.17.0`；即使玩家已載入 0.18.2，報告及下載檔名仍顯示 0.17.0，無法正確比對更新前後。現在 `version` 取自網站及離線 HTML 共同使用的 `data-version`，缺少時明示 `unknown`，場景版本另外保留為 `worldVersion`。既有測試工具的自動畫質報告也採用相同欄位語義。

增加 `p99FrameMs`，與原有 P50／P95 使用相同已排序樣本及索引方式（`floor(n × p)`）。原始時間順序、平均 FPS、CPU 時間、解析度、MSAA、畫質、render scale 與 renderer 欄位保留。只在量測結束時多讀取兩個欄位及一個已排序值，沒有新增每幀取樣、GPU query、網路上傳、畫質變更或排程邏輯。

下水後開啟「暫停 → 設定 → 進階設定 → 測試裝置效能」，完成 20 秒量測後選「匯出」，即可在本機取得報告。P99 是較尾端的幀時間，樣本很少時會接近最大值；它不能單獨區分 CPU、GPU、瀏覽器排程或熱限制。要確認特定裝置的卡頓，仍需要該裝置實際游玩取得的報告。

## 驗證

- 新增 `performance-report.cjs`：先在原程式重現 **1/5 通過、4 項失敗**，包括版本、下載檔名、缺少版本回退與缺少 P99；修正後 **5/5 通過**。直接執行正式 `finish()`／`export()`，檢查 Blob JSON、下載檔名及 URL 釋放。200 個受控區間的 P50／P95／P99 為 50.5／95.5／99.5 ms；這些是測試輸入，並非裝置效能成績。
- `performance-report-browser.cjs` 驅動桌面／觸控的正式暫停、設定、進階量測及匯出按鈕，讀取真正下載的 JSON；受控 100 個區間合計 20,000 ms，P50／P95／P99 為 199／199／299 ms。使用合成時間只驗證報告與下載流程，不是 20 秒真人或實機幀率驗收。
- 建置的網站與離線 HTML 皆使用 0.18.3；語法、資源參照、完整性清單與 MIT 包裝檢查通過。

繪圖及正常更新沿用 0.18.2；其 11 視角逐像素相同、真正 GPU 計時、連續游動與地圖資源往返證據見 [0.18.2 報告](TEST_REPORT-v0182.md)。本版沒有重跑完整 GPU 基準，也不把報告欄位修正宣稱為新的效能提升。

## 商用與完整目標

[商用來源紀錄](COMMERCIAL-READINESS.md) 及 [發布清單](../RELEASE_CHECKLIST.md) 已補入 0.18–0.18.2 的目前證據連結，保留歷史矩陣及實體裝置、人耳音訊與自然遊玩缺口。MIT 許可與散布保留條件維持原樣；沒有加入付費服務或第三方素材。

圖鑑目前仍為 41 類。完整 Wii 功能／內容、雙人外網同遊、實體手機／手把及長時間效能驗收尚未完成；本版不升級其完成狀態。詳見 [功能矩陣](../FEATURE_PARITY.md)。

## 重跑

```sh
python3 build.py --pack-only
python3 tests/parity/static_check.py
node tests/parity/commercial-packaging.cjs
node tests/parity/performance-report.cjs
node --check tests/parity/performance.mjs
# Playwright 可透過 PLAYWRIGHT_PATH 指定。
node tests/parity/performance-report-browser.cjs http://127.0.0.1:8010/
```

瀏覽器受控輸入及實際下載結果記錄在 `qa/parity/performance-report-browser.json`，不列為實體裝置效能成績。
