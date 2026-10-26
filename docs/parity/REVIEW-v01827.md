# 0.18.27 獨立兩軸審查

固定基準 `df7b1a7042fc6b544e893fd9ee3d2833d96e8c94`。審查時 HEAD 等於基準、提交清單為空，範圍為 `git diff <baseline>` 加新規格及新測試；沒有把空三點 diff 當作已審。依 AskMatt code-review 分開由兩位代理進行 Standards／Spec 只讀審查。

## Standards

最終沒有可操作的明文標準違反或阻擋設計問題。內面取消僅接受相同頂點及相反法線；完整碰撞 planes、floorAt、外露封邊仍保留。沉積面以原始世界座標合併面積加權法線，避免區塊 recenter 後重建座標的浮點誤差；硬岩及側面／底面保留硬邊。

早期封閉性測試不足以排除錯刪外露面，已補每面最多兩個 owner、相反法線、owner 中心分居兩側、全部頂點滿足凸體 planes，以及外露封邊檢查。新增正式 build 與 archive 的 107 批逐位元組驗證，避免只憑 manifest 雜湊推論來源吻合。分區／載入檢查的數量更新保留共享 identity、byte equality、streaming、大小上限及失敗斷言。

## Spec

最終沒有確認的 production 實作缺陷或範圍擴張；固定路線整體 GPU 成本不增加的條件仍未能判定，驗收保持開放，不能稱本切片全部規格已通過。幾何層緣、細粒沉積、原有路線／生物核心、碰撞與自動畫質符合本輪規格；完整商用、實體手機、原作內容與公網多人門檻保持未完成。

GPU harness 作者沒有自行充當該 harness 的獨立 Spec reviewer。Standards 另核對固定 fixture、實際 production source／URL／shader 身分、碰撞安全、ABBA、完整 frame、影像與計時分離、陰性結果及淺礁像素對照。早期近壁 fixture 低於地面時測試確實拒絕，修正相機高度後保留原安全斷言，未用跳過案例掩蓋。

## 已複查指紋

- `src/trench.js`：`f1c1cfe5bac26f3b4d4b788d97ed17f3ef149b4a946bb3af61ddb655b6888db9`
- `src/deepsea.js`：`a11ec5a0d0d7088ea3c9a52d6ab572446f7b56cf60fc5b211974cd174d380f5e`
- `src/engine.js`：`c03d9b06e1f2f88ad9760b78dd812514a713527cdf8ac09c525e8544e0b989fa`
- `tests/parity/trench-geometry.cjs`：`dd37d3640c19d613b16cffc1e92d6c7d1d59c1d1f8ae59e0910cff0674501ca0`
- `tests/parity/trench-archive.cjs`：`bae63b51a4dc3e518439dca8743b34563d708b8c7a465e8520de5442c9ec498e`
- `tests/parity/trench-surface-browser.cjs`：`c5fabebbbcd4e86f0b0ec6828ebf960de5e317cd6ee3261805759f878e67af05`

Standards 與 Spec 各自無剩餘 P1／P2；實際驗收與公開交付依 [測試報告](../TEST_REPORT-v01827.md) 記錄，不由審查取代。

## 追加回歸與計時審查

六個歷史 fixture 補齊完整 archive 的正式物種註冊順序，原索引／個體／動作斷言保留。含桶眼魚停留的真實導覽暴露鯊魚側身過小，皺鰓鯊專屬距離修正後仍使用原完整入鏡、100／40 px 與碰撞門檻。瀏覽器總目錄改為現有 44 類，保留 UID／唯一性／尺寸檢查。

首輪 GPU 計時出現非穩態漂移，新增每 block 60 幀暖機、ABBA／BAAB 及 timing-only 明確區分。Standards 發現 warm 會覆寫跨 block 基準，已改成僅建立第一次 fixed／work／batchRefs；後續暖機不可重新基準化。最終四份暖機 raw 的 40 個 scene／version pair 及各自兩個 block，conditions／workload 彼此完全相同，且與保留的 session.warm 快照相同，補證在 `gpu-block-invariance.json`，沒有為取得好數字重跑。新樣本另記 timeOrigin；歷史 wallTimeMs 僅作同頁漂移判讀。

GPU 零增加仍未定，原規格目標不改為完成；報告揭露同像素淺礁的雙向波動，僅主張直接驗證的幾何與 CPU 生成減量。此驗收缺口阻擋全部達標的聲稱，不等同已確認 production regression。

## 正常導覽揭露的側身角度

CPU 投影過關後，正常瀏覽器仍以原 0.85 側身門檻抓到失敗。最後修復用正式相同接近速度，於建立路線時有界估計抵達時間及停留中點姿態，保留固定 endpoint；預估只寫 clone 的位置／純量欄位，真實魚體及共用 home／modelCenter 不受改動。距離、路徑、floorAt、collide 與視線 gate 均保留。Standards 最終只讀審查無確認 P1／P2；另一位未撰寫此修復的代理獨立 Spec 複查亦未發現阻擋不符，並確認保留原行為及門檻。

新回歸包含實機失敗時刻與水平巡游一週的十二個離散相位；三視窗於停留中每半秒及末端取樣，不能稱每個連續時刻的視覺證明。新增測試 SHA-256 為 `997f51ba94756aa46b8ea0476e7dab9e548cac8a794ae9d0019f20077b1ef9a9`；既有 deepsea-arrival 最終為 `d8ddee5e998b5940c546f47aa61ccd22db7500ea92d39bcfa9398a944c660611`。正常桌機／觸控與公開交付另依報告驗收。

## 發布核對

Runtime `63971221191730d4a550eae2a0840f6f30442615` 已建置，公開 300／300 檔案與桌機／觸控預設入海通過。最後發布措辭另經只讀複查，保留 GPU 零增加未定、觸控模擬與實體裝置差異及完整商用缺口；詳見 [公開交付](../TEST_REPORT-v01827.md#公開交付)。
