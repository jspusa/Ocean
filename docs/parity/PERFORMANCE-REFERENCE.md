# 保留畫質與流暢度的場景效能調研

查閱日期：2026-10-23。使用者要求保留解析度、抗鋸齒、細節、可見內容與操作更新頻率，減少無效工作；本輪不以限幀、降低畫質或縮小可探索海域達成效能改善。以下區分官方作法與 Ocean 的實作建議，並非宣稱已完成完整地圖串流。

## 遊戲引擎採用的作法

| 作法 | 官方依據 | 對 Ocean 的用途 |
| --- | --- | --- |
| 世界分格與依位置載入 | Unreal World Partition 把持續世界分成可載入的格子，由玩家等 streaming source 決定載入範圍；傳送範例先載入目的地，再移動玩家。[Epic 官方文件](https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine#streamingsources) | 保留完整世界與存檔，只讓可能需要的幾何進入 GPU。預載範圍必須涵蓋轉身、快速游動與讀檔目的地。 |
| 依空間拆分繪圖批次 | Godot 指出 MultiMesh 的個別實例不能獨立剔除，建議按世界區域拆成數個 MultiMesh，避免整個大批次一起繪製。[Godot 官方文件](https://docs.godotengine.org/en/stable/tutorials/performance/using_multimesh.html) | 保留相同三角形和材質，把大型靜態場景按位置形成有緊密邊界的候選集，兼顧批次效率與剔除粒度。 |
| 可見性資料與遊戲狀態分離 | Unity CullingGroup 用包圍球計算相機可見性與距離，並提供狀態查詢／變更事件；官方建議預先配置足夠容量，避免執行時反覆調整陣列。[概念](https://docs.unity.com/en-us/engine/6000.3/manual/cameras/occlusion-culling/culling-group-api/api)、[配置](https://docs.unity.com/en-us/engine/6000.3/manual/cameras/occlusion-culling/culling-group-api/getstarted) | 生物仍有固定 ID、位置與存檔資料；渲染候選集使用可重用陣列，不把「沒畫出來」當成「不存在」。 |
| 完全遮蔽才跳過 | Godot 以物件 AABB 對遮蔽物測試，只有完全被遮蔽才剔除；文件也指出開闊場景遮蔽機會少時，額外 CPU 成本可能不值得。[Godot 官方文件](https://docs.godotengine.org/en/stable/tutorials/3d/occlusion_culling.html) | 洞窟／沉船較適合遮蔽剔除；開闊海域先做精確視錐與空間候選篩選，不直接加入昂貴的全世界遮蔽系統。 |

這些機制能減少看不到的物件所產生的工作；是否改善幀時間仍取決於原本瓶頸。Godot 的大型世界章節亦將按需載入地形區塊用於控制記憶體與局部處理量。[Godot：大型世界](https://docs.godotengine.org/en/stable/tutorials/performance/optimizing_3d_performance.html#large-worlds)

## Ocean 原版的對照

以 `948c046` 為比較基準：[engine.js](../../src/engine.js) 已有實例距離與視錐剔除，以及 instanced drawing；所以不能把「新增剔除」當成尚不存在的功能。`indexGeometry()` 以局部原點到最遠頂點的距離建立球半徑，`updateBatch()` 再把球放在實例位置。這種保守球遇到不以原點為中心的地形時可能很鬆，值得以實際頂點邊界與提交數驗證。

[scene_cache.js](../../src/scene_cache.js) 會解壓整個編譯場景，逐批建立所有 WebGL 幾何；分批 `requestAnimationFrame` 是載入工作切片，不代表相鄰區域預載或 GPU 幾何卸載。[individuals.js](../../src/individuals.js) 的 `updateLife()` 也會遍歷所有生物。以上是程式觀察，並非單憑程式閱讀就認定唯一卡頓來源。

## 建議落地順序與正確性邊界

1. **先精確剔除與快取。** 對不可變靜態幾何計算緊密邊界，建立空間候選集；沿用原本可見幾何、材質、解析度與幀迴圈，跳過確定不影響輸出的提交。未變的 GPU 資料繼續重用。
2. **讓渲染與狀態分離。** 地形分區不應移除碰撞、海圖目的地或存檔。大型生物跨格、夥伴、餵食反應、船與水族館都需動態失效處理，不能只按出生位置分類。
3. **如記憶體／首次載入是瓶頸，再做資源串流。** 採相鄰格預載、載入／卸載不同邊界與有界快取；讀檔到 7,000 m 時先準備目的地。每幀限制的是背景資源建立量，不是玩家操作或畫面幀率；必要內容未準備好時不可留下地形洞或瞬間冒出的物件。這是本專案設計建議，非套用引擎預設就能保證的結果。

剔除邊界必須包住 shader 動畫、縮放與旋轉後的頂點。Ocean 的部分植物材質即使不是動態生物也會在 vertex shader 中擺動。色彩、靜態陰影與動態陰影使用不同視錐；相機外的物件仍可能在畫面內投影，不能直接共用相機可見清單剔除陰影。單看物件中心點在螢幕外也不足以移除大型鯨魚或地形。

不建議為了省少量 draw calls 把全海域合成一個巨型批次；批次與空間剔除需要共同設計。WebGL 呼叫也應避免同步讀回與熱路徑資源重新配置，因為這類操作可能讓 CPU 等 GPU；測試用的 `readPixels`／`finish` 不應混進正式幀迴圈。[MDN WebGL：避免阻塞呼叫與批次繪圖](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#avoid_blocking_api_calls_in_production)

## 驗收方式

固定同一畫質、解析度、鏡頭、時間、光照與生物狀態，對原版與新版比較畫面；另記候選數、提交三角形、draw calls、上傳 bytes、CPU 時間與幀時間分布。需覆蓋轉身、區塊邊界、靜態／動態陰影、深海相對原點、船／水族館及存檔重載。只降低候選數不能單獨證明真機 FPS 改善；只有畫面與玩法維持一致、工作量下降，才符合這次要求。
