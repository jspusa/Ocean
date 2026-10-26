# 0.18.23 呈現節奏與無日光陰影雙軸審查

固定基線 `dca9fdbeb77628ac83e079b6aca7704e2ad2bccd`；[規格](FRAME-PACING-v01823-SPEC.md)、[實際證據](../TEST_REPORT-v01823.md)。本輪採凍結來源相對基線的工作目錄 diff，兩軸由不同代理唯讀審查，沒有參與本輪生產碼實作。AskMatt code-review 的既有本機追蹤與原規格沿用；root 彙整結果。

## Standards

來源 `/root/multiplayer_standards_review`。初審沒有 P1/P2 或硬性標準違規，也沒有值得阻擋的 smell。deadline 容差固定有界、保留原相位及原始時間；回升精度只調整 recovery，不放寬真正慢幀平均值。深海 dirty／force 延後至第一個有日光幀，矩陣與貼圖失效各自處理。

immutable uniform fixture 雜湊與基線相同。測試先恢復兩個 shadow IO guard，對完整舊 hash／state 成功後，才剔除已知 shadow rows，沒有重製 baseline。定向 cadence 16/16、sunless 7/7、uniform 7/7。

原生 GPU 報告覆核：1,200 個原始樣本可重算 12 組中位數與 signed percent，文件逐列一致；24 PNG 的實際 bytes／hash、12 對 RGBA 相同、GL=0，封存 report 與原件逐 byte 相同。控制場景波動及桌機部分較慢明確保留，沒有全面 GPU 加速、實體手機或耗電宣稱。凍結 engine SHA 與報告一致。

## Spec

來源 `/root/room_restart_spec_review`。初審沒有 P1/P2。§1–2 的有界精度補償與原始統計保留，cadence 16/16；§3–4 分開矩陣有效性與 shadow texture 有效性，保留 deep dirty／force，sunless 7/7、origin 4/4。原 immutable 基線投影 7/7。

GPU harness 取固定提交的正式 Renderer，共用實際 linked programs／幾何，先驗 shader 相同、保留 ABBA 全樣本、完整 RGBA 比對。預載 keep 的受控工作量不能當自然串流／FPS／耗電，文件如實明示。正常 UI 測試審查另外找到一項 P2 證據缺口：重載只確認照片 metadata，沒有重新讀取原 JPEG。作者已補正常首頁設定／相簿／原照片開圖、等待解碼，再核對 SHA-256／bytes／寬高，保留另存原檔。程式複審通過，最終兩端實跑與原檔核對已補齊。

獨立來源審查核對全部 17 個 shader 字串相同；GPU harness 執行時核對其中 15 個，另外兩個為 RAY_VS／RAY_FS。此兩種證據明示區分。正常 UI 最終結果已覆核；正式公開交付另列本輪報告。

| 軸線 | 目前結果 |
|---|---|
| Standards | ★★★ 生產碼、原生 GPU 及最終正常海溝證據無剩餘 P1/P2 |
| Spec | ★★★ 照片重載 P2 證據已補，最終本機無剩餘 P1/P2；公開交付另驗 |

完整多人、公網服務、實體手機、全內容與商用放行範圍保留，不因單輪回歸通過將持續目標標為完成。

兩軸最終均唯讀核對桌機 54/54、觸控 68/68，errors=[]、fatal=null、3 epochs、2 次 first-sunlit transition、staticDelta=1、shadowDraws>0、有效矩陣與自動畫質。實際原照及重載 JPEG 逐 byte 相同：桌機 100,616 bytes、觸控 46,534 bytes；最後各完成 30 個淺水遊玩幀。本輪本機驗收缺口已關閉，完整目標保留。

root 後續公開驗收完成：指定程式提交 Pages built、294/294 檔案雜湊、雙端正常入海／55 項操作，以及正式網址觸控完整海溝 68/68。此為 root 執行證據，沒有宣稱兩位審查代理親自操作公網站；公開狀態及文件提交收據見本輪報告。
