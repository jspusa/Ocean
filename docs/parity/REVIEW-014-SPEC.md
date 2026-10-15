# 0.14 季節切片 Spec review

查核日期：2026-10-13；基準為已發布 `1dde6fd`，審查工作目錄的新季節整合。依據 [SPEC](SPEC.md) 24、31、33 與 [季節研究及契約](SEASONS-REFERENCE.md)。範圍是日曆、世界出現條件、既有互動／照片／甲板／存讀檔接點；不把本輪未查明的完整 Wii 物種曆表當作已完成。

| 優先級／規格 | 具體問題與處置 | 狀態／證據 |
|---|---|:---:|
| P2：實際生物才能取得攝影紀錄 | `voyage.js:83` 的 `gradePhoto` 原先沒有排除 `ecologyPresent=false`，即使 renderer 未畫鸚鵡螺仍能把空畫面評成牠。已加入與觀察相同的 gate；獨立執行 production grader 的 CPU 回歸：相同投影、相同 UID，隱藏時無主體、可見時有主體 | 已關閉；CPU＋三尺寸真快門 ★★★ |
| P2：時間提示與實際可尋訪內容一致 | `seasons.js:29–52` 原先讓近處待入場動物必須等玩家／鏡頭離開 60m，卻已提示「目前可尋找」。已允許整個身體離開畫面後轉換，等待時提供環視提示；獨立 CPU 確認畫內不突然生成，畫外可入場 | 已關閉；CPU＋三尺寸真手勢 ★★★ |
| P2：缺席時仍能計畫重訪路線 | 圖鑑找不到當前個體時原先只吐司通知。現 `voyage.js` 會先標記實際棲地，再提示出現時段；沒有新增免費收錄或玩家傳送 | 已關閉；三尺寸 UI／位置保持 ★★★ |
| P2：失去焦點不可偷跑航程 | Standards 審查發現畫面仍可見但視窗失焦時，原先時間及氣量繼續下降。`app.animate`、`expedition.tick` 現檢查 `document.hasFocus()`，focus 回復重設時間基準；獨立 CPU 回歸確認失焦不減時間／氣量且復焦可繼續 | CPU 層已關閉；真失焦平台限制 ★★☆ |
| P2：船艙時計等待後仍能返回 | 季節按鈕原先重新 `open` research，觸發 ship 的 leave 把返回控制隱藏。現僅重繪現有 panel；實際甲板行走到船艙、點時鐘、等待一天後點回艙，八個物件及正確船艙模式均恢復 | 已關閉；三尺寸實際 UI ★★★ |

獨立執行 `tests/parity/seasons.cjs` **14/14**、`expedition.cjs` **19/19**，全部通過。涵蓋月份／跨年／閏年、非有限值、夜間邊界、下一窗口、單一 clock、既有 UID／位置／尺度、夥伴豁免、production instance 收集器及攝影排除、等待輸入、日曆上限與 visible-but-unfocused 暫停。instance 收集器使用 CPU GL seam，**不是實際 GPU 提交或肉眼畫質證明**。

來源閱讀確認：不新增第二份日期狀態；既有 day/minute 直接衍生日曆；野外存在 flags 不刪除 actor 或改 UID／home；鸚鵡螺夜間、兩種鯨豚季節訪客，其餘 29 種保留常住，包含既有郵件與故事必要目標。排程不讀手動光照色調，原圖 identity 不改為航程日期，水族館用獨立個體。精確月份與時刻明確是本作原創。

目前來源審查沒有其他開放的具體阻斷。最新 0.14.0 烘焙（364 meshes、3,531 nodes；42,905,644 decoded bytes／17,443,218 gzip bytes）實際瀏覽器結果如下；各份結果均有零未捕捉例外、GL 0、context 未遺失。

| 驗證環境 | 功能檢查 | 結果檔 | 證據 |
|---|---:|---|:---:|
| Chrome 桌機 1440×900 | 57/57 | `qa/parity/seasons-desktop-results.json` | ★★★ |
| Chrome 觸控模擬直向 390×844 | 57/57 | `qa/parity/seasons-portrait-results.json` | ★★★ |
| Chrome 觸控模擬橫向 844×390 | 57/57 | `qa/parity/seasons-landscape-results.json` | ★★★ |
| 額外有頭 Chrome 桌機焦點探測 | 2/2，僅正常 RAF 與 context 健康 | `qa/parity/seasons-desktop-focus-results.json` | ★☆☆；真失焦未驗成 |

功能證據包含四季／跨年時鐘 UI、白天缺席鸚鵡螺不能取得攝影主體、晚上同 UID 的真正 JPEG 與圖鑑層級、持續觀察跨黎明不突消、離框後入場、實際觸控／滑鼠轉回可見相同個體、已收白鯨訓練與館藏跨季保留、甲板訪客模型變換、同一份日曆保存、實際匯出後新儲存空間匯入且 JPEG bytes 完全相同。測試明示旅行／年末／既有知識夥伴／缺席微觀 gate fixtures；不是完整真人從零取得進度，也不是實體手機驗證。

桌機初輪在未抬高到合法離底高度的海馬旅行 fixture 停止；修改為既有微觀測試相同的 ground + .85 m 安全高度，沒有放寬產品入口。橫向初輪 55/57 的兩項失敗保存在 `qa/parity/seasons-landscape-first-failure.json`：一次拖曳的 yaw −1.6988 rad、目標 z −.1566 m，仍接觸保守身體球，合理保持 pending。最終以至多四次真拖曳檢查，第二次 yaw −3.3976 rad、z −1.1112 m 後入場，等量反向到 yaw≈0 且目標投影在畫框內；沒有直接改鏡頭或 presence 使測試通過。後續新增手勢起點 `elementFromPoint` 必須是 canvas 的明確 guard；該 guard 在本輪結束後加入，語法已過，未另開 GPU 重跑；以上通過數對應既有真手勢執行及投影證據。

三尺寸皆嘗試同一 Chrome process 新建原生空白視窗並啟用；額外有頭桌機也嘗試一次。所有平台回報遊戲 `hidden=false / hasFocus=true`、沒有 blur 事件，**未建立 visible-but-blurred 狀態**，因此失焦暫停／恢復只列來源＋CPU 證據，不冒稱瀏覽器通過。沒有覆寫這些 DOM 屬性，也沒有分派人工焦點事件。焦點限制單獨寫入各 JSON 的 `limitations`，未以隱藏分頁替代。

已肉眼查看桌機／直向的夜間鸚鵡螺、直向館藏與直橫向工作桌截圖；直向按鈕清楚且可捲動，橫向截图停在工作桌上半部，日曆按鈕的可達性來自實際操作而非該單張圖片。短暫 toast／攝影分數可能仍在館藏截圖內，不把測試快速切換後的提示當靜態主畫面品質證明。沒有在此宣稱模型已達照片級或超越 Wii；最終美術／效能由獨立 gate 承接。

**季節切片的三尺寸整合通過，真實失焦驗證保留平台限制。** 全物種曆表、內容量與完整 33 個故事仍由主目標追蹤；本報告不作整體完成或發布驗證。所有本輪自建瀏覽器及 context 已關閉，GPU 已交回協調者。

## 地形 LOD 接縫獨立追加

最後目視另發現手機近／遠地形採樣不同而形成約 45 cm 黑裂縫。對 `open_world.js:33–46` 的修補作獨立唯讀查核：低精度網格改為相同的 22 段外周，以四段單調連接的環帶接到 5×5 粗內圈；近景仍用原 22×22 取樣與三角順序。沒有用垂直遮裙遮住缺口，也沒有改變近景高度函數或 LOD 距離。

| 檢查 | 實際證據 | 狀態 |
|---|---|:---:|
| 所有 LOD 與相鄰 tile 共邊 | `terrain-lod.cjs` **9/9**，100 tile 的四邊及相鄰 high/high、high/low、low/high、low/low 都有相同 23 個邊界頂點，重現位置的高度差 < 1e−9 m | CPU 通過 ★★★ |
| 環帶無缺口或翻面 | production mesh 全三角朝上、無退化、有限且投影總面積 4,096 m²；額外獨立焊點／邊 audit 覆蓋100 tile，每tile V=124、E=281、F=158，Euler=1，88條單用邊全部在外周且每邊界頂點度2，內邊全部使用2次 | CPU 通過 ★★★ |
| 保持近景與有界成本 | 近景968三角／tile，其頂點資料等於現行 groundHeight 下的修補前22×22算法；遠景由98增至158三角／tile。seed、材質、近遠距離與陰影設定均保留 | CPU 通過 ★★★ |
| 最後建置的實際接縫與精度切換 | 已讀獨立渲染代理產出的 `regions-014-seam.json` **7/7**、14張 compiled/GL0 畫面；親看相同直向站位修正前後圖片，原大塊破點消失。最終效能及交付尚未由本審查確認 | 專項視覺已關閉 ★★★；效能另驗 |

未發現需阻斷的覆蓋、朝向或共邊問題。這次近景比較使用**現行高度函數**重建舊網格算法，不是與0.13已發布 binary 的完整地形比對；曲面區域本輪本來就有變更，兩者不可混稱。額外 manifold audit 為獨立 CPU 探索性驗證，永久回歸為 `terrain-lod.cjs`；不以 CPU 數量替代最終畫質。


後續實際跨精度移動另揭露第二個問題：原 `Renderer.updateBatch` 的 ±.6 m 重疊讓不同內部高度的 high/low 同時寫深度，high 淡出但 low 沒有相配淡入。最後 `engine.js:682–690` 僅在主畫面且 material1 使用 margin0、max排他／min包含，`engine.js:815` 同時關閉地面片段淡化；陰影 pass 及其他材質維持原容差與淡化。獨立重跑 production updateBatch 的 **9/9** CPU 測試，含桌機／mobile各quality門檻前、等於與門檻後恰一層，以及非地面／陰影不改。

GPU專項由渲染代理執行，本審查沒有另開瀏覽器。已實讀 JSON：桌機／直向 **7/7**、14張全 GL0/compiled、errors0；真輸入與確定性時間推進移動17.3887 m，直向目標tile由 coarse→high，取樣幀僅一層提交，已提交地面的真GL uniform fade=0。親看 `regions-014-portrait-lod-travel-2-before-transition-fix.png` 與修後 `regions-014-portrait-lod-travel-2.png`，81.4938 m 站位大塊破面已消除。此修法是原子切換，內部形狀仍可能有切換跳變，**不是 geomorph 或無縫形變**。最終效能、離線與公開交付仍需主流程驗證。
