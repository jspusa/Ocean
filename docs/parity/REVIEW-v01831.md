# 0.18.31 雙軸審查

固定基準：`b337564279219cbbff573a548c274c0e11393256`。需求依 `SPEC.md` 第 32 項及 `issues/13-full-acceptance.md`：改善正常游泳成本、保留探索內容、畫質與自動調整，不以合成測試代替實機驗收。

## Standards

正式 engine 與 Renderer→WebGL 測試：零未解項目。新增單一有界 `3:3` 變體，原 VS、FS 方程、幾何、其他路由及編譯失敗 fallback 保留；影格中不新增編譯。engine SHA `077165f02196c9085d0a6976f63a26c15ba615c43133a9b97fb9d44dbd046f0b`。

Opaque collector 初審指出 scene／sky 期間的 FBO 改變也必須拒絕，已用 RED→GREEN fixture 修正；20 類外部 API fixtures 通過。最終 harness SHA `39dcff73ca4f71418f9e23863891ef32fadb2070182b05eab5f81433a7bce9b5`。

新 native A/B harness 初審指出中途失敗會遺失同區塊已完成樣本，且失敗時缺 query／map 清理收據。已保留 partial、failed row、owned-query cleanup 與原始 failure；原生故障注入的第一筆 valid、第二筆 failed 均留下，第二筆 query 實際結束並刪除、設定還原成功。該預期失敗收據維持 failed，不改寫成普通效能 PASS。

## Spec

正式變更及 CPU 契約：零未解項目。測試在原程式 RED 4／8，實作後 GREEN 8／8；完整 CPU 104／104，靜態 68／68。正常游泳與受控固定視角分開解讀。觸控固定遠景中海葵未被繪製，僅作控制，不計為新程式收益。

預設桌機與觸控圖像全 RGBA 相同。低畫質藍光的首次嚴格比對顯示兩個通道差一個 8-bit 級距；舊 FAIL 保留。雙軸同意事先固定新的有限視覺驗收：每張候選同時滿足 max≤1、不同通道比例≤1e-5，baseline repeat／未繪製控制／預設 day 仍須零差；完整尺寸、條件與 workload 必須一致，近景必須實際繪製海葵。逐圖保存 exact／accepted-with-tolerance、差值與前 32 個差異位置，不推定編譯浮點是已證根因，不稱全部矩陣逐位元組相同。

最終影像 harness SHA `393ea6b8b02a1fd429d07e6fbf05b6bb8e6bd8c130520d39f310fba5d121a0f5` 經兩軸唯讀複核，零未解項目。影像矩陣、自然輸入、公開發布的完成證據見 [測試報告](../TEST_REPORT-v01831.md)；實體手機、耗電、所有場景及完整商用驗收仍未由本輪證明。
