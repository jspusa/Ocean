# 0.18.17 首次入海音訊準備

固定基準 `9683eff7b3416fca6bf176dba1dc6f9ec0f90164`。沿既有正常 UI／正式 OceanAudio 與 Web Audio I/O 邊界驗證，不改變游泳、世界、畫質、自動解析度或聲音偏好。

## 觀察與範圍

v16 首次入海的約 189 ms 是最後首頁 render 至第一個 active render 的間隔，不是 click-to-paint。新增 DOM 事件、透明同步呼叫計時與原生 CPU profile 後，實際 startDive 同步 138 ms，其中 audio.start 133.4 ms；130.33 ms 的自身採樣及 173 次 positionTicks 在 AudioContext 建構行，buildAmbience 僅 2.3 ms。不能把非同步 decode 完成時間當同步阻塞，也不假稱已分辨 constructor 選項或 fallback 的成本。

## 玩家可見要求

1. 使用者選擇入海有聲音時，可在既有載入畫面撤下前準備一次音訊圖，保持未啟用、零 master gain、suspended。準備不抓音樂、不解碼、不啟動週期 tick；首頁不會發聲或持續處理音訊。
2. 只在本頁持有航程、前景可見且有焦點、startWithSound=true 時預備。被存檔鎖住、偏好關聲音或背景載入不強制建立。不可在可操作首頁偷偷排程阻塞性準備。
3. 點擊入海／開聲音仍直接在使用者手勢堆疊呼叫 resume，不 await 後才呼叫。沒有預備時保留 lazy fallback；建立／準備失敗不阻止遊戲開啟，後續可重試。
4. 沿用同一音訊圖、兩軌原創配樂及既有音量／環境／呼吸／本機音樂路徑，不重複來源或 timer。準備期間失去本頁使用權或轉入背景時保留靜音／暫停，未啟用圖可安全釋放。
5. 不宣稱消除 AudioContext 建構成本：把必要的一次性工作納入可見載入階段。必須量測準備時間、首頁、click 到第一個提交及同步 start 時間，確認 resume 未重新承擔同一阻塞。

## 證據

逐個外部行為 RED→GREEN：正式 OceanAudio 呼叫、Web Audio 原語及 timer／fetch 邊界；正常首頁點擊／觸控、保存偏好、重載、靜音、背景與多分頁保護。真瀏覽器不使用自動允許音訊旗標；明示嚴格 user gesture policy 再驗。實體手機、人耳音質及普遍功耗不在模擬測試證據中。

官方語義：[Chrome autoplay](https://developer.chrome.com/blog/autoplay/#web-audio) 說明預建 context 必須由手勢 resume；[AudioContext suspend](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/suspend) 說明暫停時間／音訊硬體處理。這些支持生命週期，不替代本機效能量測。
