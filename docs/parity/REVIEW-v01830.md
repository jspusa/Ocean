# 0.18.30 獨立兩軸審查

固定基準：已公開 0.18.29 `4a3d9851ed4db525a52185f5d4f306f21ea05764`。規格為 [DEEP-WATER-v01830-SPEC](DEEP-WATER-v01830-SPEC.md)，保留完整 [SPEC](SPEC.md) 第 32 項及商用未完成範圍。檢查 `git diff 4a3d985` 與新增測試／報告；程式作者、harness 作者與兩位唯讀審查者分開。

正式 engine：`8485d541e6f0587d155af47dfff53667cc8f415b56cc122a5cd52f900be16200`。原生 runner：`67195c2b2fd4319362d483b9160bc616491f9df9ab6d46008ec974e85848cc9b`。

| 審查軸 | 本輪結果 | 範圍 |
|---|:---:|---|
| Standards | ★★★ 無未解項目 | 明文規範違反 0、Fowler heuristic 0；一項既有斷言覆蓋缺口已補 |
| Spec | ★★★ 程式無未解項目 | 唯一 guard、原畫面與工作量、明示 cleanup v2 符合契約；驗收分開執行 |

## Standards

依 `CONTEXT.md`、`docs/agents/issue-tracker.md`、使用者比較表格／星星規則與 AskMatt 的 Fowler baseline 檢查，沒有另行找到專屬 coding standards。正式 renderer 僅以既有 sunless 包住不可見水面的 uniforms／VAO／draw／統計，alpha-to-coverage 關閉保持在 guard 外。來源 gate 要求其他 engine 位元組相同，RGBA 門檻未放寬；清理 v2 明示回到正式完成幀的有效狀態，首次錯誤與中斷資料保留。

初審發現 CPU 測試以 `if(surface)` 選擇性檢查跨原點矩陣，某些沒有鄰近 surface 的案例會跳過。已改為無條件取得必定繪製的 `pointProgram`，比較 `uLightVP` 與 `uRenderOrigin`，若缺 draw 也會失敗。唯讀複審確認關閉；修正未改 engine 或 GPU runner。

完整 CPU 後追加核對 uniform fixture 的明示省略：不可變參考 SHA 保持 `3917b6f2`，reference 只恢復精確 water guard，先驗全部舊 hash／draw 狀態，再移除深海 shadow／water rows；明示十個舊水面 uniforms 及正式零提交。唯讀審查與 7／7 補驗通過，允許以首輪 103／104、修正後合計 104／104 描述。

## Spec

沒有未授權擴張、缺失實作或貌似完成但錯誤的行為。保留原 setupWater、shader 與可見畫質，只允許 sunless 少一筆水面 draw 和其頂點／三角形；不符合門檻即恢復。原生深海覆蓋查詢關閉 depth test，能區分裁切與地形遮擋。局部 GL 精確恢復與跨海域有效結束狀態的 v2 契約如實描述，沒有掩蓋 indexed 實驗的舊失敗。

首個返回淺水完成幀的路由由 CPU 契約直接覆蓋；原生像素返回是在暖機之後，不能稱作原生首幀無黑閃證據。自然探索、自動畫質與已知畫面保留回歸另外取證。

獨立重算兩端各 2,600 筆 GPU 樣本後，六個 sunless 視角結果小而混合，未建立 GPU 時間／FPS／耗電改善或完全不退步的證據。可在其餘功能驗證完成後，以「每幀精確少一個不可見海面提交」採用；不以單一負百分比宣稱普遍加速。完整數據與採用界線見 [報告](../TEST_REPORT-v01830.md)。

未採用 indexed 實驗報告另經唯讀核對，18 個平衡組差平均、影像數、失敗狀態與 15 個快照檔案雜湊均相符；小範圍清理成功未被當作原失敗根因證明。

審查後由主執行者完成最終 0.18.30 正常海溝流程：桌機 54／54、觸控模擬 68／68，自動畫質、正式選取／照片、重載與兩次淺水返回均通過。這是另行執行的驗收證據，不宣稱由唯讀審查者執行。公開交付依測試報告另記，完整商用範圍保持未完成。
