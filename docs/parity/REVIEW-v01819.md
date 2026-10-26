# 0.18.19 皺鰓鯊審查與目前驗證

root 補記最終本機結果：完整 CPU 93/93 suites、最終打包靜態 64/64、本機橫向自然航程 26/26 均通過；來源未在完整 CPU 後修改。原審查時點及下列獨立來源保持，公開交付結果集中見 [本輪報告](../TEST_REPORT-v01819.md)。

固定審查基準為 `a2a4bdab378555b25d53af8a0c774f4228982065`，規格見 [FRILLED-SHARK-v01819-SPEC.md](FRILLED-SHARK-v01819-SPEC.md)。本紀錄整理截至 2026-10-26 已有的審查回報及本機 QA 檔案；整理時沒有執行 CPU 測試或 GPU／瀏覽器。它不是新的獨立審查，也不是發布或完整商用驗收。

## 兩軸來源與結論

初審由兩位不同代理分別進行。以下來源名稱及初審結論依 root 保留的代理回報記錄；不把測試作者自查、文件整理或同一審查者後續複查列為另一位獨立審查者。

| 審查軸 | 真正的初審來源 | 發現與處理 | 目前界線 |
|---|---|---|---|
| Standards | `/root/frilled_standards_review` | ★★★ 0 個程式標準阻擋；1 個 P3 非阻擋維護建議 | 初審來源獨立於 Spec 初審 |
| Spec 初審 | `/root/frilled_spec_review` | ★★★ P2：`makeThumb` 以資產 JPEG 覆蓋原創 SVG，圖片下載／解碼失敗時沒有可用後備；後續已修正 | 原 Spec 審查者目前不在 live 列表；原始發現依 root 保留的初審回報記錄 |
| 修正後唯讀複查 | `/root/frilled_standards_review` | ★★★ 確認 SVG fallback 修正；同一代理回報 Standards／Spec 窄範圍結果 | 此代理獨立於修正作者，但它仍是原 Standards 審查者；不算第二組雙軸獨立複查 |
| 最終獨立 Spec | `/root/frilled_spec_final` | ★★★ 0 阻擋；確認 P2 實際修正、索引 42（第 43 類）／固定 UID／共享兩級 LOD 不重複、既有站點與保存及自然導覽符合規格 | 新的獨立唯讀 Spec 審查者；閱讀 CPU 與桌機真實 HTTP 503／解碼失敗通過資料，沒有自己執行 CPU／GPU，也沒有重做 Standards 軸 |

P3 是 `app.js` 提示中 `sp.trench || sp.oarfish || sp.id === 'frilled_shark'` 的物種條件重複。未來可用物種 metadata 表達提示策略；本輪不為此擴大抽象或重構。它是維護建議，不是物種錯誤、功能阻擋或效能改善證據。

P2 修正於 `makeThumb` 覆蓋前保存原創 SVG，保留正常 JPEG 優先；單一 capture error listener 處理目前圖鑑面板中的已知本機圖鑑圖片，涵蓋卡片、詳細資料、測驗及面板重建。每個圖片元素最多切換一次；照片、外站／未知圖片與其他錯誤不變。修正作者的 DOM adapter 測試 3/3 通過，見 [fallback 最終紀錄](../../qa/parity/v01819-guide-image-fallback-final.log)。root 後續執行真正 HTTP／解碼故障，桌機與觸控各 32/32 通過；此原生結果與 CPU 邊界測試分開記錄。

## 已有驗證證據

星等只表示該列範圍的證據狀態：★★★ 已有通過檔案，★★☆ 尚有指定驗證待補，★☆☆ 仍在評估；不是整體產品評分。

| 範圍 | 已確認的數字與結果 | 證據與限制 |
|---|---|---|
| 模型 CPU | ★★★ 6/6；第 43 類、全長 1.7 m；高／低 LOD 為 11,558／4,670 三角形，索引幾何 872,400 bytes | [model final](../../qa/parity/v01819-frilled-model-final.log)。兩級含六對褶鰓、跨喉連接、各鰭、口腔及三尖齒；模型單位長 1，實際 bounds 為 `[-0.5,-0.096349672,-0.105]` 至 `[0.5,0.081759293,0.105]`。不是原生外觀或效能證據 |
| 世界／動態 CPU | ★★★ 5 組通過；舊 42 類與個體保留；新增 1 個穩定個體、2 個共享 LOD batch；程序及編譯恢復不重複 | [world final](../../qa/parity/v01819-frilled-world-final.log)。240 秒、120 Hz 整身動態包絡檢查；36 種水族館配置通過 |
| 整身安全包絡 | ★★★ 測得最大身體半徑 0.920999 m、距 home 最大 2.801869 m、單步最大位移 0.000833541 m | 同一 world 紀錄，檢查當前真實岩石 solids 與水體。home `[784,-900,-110]`、gate `[766,-900,-90]`，屬岩壁旁遭遇；不是近海床遭遇 |
| 導覽抵達 CPU | ★★★ 13/13；midwater 81.5 秒／2 次遭遇，slope 123.8 秒／3 次，hadal 205.7 秒／5 次 | [arrival green2](../../qa/parity/v01819-frilled-arrival-green2.log)、[原始資料](../../qa/parity/deepsea-arrival.json)。正式導航／投影／選取；三種 viewport 在停留 0／2／4 秒全身在畫面內且可選取，未自動辨識；時間為 CPU 模擬時間 |
| 原生 GPU rig | ★★★ 4 組通過；原生 Apple M3 Max／ANGLE Metal，GL error 0 | [rig green](../../qa/parity/v01819-frilled-rig-green.json)。頭／眼／齒穩定、身尾側移及附屬同步、法線與獨立 GPU 有限差分相符、正式時間凍結與顏色／陰影一致；這是取樣頂點 fixture，不能單獨證明整隻動物外觀 |
| 原始模型縮圖產生 | ★★★ `original WebGL guide frilled_shark` 通過 | [guide final](../../qa/parity/v01819-frilled-guide-final.log)。證明原始 WebGL guide 產生流程；不證明網路／解碼故障 fallback |
| 桌機自然流程 | ★★★ 26/26；原生 Chrome／Apple M3 Max，0.18.19，fresh save、自動畫質、編譯世界 | [desktop natural JSON](../../qa/parity/v01819-frilled-desktop-local.json)、[文字紀錄](../../qa/parity/v01819-frilled-desktop-local.log)。正常入海、自然 900 m 停留、主動選取與觀察、拍照、圖鑑、沖洗及重載；繼續抵達 1400 m 站。執行時尚未加入後續 fallback 修正 |
| 觸控自然流程 | ★★★ 26/26；重載後自動畫質仍啟用，GL error 0、無 context loss | [touch natural JSON](../../qa/parity/v01819-frilled-touch-local.json)、[文字紀錄](../../qa/parity/v01819-frilled-touch-local.log)。包含自然遭遇、主動選取、觀察、拍照、1400 m 抵達、沖洗及重載；瀏覽器觸控模擬不等於實體手機 |
| fallback CPU／原生瀏覽器 | ★★★ DOM adapter 3/3；root 執行桌機 32/32、觸控 32/32，兩份結果均 `fatal:null`、`passed:true` | [CPU final](../../qa/parity/v01819-guide-image-fallback-final.log)、[桌機原始結果](../../qa/parity/v01819-guide-fallback-desktop.json)、[觸控原始結果](../../qa/parity/v01819-guide-fallback-touch.json)。真實 HTTP 503／無效 JPEG，正常 UI 的卡片／詳細資料／返回重建／自然測驗成功解碼原創 SVG，無新增觀察或照片；觸控為瀏覽器模擬，非實體手機 |
| resize／呈現保持 | ★★★ 桌機與觸控皆通過 | [原始結果](../../qa/parity/v01819-resize-presentation.json)、[文字紀錄](../../qa/parity/v01819-resize-presentation.log)。涵蓋自動畫質適應、恢復、品質調整、真實 resize／方向事件與延遲的真實區域請求；等待期間取樣仍有畫面，兩端 GL error 0 |
| kind 11／material 0 fragment | ★★★ `11:0` 已裁決保留；48 個案例、192 個 ABBA 完整 RGBA 比較影格全部 byte-exact 0 差異 | [camera2 原始結果](../../qa/parity/v01819-frilled-surface-camera2.json) 為 `passed`，`errors`／`pixelFailures` 皆空；[CPU routing](../../qa/parity/v01819-trench-surface-green2.log) 7/7。效能數字與不穩定界線見下表，不能宣稱固定桌機加速 |

桌機自然首見的整身長度為 125.26 CSS px，距離 7.76 m，側面方向指標 0.8688；這是未調整玩家鏡頭的實際停留。10.025 秒動作序列取得 7 張不同畫面。正式暫停及照片預覽的時間與個體位置均維持不變。拍照 JPEG 為 1920 × 1200、40,620 bytes；沖洗與重新載入後 SHA-256 相同，個體 UID 為 `frilled_shark-001`。

同次自然流程有 9,333 次 render callback、9,332 次完成渲染，其中 8,592 次屬動作階段、7,752 次正在移動；深度範圍 2.2–1401.18 m。每個完成 callback 同步取樣九個區域共 576 pixels，未發現取樣區域全 RGB 0、GL 錯誤、context loss 或未選取的中央名稱。這不等於逐像素檢查整個 framebuffer，也不是獨立 GPU 成本量測，更不是實體手機驗收。

## fragment 特化裁決與原始數字

root 保留 `11:0`：目前的完整像素等值驗證通過，camera2 在固定 fixture 上有成本改善。原始第一次桌機結果同時保留；兩次桌機方向不同，不能只挑較快的一次宣稱穩定收益。表中為 runner GPU P50（每模式 50 個排序樣本的第 26 值，並非中間兩值平均的通常中位數），單位 ms，星等表示該次量測可支持的結論。

| 量測 | generic P50 GPU ms | `11:0` P50 GPU ms | 可支持的結論 |
|---|---:|---:|---|
| 第一次桌機 | 5.953624 | 6.616750 | ★★☆ 此次特化較慢；[原始結果保留](../../qa/parity/v01819-frilled-surface.json)，不是最終完整像素驗收 |
| camera2 桌機 | 5.833791 | 4.517541 | ★★☆ 此次較快，但與第一次方向不同，不能保證固定桌機加速 |
| camera2 觸控設定 | 3.710041 | 1.764500 | ★★★ 此固定 fixture 測得較低 GPU 成本；不是實體手機、耗電或整體遊戲 FPS 結論 |

[camera2](../../qa/parity/v01819-frilled-surface-camera2.json) 的 48 個像素案例涵蓋 4 類 kind 11 生物、2 個正式時間、3 種燈光／場景配置與桌機／觸控設定。只移除／恢復正式 `surfacePrograms` 的 `11:0` key，在同一案例內固定模型、姿態、相機、畫質、解析度、MSAA 與時間；VS 保持原樣，FS 只固定 kind／material 常數。完整 RGBA 的不同通道數、最大差值及 alpha 差異皆為 0，沒有放寬容差。

192 個影格是像素 ABBA 比較數，不能當作 192 個獨立效能樣本。GPU 計時限定每個 profile 的第一個深海開燈皺鰓鯊 fixture；各 block 先暖機 10 次，再量測 25 次完整 render。開放水體 studio 是受控驗證配置，不冒充自然遇見，也不以移動魚隻、降低畫質或刪除內容作為正式玩法的效能修正。

## 保留的診斷與尚待工作

最早 arrival green1 的 hadal 行程被測試原有 200 秒上限截斷；新增停留後完整行程是 205.7 秒。green2 將測試觀察窗放寬到 300 秒後 13/13 通過，沒有調快導覽、瞬移或刪除遭遇。此舊檔屬測試觀察窗不足的診斷，不能描述成已確認的遊戲導航缺陷。

整理初稿時完整 CPU 回歸仍在執行；其後 root 已完成 93/93，最終靜態 64/64，依本文開頭的補記與發布報告為準。桌機／觸控自然流程、fallback 及 resize 已有本機證據，`11:0` 已裁決保留；這些結果不能擴張成所有裝置與遊玩方式均已驗收。公開結果於審查整理後由 root 另行完成：指定程式提交已由 Pages 建置，291 個公開檔案、雙端自然流程各 26/26、正常節奏 55/55 及公開觸控圖片故障 32/32 通過，詳見本輪發布報告。這不代表實體手機或完整商用目標完成。最後 claim audit 對統計命名提出 P3，已將本文及報告改稱 runner P50，保留全部原始值。
