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
