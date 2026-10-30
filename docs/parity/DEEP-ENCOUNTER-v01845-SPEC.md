# v0.18.45 深海潛次配置第一階段

Owner: `src/encounters.js`；本配置增量在 `src/deepsea.js` 只改 slowdown anchors。不得改 geometry、UID、scale、資源數、presence 或清除存檔。同版另有獨立的[導覽接觸修正](DEEP-GUIDE-CONTACT-v01845.md)，其路線與實際抵達判定不屬於本配置增量。

| 契約 | 實作範圍 | 驗收 |
|---|---|---|
| 真正空間變化 | coelacanth-002、pelican_eel-001/002/003、humpback_anglerfish-001/002，各三個有限安全候選，另改 homeYaw/radius/phase | ★★★★★ 指定兩 seed ≥3 個 home 改變 ≥1 m；32 seed 覆蓋候選 |
| 舊存檔 | schema2 無 deepVersion 視為0，init/reset/resume 保留 legacy home；新潛次才設 deepVersion=1 | ★★★★★ 重播、fresh VM reload、回復 legacy、idempotence |
| 必達生物 | 8 guide、6 station、2 story representatives、7 benthic 固定原位；六個自由個體 presence 也全部 true | ★★★★★ 每 UID 身份/比例不變 |
| 生物安全 | 真 archive vertex bound + 全時刻 shader deformation bound + 整條解析路徑外球；真岩 BVH、實際 floor planes、region solids 均不相交 | ★★★★★ 不以離散抽樣代替連續證明 |
| 運動與速度 | motion owner沿用 home/center/radius；每次套配置重建固定深海 anchor 清單，swimScale不掃描全life/不配置陣列 | ★★★★★ 有界入口工作，熱路徑無新增rng |

候選都保持原深度：腔棘魚217 m、吞鰻1050/1450/1120 m、鮟鱇580/910 m；每home距原棲地最多約6 m。任何候選因日後地形變更不安全，有限輪詢其他候選；全部失敗保留作者原位並在snapshot記錄fallback，不向上拉魚、不改世界。有限catalog v1必須凍結，將來更動另增version。

保護快照依現有規則：owned UID、已接mail species及選取habitat species不搬移；途中改任務不改同潛次配置。設定home時同步center與floor/ceiling的原始相對高度，清除該actor舊contact記憶；不累加位移。

測試：`node tests/parity/deep-encounters.cjs --out=...`。先封存RED，再實作；正式既有encounters測試須僅允許上述白名單home變動，其他身份與固定home契約保留。Native desktop/touch與公開版驗證由root在freeze後執行，CPU不能代替視覺/實機驗收。
