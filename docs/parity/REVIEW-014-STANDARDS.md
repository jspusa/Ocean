# 0.14 Standards review

查核日期：2026-10-13。基準 `1dde6fd74e0e288ff127a7eaacdce0151463be0b`，審查工作目錄季節接入；命令為 `git diff 1dde6fd -- src/app.js src/ecology.js src/engine.js src/expedition.js src/individuals.js src/microcosm.js src/ship.js src/voyage.js`，另讀新 `src/seasons.js`。Standards 軸由非季節實作者獨立執行；本文件不作作者自身鮟鱇模型的獨立審查。

依據 [CONTEXT](../../CONTEXT.md)、[工作追蹤規則](../agents/issue-tracker.md)、[SPEC](SPEC.md)、[本輪契約](SEASONS-SLICE.md)，並以 code-review 的程式異味基線輔助檢查。未發現需阻斷本輪的命名、重複抽象或非必要重構；既有短行風格不另列缺陷。

| 發現 | 修正與複核 | 證據狀態 |
|---|---|:---:|
| P2：可見但失焦仍推進時間與耗氣。`SEASONS-SLICE.md:7` 要求「失焦／暫停／照片檢視不推進」，原 `expedition.js:45` 只排除 hidden；原 app blur 只清輸入。實際 tick 在 `hidden=false / hasFocus=false` 下執行 5 秒，minute 由 540 變 541.25、air 由 1200 變 1195 | `app.js:114` 與 `expedition.js:45` 加入 focus gate；`app.js:191` 的 blur 清輸入並暫停音效，focus 重設時間基準並按聲音設定恢復。新增回歸確認失焦時數值不變，恢復只計新 tick。已複核修正，CPU 層關閉 | 來源＋CPU ★★☆；真失焦／恢復瀏覽器待驗 |

獨立重跑 `expedition.cjs` **19/19**、`seasons.cjs` **14/14**，全部通過。已讀 RED 紀錄 `/tmp/ocean-focus-red.log`，其失敗為 541.25 不等於 540；它是本機暫存證據，永久回歸保留在 expedition 測試。另直接執行 production `animate` 的 CPU seam，確認可見失焦時清除累積步長、更新時間基準並排下一幀，沒有呼叫遊戲更新或渲染。

來源複核涵蓋：唯一 expedition day/minute 權威與匯入／重設、同一 instance collector 的 main/LOD/shadow 缺席排除、觀察／觸碰／微觀入口／grader 一致 gate、已收夥伴與獨立館藏豁免、原 UID／尺度保存、跨日及上限。未見其他開放的重要問題；手動光照不參與季節判定。

**本報告尚不代表整合驗收通過。** 未開 GPU 或瀏覽器；桌面與觸控直橫向、真焦點轉移、真快門、季節邊界手勢、匯入重載及新模型目視待最終烘焙後驗證。完整物種曆表與 33 條故事等全作缺口仍由主追蹤保留，不因本輪部分來源審查通過而結案。

## 曲面與移動接入追加審查

同日獨立唯讀審查 `src/regions.js` 的曲面欄柱、面方向、精確球體掃掠、滑行與空間索引，以及 `app.js` 和 `navigation.js` 的移動接線。此審查者沒有實作上述地形或移動來源。原始區域與來源版本以凍結後的 regions 17 項回歸為準。

| 發現 | 修正與複核 | 證據狀態 |
|---|---|:---:|
| P2：navigation 初始化覆蓋 collide 後丟失 from。原 `navigation.js:55` 包裝只呼叫 `oldCollide(p)`；因此正式遊戲中的 manual／auto 移動無法使用 app 新增的連續掃掠。直接測 app 函式會漏掉此問題 | 在 `region-camera.cjs` 真正載入並 init navigation，經 production updatePlayer 進行高速度洞內上升，先得到 10/11 RED；root 將包裝改為 `(p,from=null)` 並傳給 `oldCollide(p,from)`，獨立重跑 11/11 GREEN。覆蓋 free／journey 及刻意位置變更仍使用端點修正 | 來源＋CPU 已關閉 ★★☆；最終真實控制待驗 |

獨立重跑 `regions.cjs` **17/17**、`region-camera.cjs` **11/11**。檢查包含：實際三角面內外取樣與碰撞、同一網格的洞頂高度、長射線與擦邊掃掠、沿牆滑行及離牆恢復、天窗開口、全部既定路線和調查站位、平台在實際地形三角面上、725 個既有個體的身份／尺度／取樣動作，以及網格預算。

另作獨立固定 seed=91 CPU 抽查：1,000 個三維 cube 查詢與完整 AABB 列表完全一致；三區真路線出發的 6,240 次短步移動均有限、不進入實體、不低於 .82 m 地面間距，且位移不超過輸入步長。這是額外探索性檢查，永久回歸是上述兩個測試檔，不把抽樣當完備性證明。

未見其他重要曲面／移動缺陷。正常查詢使用局部 XZ 桶；深海動作亦已改局部候選，保留全列表等價性。碰撞脫困後備仍會掃完整 solids，但正常安全起點和滑行不走此路徑。CPU 檢查不代表最終 GPU 負載、畫面自然度或手機手感已驗收。

## 地形 LOD 接縫獨立追加

本段由未實作該網格修補的 Spec 審查者獨立查核 `open_world.js:33–46` 與新 `terrain-lod.cjs`。**未發現新增的明文規範違反或需修正的重要程式異味。** 修補局限於既有地形建立器，22段公共外周連接有界粗內圈；未引進新套件、執行階段網路依賴、全域隨機消耗或額外互動狀態。

| 檢查 | 獨立證據 | 狀態 |
|---|---|:---:|
| 有界資料與既有接點 | 每遠景tile由98增至158三角、近景968不變；seed、材質、LOD門檻、陰影設定保留 | CPU **9/9** ★★★ |
| 真公共網格覆蓋 | 全100tile任意相鄰LOD邊界一致，面均朝上且總投影面積4096；額外焊點驗證每tile124頂點／281邊／158面、Euler1、88外周邊，內邊全為兩次使用 | CPU 探索性複核 ★★★ |
| 測試主張精度 | 近景測試依現行 groundHeight 重建修補前22×22網格算法，並非已發布binary比較；實作者已將原「released surface」改為「pre-seam 22 by 22 triangulation」。這是證據描述修正，不是已觀察到的功能失敗 | 邊界已標明 ★★☆ |

環帶採單調合併兩組邊界參數，四個凸梯形只共用角落連線；正朝向、面積與 manifold 檢查彼此補足，沒有以單純triangle數冒充無洞驗證。未要求為此局部修補重構既有全域風格。最終烘焙的裂縫／切換專項視覺證據已另列於下；一般畫面自然度與最終GPU成本仍由後續gate驗收，本審查未開GPU。


同日最後 `engine.js` 窄修複核：`atomicGround = !shadowPass && b.material===1` 同時控制主畫面容差0、上限排他與地面uniform淡化0；high/low 使用相同origin與quality scale，等號恰好由low提交。shadowPass保持原±.6 m，非地面材質保持原行為。已獨立重跑 `terrain-lod.cjs` **9/9**，新測試實際執行 production updateBatch，不是字串比對或重製條件；覆蓋6種 mobile／quality組合與每個邊界7個距離。無新重要副作用或規範違反。

已核讀渲染代理產出 `qa/parity/regions-014-seam.json`：**7/7**、14個 compiled/GL0 截圖樣本、零例外，目標tile取樣時每次只提交一個地面LOD且真GL uniform fade0；直向實際移動跨越原失敗距離。審查者也獨立目視相同81.4938 m站位的before-transition-fix與after圖，大塊破點已消除。兩種裂縫缺陷因此按來源＋CPU＋專項GPU證據關閉；仍明示高低內部形狀的硬切pop，不聲稱平滑geomorph。此專項不替代最終全景效能、離線或公開版驗證。
