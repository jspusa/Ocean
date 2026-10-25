# 01 — 新功能保存與完整生命週期

**What to build:** 原有匯出／匯入／續玩包含所有功能分區；舊存檔遷移；工具、暫停、回船、載入與游動一致。

**Blocked by:** None

**Status:** in-progress

- [ ] 上述玩家可操作流程全部存在。
- [ ] 經實際瀏覽器、狀態保存及必要失敗案例驗證。
- [ ] 差距與證據已記錄；未以名稱或 fixture 代替完整行為。

範圍依據：[規格](../SPEC.md)、[原作查證](../../WII-PARITY-REFERENCE.md)。

## 0.9 進度

0.9 已接入四個功能分區，舊存檔預設、實際檔案匯出／匯入、影像參數保存及跨面板生命週期。後續每個系統加入時仍須重跑；不能提前完成全範圍保存工作。

執行證據及限制：[驗證報告](../../../TEST_REPORT.md)。

### 0.18.7 bounded reliability slice

Validated primary snapshots alone may rotate into the voyage backup. Optional backup quota failure no longer blocks a successful primary replacement; failed primary writes still report failure. Regression: `tests/parity/save-backup.cjs`. Context-loss recovery offers a full export and displays export failure within its recovery screen. This does not complete stale-tab protection, journal backups, crash-atomic cross-store import or the entire ticket.

### 0.18.8 session ownership and rescue exports

Current builds acquire an exclusive browser lock before loading/migrating saves or allocating the renderer. Duplicate tabs wait for a fresh reload. Voyage, journal and photographic writes are guarded; exports no longer save or adopt external library state. Photo initialization and full imports drain before release. Failed durable rollback retains a coherent pre-import voyage and original-image cache for explicit rescue export. Real two-tab Chrome, touch layouts, native storage fault injection and 43 photography checks are recorded in [the report](../../TEST_REPORT-v0188.md). Pre-0.18.8 tabs do not obey this cooperative lock; external storage detection stops this build, not already-issued legacy writes. Journal backups and crash-atomic cross-store import remain incomplete; do not close this whole ticket.

### 0.18.9 匯入中斷恢復與日誌備份

IndexedDB 同一交易保存舊相簿原圖及四份 localStorage 快照，再替換照片；所有新快照寫妥後刪除恢復紀錄才提交。啟動在分頁取得使用權後、Renderer 及功能搬移前先恢復未完成匯入，未知外部值停止自動恢復。啟動失敗仍可從持久紀錄下載原航程與原圖。日誌加入相容備份輪替，損壞主檔／個別壞列不自動抹除有效資料；待救援照片於匯入完成後重開仍保留。

本機實際 renderer crash 與二次中斷恢復共 10 組、攝影 44 項、日誌原生 4 組、分頁 10 組及失敗回滾救援通過，見 [0.18.9 報告](../../TEST_REPORT-v0189.md)。CPU 批次 75/78，三份歷史契約失敗明載，不能稱全綠。最終打包的靜態 60/60、自由探索 33/33、離線版及桌機／觸控顯示恢復通過；線上發布仍待主流程補證。這些證據不涵蓋裝置斷電、硬體故障、實體手機長時間負載或全部功能生命週期；本工作單及完整目標維持未完成。
