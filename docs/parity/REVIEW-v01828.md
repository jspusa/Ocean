# 0.18.28 獨立兩軸審查

固定基準 `f38a5ef5a1398bd132cb350701a7be88df440c47`。審查時 HEAD 等於基準、提交清單為空；範圍使用 `git diff <baseline>` 加未追蹤規格、測試與 fixture，不以空三點 diff 當成已審。依 AskMatt code-review，由未編輯該實作的代理分別執行 Standards 與 Spec，只讀既有程式及證據。

## Standards

最終未解決的明文規範違反為 0，可操作 P1／P2 heuristic 為 0。影像測試曾重複宣告門檻與實際判斷常數，已集中到 `THRESHOLDS`；所有固定值未改，四組歷史 RED／候選 GREEN 的數值與控制完全相同。可追蹤 fixture 保留原始來源、conditions、完整 RGBA 雜湊與精確 ROI 訊號，乾淨 checkout 不依賴 ignored 原圖。

Renderer 的局部 scissor clear、同 actor LOD 合併、packed buffer 各自持有 actor 對應，以及例外下 MRT／GL 狀態還原，均有對應正式方法的回歸。沒有將 CPU mock 冒充 shader 像素或 GPU 效能。新增相容測試明示 quality 0／RGBA8 override，並恢復原狀；harness 的 restore 成功旗標改為真正重建與 GL 檢查成功後才設定。

## Spec

未發現阻擋本輪透明散焦修復的實作或新視覺缺陷。獨立 reviewer 親看桌機／觸控各自的 tile、薄斜向前景、四個畫面邊緣及五張連續 LOD 哨兵 PNG，未見重複罩緣、tile 接縫、明顯前景穿透或黑幀。120 幀的 shellDelta／projectedCapArea 最大相鄰變化為桌機 1.378%、觸控 1.941%，無歸零跳變；這是該固定路線的診斷，不是全部連續運動的證明。

規格要求有界局部成本及保留完整正負計時，沒有允許宣稱整體 GPU 零增加。大型透明罩散焦與兩個體散焦增加成本，須按 [測試報告](../TEST_REPORT-v01828.md) 揭露；未採用的 depth-bounds 探針也保留負向結果。完整效能、實體裝置、內容與商用驗收保持未完成，局部發布不縮小整體目標。

先前報告與規格的過時「尚待 RED／修復／測試」文字已依最終資料更新；公開 Pages 精確提交、完整 manifest 及實際入海是另外的發布驗收。

## 最終來源指紋

```text
engine.js                  7a653568e44d0707539483887e58a05fd18c5a092c078c038c03d8de44beea72
transparent-photo-image.py ad48bca2b64b5bd55301f2c0d0335ad34f172e1bafadf27b0b4cc67d3c08fc27
fixture                    efa317ad2371dddca8222188c80109b45358be5705b2ba3036287cf0f646c17e
transparent-photo-state   c6b056b241c58761af7834250ce5f07ba8e5df1f876bf047c2fb6194e0955f62
barreleye-browser          b72a8f4e64f63a386b3a176850ee9da563beef514bdb9670448e3bfaa4f34600
barreleye-render-browser   24023099fdc5f7a92ddbb6ac1d89316dc4f093ada9621edb9e8c7d43261c2607
```

Standards 最後審核的 harness 為 `4b6ce119…`；其後僅將 `scratch` 診斷欄位從固定 conditions 移到場景頂層，不改 GL、場景或判準。Spec 核對最終 `24023099…`，最後兩端正式影像亦以此執行。

## 發布核對

Runtime `6a845f12f4e05ce7f7cb9af76355174340672e5f` 的 Pages 精確提交已 built；公開 300／300 檔案雜湊及兩端正式預設入海通過，errors=[]、GL 0。只將本輪交付記為完成；大型散焦成本與全商用缺口依 [報告](../TEST_REPORT-v01828.md) 保留。
