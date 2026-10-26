# 0.18.21 雙人同游客戶端驗證

基線 `2f4cc278c4cc17b413f5c139798dea5f0621263a`，本輪規格見 [Stage C 契約](parity/MULTIPLAYER-CLIENT-v01821-SPEC.md)。本機桌機與觸控模擬各 67/67、指定提交的 Pages 建置、294 個公開檔案雜湊及公開正常操作已通過。公開的是遊戲前端；公網多人服務仍未配置。

## 實作範圍

- 正式首頁與水下選單提供匿名雙人房間：建房、貼上房號、申請、房主批准／拒絕、訪問開關、分類預設訊息與離房。
- 位置與方向由真 WebSocket 傳送，只保留兩筆姿態插值，不外推。一般移動最多 10 Hz、只送變更；暫停／失焦狀態立即通知。近於眼睛 2.3 m 隱藏同伴模型，避免重疊入水時擋住視野，海圖仍保留位置。
- 遠端模型使用既有潛水員 rig，最多一個獨立 batch，無新增陰影 pass；收到對方姿態不會讓暫停中的海景反覆重畫。進房前及離房後沒有遠端幾何／送姿態計時器。
- 連線憑證僅留當次頁面記憶體。joined 即時 confirm；首次准入、旋轉重連及控制回覆不明均按協定恢復原席位，不重送建立／批准操作。頁面重載、匯入、存檔所有權撤銷及真實 WebGL context loss 清除遠端狀態。
- `room-service.json` 的公開端點仍為 null；公開網站沒有房間服務，面板會如實說明尚未開放。HTTP loopback 開發版本使用同主機 8787；其他部署僅接受 WSS 設定，不接受玩家輸入中繼網址。

不包含持久身分、42 好友、邀請、共同生物／世界時鐘、工具效果、全部外觀同步、公網服務或實體手機。本輪不關閉工作單 11，也不關閉整體商用目標。

## 已完成的程式檢查

| 邊界 | 證據與範圍 |
|---|---|
| CPU 回歸 | ★★★ 最終來源凍結後重跑 95/95 套；`qa/parity/v01821-final-cpu-results.json`、逐套原始 log。不是 95 個單一 assertion，也不代表原生 GPU 驗收。 |
| 房間服務與新客戶端 | ★★★ 66/66 真網路／CLI 與明示異常封包邊界測試；包含新增 17 項客戶端測試。`v01821-all-server-tests.log`、`v01821-room-client-tests.log`。 |
| 靜態建置 | ★★★ 最終 66/66；179 個既有場景分區逐 SHA-256 核對後重用，沒有重新生成或縮減世界。打包後 294 檔 manifest 全數相符，`qa/parity/v01821-static.log`。 |

原生功能測試使用同一台 M3 Max、安裝版 Chrome、兩個獨立 storage context、預設自動畫質與正常鍵鼠／CDP 觸控輸入。CDP 讀取不提供 userGesture、不改 pose、房間、進度、時間或焦點函式；唯一圖形故障注入使用真實 `WEBGL_lose_context`。觸控配置不是實體手機，也不是 GPU 時間或耗電量測。

## 保留的 RED 與中間失敗

- 原版本缺少多人入口：`/tmp/ocean-v01821-multiplayer-red/report.json`，4/5。
- 第一個客戶端建置仍把入口放在隱藏的舊船上面板：`/tmp/ocean-v01821-multiplayer-desktop/report.json`，5/6；新增可見首頁入口後修正。
- `desktop-2` 完成 46 項後，測試控制器嘗試點隱藏的舊 `shipLog` 而逾時；改走正式設定／探索選單／航程冊，沒有改遊戲存檔或放寬 timeout。
- `desktop-final` 37/38：恢復文案把已准入房間與尚未准入連線混為同一用語。依實際 memberId 分別顯示「恢復原房間」或「恢復這次連線」；無身分恢復不顯示入房後控制。
- `desktop-verified` 52/53：重載前的舊 document 沒有完整收到 CDP `webSocketClosed` 事件，歷史追蹤器誤算仍開啟。最終測試以 TCP proxy 的真實連線數為準，保留缺失 CDP 結束事件的識別碼，不把它們偽標已關閉。退出仍須實際 TCP=0，且不出現新連線或姿態；context loss 只保留另一位房主的 TCP=1。

原始失敗不刪除、不以較早部分通過代替最終結果。所有上述資料夾已逐檔保留於 `qa/parity/v01821-multiplayer-*/`，JSON 與原圖未改寫，`artifact-location.json` 記錄原路徑及保留位置。

## 最終原生雙端驗證

| 配置 | 結果與限制 |
|---|---|
| 桌機 | ★★★ 67/67；1440×900、DPR 2、quality 2、adaptive=true。`qa/parity/v01821-multiplayer-desktop-accepted/report.json`。 |
| 觸控模擬 | ★★★ 67/67；390×844、DPR 3、quality 1、實際 585×1266、adaptive=true。`qa/parity/v01821-multiplayer-touch-accepted/report.json`。同一電腦 GPU，不是實體手機。 |
| 公開多人服務 | ☆☆☆ 未配置；上述雙端使用實際本機服務，受控 HTTPS 未設定端點案例只證明前端行為，不冒充公開驗證。 |

兩端均為原生 ANGLE Metal Apple M3 Max，正式編譯場景；errors=[]、fatal=null。實際輸入覆蓋首連失敗與重試、拒絕／關閉訪問／取消／核准、雙向游動超過 3 m、遠端模型、海圖像素變化、分類訊息、暫停／背景、真正 TCP 中斷與原席位恢復、離房、重載後重新核准、原生檔案匯入、存檔所有權與真 WebGL context loss。

退出後實際 TCP=0，且沒有新 WebSocket 或姿態；訪客圖形故障後只剩房主 TCP=1。重載前舊 document 缺失 CDP 結束事件的識別碼保留在報告，沒有偽改為已關閉。暫停海圖收到真實遠端姿態時 renderer.dirty=false，直接更新 2D 地圖；這不是 FPS 或耗電量測。截圖已檢視遠端模型、桌機及觸控房間面板。

獨立規格與程式審查的修正及結論見 [雙軸審查](parity/REVIEW-v01821.md)。完整多人與商用目標仍在進行。

## 公開交付

程式提交 `f1bd647147cfaadfa91e69db0821484394d554b8` 已推送 main；Pages 回報該提交於 `2026-10-26T08:18:58Z` built、error.message=null。原始回覆：`qa/parity/v01821-runtime-pages-build.json`。

| 公開驗證 | 實際結果 |
|---|---|
| 發布內容 | ★★★ 294/294 檔案的長度與 SHA-256 全數符合本機 manifest；manifest 本身逐 byte 相符。`qa/parity/published-v0.18.21-delivery.json`。 |
| 預設入海 | ★★★ 桌機與觸控配置由線上首頁正常入海；adaptive=true、quality 2／1、compiled=true、streamed=true、43 類圖鑑、8 個 surface programs、WebGL error=0、無自動中央焦點。errors=[]。 |
| 未配置服務的介面 | ★★★ 公開桌機 6/6、觸控模擬 6/6；正式可見入口如實顯示未開放、不建立 socket／模型，關閉後正常單人入海。`qa/parity/v01821-public-desktop/report.json`、`v01821-public-touch/report.json`。 |
| 公網雙人同遊 | ☆☆☆ 尚未提供自有後端；上列公開測試沒有本機 proxy、請求改寫或代用服務，不能算雙人外網驗收。 |

公開測試直接使用 `https://jspusa.github.io/Ocean/`。目前 manifest SHA-256：`cee996bd2c8841024a639f4d5014703dcd0b212d618929ecb878e93669dc42e5`。後續驗證收據的文件提交不修改此 manifest 或 runtime；其 Pages 狀態及代表公開檔案另留於 `qa/parity/v01821-final-delivery-receipt.json`。

本輪新增功能與既有單人入口已按上述範圍交付。完整商用目標、工作單 11、實體手機／其他硬體性能與耗電、全內容和公網連線仍未完成。
