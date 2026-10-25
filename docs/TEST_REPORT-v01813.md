# 0.18.13 載入中斷恢復

固定基準 `3b7037e58ac7c11bccd50c44a8763fc9dd8c3cbb`；[本輪規格](parity/STARTUP-v01813-SPEC.md)。本機驗證完成，公開發布待核對。

## 正式行為

圖片每次最多等待 12 秒，網路圖片沿用兩次退避重試，embedded 圖片不重試。成功才整組替換材質；失敗先取消未完成來源及回呼，再刪除新 GPU 資源，保留原材質與再次升級能力。開場素材失敗使用原有錯誤面板，提供明確文案並聚焦「重新嘗試」。WebGL 與 context loss 的省電重啟／備份語義不變。

完整場景沿用區域請求的取消與截止機制，獨立採 60 秒預算涵蓋 headers、body、非同步解壓與讀取；區域預設仍是 12 秒。保留兩側位元組上限與完整驗證後才上傳模型的順序。失敗使用現有程序場景。非同步截止不聲稱能中斷同步 GL 或 JSON 工作。

本輪沒有修改著色器、模型、材質取樣、降採樣、自動畫質預算或模擬頻率，不將啟動恢復宣稱成 FPS／耗電改善。新增海溝故事只留下 [後續提案](parity/HADAL-INVESTIGATION-PROPOSAL.md)，未算成已交付內容。

## RED 與原生證據

`texture-loading.cjs` 保留原六組斷言並擴充有到期時間的 Image／時鐘 adapter。三輪有效 RED→GREEN：初始無截止、取消來源次序、事件迴圈恢復時過期 onload 搶先於 timer。最終 10/10，含 11,999 ms 期限內成功及無殘留計時器。原始記錄為 `v01813-texture-deadline-{red,green}-{1,2,3}.log`／`-final.log`。

`scene-startup-deadline.cjs` 初始 headers 永久等待 RED 0/1；補完後涵蓋 headers、body、解壓、真正晚到完整 bytes 但不改世界、正常慢成功、parent abort 與 12／60 秒獨立預算。原場景大小與儲存效率斷言 6/6、區域恢復 11/11 保留。`startup-recovery.cjs` 先重現素材故障被誤報成無法啟動 3D，再驗證素材、一般圖形及兩種 context loss 指引。

原生 `startup-deadline-browser.cjs` 使用本機 HTTP 伺服器真正送出 64 bytes 後停止，不替換 runtime Image／fetch／計時器。桌機及觸控尺寸均經三次 12 秒停滯、服務端觀察來源被取消、錯誤面板、正常重新嘗試及真實鍵盤／CDP 觸控游動；保持自動畫質、自由模式、42 類圖鑑與 GL error 0。證據 `v01813-images-native.json`／`.log` 及截圖。

完整場景首次原生 body 停滯約 61.0 秒後取消，程序備援完成、真實鍵盤游動通過，GL error 0。證據 `v01813-scene-native.json`／`.log`。兩份獨立審查均找出 timer 尚未處理時，過期讀取可能先成功的同一邊界；新增 60,000 ms headers、60,001 ms 完整 body 與 59,999 ms 成功控制，10/12 RED → 12/12 GREEN，證據 `v01813-scene-startup-elapsed-{red,green}.log`。正式 helper 於兩次 await 後核對單調時鐘並取消逾時來源。

既有原生材質交易故障測試兩種 profile 通過，永久失敗後完整 RGBA 雜湊與之前相同、GL error 0，包含其他圖片晚到；證據 `v01813-texture-rollback-native.json`／`.log`。測試啟動器改用專案既有 `browser-launch`，保留原軟體預設，這次以 `NATIVE_GPU=1` 明確使用原生 Chrome。

Standards 也指出新原生測試的單指 `touchEnd` 參數不符 CDP 文件。修正為空觸點列表並在游動後確認正式輸入全部歸零。最終 runner 首次執行因成功放手後又無條件 `touchCancel` 而被 CDP 拒絕，記錄保留於 `v01813-startup-final-attempt.json`／`.log`；這是測試操作錯誤，沒有更改產品。清理現在只取消仍按下的觸點，並在 finally detach；修正後重新執行全套原生測試。

Chrome 156.0.8078.47，原生 GPU 為本機 Apple M3 Max／ANGLE Metal。觸控是同電腦的尺寸與輸入模擬，不是實體 iOS／Android，也不是效能比較。完整內容、多人成品、實體裝置及商用驗收缺口仍保留。

## 最終驗收與公開交付

最終 CPU **85/85 suites**、靜態 **61/61** 通過，證據 `v01813-final-cpu-results.json`／`.log` 與 `v01813-static-final.json`／`.log`。完整 CPU 只掃描一次，沒有略過失敗後計為通過；原始兩種下載永久等待的 baseline audit 另存 `v01813-startup-baseline-audit.json`。打包先核對既有 archive 與全部 179 個區塊雜湊，未重建或改動幾何資產，保留離線單檔及 MIT 標示。

| 獨立追審 | 結果 | 範圍 |
|---|---|---|
| Standards | ★★★★★ 原 P2 關閉，未解 0 | 材質交易、場景截止、輸入清理與原始測試證據 |
| Spec | ★★★★★ 原 P2 關閉，未解 0 | 正式行為及期限內／外邊界；公開發布另核對 |

最終 `v01813-startup-final.json`／`.log` 三組情境均通過：桌機與觸控的真實圖片 body 停滯、錯誤入口、正常重載與游動；完整場景 60 秒 body 停滯後成功使用程序備援。全部保持自動畫質、GL error 0、沒有 context loss 或 pageerror；游動後正式移動／環視／浮潛輸入全部歸零。

`v01813-resize-final.json`／`.log` 亦通過桌機與觸控的正式自動解析度、畫質切換、真正 resize／方向事件及實際冷區塊等待回歸；畫布提交前保留上張畫面，合成器截圖與 GL 檢查通過。這是已知黑閃路徑的回歸，不宣稱已排除所有硬體或其他原因的閃屏。

Pages 公開雜湊核對仍待填寫；沒有將推送或本機通過當成公開成功。
