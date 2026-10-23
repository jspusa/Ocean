# 保留畫質與更新率的效能驗證

日期：2026-10-23。比較基準為 `948c046a67fb5b7c7b8f77466b4b24171e75be9d`（0.17.0）。本次保留原版解析度、抗鋸齒、特效、可見細節、操作與繪圖排程。先前草稿中的限幀、自動畫質降級改寫及均衡 MSAA 降級已撤回；`performance.js`、`mobile-controls.js` 和 `animate()` 恢復原版。原有的自動解析度選項仍沿用原本行為。

## 實作與依據

- **附近碰撞候選集：** 將 185 個固定珊瑚礁障礙物放入 16 m 空間格，游泳、相機與視線查詢只進入相關格。保留原本精確碰撞算法與障礙物順序；被推離後重新查詢後續候選，避免跨格漏碰撞。長距離射線有有界後備路徑。區域地形的原有碰撞照常運作。
- **靜態海床重用：** 初始化時以原本雙精度建立固定高度格；游泳與生物查高度時，沿用相同插值順序，省去反覆產生地形雜訊。
- **更精確的視錐剔除：** 原版已有距離與球形視錐剔除。這次僅對邊界較鬆的固定剛性幾何補上緊密包圍盒；材質動畫、植物與動物沿用原界限。陰影與相機分開判斷，保留畫面外投影物件。
- **減少重複 WebGL 提交：** 未改變的靜態實例資料不重複上傳；陰影、可見集合、物件移動與深海原點變更都會檢查實際資料。每個 shader pass 內，相同材質／物種／LOD 參數只在變更時設定，不改變繪製順序。靜態上傳快取最多約 439 KiB。

已參考 Unreal World Partition、Godot MultiMesh／剔除及 Unity CullingGroup 官方作法，見 [調研與適用邊界](parity/PERFORMANCE-REFERENCE.md)。目前完成的是局部查詢、精確剔除與資料重用；完整地圖資源串流尚未實作，初次下載量與整體幾何駐留量沒有因此減少。

## 畫面與工作量對照

以同一 Chromium／SwiftShader、固定鏡頭與時間，比較原版及修改版真實 WebGL 輸出。桌面使用細緻畫質，觸控模擬使用均衡畫質；兩者均保留此環境的 4× MSAA。基礎畫面為 320×240、DPR 1；另測桌面 550×370 與手機直向 195×422。小畫面用於控制軟體 GPU 測試成本，不代表實體手機效能。

**11 組最終 RGBA 輸出逐位元組完全相同**：桌面／手機各自的珊瑚礁、外海、7,000 m 深海，加上桌面洞窟、遺跡、反向視角、寬畫面及手機直向。每組均確認原圖非空白、解析度／體積光尺寸／MSAA 相同，且沒有 WebGL 或 pageerror。

| 固定珊瑚礁視角，每幀指標 | 原版 | 修改後 |
| --- | ---: | ---: |
| 桌面 GPU 資料上傳次數 | 132 | 18 |
| 桌面上傳 bytes | 115,968 | 57,216 |
| 桌面 uniform 呼叫次數 | 957 | 321 |
| 觸控橫向 GPU 資料上傳次數 | 121 | 18 |
| 觸控橫向上傳 bytes | 109,728 | 57,216 |
| 觸控橫向 uniform 呼叫次數 | 891 | 314 |
| 手機直向 GPU 資料上傳次數 | 65 | 16 |
| 手機直向 uniform 呼叫次數 | 555 | 253 |
| 手機直向 draw calls | 71 | 63 |

手機直向提交三角形由 416,276 降為 411,668，輸出像素仍完全一致。這些是排除無效工作的計數，不是 FPS 或耗電改善百分比。

另以真實 `animate()`、繪圖 spy 與受控 120 Hz 回呼檢查排程：原版與修改版的低／高畫質及首頁皆繪製 120 次；暫停與背景頁面皆為 0。模擬經過時間與游泳位置完全相同。此測試確認沒有新增限幀，不表示軟體 GPU 或所有裝置能實際達到 120 FPS。

## 碰撞、地形與回歸

- 空間碰撞 8/8：與凍結的 0.17 原函式比較 1,615 個點／射線，覆蓋連續推離、負座標格、長射線、場景重建與區域掃掠。深海 120 個物理步驟對無關珊瑚礁障礙物的位置讀取由 66,600 次降為 0。
- 海床 10,000 次查詢：所有結果與原版序列完全相同；查詢期間 `sin`／`cos`／`pow`／`exp` 呼叫由 720,904 次降為 0。回歸腳本亦檢查越界與非有限輸入。
- 完整重新編譯場景後，`assets/reef.mesh.gz` 與原版位元組相同，SHA-256 為 `719cee472608b570784271d4004ea47cf3d5c4427eff84d86d00bed72f6d96a6`。包含 481 個 meshes、3,647 個共用實例；世界幾何及內容不變。
- 渲染快取 10/10、緊密邊界 5/5、逐 draw 狀態對照 5/5、地形 LOD 9/9、大型生物渲染 4/4、深海地形 12/12。
- 自由游泳 12/12、連續海域 6/6、水面操作 13/13、區域相機 11/11、選取 14/14、生態 39/39、攝影 18/18、船上行為 12/12。
- 自由海洋瀏覽器 33/33：桌面、手機直向與橫向的啟動、鍵盤／觸控、跨海域、7,000 m 存檔重載、大型生物與深海燈光；無瀏覽器執行錯誤。
- 舊 `partner-follow.cjs` 在原版與修改版均出現 19 項 `OceanTrench is not defined`；先前對照輸出完全相同，屬測試 fixture 缺少地形依賴，未列為通過。

這些對照覆蓋指定場景與行為；尚未量測實體電腦／手機的幀時間或功耗，也不能由 11 張畫面推論所有視角。後續資源串流需處理相鄰區域預載、跨格生物與讀檔目的地，避免地形突然出現或載入停頓。

## 重跑

```sh
python3 build.py --pack-only
python3 tests/parity/static_check.py
node tests/parity/ground-sampling-performance.cjs
node tests/parity/spatial-collision.cjs
node tests/parity/spatial-culling.cjs
node tests/parity/render-efficiency.cjs
node tests/parity/render-state.cjs
node tests/parity/terrain-lod.cjs
node tests/parity/pelagic-rendering.cjs
python3 -m http.server 8000
```

另一工作目錄 checkout 原版 `948c046a67fb5b7c7b8f77466b4b24171e75be9d`，以 `python3 -m http.server 8001` 提供原版；再在修改版目錄執行：

```sh
# 需安裝 Playwright，可用 PLAYWRIGHT_PATH 指定位置。
# 瀏覽器測試依序執行，避免爭用 GPU。
node tests/parity/quality-preserving-performance.cjs
node tests/parity/free-ocean-browser.cjs http://127.0.0.1:8000/
```

比較腳本預設原版位於 `:8001`、修改版位於 `:8000`，可使用 `--original=`／`--candidate=` 覆寫。最終結果為 `qa/parity/quality-preserving-performance.json`，原版像素為 `qa/parity/quality-original.json`。QA 原始產物不隨網站發布。
