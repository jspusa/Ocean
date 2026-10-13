# 0.12 Standards gate：夥伴跨模組整合

2026-10-13；只讀檢查相對已發佈 0.11 的工作變更：ecology、audio、cetacean_world、cetaceans、engine、individuals、aquarium。只新增獨立 CPU 回歸測試，未修改執行碼、未開 GPU。

## 已記載的硬性規範

**未發現實質違反。** `build.py:1–4` 的無外部 runtime 依賴／獨立離線／子路徑承諾仍由本地程序模型與本地載入維持；狀態及展示容量有上界。`docs/agents/issue-tracker.md` 要求完整驗收才關票，票 02 仍為 in-progress，未將原作未知項或局部交付標成完整。此項是原始碼核對，不是本輪離線實測。

## 正確性判斷與證據

| 優先級／狀態 | 位置、重現與處理 | 證據強度 |
|---|---|:---:|
| P2／已修（CPU） | `src/engine.js:643` 的 `updateBatch` 已讓 kind7 與 kind9 接收 `partnerFinPulse`，舊瓶鼻海豚不再丟失 `src/ecology.js:239` 的握鰭訊號。`src/engine.js:82–86` 共用顏色／陰影頂點程式加入舊種胸鰭變形及 bank。獨立測試將 pulse 從 0 改為 .8，instance data 現在隨之改變；原先相同資料的 RED 已轉綠。另讀取 water 的 GPU 結果：真實 VS／mesh transform feedback 正側胸鰭抬升 .606 m，另一側／身體／頭部保持 0；本 reviewer 未重跑 GPU | ★★★ CPU 紅綠；GPU 結果另由 water 執行 |
| P2／已修 | `src/audio.js:40,53–54` 的訓練在 active=false，原本 master 一律 0，三音 cue 建好仍無聲。現在實際訓練可開 master；呼吸、泡泡與踢水仍需 active。最小 graph seam 驗證訓練聲音、mute／hidden／master0 及普通船艙面板關閉 | ★★★ CPU graph 先紅後綠；未實聽 |
| P2／已修（休憩音樂，CPU） | `src/audio.js:40–46` 以 modal=`shipRest` 且 ship mode=`rest` 加入輸出資格，休憩 environment=0；global mute／hidden／master0 先行，active-only 呼吸／泡泡保留。原 source→music→master 無需中斷或重建，離開休憩仍關閉主輸出。未發現新保存、狀態洩漏或來源重複 | ★★★ production graph 4/12 RED → 12/12 GREEN |
| P2／已修 | `src/ecology.js:114–116` 成功招募先清除原抓握與訓練，避免 selected 新夥伴但 grabbedUID 仍為舊夥伴；失敗替換不變動資料。詳見 [Spec gate](REVIEW-v012-spec.md) | ★★★ CPU 先紅後綠 |
| P2／已修（來源核對） | `src/ecology.js:248–252` 隨物種接觸半徑計算站位，約 8° 側偏，修正夥伴停得太遠及直向畫面看不到的問題 | ★★★ root／living CPU；本 reviewer 只讀 |
| P2／已修（來源核對） | `src/ecology.js:194–222` 從只碰撞終點改為體型擴張、前視線段、兩階段繞行與每步侵入檢查。移動仍受 speed × dt 上限；detour 僅在 runtime，招募／選擇／首次呼叫／訓練／reset 清除，未寫入存檔或更改 home、UID、尺寸。未發現新增保存或生命週期缺陷 | ★★★ root／living CPU；本 reviewer 只讀 |
| P2／已修（最終取景） | `src/ecology.js:342–345` 只調整直向訓練待命的眼位距離與注視點，未寫入玩家設定／存檔，退出仍走原 ship camera；既有表演鏡頭分支保留。root 紅測曾得到模型底部 566 px 超過面板頂部 523 px；新取景測試隨修復轉綠，未發現新的生命週期或資源問題 | ★★★ 來源核對＋root GPU 結果 |

**Standards gate 通過本輪原始碼及 CPU 範圍，沒有剩餘已證實缺陷。** 沒有另報純命名、重複表或抽象層數偏好；現有全域模組慣例優先。

## 執行範圍

| CPU 測試 | 結果 |
|---|---|
| `tests/parity/ecology.cjs` | ★★★ 37/37 |
| `tests/parity/cetacean-motion.cjs` | ★★★ 11/11 |
| `tests/parity/aquarium.cjs` | ★★★ 12/12 |
| `tests/parity/partner-state-review.cjs` | ★★★ 10/10；修復後獨立重新執行 |
| `tests/parity/ship-audio.cjs` | ★★★ 12/12；修復前 8 項休憩輸出失敗，修復後獨立重跑全綠。真 start／loadLocal／tick，mock 僅 Web Audio primitives，沿實際連線檢查控制增益 |
| `tests/parity/partner-follow.cjs` | ★★★ root／living 回報 19/19；七新物種 × 桌面／直向 14 項、大小體型 × 左右繞行 4 項、reset 1 項。已讀取測試，效能量測期間未重跑 |
| GPU 結果檔 | ★★★ 讀取 water 的 cetacean desktop 20/20、touch 14/14，errors=[] |
| 實際 UI 結果檔 | ★★★ 讀取 root 的 partners desktop／touch／landscape 各 47，errors=[]；含匯出／匯入、八入口、滿席替換及七個新增全身取景檢查 |

新增結果採明確分工：本 reviewer 自行執行的 CPU 與讀取其他執行者結果分開列出，沒有重跑 GPU 或干擾效能量測。瀏覽器為控制場景及觸控模擬；不代表實體手機、自然招募全流程或全部 Wii 對等。聲音實聽不由 graph seam 代替。

最終新增測試的來源核對：`tests/parity/projected-partner.mjs:7–24` 使用 production VS／真 GPU mesh，四個待命相位取全身投影；finally 還原批次 instances、釋放 buffer／feedback／program／shader 並重繪。`partners-browser.mjs:31–34` 在實際手勢後、面板完成顯示時檢查 8 px 邊界。它驗證取景而非水下可見度／遮擋，不涵蓋整段表演、任意視窗或原瓶鼻海豚全姿勢；未以部位 hit target 通過替代全身判定。本 reviewer 僅核對來源及三份 47 項結果檔，root 另檢視最終截圖。

追加音訊邊界：CPU 檢查連線及增益目標，不模擬 MP3 codec、漸變時序或聲波，更不是人耳實聽。`ship-browser.cjs` 原先只驗 custom／檔名／sound 狀態；root 已補實際 MP3 與 master analyser 波形、靜音／音量／idle／離開檢查，目前執行中，待其結果才列為瀏覽器完成。本 reviewer 未執行 GPU，也未修改音訊來源碼。

## root 發布前補記：0.12.1 音訊實測

`ship-browser.cjs` 桌面、觸控直向與橫向各41/41；實際MP3／原創配樂、音量恢復及idle的master analyser RMS>0.00001，音量0／起身後RMS<0.000001。靜音按鈕確認真實AudioContext suspended，重新啟用後同一來源輸出恢復；不將暫停context保留的最後analyser樣本誤判為仍播放。環境匯流排為0，未以水下雜訊充當音樂。這是root的瀏覽器／輸出量測，不是本獨立reviewer親跑或實體喇叭聆聽。
