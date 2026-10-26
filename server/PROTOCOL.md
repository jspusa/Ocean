# Ocean room protocol 1

連線：`new WebSocket(endpoint + '/v1', 'ocean.v1')`。端點不得帶 query；伺服器要求精確允許的 Origin。JSON 僅接受下表欄位，未知欄位拒絕。第一個服務訊息為 `{type:'hello', protocol:1, contentVersion}`。下例是結構說明，`<...>` 為執行時資料，不是可用憑證。

## 初始與准入

尚未加入時可以送出以下訊息：

| type | 其餘必要欄位 | 結果 |
| --- | --- | --- |
| `create` | `protocol:1, contentVersion, name, admissionNonce` | 建立房間，收到私有 `joined`，角色 host |
| `request` | `protocol:1, contentVersion, name, roomId, admissionNonce` | 自己只收到 `pending`；主持者收到 `join-request` |
| `recover` | `admission:<完整原始 create/request 物件>` | 只恢復原等待申請或原已准入席位，不建立房間或新申請 |
| `cancel` | 無 | 僅目前等待申請的 socket 可取消，收到 `cancelled {requestId}` 後關閉 |
| `resume` | `protocol:1, contentVersion, roomId, memberId, resumeToken, resumeNonce` | 成功收到新的私有 `joined`；舊能力值立即失效 |

名稱 1–24 個 UTF-16 code units，不得全空白或含 Unicode control/format 字元。名稱是暫時顯示名稱，不是已驗證身分。房號及 memberId 是識別碼，不授予讀取房內狀態的權利。未知房號、版本錯誤、滿房、訪問關閉或主持者不在線皆不產生申請。

`pending` 只有 `{type, requestId}`，不包含房間世代、其他成員或姿態。等待者不能建立另一房間或重複申請。網路斷線保留原申請至固定到期；退出等待必須送 `cancel`，不能用關閉 socket 代表取消。若取消前已斷線，先 recover 原申請，再取消。核准先於取消發生時，已加入者應使用 `leave`。

`join-request` 為 `{type, requestId, name}`。主持者使用已准入操作 `decide` 處理。等待者被拒絕會收到 `{type:'rejected', reason}`，接著 socket 關閉。最多 4 件等待申請，30 秒逾時；已滿兩人時不再收申請。

`joined` 僅對得到資格的連線發出：

```js
{
  type: 'joined', protocol: 1, contentVersion,
  roomId, roomEpoch, memberId, role: 'host' /* or 'guest' */,
  generation: 1, resumeToken: '<private, 256-bit random>',
  snapshot: {
    visitsOpen: true,
    members: [{id, name, role, generation, connected, pose: null}],
    pending: [{requestId, name, expiresAt}] // 僅 host 的快照含此欄位
  }
}
```

`resumeToken` 只留在該客戶端的連線 session；不要放入 URL、日誌、分享連結或遊戲存檔。伺服器只存 SHA-256 digest，對比使用固定時間比較。這是短期房間能力值，**不是 Stage B 持久身分**。

### 首次建立與核准回覆遺失

在每個新的建立／申請意圖前，客戶端以安全亂數產生 32 bytes 的 `admissionNonce`，無 padding base64url 為 43 字元。保留完整原始 create/request 於這次連線 session，直到收到 joined。此 nonce 是私有恢復能力的一部分，不可放入 URL、日誌、分享連結、遊戲存檔，亦不可在另一個新意圖重用。

若 pending 或 joined 回覆遺失，關閉舊 socket，於新連線只送：

```js
{ type: 'recover', admission: originalCreateOrRequest }
```

`admission` 必須精確包含原始操作類型、protocol、contentVersion、name、admissionNonce，以及 request 的 roomId；不得多欄位或變更值。recover 不會建立房間、重送主持者申請或直接核准。找不到、已過期、已拒絕／取消、房間已關閉或已確認皆回 `admission_invalid`，不洩漏快照。版本不一致回 `version_mismatch`。初始 create/request 在 nonce 紀錄仍保留時重送會回 `admission_used`；**不確定結果只能 recover，不能重送 create/request**。明確 `admission_invalid` 後停止恢復；新的使用者意圖才能另取 nonce 建立／申請。

等待期間，recover 只將同一個 requestId 換到新 socket，回覆原本的 pending。舊 socket 被取代，不產生額外申請、核准或房間快照；等待的固定期限不延長。主持者可核准暫時離線的申請，只保留同一個客人席位，`member-joined` 的 connected 為 false。

房主第一次建立、或客人第一次被核准時，開始一個固定 30 秒的首次 joined 恢復窗口。**核准窗口與等待期限分開**：晚核准者仍有完整恢復時間；之後任意次重試均不延長。recover 已准入者會旋轉能力值、增加世代、關閉舊 socket，回傳同一房間與成員的 joined。兩人上限包含離線保留席位。關閉訪問會撤銷等待申請，但既有已准入者仍能恢復原席位。

客戶端收到 joined 後先保存新 resumeToken／generation，立即 confirm。當前 socket／epoch／generation／seq 通過驗證的第一個操作，或使用現行能力值開始 resume，均撤銷首次准入證明。確認後舊原始請求不能恢復；confirm 的 ack 遺失時改用已收到的 resumeToken 走重連流程。舊世代不能確認或撤銷新世代的證明。

伺服器只存 nonce digest 與完整請求 digest。全服務最多 `maxRooms * (maxPendingPerRoom + 2)` 筆首次准入紀錄，預設 192 筆；含短期的已撤銷 nonce 紀錄，不保留歷史或重傳佇列。等待紀錄到期後釋放；第一次准入只更新一次為准入窗口截止時間，重試不更新。超過上限在任何新房／申請配置前回 `recovery_full`，客戶端應等候後重試明確未受理的新意圖，不可迴圈洪泛。取消／拒絕／關房會立即撤銷證明，僅保留至原截止時間的 nonce digest 防止窗口內重用。未設定 OCEAN_STATE_FILE 時紀錄只在程序記憶體；設定 SQLite 時依下方固定期限恢復。

### 可恢復的重連旋轉

每次開始新的重連程序，客戶端先使用安全亂數產生 32 bytes 的 `resumeNonce`，以無 padding base64url 編碼為 43 字元。Nonce 只用於這次程序，不能放入日誌、URL、遊戲存檔，也不能在下一次程序重用。它與現行能力值一同構成這次重連的私有恢復證明。

伺服器接受現行能力值後，立即旋轉能力值、增加世代、取代舊 socket，再送出 `joined`。另外只保存一個「未確認交接」紀錄：完整原始 resume 身分／能力值／nonce 的 SHA-256 digest，以及從第一次接受起算的 30 秒截止時間。當 `joined` 因網路中斷未送達時，客戶端關閉前次 socket，使用**完全相同**的 resume 內容重試。只在此紀錄仍未確認且未過期時可恢復；每次恢復仍旋轉能力值、增加世代、關閉前一 socket，截止時間不延長。

客戶端取得 `joined` 後，先保存新能力值與世代，立即送 `confirm` 操作（不等待遊戲 RAF）。伺服器清除未確認交接紀錄並回 `ack`。第一個通過當前 socket、世代與序號驗證的其他已准入操作也代表已取得 joined，會清除同一紀錄。若 confirm 或其 ack 遺失，客戶端已保存新能力值，可用新 nonce 開始下一次重連，無須回頭使用原始請求。

客戶端一次只可有一個重連程序，保留至多一個未取得 joined 的原始 resume 請求，任意多次中斷都重試該內容。成功取得 joined 後刪除原始請求；不得多分頁競爭重連。無回覆不是拒絕；網路不通時保留該請求直到期限，不能自行猜測新能力值。明確 `resume_invalid` 表示資格已過期、被更新、已確認或房間消失，停止以該請求重試。

每名成員只存現行能力值 digest 與最多一個有界恢復證明，沒有明文能力值、重試歷史或傳出重送佇列。舊能力值加上不同 nonce 一律無效；現行交接一經確認，連完全相同的舊請求都無效。下一次使用現行能力值的正常 resume 取代前次證明。任何舊 socket 的操作、延遲關閉及舊世代封包都不能影響新世代。既有握手、連線、限流、心跳與斷線席位期限仍適用；原生客戶端不能藉重試延長此證明的固定截止時間。

已有 room/member/capability 的重連回覆遺失使用本節 resume 流程；尚未收到第一次 joined 使用前節 admission 恢復流程。兩種流程均只在固定期限內有效。0.18.22 的可選 SQLite 保存可跨單主機程序重啟延續相同權威；Stage B 持久身分／邀請尚未實作。

## 已准入操作

每個操作都必須有 `{type, roomEpoch, generation, seq}`。`seq` 是安全整數，自 1 遞增；必須大於前次值，單次前進最多 1000。成功重連後重設為 1。經過世代與序號驗證的操作即消耗序號，後續業務錯誤不回退；格式錯誤／錯誤世代不更新序號。對可靠控制使用新序號，不要盲目重送舊序號。

| type | 額外欄位 | 可操作角色及回覆 |
| --- | --- | --- |
| `confirm` | 無 | 兩端；確認 joined 已收到，撤銷先前恢復證明；`ack {seq}` |
| `decide` | `requestId, approve:boolean` | host；`ack {seq}`，申請人收到 joined 或 rejected |
| `visits` | `open:boolean` | host；`ack {seq}`；關閉時清除全部等待申請 |
| `pose` | `pose` | 兩端；只向另一成員送姿態，自己不收到逐包 ack |
| `preset` | `category, preset` | 兩端；向兩人送含正確發送者的事件 |
| `leave` | 無 | 兩端；`left` 並關閉 socket；host 離開另關房 |

姿態唯一允許欄位：

```js
{
  position: [x, y, z],  // x,z: [-20000,20000]; y: [-12000,50]
  yaw,                 // [-PI,PI] radians
  pitch,               // [-PI/2,PI/2] radians
  tool: 'observe',      // observe/feed/pen/camera/touch/grab/partner
  paused: false
}
```

全部數字有限；不接受 null、字串數字或任意附加欄位。`tool` 只表示所選工具，不宣稱已同步筆跡、餵食／抓握等世界效果。姿態轉送形狀為 `{type:'pose', memberId, generation, seq, pose}`；發送者由伺服器決定。接收者須以 memberId＋generation＋seq 判斷過期資料；失焦／paused 或 presence 斷線時停止外推。伺服器僅保留最新姿態，重連快照可以還原最新可見狀態。

| category | 合法 preset |
| --- | --- |
| `social` | `hello`, `thanks`, `goodbye` |
| `navigation` | `follow`, `wait`, `return` |
| `discovery` | `found`, `look`, `help` |

預設訊息事件為 `{type:'preset', memberId, generation, seq, category, preset}`。不可新增 text、自稱 sender 或任意訊息；前端自行本地化上述 ID。暫時性 preset 不做離線歷史重播。

## 房間事件與失敗

| 事件 | 欄位與前端處理 |
| --- | --- |
| `member-joined` | `member`：加入已核准同伴 |
| `presence` | `memberId,generation,connected`：斷線立即凍結；新世代清掉舊插值資料 |
| `member-left` | `memberId,reason`：移除遠端角色與提示 |
| `request-cancelled` | `requestId`：申請人明確取消或申請逾期，主持者移除等待項目 |
| `cancelled` | `requestId`：取消已受理，等待者清除原始請求並停止重試 |
| `left` | `reason:'left'`：停止連線與上傳，不碰個人探索進度 |
| `room-closed` | `reason`：清除遠端房間狀態；不可偽造返程或故事完成 |
| `error` | `code`：回應拒絕，無任意輸入回顯；通常連線仍可用 |

錯誤包括 `invalid_message`, `invalid_pose`, `invalid_preset`, `version_mismatch`, `not_admitted`, `already_pending`, `host_only`, `stale_session`, `stale_sequence`, `resume_invalid`, `admission_invalid`, `admission_used`, `recovery_full`, `room_unavailable`, `host_unavailable`, `room_full`, `visits_closed`, `server_full`, `pending_full`, `request_unavailable`, `preset_rate_limited`, `rate_limited`。

正常關閉為 1000；被新版連線取代為 4001；握手／訊息速率為 1008；binary 為 1003；過大封包為 1009；慢速接收端為 1013。遠端不回應關閉或心跳時可能只觀察到 1006。所有 close reason 為伺服器固定字串，不含使用者輸入或憑證。

主持者斷線 30 秒內可 resume；其他成員保留房間並得到斷線提示，新申請停止。主持者過期為 `host_disconnected`，正常離開為 `host_left`。客人過期為 `resume_expired`，正常離開為 `left`。等待申請拒絕原因包括 `host_rejected`, `visits_closed`, `room_full`, `request_expired` 及關房原因。

HTTP `/health` 只回 `{status:'ok'}`、`Cache-Control:no-store`，沒有房號、成員、token 或存檔。其餘 method/path（含 query）為 404；WebSocket path/origin/subprotocol 不符為 403，連線額度滿為 503。

## 可選程序重啟恢復（0.18.22）

封包形狀與 protocol 1 不變。設定 OCEAN_STATE_FILE 後，准入／交接／撤銷／可靠控制先提交磁碟，再送任何成功事件。不能在沒有 ACK 時猜測結果；初次意圖使用原 admission，交接使用原 resume，依既有恢復程序查明權威狀態。

重啟不建立新房、不改 roomEpoch/memberId、不延長 admission/pending/resumeRetry；全部成員先離線、pose=null。原本連線中的席位依最後已保存的租約截止時間可恢復，租約於存活時每 5 秒更新一次至 30 秒；已斷線者沿用斷線偵測時的固定截止。普通位置不逐包保存，恢復後由新世代新姿態接續。舊 proof 撤銷、訪問設定、離房、拒絕及預設訊息額度跨重啟保留。

提交失敗或不確定時不送當次成功事件，整個權威停止處理，連線關閉碼 1011、固定 reason=storage_unavailable，health 回 503／status=unavailable，新 WebSocket 升級回 503。不得以 invalid_message 偽裝儲存問題，亦不得繼續使用未提交的記憶體。未設定保存仍沿用原記憶體模式；公網服務並未因此開通。
