# 0.18.22 房間保存雙軸審查

固定基線 `7c8d672b9e5b6184bc2e7f07c0ca221654670c9f`；[規格](ROOM-DURABILITY-v01822-SPEC.md)、[執行證據](../TEST_REPORT-v01822.md)。兩軸由不同代理唯讀審查，root 整理結果；原生測試另由 root 執行，不當作審查代理已親自驗收。

## Standards

來源 `/root/multiplayer_standards_review`。初審找到 P1：合法 JSON 的 type／category 物件在屬性查找時觸發轉型例外，transaction 會把它當儲存故障，連未准入者也能使全服務不可用。真 WebSocket RED 的 health 503 已保留；在字串型別檢查後，拒絕異常輸入且原玩家仍可確認，GREEN。

另一項 P2 為保存期限只驗證安全整數，損壞檔案可保存過遠的資格。現在依保存時間與對應 grace／TTL 限制上界；三種真資料檔損壞負例由 RED 轉 GREEN，拒啟動且不覆寫原檔。退休紀錄採兩類期限最大值，已過期值保留給正常清除。

最終複審無剩餘 runtime P1/P2，也未發現明文程式標準違規；smell baseline 視為判斷提示，不把行數或函式形式當硬性違規。

## Spec

來源 `/root/room_restart_spec_review`，未參與本輪實作。初審認為提交順序、失敗停權威、摘要、關聯與截止時間符合規格；初審漏掉上述 coercion 問題，不能以初審無發現掩蓋 Standards 的實際 RED。

後續複審已核對 type/category/preset 檢查、惡意封包後正常房主仍可確認的 GREEN，以及其餘合法 JSON 入口，未找到新增 P1/P2。原本尚缺的 CLI 故障證據由 root 與實作代理補入本輪報告。

## 驗證範圍修正

Standards 指出第一份原生 69/69 先切 TCP 再殺服務，只能證明已偵測斷線後的資格恢復。控制器保留此證據，另改為兩席實際連線超過 30 秒、proxy 保持啟用與 TCP=2 時直接 SIGKILL，等待正常重連畫面後才同檔／同 port 啟動。最終桌機及觸控結果在本輪報告記錄。

| 軸線 | 程式複審狀態 |
|---|---|
| Standards | ★★★ 1 項 P1、1 項 P2 已修正；最終桌機／觸控各 70/70 的 live lease 證據已唯讀核對。 |
| Spec | ★★★ 修正後無剩餘 P1/P2；沒有將仍缺的完整多人與公網服務說成完成。 |

持久好友／邀請、共同世界／工具、多主機、自有公網、跨網路、實體裝置及完整商用目標保留。SQLite 的程序崩潰證據不推論設備斷電或所有檔案系統可靠性。

兩軸均已核對最終桌機與觸控報告：實際連線超過 30 秒時直接 SIGKILL，proxy 啟用、TCP=2，同檔／同 port／新 PID 恢復，未重新准入；正常退出與暫存清理完成。原生證據缺口已補，Spec 與 Standards 最終剩餘 P1/P2 均為 0。
