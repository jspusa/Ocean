# 深水頭身、鰭面與口囊修整

基準：已發布 v0.18.45，commit `5c43505718075b164e05039d3ad926df02d869b6`。本切片已完成 source freeze 與 CPU 驗證；原生 WebGL 光照、圖鑑、微觀、真棲地、效能及發布由 root 接續。文件版本名稱不代表已發布。本輪沒有修改音訊或進入流程。

`src/abyss_fauna.js` SHA-256：`8cb89ca547b58795c0b67a121d80fbb1b0bb8847a9bd6d054c4033160fa5d882`。

## 形態依據與界線

2026-10-30 重新查閱 [Australian Museum 腔棘魚](https://australian.museum/learn/animals/fishes/coelacanth-latimeria-chalumnae-smith-1939/)：肉質成對鰭、鋼藍外觀及中央延出的三部分尾形，作為現有 1.5 m 原創數位個體的辨識依據。[Australian Museum 吞鰻](https://australian.museum/learn/animals/fishes/pelican-eel-eurypharynx-pelecanoides/)：巨大嘴部、吻端附近小眼、多排小牙、黑色細長身體與尾端發光器，作為現有 0.75 m 個體的依據。沒有下載或改作館方照片、遊戲模型、貼圖或音訊。

鰭的控制點、曲率、張口姿態、厚度、牙數及光學材質是原創美術選擇，並非來源的精密形態量測。科學來源不提供本模型的頂點或照片級品質保證。

## 實作範圍

只重做 `src/abyss_fauna.js` 的 coelacanth、pelican builders 及專用 helper。保留 UID、home、scale、presence、spawn 和所有位置動作規則。未修改 engine、build、version、commit 或公開站點。

root 另外核准唯一的其他 builder 例外：鮟鱇既有口腔內襯改為 tag2，位置、法線、頂點色、UV、三角順序與數量完全不變。高／低模有 5,400／1,500 個頂點 word 的 tag1→tag2；排除 tag 後 Float64 實際網格 SHA 分別保持 `a9762ae76222389517189e19872fcf4a629ae81c82a8581536b46a1a3f3bb1b7`、`c92aebf4ef8c078399f19388415906f4ffb84dfeb4a94ec244d225e55e4afaed`。巨型烏賊與蜘蛛蟹高／低網格所有 word 的 SHA 均完全不變，證據在 `unmodified-models.json`。

下表星等表示證據階段：★★★為 CPU 結構／初步輪廓可確認，並非擬真分數、GPU 或手機驗收。

| 項目 | v45 問題實證 | frozen 實作與目前證據 | 階段 |
|---|---|---|---|
| 腔棘魚頭臉 | 身體與嘴／鰓線共 5 個未焊接面群；側眼偏大 | 單一閉合頭身；嘴／鰓折線刻入本體並以低明度基色保留；小眼直接與真實表面相交。移除原高頻頂點斑，留下平滑藍色供 root 材質細節 | ★★★☆☆ |
| 腔棘魚成對鰭／背鰭 | high 114、low 50 個 tag3 幾何分群，包括圓管鰭條和板片 | 肉質根部連續變薄，有曲率的閉合表面；四成對鰭的外段厚度小於根部48%，有可量測弧度，根部與真身體三角面相交 | ★★★☆☆ |
| 腔棘魚尾形 | 分開的板片；初版新 loft 又過於花瓣狀 | 最終改成一片寬而連續的三葉尾面，中央只短幅延出。全魚 tag3 共8個閉合面群：四成對鰭、兩背鰭、一臀鰭、一完整尾鰭。root 已看 candidate-5 clay 並同意進原生光照驗收 | ★★★☆☆ |
| 吞鰻口囊與眼 | 頭身 5 個面群、規則圓漏斗、獨立眉球與嘴圈 | 尾至口緣一片連續外皮；下囊較深、口角退後；小眼嵌皮，移除眉球／嘴圈；口腔與外皮共用非平面嘴緣 | ★★★☆☆ |
| 口腔材質語義 | 吞鰻、鮟鱇內外均 tag1 | 僅 species29/30 內襯用 tag2；外皮／牙1、鰭3、眼4、尾光6。種29/30 VS 的 tag2 與 body 同變形，無新 attribute、UV 或 draw call；root 負責 shader 語義消費 | ★★★☆☆ |

## 資源預算與真正尺寸

數據來自實際 `faunaGeometry` / `indexGeometry`。indexed bytes 為 Float32 vertices + Uint32 indices，並非壓縮下載量、整體 GPU 記憶體或 FPS。沒有加隱形極值點凍結舊 bounds，也沒有放大動物或調小既有棲地安全半徑。通用接觸包絡仍由實際模型及原有規則計算；不宣稱其數值完全不變。

| 種類 / LOD | v45 三角形 → frozen | v45 indexed bytes → frozen | 公尺尺度 | 證據 |
|---|---:|---:|---:|---|
| 腔棘魚 high | 8,412 → 6,972 | 399,792 → 264,816 | 1.5 m | ★★★☆☆ |
| 腔棘魚 low | 2,512 → 1,968 | 144,576 → 79,392 | 1.5 m | ★★★☆☆ |
| 吞鰻 high | 6,678 → 6,068 | 274,632 → 236,112 | 0.75 m | ★★★☆☆ |
| 吞鰻 low | 2,228 → 1,756 | 102,480 → 73,104 | 0.75 m | ★★★☆☆ |

高模實測 bounds：腔棘魚 min `[-.510,-.176944214,-.278]`、max `[.490,.228119385,.278]`；吞鰻 min `[-.515088757,-.171470779,-.124451529]`、max `[.484911243,.110915504,.124451529]`。兩種 X 全長都為1，instance公尺尺度未改。完整精度與 low bounds 在 `green.json`。

## CPU 驗證與安全範圍

`tests/parity/deep-anatomy.cjs` 從公開三角網格判定，不 import 建模控制點，也不以 source 字串代替幾何證據：

- 每個 LOD 的三角形／indexed bytes 上限、真尺寸、有限單位法線、非坍塌三角形、繞序。
- 依座標焊接的頭身連通／閉合，眼與鰭根的實際三角面相交；不是僅檢查控制點距離。
- 四對應側鰭的剖面厚度、弧度，八個閉合鰭面及真正三葉尾輪廓。
- 吞鰻內外口腔共邊、非平面口緣、深喉；口腔與外皮三角面不得相穿。這項新增檢查實際抓到中間候選 high/low 的293／161對交叉，修正內襯曲線後均為0。
- 正面與左右斜角射線先命中 tag2 真內襯，X 約 `.166–.184`，沒有用黑色平面假裝洞口。
- 鮟鱇語義例外排除 tag 後的完整網格雜湊相等。
- 12個既有 `deepHabitats`候選：高／低模完整原點半徑加所有 phase 的 rig 位移，再乘真正 scale，連續球包絡對實際 floor／region／`rockContact` catalogue 清空；並取樣完整 `200π` 基本週期確認既有動作保持在包絡內。

| 模型 | frozen 全動畫保守半徑 | 既有認證半徑 | 結果 |
|---|---:|---:|---|
| 腔棘魚 | .822725645 m | 1.05 m | ★★★☆☆ 通過 |
| 吞鰻 | .427710962 m | .50 m | ★★★☆☆ 通過 |

rig 位移上界分別是 `hypot(.035,.016)`、`.055`。完整巡徑球使用既有認證半徑加 `hypot(radius,radius*.42,bob)+.03`，沒有縮小任何碰撞範圍。這證明的是已列出的有限候選及其完整巡徑。

另探查 archive 的原始 authored homes：四隻吞鰻的最寬巡徑球對 floor/region/rock 清空；兩隻腔棘魚在**尚未套用既有動作收縮**的最寬球會碰斜坡，不能把這個球當成原始home的連續證明。原 `abyss-motion.cjs` 的實際收縮動作、全身與原始海床／region逐點檢查仍9/9；這部分不擴大成所有原始位置對岩體的連續證明，也未移 home 或改動作。

## 封存與交接

QA 路徑：`qa/parity/v01846-deep-anatomy/`。

| 檢查／證據 | 結果 | 階段 |
|---|---|---|
| 原始v45 source與4份實際網格 | `abyss_fauna-v45.js`、`red-mesh/*.f32.gz`；source SHA `ff6b1e82a83e2f9e5f5245489ee4b1dc5c3994e3469ec885e2cd187a86ebaca4` | ★★★☆☆ |
| 新獨立幾何 suite | 最終 RED `11/24` → GREEN `24/24`；`red-final.json`、`green.json`。最初10/20保留為`red-initial.json` | ★★★☆☆ |
| 舊模型 suite | `abyss-fauna.cjs` 15/15；只窄修species29/30 tag2與兩種有意改形的精確舊bounds，保留其餘模型契約 | ★★★☆☆ |
| 舊動作 suite | `abyss-motion.cjs` 9/9；source未改 | ★★★☆☆ |
| 新4份網格 | `green-mesh/*.f32.gz`；實際bytes／bounds／包絡在`green.json` | ★★★☆☆ |
| CPU形體投影 | `coelacanth-cpu-clay.png`、`pelican_eel-cpu-clay.png`，使用實際網格、側／斜／正視角；原生光照待root | ★★★☆☆ |

CPU／clay通過不代表照片級自然度、遊戲內流暢、實體手機驗證、公開部署或玩家驗收。root 接續實際圖鑑、微觀、左右／正面／側面、高低LOD、真棲地的 WebGL 照明與自動畫質效能；若畫面出現具體缺陷再修，不以此文件宣稱已全面超越 Wii。
