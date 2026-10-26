# Ocean room protocol 1

連線：`new WebSocket(endpoint + '/v1', 'ocean.v1')`。端點不得帶 query；伺服器要求精確允許的 Origin。JSON 僅接受下表欄位，未知欄位拒絕。第一個服務訊息為 `{type:'hello', protocol:1, contentVersion}`。下例是結構說明，`<...>` 為執行時資料，不是可用憑證。

## 初始與准入

尚未加入時可以送出以下訊息：

| type | 其餘必要欄位 | 結果 |
| --- | --- | --- |
| `create` | `protocol:1, contentVersion, name` | 建立房間，收到私有 `joined`，角色 host |
| `request` | `protocol:1, contentVersion, name, roomId` | 自己只收到 `pending`；主持者收到 `join-request` |
| `resume` | `protocol:1, contentVersion, roomId, memberId, resumeToken, resumeNonce` | 成功收到新的私有 `joined`；舊能力值立即失效 |

名稱 1–24 個 UTF-16 code units，不得全空白或含 Unicode control/format 字元。名稱是暫時顯示名稱，不是已驗證身分。房號及 memberId 是識別碼，不授予讀取房內狀態的權利。未知房號、版本錯誤、滿房、訪問關閉或主持者不在線皆不產生申請。

`pending` 只有 `{type, requestId}`，不包含房間世代、其他成員或姿態。等待者不能建立另一房間或重複申請；退出等待直接關閉 socket。

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

### 可恢復的重連旋轉

每次開始新的重連程序，客戶端先使用安全亂數產生 32 bytes 的 `resumeNonce`，以無 padding base64url 編碼為 43 字元。Nonce 只用於這次程序，不能放入日誌、URL、遊戲存檔，也不能在下一次程序重用。它與現行能力值一同構成這次重連的私有恢復證明。

伺服器接受現行能力值後，立即旋轉能力值、增加世代、取代舊 socket，再送出 `joined`。另外只保存一個「未確認交接」紀錄：完整原始 resume 身分／能力值／nonce 的 SHA-256 digest，以及從第一次接受起算的 30 秒截止時間。當 `joined` 因網路中斷未送達時，客戶端關閉前次 socket，使用**完全相同**的 resume 內容重試。只在此紀錄仍未確認且未過期時可恢復；每次恢復仍旋轉能力值、增加世代、關閉前一 socket，截止時間不延長。

客戶端取得 `joined` 後，先保存新能力值與世代，立即送 `confirm` 操作（不等待遊戲 RAF）。伺服器清除未確認交接紀錄並回 `ack`。第一個通過當前 socket、世代與序號驗證的其他已准入操作也代表已取得 joined，會清除同一紀錄。若 confirm 或其 ack 遺失，客戶端已保存新能力值，可用新 nonce 開始下一次重連，無須回頭使用原始請求。

客戶端一次只可有一個重連程序，保留至多一個未取得 joined 的原始 resume 請求，任意多次中斷都重試該內容。成功取得 joined 後刪除原始請求；不得多分頁競爭重連。無回覆不是拒絕；網路不通時保留該請求直到期限，不能自行猜測新能力值。明確 `resume_invalid` 表示資格已過期、被更新、已確認或房間消失，停止以該請求重試。

每名成員只存現行能力值 digest 與最多一個有界恢復證明，沒有明文能力值、重試歷史或傳出重送佇列。舊能力值加上不同 nonce 一律無效；現行交接一經確認，連完全相同的舊請求都無效。下一次使用現行能力值的正常 resume 取代前次證明。任何舊 socket 的操作、延遲關閉及舊世代封包都不能影響新世代。既有握手、連線、限流、心跳與斷線席位期限仍適用；原生客戶端不能藉重試延長此證明的固定截止時間。

本規則恢復的是已有資格者的重連回覆遺失。第一次建立／核准的 `joined` 若從未送達，客戶端尚未得到 room/member/capability，仍需重新建立／申請並等待原席位到期；Stage B 身分與邀請流程須另行處理這個邊界。服務重啟仍會失去記憶體中的房間。

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
| `request-cancelled` | `requestId`：申請人斷線，主持者移除等待項目 |
| `left` | `reason:'left'`：停止連線與上傳，不碰個人探索進度 |
| `room-closed` | `reason`：清除遠端房間狀態；不可偽造返程或故事完成 |
| `error` | `code`：回應拒絕，無任意輸入回顯；通常連線仍可用 |

錯誤包括 `invalid_message`, `invalid_pose`, `invalid_preset`, `version_mismatch`, `not_admitted`, `already_pending`, `host_only`, `stale_session`, `stale_sequence`, `resume_invalid`, `room_unavailable`, `host_unavailable`, `room_full`, `visits_closed`, `server_full`, `pending_full`, `request_unavailable`, `preset_rate_limited`, `rate_limited`。

正常關閉為 1000；被新版連線取代為 4001；握手／訊息速率為 1008；binary 為 1003；過大封包為 1009；慢速接收端為 1013。遠端不回應關閉或心跳時可能只觀察到 1006。所有 close reason 為伺服器固定字串，不含使用者輸入或憑證。

主持者斷線 30 秒內可 resume；其他成員保留房間並得到斷線提示，新申請停止。主持者過期為 `host_disconnected`，正常離開為 `host_left`。客人過期為 `resume_expired`，正常離開為 `left`。等待申請拒絕原因包括 `host_rejected`, `visits_closed`, `room_full`, `request_expired` 及關房原因。

HTTP `/health` 只回 `{status:'ok'}`、`Cache-Control:no-store`，沒有房號、成員、token 或存檔。其餘 method/path（含 query）為 404；WebSocket path/origin/subprotocol 不符為 403，連線額度滿為 503。
