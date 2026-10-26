# 0.18.29 獨立兩軸審查

固定基準 `eaf62daa63ff1adbf79d6342cd8a399eb917d9b1`。審查時 HEAD 同基準、提交清單為空；使用 `git diff eaf62daa63ff1adbf79d6342cd8a399eb917d9b1` 加未追蹤規格、報告與 equivalence 工具。依 AskMatt code-review，由未編輯該實作的兩個代理分別執行 Standards 與 Spec；均唯讀，未另啟 GPU 工作。

## Standards

修後明文規範違反為 0，可操作 Fowler heuristic 為 0。先前 P2 是配對測量中途失敗時只保存當前 block，先前完成的 rapid samples 會遺失，違反保留原始結果的規格。現在暖機前就保存同一個累積 record，逐筆記錄 pending index／mode，catch 保留 partialRapidPair 與當前 partialBlock。明示第 9 筆中斷的原生故障測試，保留全部前九筆 GPU 原值、兩個至少 60 frame 的暖機及原始錯誤，並恢復 program 與 GL 狀態。

另外修正 rapid／block 的方法文字，equivalence 輸出也保留 rapidPair 原始值。原始失敗與先前 metadata 未改寫。版本、README、manifest、入口、新規格／工具及報告均已納入審查；測量工具的通過不代替產品效能與公開驗收。

## Spec

未發現阻擋本輪改善的實作缺陷或額外功能擴張。新 shader 保留全部 81 組取樣、y→x 累加、權重、座標及 alpha／來源深度門檻，沒有新增 runtime pass／texture／program，也未降畫質或改生物。

Reviewer 對 raw rapid samples 做每八幀平衡分組：大型散焦桌機 25／25 組改善，觸控 23／25，反序觸控 23／25。這支持局部受控改善；普通桌機小變化與未使用 filter 的控制組波動不作全面加速宣稱。獨立親看 14 張原生 PNG，涵蓋小／中 CoC、兩端細前景、巨幅 tile、部分遮擋、畫面邊界及兩端 LOD 000／059／119，未見新增黑幀、接縫或光暈穿透。連續 120 幀正規化 shell 訊號最大相鄰變化為桌機 1.378%、觸控 1.941%。

最終完整 baseline RGBA 比對、CPU／靜態、正常流程與公開交付須依 [測試報告](../TEST_REPORT-v01829.md) 的實際完成證據核對；審查不將當時仍在執行的檢查寫成通過。實體手機、耗電與完整商用目標仍未完成。

最終本機證據完成後，Spec reviewer 已再次唯讀核對：六份正式 equivalence 全部 passed／fullCoverage、無 subset 或 failures，合計 104 場景、8 sweep／960 幀、496 PNG；CPU 104／104、靜態 68／68、自然流程各 31／31。歷史光學兩端各 0／10 重影，全部斷言通過。另核對正式相機最小 25°，確認報告沒有把 3° 壓力測量、觸控模擬或本機結果擴大為一般遊玩、實體手機或公開交付結論。沒有新增 Spec 阻擋項。

## 審查來源指紋

```text
engine.js                  b07df71c6c837ab0d72ecaf8babdbf6a90d94f74b74d146ec67123b6c256782c
barreleye-render-browser   1b5c1f11a947174b7520eb7bdf36fafd03f4ca1ad4c0a626c9911ad47b495468
filter-equivalence        c586eb19a19e04e0072b9c213ec922a43337ba36c75f577503834e4e6df2961d
```

兩軸未解決項目分別為 Standards 0、Spec 0；完整驗收及發布進度分列於報告，不將兩軸結果合併成整體商用評分。

發布後核對：精確 runtime `d5fc90fbff81419888597f14814f9fb37727ed35` 的 Pages built、300／300 公開檔案雜湊，以及正式網站桌機／觸控自動畫質入海均通過；來源 engine 與上述審查指紋一致。公開收據與實體裝置界線見 [測試報告](../TEST_REPORT-v01829.md)。
