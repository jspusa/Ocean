# Ocean 本機雙人房間服務

真正 HTTP／WebSocket 服務，使用固定版本 `ws@8.22.0`。`rooms.mjs` 管理房間權威，`server.mjs` 負責網路邊界，`cli.mjs` 啟動服務。它不載入遊戲渲染器、不讀取或寫入任何玩家存檔。

服務提供建立、申請、主持者核准／拒絕、訪問開關、兩人上限、版本隔離、雙向姿態與分類預設訊息、離開、斷線席位保留、旋轉重連能力值，以及首次建立／核准和重連回覆遺失時有期限的恢復程序。0.18.21 已接入遊戲面板與遠端潛水員；僅主動建立／申請才連線。**這不是完整多人遊戲或公開部署驗收**：尚缺持久身分／42 位好友／持久邀請、共同時鐘／生物／完整工具、正式部署 adapter、不同網路及實體手機驗收。

本機以 `python3 -m http.server 8000` 開啟遊戲，另一個終端執行以下服務。從 `http://127.0.0.1:8000/` 的「雙人同游」建房；同行者需獨立瀏覽器資料區。重新整理、回船或關閉頁面會結束該頁同游，個人進度保留。不同瀏覽器只要共用同一來源仍受各自既有存檔鎖保護。

正式網站的 `room-service.json` 目前為 `{"endpoint":null}`，不會連線。未來只可填入自己管理的 `wss://…/v1` 再建置；不能把憑證放入此公開設定，不能以 localhost 的成功宣稱公網已開通。HTTPS／TLS、持久資料及部署營運仍依完整多人計畫處理。

## 啟動與測試

需要 Node.js 22 或以上。在 repo 根目錄執行：

```sh
npm ci --prefix server --ignore-scripts
npm start --prefix server
npm test --prefix server
npm run check --prefix server
```

預設只監聽 `127.0.0.1:8787`；HTTP 健康檢查為 `/health`，WebSocket 為 `/v1`，子協定為 `ocean.v1`。終端只印一次公開端點及內容版本，沒有 request log、封包或能力值。

| 環境設定 | 預設與用途 |
| --- | --- |
| `OCEAN_HOST` | `127.0.0.1`；只在明確需要 LAN 驗收時改綁定位址 |
| `OCEAN_PORT` | `8787`；`0` 可由系統選擇測試 port |
| `OCEAN_ALLOWED_ORIGINS` | `http://127.0.0.1:8000,http://localhost:8000,https://jspusa.github.io`；逗號分隔、精確 origin，不能包含路徑或萬用字元 |
| `OCEAN_CONTENT_VERSION` | 未設定時讀取 repo `VERSION`，形成 `ocean-<VERSION>`；正式環境應固定到部署中的內容版本 |

`createOceanServer({ contentVersion, allowedOrigins, ...limits })` 可被整合測試或本機 runner 使用，必須提供內容版本。公開操作只經 HTTP／WebSocket；沒有列舉房間、取得內部狀態或繞過核准的測試端點。

## 資源與生命週期

| 項目 | 預設界限 |
| --- | --- |
| 已核准成員 | 每房 2 人；斷線保留席位也計數 |
| 房間／申請 | 32 個房間；每房最多 4 個等待申請 |
| WebSocket | 全服務 128；每 TCP 來源位址 8；不信任 `X-Forwarded-For` |
| HTTP | 8 KiB header；10 秒 request/header timeout；最多 256 TCP sockets |
| 封包 | UTF-8 JSON；最多 4096 bytes；不開 compression；最多 32 fragments/buffered chunks |
| 一般訊息 | 每連線 40 次／秒補充，突發 60；超過就關閉該連線 |
| 預設訊息 | 每成員 2 次／秒補充，突發 4；重連不重置此額度 |
| 傳出緩衝 | 64 KiB，最多再加一個有界訊息；超過關閉慢速接收端，不建立應用層重傳佇列 |
| 首次准入證明 | 全服務最多 `maxRooms * (maxPendingPerRoom + 2)` 筆（預設 192），含短期已撤銷 nonce 紀錄；只存摘要，滿額拒絕新配置 |
| 首次准入期限 | 等待沿用原申請到期時間；首次建立／核准另起固定 30 秒，重試不延長；confirm／當前操作／正常 resume 撤銷 |
| 未完成握手 | 5 秒關閉；申請等待最多 30 秒 |
| 心跳 | 15 秒 ping；下一輪仍無 pong 則中止，獨立於遊戲 RAF |
| 斷線重連 | 伺服器偵測斷線後 30 秒；每次成功重連旋轉能力值與增加連線世代 |
| 未確認交接 | 每成員最多 1 個 SHA-256 恢復證明；第一次接受起算 30 秒，重試不延長；當前世代 confirm／操作立即撤銷 |
| 關閉等待 | 最多 250 ms，之後中止未完成 close handshake 的 socket |

以上是本作設計值，不聲稱與 Wii 原作相同。連線數／限流測試可透過 runner 調小時限或額度；正式啟動 CLI 使用預設值。

主持者正常離開會關房；主持者斷線先保留 30 秒，過期關房；客人斷線過期只移除客人。重連取代仍在的舊 socket，舊 socket 後續關閉不會誤傷新世代。重連先傳入安全亂數 nonce；若 joined 在途中遺失，只能在固定期限內重送完全相同的私有請求。收到 joined 後立即保存新能力值並 confirm，後續使用新能力值重連。舊能力值加上不同 nonce、確認後的舊完整請求及舊世代操作均不能取代現行連線；細節見 [PROTOCOL.md](PROTOCOL.md)。過期申請／離開／房間關閉使相關資格失效。所有狀態僅在單一程序記憶體，服務重啟會失去房間與重連能力值；個人進度完全由遊戲正式存檔 owner 保存。

## 驗收與部署界線

測試以獨立的真 TCP WebSocket 連線操作，涵蓋未核准隔離、版本、角色、重播、失效能力值、真正 7000 m 海溝座標、慢速接收端及失聯心跳；CLI 測試另啟動 Node 子程序。另用真正 TCP proxy 在資料送達客戶端前切斷三次 joined 回覆，讓另一名成員確認每次交接實際發生，再驗證原席位恢復、確認後舊請求撤銷、確認 ack 遺失及重試不延長期限。首次准入另以 TCP 丟棄房主 joined、客人核准 joined 及 pending，驗證同一房間／席位／申請恢復、晚核准、明確取消、固定期限與有界容量。測試不操作內部房間 Map、不使用 BroadcastChannel、不使用 demo relay。

尚未接到遊戲前端，未加入玩家沒有新增 WebSocket、上傳或遠端模型成本。前端整合時仍須做到使用者進入同遊前不建立連線，姿態建議 10–20 Hz、有變動才傳、插值／過期凍結與有界事件佇列，並保留目前自動畫質和單寫存檔保護。

初次 create/request 必須有安全亂數 admissionNonce。不確定回覆時保留原始請求，在新連線用 recover 尋回同一申請或席位；不可盲目重送 create/request。等待中的斷線不再等於取消，必須以 cancel 明確取消，或等待原期限。首次核准的恢復窗口從核准時開始，晚核准者也能恢復；重試不延長窗口。初次證明與現行 resumeToken 是分開的短期能力，詳見協定。這沒有提供服務重啟恢復、持久好友或公開後端。

此 HTTP 本機服務不提供 TLS、不代表正式公開後端。正式部署需自有 WSS／TLS 端點、明確公開存取、身分與邀請權限、監控、額度與費用界限。單程序記憶體不可直接放到多 instance 後端冒充共同房間；推薦每房一個 Durable Object 的 adapter。Origin 檢查是瀏覽器邊界，不是身分認證；原生客戶端可偽造 Origin，不能將 Stage A 當成商用好友帳號系統。

能力值只傳在 WSS JSON 內容，不能放在 query string、子協定、診斷日誌、遊戲存檔匯出或 Git。`server/.gitignore` 排除相依套件、本機環境檔、log 與 local state。

官方依據：[ws 8.22.0 release](https://github.com/websockets/ws/releases/tag/8.22.0)、[ws API](https://github.com/websockets/ws/blob/8.22.0/doc/ws.md)、[Durable Objects WebSocket](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)。正式部署另行核對方案與限制。
