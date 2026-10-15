# 0.15 Spec gate — independent source review

2026-10-15；基準 `3b03ff8`。審查者：experience_quality。範圍是本輪深海研究潛航切片，不是完整 Wii 功能對等或攝影級品質認證。

## 獨立審查範圍與結果

對照 `DEEPSEA-SLICE.md`，閱讀 root／其他作者的 `deepsea.js`、`voyage.js`、`navigation.js`、`expedition.js`、`trench_world.js`、`trench_fauna.js`，以及 `individuals.js` 深海動作和 `fauna.js` 鸚鵡螺殼口。未發現本輪尚待修復的具體阻斷或資料損失缺陷。

| 驗收項目 | 已查證內容 | 證據強度 |
|---|---|---|
| 真實深度與保存 | production `readVoyage` 保留有效 −7000m；無部署身分／非法位置不能借深海放寬舊存檔範圍；原淺海位置保持 | ★★★ CPU＋來源 |
| 部署與接手 | prepareDive 在新航程定位後、session 起算前部署；站間路徑從目前位置開始，取消沿用正常控制；回收走原 goHome 保存流程 | ★★☆ 來源；自然瀏覽器流程由 root 接續 |
| 淺海資料隔離 | 深海續遊不改泊位；不扣氣瓶；清除暫時訪客位置；受保護的圖鑑／照片／故事狀態未被部署或回收覆寫 | ★★☆ 來源；整體匯入／匯出仍需瀏覽器 |
| 新個體與尺度 | 三物種追加在舊 life 後，尺度 0.28／0.14／0.20m；原創 2017 物種有明示；海豬以同層 floorAt 和真模型 bounds 支撐，非全域海底 | ★★☆ 來源與既有行為測試內容審查 |
| 鸚鵡螺殼口 | 真開口、內唇與軟體幾何／標籤分離，非外殼貼圖畫洞 | ★★☆ 來源；藝術品質需真畫面 |

獨立重跑 `node tests/parity/deepsea.cjs`：13/13，包括 production reader、合法／非法 resume、步進、深海筆跡／軌跡保存。測試中的位置是明示 fixture，沒有把測試擺位當玩家游抵。

## UI 作者自驗，與獨立 gate 分開

experience_quality 自己實作的 HUD／selection 不計入上方獨立來源結論。其實際瀏覽器結果為 desktop 27/27、390×844 29/29、844×390 29/29；320×568 追加 11/11。全部 compiled、GL0、無 pageerror。真滑鼠／觸控、照片 JPEG、重載與雙搖桿皆有對應用例；遭遇位置是兩個既有個體的受控 fixture。320 短直向曾遮住生物中心，已縮短重複說明，紅→綠後目視確認。高密度通知圖是人工同時顯示的排版壓力場景，不是自然深海遊程。

CPU selection 14/14、ecology 39/39。證據：`qa/parity/selection-{desktop,portrait,landscape,narrow}.json` 與同名 encounter／stress 圖。

## 仍須保留的界線

本次 reviewer 已唯讀核對 root 的自然深海紀錄 `qa/parity/deepsea-desktop-portrait-landscape-results.json`：105/105（每尺寸 35），包括三站、真移動接近、未選取快門、點選觀察、重載／完整 JSON 匯入及回收。舊玩法 `desktop-browser.json`／`touch-browser.json` 各 32/32。這些是其他執行者的紀錄核對，不是 reviewer 重跑。

材質與新幾何應以最終 bake 畫面檢查。效能、離線與發布後雜湊不屬本次 reviewer 已執行範圍；0.14 的交付 JSON 不當作 0.15 證據。尚無實體手機或同硬體 Wii 對照，也不以測試數量宣稱原作全量內容或擬真藝術已完成。

## 最後來源複核與已修復問題

再次唯讀檢查 `deepsea.js`、`voyage.js`、`app.js` 的接入及 `tests/parity/delivery.mjs`。發現一項 P2 生命週期缺陷：`app.js:207` 將深海狀態搬到全域通知區，`deepsea.js` 結束潛航時卻只隱藏原 HUD；停止 tick 後，研究站或「接手操控」可能殘留在返船畫面。root 已在 `deepsea.js:55` 的 `end()` 明確隱藏狀態，原始已顯示狀態→結束→確實隱藏的 production lifecycle 回歸由紅轉綠。reviewer 已核對修法及斷言；CPU 10/10 為 root 執行結果，最終瀏覽器返船檢查由 root 接續。另將航線圖說明改為按實際「選擇研究站」按鈕，避免暗示圖上站點可點。

| 最終複核項目 | 結果 | 證據強度 |
|---|---|---|
| 返船通知殘留 P2 | 已修復；來源及 CPU production lifecycle 10/10，瀏覽器最後回歸待 root | ★★☆ 來源＋CPU紀錄 |
| 深海保存與跨區觀察 | 保留合法深度，遠方圖鑑只標記／開部署入口，不越區跟隨 | ★★★ 來源＋既有105項紀錄 |
| 交付 runner | 新增實際7000m入口、自動畫質及無中央自動選取；尚不宣稱新版離線／公開已通過 | ★★☆ 來源 |

本輪未發現其他未修復的具體阻斷或資料損失問題。此結論保留上述瀏覽器與交付待驗範圍。

主流程後續驗證：最終場景的深海瀏覽器三尺寸105/105，包含回收後 `deepseaStatus` 隱藏斷言；GL與頁面錯誤為0。此為root執行證據，並非reviewer重跑。

主流程交付補記：root最終靜態53/53、離線12/12、公開13/13；94個manifest檔案大小與SHA-256一致，實際公開7,000m部署、觸控與潛航器提示均通過。已執行範圍與硬體界線見TEST_REPORT。
