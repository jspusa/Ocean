# v0.18.45 海龜：連續頭部與材質

固定基準：`dbd54ec34adcdad177014d01d3536197ea21fb59`（v0.18.44）。本節為 geometry 契約；材質部分由主執行緒另外補充。這是改善既有海龜的可見形態，不代表整體寫實或手機耗電目標完成。

## Geometry

### 真實失敗與範圍

原生正面／斜面可見獨立淺色橢球喙，造成按鈕般拼貼外觀。正式高模型額外使用 780 triangles 的喙橢球及 420 triangles 的重複口線管；四鰭端的軸向法線不符合離散末端 fan，高模型 20、低模型 10 個鰭端 corner normals 與實際面反向。高模型另有 48 個埋入頭後首環的微小負 dot。保存基準實際模型 RED，不把 topology／法線通過當美術接受。

獨立實際網格審查另確認：基準低 LOD 兩眼與頭部約有 .009 模型單位間隙。保留眼睛位置時，以同一連續頭部曲面的局部眼窩支撐修正，兩 LOD 必須有實際正體積接觸。原高 LOD 鼻孔整體埋入頭部；本次保留其位置與接觸，不宣稱已改善鼻孔可見性。

| 項目 | 基準 | 本次幾何要求 | 驗證強度 |
|---|---|---|---|
| 頭／喙 | 兩個重疊曲面 | 合成一個閉合 head surface，嘴線為該表面的淺凹輪廓；不新增球／管 | ★★★★★ 實際 triangles |
| 殼 | 已閉合且共邊平滑 | 全部殼 vertex attributes／indices 保持精確；不重塑殼體 | ★★★★★ 精確比較 |
| 頭後端 | x≤.95 的既有 loft | 保留實際 sampled positions；只允許必要 normal 修復 | ★★★★★ 精確比較 |
| 眼／鼻 | 現有位置與接觸圖 | 原 ellipsoid 位置、尺度及 geometry 保持；以 head→lid→eye→highlight 接觸圖驗證，不要求每顆眼球直接碰 head | ★★★★★ 實際接觸 |
| 四鰭 | 有厚度且根埋殼內 | 先保持形狀／根／末端不變；只在必要末環細部修復 cap normals | ★★★★★ 逐角檢查 |

### 必須維持

1. 高／低 LOD 共享同一頭部解析形狀及 tag 語義；頭部皮膚 tag 2、整合喙 tag 3、既有眼鼻 tag 4、material 5／kind 2 不變。喙區與皮膚可分 tag，但共邊位置、normal 連續。
2. 所有正式 source／indexed triangles 非退化，normal 有限且單位長；逐 corner 的 face-normal dot ≥0（Float32 驗證只容許數值量級誤差，不容許可見反向法線）。末端不可僅翻 triangle winding 配合法線；若單一 pole normal 無法合法覆蓋 incident faces，改正末環取樣／局部幾何。
3. 刪除獨立喙橢球與兩份重複口線 tube。近模型嘴線凹陷必須存在於真實頭部表面，不能只新增材質條紋或用多個獨立零件遮掩；低 LOD 取樣相同解析形狀，但不宣稱遠距可分辨細口溝。維持頭部 x≤1.31、既有眼鼻錨點接觸，不引入浮空部件。
4. 六個海龜 UID、genes、種子消耗、scale、路線、14m／180m LOD 及碰撞行為不變。兩 LOD 的實際 radius 必須保持 `1.719214937115194`，不能由較小形態默默縮窄接觸包絡；kind 2 原 shader stroke、全 phase 幅度及 rigid shell 不變。
5. 預算不超過基準高 14,170／低 1,122 triangles；indexed bytes 不超過 529,512／43,656。禁止藉新增 render pass、材質、貼圖或 shader 改動通過本 geometry 階段。

### CPU 與原生接受

正式測試要補獨立失敗見證：原 head＋beak 的分離 component、真實 face／corner normal 反向、基準 exact shell／後頭／四鰭、保留眼鼻實際接觸、低／高輪廓及完整動畫包絡。舊測試要求「所有 cap normal 必須沿同一固定座標軸」是錯誤實作鏡像，應改為依實際 fan 的共同 outward normal 與逐角同向。

CPU 通過後由主執行緒在同一 `turtle-002`、原 pose／time／camera／shader／世界鄰居下檢視 front、oblique、side、underside、抬鰭與遠 LOD；桌面／觸控自動畫質均需保留。若嘴／頭仍像拼貼，應拒絕候選，不以增加三角形或調亮全景代替形態改進。最後的 guide 圖與實際模型需一致。

## Material

原創 imagegen 皮膚色彩貼圖，使用 `assets/turtle_skin_v45.jpg`（1024² JPEG）。不把生成影像稱為科學掃描、原生物照片或完整 PBR 材質。實際來源與完整提示詞見 [TURTLE-SKIN-v01845](TURTLE-SKIN-v01845.md)。

1. 使用既有 slot 5，替換原本未取樣的 `shell_nor_gl`；九個常駐貼圖數與該 slot 1024² RGBA8／mip 容量不增。保留舊公開檔以容納舊頁面，故網站資產／離線包會多一個新 JPEG；如實列出 bytes。
2. 頭部使用模型座標圓柱投影，鰭使用模型座標 XZ 投影；不使用會隨世界旋轉切換的 normal 投影。鏡像重複保證邊界色彩連續，不假設生成影像四邊天然吻合。角度先摺疊，避免下顎 ±π 跨越造成隱式 mip 梯度跳變；軸心以有限 epsilon 避免 atan(0,0)。
3. 每個皮膚 fragment 最多兩次新增色彩取樣，既有兩次 noise、不新增 octave、render pass、material 或高／低模型。保留額前兩片較大鱗片、頸部皺褶、較淡腹面與獨立個體色差。以既有 gamma-space 材質管線處理，避免重複 sRGB 解碼。
4. mipmaps／anisotropy、低畫質色彩與中高畫質細法線均需正常；只有海龜使用新的 sampler，所有其他材質、故障回復、離線包均保持可載入。光照及自動畫質設定不為截圖改亮。
5. 實際 compiled triangles／instance／正式 shader 的 48 組材質轉向對照必須維持原容差；七個世界鏡頭與 120 游動 frames 無 GL error／全黑。原生 GPU 成本用 v44 真正 material 5 對照，固定相同 candidate 幾何、camera、instance、quality、texture／lighting，不能對照更舊 generic shader。效果以實景審視接受，效能數據只涵蓋本機原生桌面與觸控模擬。
