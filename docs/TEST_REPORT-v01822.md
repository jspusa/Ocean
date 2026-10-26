# 0.18.22 房間重啟恢復驗證

基線 `7c8d672b9e5b6184bc2e7f07c0ca221654670c9f`；規格見 [本輪契約](parity/ROOM-DURABILITY-v01822-SPEC.md)。最終本機驗證已完成，公開發布尚未完成。

## 本輪行為

自有 Node 服務可選 SQLite 保存短期房間權威。成功回覆前完成交易；固定恢復期限、准入／交接摘要、訪問設定、世代與撤銷均跨程序重啟保留。恢復先顯示離線與空姿態，等待新連線的更新。一般游泳位置不逐包寫磁碟，第一次當前世代操作撤銷 proof 時仍先保存。

資料庫及內容有上限，沒有私人能力值、照片、個人存檔、姿態及訊息歷史；同檔只有一個 writer。壞資料、版本／時鐘不合、無效關聯與超出合理期限拒絕啟動，不以空資料取代。儲存失敗或結果不明時不送成功事件，關閉連線、health 503，停止使用已變動記憶體。

公開端點仍為 null，沒有部署公網多人服務。持久身分／42 好友／邀請、共同世界／完整工具、多主機 adapter、跨網路與實體手機、內容及商用驗收仍未完成。此版本不提高整體完成星級。

## RED、修正與中間證據

- 舊 CLI 真建房／核准／訪問關閉 ACK 後 SIGKILL，同檔重啟回 `resume_invalid`，0/1：`qa/parity/v01822-durability-first-red.log`。第一個 GREEN 連續三次真 SIGKILL 恢復兩人原房／epoch／memberId／設定，`qa/parity/v01822-durability-first-green.log`。
- Standards 審查找到 P1：外來合法 JSON 的 type／category 物件會觸發 property key coercion 例外，誤使全服務進入儲存故障狀態。真 WebSocket RED 的 health 為 503 而非 200，`qa/parity/v01822-hostile-json-red.log`；先檢查字串型別後，陌生封包遭拒、原房主仍可確認，修正測試通過。
- Standards 審查找到 P2：損壞期限仍為安全整數時，可能載入極遠未來的權利。真流程保存後只破壞三種 deadline 的負例均 RED：`qa/parity/v01822-durability-deadline-red.log`。codec 已補 savedAt 加 grace／TTL 上界，最終測試另列。
- 初次原生桌機為 69/69：`/tmp/ocean-v01822-durable-desktop/report.json`。該控制器先切 TCP、再殺服務，證明已偵測斷線後的資格恢復，不能代替存活連線週期租約。保留此報告，最終控制器改為直接終止存活服務，再觀察正常客戶端恢復。

## 方法與限制

成功准入與恢復僅由真正 HTTP／WebSocket、正式 CLI 或正常遊戲 UI 取得。SIGKILL 實際終止獨立子程序；同檔、同 port、新 PID 恢復。資料檔負例只破壞已合法取得的資料以驗證拒絕，不以改資料取得資格；IO adapter 僅注入提交前失敗或提交後結果不明，對外以成功事件、close 與 health 判斷。

原生遊戲使用同一台 Apple M3 Max 與安裝版 Chrome；兩個獨立儲存 context、正式鍵鼠／CDP 觸控、自動畫質，沒有 pose／進度／時間注入。觸控是同機模擬，沒有實體手機、GPU 成本、FPS 或耗電新成績。程序 SIGKILL 不是設備斷電、硬碟故障或多主機驗收。原有公開單人與畫質內容保留，不藉本輪宣稱全裝置更快。

## 最終本機結果

| 驗證範圍 | 結果 | 證據 |
|---|---|---|
| 服務與客戶端 | ★★★ 101/101 | `qa/parity/v01822-all-server-tests.log`；66 個既有、30 個耐久性、5 個故障案例，含子測試計數 |
| 既有遊戲 CPU 回歸 | ★★★ 95/95 套 | `qa/parity/v01822-final-cpu-results.json` |
| 打包與靜態 | ★★★ 66/66 | `qa/parity/v01822-static.log`；294 個 manifest 檔案與 179 個場景 chunk 未重烘焙 |
| 原生桌機正常操作與直接崩潰恢復 | ★★★ 70/70 | `qa/parity/v01822-durable-desktop-final/report.json` |
| 原生觸控模擬正常操作與直接崩潰恢復 | ★★★ 70/70 | `qa/parity/v01822-durable-touch-final/report.json` |
| 兩軸獨立複審 | ★★★ 無剩餘具體 P1/P2 | [審查記錄](parity/REVIEW-v01822.md) |

桌機兩席存活 34.318／31.006 秒，觸控為 34.268／31.008 秒；直接 SIGKILL 時 proxy 仍啟用、TCP=2。兩端各以同檔同 port、新 PID 恢復，原 roomId／memberId／角色／訪問設定保留，世代 1→2，沒有重新建房、申請或核准。觀察到 `resume → joined → confirm → pose`，也完成房主結束、離開、個人存檔隔離與清理。桌機 1440×900、DPR 2、quality 2；觸控 390×844、DPR 3、quality 1、實際 585×1266；兩者 adaptive=true。

兩份報告均 status=passed、errors=[]、fatal=null。`consoleErrors` 各保留兩筆刻意初次連線失敗與一筆刻意觸發 WebGL context lost；這些是測試故障情境，不能描述為整份 console 全無錯誤。恢復結果與畫面為本機範圍，不作為新的黑閃／耗電效能成績。

原始 `/tmp/ocean-v01822-durable-*` 報告及圖片完整保留至上述 `qa/parity/v01822-durable-*`，附 `artifact-location.json` 記錄原路徑，未重寫原報告。初次 69/69 報告仍保留，最終驗收採 70/70。

已驗證程式 SHA-256：

```text
server/rooms.mjs c69c2c28354e4841bbaf5f4443e816040ac932d957af2941d56aaf7ac146bff1
server/room-state.mjs d2a93bc2a6e3e4bcbafc9feadc92967eff3286c91defbbcc5b18510d99ec1ea7
server/room-store.mjs df7a41fea6b2ca8a09b024a9d7d92d1f4873f7d5ee3e65af76b4bb74379a8950
server/server.mjs 12f72ab4b91f7fd5c74cb45498185ea93f23fd08888c6a18c6543a437de6519b
tests/parity/multiplayer-browser.cjs d4e6696e6dc24ce3376dcdb71ce092d79f245198c504f569e5dc2d635b19bd5b
```
