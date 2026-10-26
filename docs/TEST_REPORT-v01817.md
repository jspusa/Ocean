# 0.18.17 首次音訊啟動與准入恢復

固定基準 `9683eff7b3416fca6bf176dba1dc6f9ec0f90164`。本輪繼續完整商用／Wii 功能目標，不把音訊或房間切片當作全部完成。玩家端只改第一次音訊圖的準備時機；渲染器、地形、生物、光影、解析度、自動畫質與游泳操作保持。

## 首次入海歸因

v16 的 189.2／180.2 ms 是最後首頁 render 至第一個 active render 的間隔，並非 click-to-paint。本輪透過正常 UI、透明函式計時、DOM 事件與原生 CPU profile 進一步定位。

| 桌機首次正常點擊 | 當次量測 | 支持的結論 |
|---|---:|---|
| 整個 startDive 同步執行 | 138.0 ms | ★★★ 存在長任務 |
| audio.start 同步執行 | 133.4 ms | ★★★ 主要工作落在音訊初始化 |
| AudioContext 建構行自身採樣 | 130.33 ms／173 次 | ★★★ 定位至帶選項建構及其 fallback 同行，未假稱已細分原生裝置工作 |
| buildAmbience 同步執行 | 2.3 ms | ★★★ 噪音合成不是主要阻塞 |

證據：`qa/parity/v01817-start-trace.json`、`.log`、`.cpuprofile`。這是當次原生 Chrome／Apple M3 Max 的同步行為，不能推導所有裝置耗時或功耗。

依 [音訊規格](parity/AUDIO-ENTRY-v01817-SPEC.md)，只有偏好入海開聲音、持有航程、可見且有焦點的頁面，在既有 loading 撤下前預備音訊圖。準備保持零 master gain、未啟用、suspended、不抓取音樂、不啟動週期 tick；首頁不啟動聲音。正常入海仍在原始使用者手勢內直接 resume。偏好關聲音、背景或存檔被鎖住時不強制準備；未用圖可釋放，準備失敗可由手勢重試。

這是必要初始化工作的時機調整，不宣稱建構成本消失或整體下載變快。載入時間、同步 prepare、可信 click 到第一個完整 renderer submit，以及同步 start 分別記錄；submit 不是螢幕實際呈現時間。

## 音訊驗證界線

正式 OceanAudio／Web Audio I/O 邊界的準備與釋放案例，保留 RED→GREEN；目前 CPU 聲音路徑 **15/15** 通過。沿用原創雙軌、各音量、船上休息、呼吸／環境及本機音樂路徑；CPU gain 路由不是人耳音質或 codec 驗證。

第一輪 browser 儀器因缺少 enable-automation 無法讀 command line，未進入產品斷言。正式 RED 證明首頁尚未建立音訊圖。第一輪正常流程雖 30/30，但覆核發現 Playwright 的 evaluateWithArguments 設定 userGesture=true，污染預備時 activation。該結果保留為 `v01817-audio-entry-observed-contaminated.json`／`.log`，不能用來宣稱無手勢預備或 autoplay 驗收。Runner 改以 Runtime.evaluate(userGesture:false) 作全部讀取與等待，並硬性檢查首次真操作之前 activation=false、resume=0、音樂 IO=0。

修正儀器後，嚴格無合成手勢的正常流程 **32/32** 通過（桌機與觸控尺寸各 16 項）。兩端首次 constructor 的 isActive／hasBeenActive 均 false；首頁音訊 suspended、master=0、enabled=false、timer=null、音樂 IO=0、resume=0。設定關聲音、保存重載、無聲入海、由設定開聲音的 lazy fallback、第二同源分頁鎖定均通過，errors=[]。

| 同機正常入海，嚴格 gesture policy | 桌機 | 觸控尺寸 | 判定 |
|---|---:|---:|---|
| loading 內 prepare 同步時間 | 126.9 ms | 128.6 ms | ★★★ 成本保留在載入階段 |
| 入海 audio.start 同步時間 | 0.6 ms | 0.7 ms | ★★★ 重用既有圖 |
| 入海 startDive 同步時間 | 5.0 ms | 6.1 ms | ★★★ 可信點擊／觸控 |
| resume 同步時間 | 0.1 ms | 0.1 ms | ★★★ 位於原始使用者手勢堆疊 |
| click 至首個完整 renderer submit | 29.7 ms | 10.7 ms | ★★★ 非螢幕 paint 或普遍 FPS |

完整來源 `v01817-audio-entry-strict-green.json`／`.log`。此正常流程於相同正式源碼、打包版號更新前執行；最終打包及公開版本另驗。背景／失焦與準備失敗的分項證據及原生返回焦點限制見下文；公開結果仍待執行。

## 首次准入回覆恢復

依 [准入恢復規格](parity/ADMISSION-RECOVERY-v01817-SPEC.md)，初次 create／request 帶不可猜測 nonce；recover 精確綁定原請求，只恢復原房、原申請或原席位，不建立新房、不繞過主持核准。等待到期與核准後恢復窗口分開；重試不延長期限。等待 socket 斷開保留原申請，明確 cancel 才取消。

確認或現行有效操作撤銷原 proof，正常 resume 也撤銷初次證明；舊 socket／世代不能取代新連線。拒絕、關房與容量限制保留；全域最多 192 筆摘要／短期撤銷紀錄，滿額在配置新房／申請前拒絕。Standards 審查後將共同交接放入 handoff，兩種 proof 的驗證及撤銷仍在各自分支。

真 HTTP／TCP／WebSocket／CLI **49/49** 與語法檢查通過，包括真 TCP 丟棄首次房主／訪客／pending 回覆，以及未 confirm 就 resume 撤銷原 proof；共享交接重構及最終 v0.18.17 打包後重跑仍為 49/49，沒有跳過或失敗。證據見 `v01817-server-final.log`、`v01817-server-check-final.log` 與各 RED→GREEN 記錄。

此服務仍為本機、單程序記憶體基礎，未接入遊戲，也未公開部署。持久身分／好友／邀請、共同世界／全部工具、前端雙人、服務重啟恢復、外網與實體裝置，以及完整商用門檻均未完成。

## 最終打包回歸

最終 v0.18.17 的 CPU **89/89 suites**、靜態 **61/61** 通過；包括音訊 15/15、自由游動、海溝與生物、存檔、輸入、自動畫質、畫面保留、載入恢復及模組／manifest 一致性。CPU 渲染規則不等於 GPU 黑閃或實體裝置驗收。打包重用已校驗的 179 個場景分塊，公開 manifest 仍列 287 個檔案。證據：`v01817-final-cpu-results.json`、`v01817-static.json`、`v01817-pack.log`。

## 生命週期測試方法與儀器修正

生命週期 runner 在 Web Audio 建構、節點與 suspend 邊界注入失敗，不修改玩家、存檔、時間、畫質或正式可見性狀態。所有觀察用 CDP userGesture=false；真正獨立 Chrome 視窗製造失焦。背景載入案只暫緩原樣 bootstrap.js 的 HTTP 交付，待真失焦後 continue，屬網路時序控制，不能用來量測無干預載入速度。

最初 context.newPage 實際在同一原生視窗開分頁，真失焦前置條件未成立；改用 newWindow 後，產品的背景跳過準備／失焦釋放均通過，但 bringToFront 無法使原視窗重新取得焦點。這些未完成執行保留，不當作全綠結果。關閉輔助視窗、Chrome app 啟用、精確 browser PID 的原生啟用，以及移除重複 focus-emulation 關閉的時序 probe，均未恢復頁面的真實焦點；最後停止儀器嘗試，未降低斷言或注入 DOM focus 事件。

| 最終本機生命週期證據 | 實際結果 | 界線 |
|---|---|---|
| 五種 Web Audio 故障 × 桌機／觸控 | ★★★ 10 案、90 項通過 | 正常 UI 重試、兩配樂來源、非零 RMS、master→limiter→destination，無 page errors |
| 真失焦背景載入及準備中失焦 | ★★★ 兩端共 8 項產品斷言通過 | 不建立音訊／不抓音樂，或原生 close 並移除未啟用圖 |
| 真視窗失焦→返回→正常入海啟音 | ★☆☆ 尚未完成 | 原生視窗返回焦點 gate timeout；14 案完整 runner 為 failed，不能稱 14/14 或將 98 個分項通過算成全綠 |

完整輪保留於 `v01817-audio-lifecycle-window-return-failed.json/.log`；其他儀器失敗為 `same-window-failed`、`focus-probe`、`native-focus-probe`、`pid-focus-probe`、`focus-order-probe`，各有原證據。最終 probe 的 PID 原生啟用回傳 true，頁面仍 hasFocus=false、hasBeenActive=false、無 trusted focus。此為未完成的儀器前置條件，沒有已確認的產品失敗，也不能用正常 strict 32/32 取代真視窗返回端到端驗證。觸控全部是同一桌機模擬，實體手機與人耳品質仍待驗收。

[獨立雙軸審查](parity/REVIEW-v01817.md) 沒有已確認的 production 阻擋；Spec 保留上述 1 項端到端驗證缺口。本次有限音訊修正版不等於完整音訊／商用驗收。
