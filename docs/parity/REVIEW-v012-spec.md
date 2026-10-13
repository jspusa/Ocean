# 0.12 Spec gate：夥伴狀態與訓練

2026-10-13；獨立只讀 review `src/ecology.js` 與相關公開介面，對照 SPEC 11／12／31／33，另補 SPEC 27 休憩音樂、票 02 及 [原作來源補查](WII-PARTNER-REFERENCE.md)。此紀錄不是完整 parity 或發佈驗收。

## 發現與修復核對

| 優先級／狀態 | 位置、重現與影響 | 證據 |
|---|---|:---:|
| P2／已修復 | `src/ecology.js` 的 `befriend()` 成功路徑：騎著 A 再招募 C，或告別非 selected 的 B 換 C，原先會 selected=C、grabbedUID=A、riding=true，導致操控 C 卻抓住 A。現在成功切換前執行 `releaseGrab()` 並清訓練；失敗招募保持原狀 | ★★★ CPU 公開 API，先紅後綠 |
| P2／已修復（新增核對） | `src/ecology.js:248–252` 夥伴站位改依接觸半徑及體型，向前約 8° 側偏，避免已同行卻無法再接觸、或直向畫面落在畫外 | ★★★ root／living 14 項 CPU；本 reviewer 只讀 |
| P2／已修復（新增核對） | `src/ecology.js:194–222` 每步檢查體型擴張的前視路徑及終點，採左右兩階段繞礁；detour 清理不污染持久 roster／name／mastery。大／小個體雙向繞礁及中途 reset 涵蓋 5 項 | ★★★ root／living CPU；本 reviewer 只讀 |
| P2／已修復（最終取景） | `src/ecology.js:342–345` 直向待命鏡頭距離改為 1.4 倍，注視點改為舞台下方 1.2 × 體型比例，保留控制面板上方的全身空間。root 曾重現短吻真海豚模型底部 566 px 落到面板頂部 523 px 以下；部位按鈕可點並不足以排除此缺陷 | ★★★ root GPU 先紅後綠；本 reviewer 來源／結果核對 |
| P2／已修復（休憩音樂，CPU） | `src/audio.js:40–46` 原本僅潛水／訓練能開 master，休憩 MP3 已解碼／啟動仍靜音。現在 `shipRest` 加實際 rest 模式可播放原創／本機音樂；idle 同模式保持，離開關閉輸出，休憩環境匯流排為 0。未停掉／重建音樂來源，也保留潛水及訓練路徑 | ★★★ 獨立 4/12 RED → 12/12 GREEN；瀏覽器結果見末段 root 補記 |
| 證據修正／已核對 | `tests/parity/ecology.cjs` browser 手勢與保存斷言原先仍期待舊 jump／spin 對應；現已更新為嘴部點觸 spin、胸鰭撫摸 sing、保存 mastery.spin | ★★☆ 原始碼核對；本輪未跑 browser |

**本輪狀態 review 沒有剩餘已證實的資料損失或夥伴身分阻斷。** 跨繪圖／音訊的兩項缺陷已完成 CPU 紅綠核對，詳見 [Standards gate](REVIEW-v012-standards.md)。夥伴獨立測試 10/10，追加休憩音訊 12/12；狀態測試通過不等於所有感官回饋已驗收。

## 測試內容與限制

| 項目 | 結果／涵蓋範圍 | 把握度 |
|---|---|:---:|
| 原 ecology CPU suite | 37/37；互動距離／遮擋、知識、招募、基本映射、隊列、記錄與清理 | ★★★ CPU |
| 新 `tests/parity/partner-state-review.cjs` 狀態部分 | 8/8；失敗替換不改舊資料、成功替換完整保存、新個體零熟練、舊同種三夥伴進度保留、抓握切換、三指令順序、三種基礎動作的 18 組強度邊界、離開訓練仍保留已完成熟練 | ★★★ CPU |
| `tests/parity/ship-audio.cjs` | 12/12，獨立重跑；真 `start/loadLocal/tick` 建圖，追蹤來源至 destination 的控制增益。涵蓋原創／本機、idle、離開／重入、潛水／訓練、mute／hidden／music0／master0、恢復原創及休憩無呼吸／泡泡 | ★★★ CPU 圖路由；不模擬解碼或實際波形 |
| 保存證據 | 以實際 sanitize／公開 API、JSON 複製及 save callback 驗證；不是瀏覽器 localStorage 匯入、重新載入或磁碟失敗驗證 | ★★☆ 有範圍限制 |
| 37 項中的姿勢唯一性測試 | 原先內含唯一 id 的版本無法證明姿勢不同；現已排除 id，37/37 重新通過。另有獨立握鰭 instance encoding 測試；CPU 姿勢不能替代畫質驗收 | ★★★ 已修正測試品質 |
| 新增 follow suite | root／living 回報 19/19。七新物種兩種 viewport 共 14、兩種體型雙向繞礁共 4、reset 1；已核對 source 和公開 API 斷言，未在效能量測期間重跑 | ★★★ 分工 CPU；非本 reviewer 重跑 |
| GPU／玩家操作結果檔 | 讀取 water 的 cetacean desktop 20/20、touch 14/14，root 的 partners desktop／touch／landscape 各 47；errors=[]。包含舊種握鰭真 shader 通道、八候選入口、滿席替換及真實檔案匯入／匯出；本 reviewer 未重跑 GPU | ★★★ 分工證據；受控場景／觸控模擬 |

新增 `tests/parity/projected-partner.mjs` 以 production VS 與實際 GPU 網格取 transform feedback；在真實嘴部按住操作後，對七新物種各取四個待命變形相位，要求全身投影離畫布／面板邊緣至少 8 px。`partners-browser.mjs:31–34` 將此檢查獨立於 44 px 部位可點檢查；已讀取三種 viewport 的 47 項通過結果，沒有由本 reviewer 重跑 GPU。

這驗證的是待命全身**取景**，包含水下頂點，不保證所有頂點在水／遮擋之後仍可見，也不等於完整表演全時間、任意 viewport 或實體手機驗收。七個新增取景案例不應冒稱八種候選全姿勢掃描；root 另作最終截圖目視，包含康氏矮海豚完整吻部。

fixtures 明確建立 actor 位置與熟悉度，只用於狀態邊界；不冒稱自然游動完成的全流程。測試不只檢查原始碼字串。

## SPEC 邊界

| 玩家故事 | 本輪判定 |
|---|---|
| 11：多種夥伴、呼叫／抓握／退出 | ★★★ CPU 狀態相容；新增接近／繞礁公開 API 測試與 root browser 結果均另列範圍 |
| 12：部位手勢、隊列、Go、動畫與回饋 | ★★★ 規則邊界已測；實際動畫和聲音不由 CPU 數值代替 |
| 27：自選 MP3、音量及休憩 | ★★★ 音樂輸出路由已紅綠閉合；原 browser 只查檔案解碼的斷言已補真 analyser 檢查，其實際執行結果見末段 root 補記 |
| 31：新舊狀態保存與匯入 | ★★★ sanitize 舊資料保留；root 實際檔案匯入／匯出及 reload 結果列入分工證據 |
| 33：可盤點內容與原作對等 | ★☆☆ 六基本與三指令上限出自同期攻略；精確升級門檻是本作明示設定，八候選交好規則與全部特技總數仍未一手查明，不可將票 02／整體 parity 勾成完成 |

沒有因純程式碼可列出名稱，就宣稱全部原作特技已完成。上述 browser 使用控制場景，觸控為模擬而非實體手機；聲音實聽、自然探索招募全流程與原作未查明規則不由這些結果取代。

## root 發布前補記：0.12.1 音訊實測

`ship-browser.cjs` 桌面、觸控直向與橫向各41/41；實際MP3／原創配樂、音量恢復及idle的master analyser RMS>0.00001，音量0／起身後RMS<0.000001。靜音按鈕確認真實AudioContext suspended，重新啟用後同一來源輸出恢復；不將暫停context保留的最後analyser樣本誤判為仍播放。環境匯流排為0，未以水下雜訊充當音樂。這是root的瀏覽器／輸出量測，不是本獨立reviewer親跑或實體喇叭聆聽。
