# 0.12 鯨豚形態、尺度與夥伴接口

查核日：2026-10-13。這個切片追加七種原創程序模型，與既有瓶鼻海豚組成八種夥伴候選；不代表 Wii 一代全物種、全部夥伴事件或完整生態模擬已完成。網格、配色、刮痕與 SVG 均由本專案製作，沒有使用原遊戲或研究網站的模型、照片、貼圖。

## 形態依據

★ 表示已有下列第一方生物資料支持，不是模型真實度或遊戲品質評分。表中自然範圍／最大值與本作代表個體尺度分開列示；來源不支持本作的訓練能力、信任門檻、互動許可、速度或出現海域。

| 索引／穩定 ID | 形態與自然行為依據 | 自然尺寸／本版尺度 | 來源 |
|---|---|---|---|
| 20 `common_dolphin` | ★ *Delphinus delphis*。適中長吻、細長身體、高背鰭；黃褐前側與灰色後側形成沙漏紋。常群游並躍出水面。 | NOAA 列6–8英呎，約1.83–2.44 m；模型 **2.1 m**。 | [NOAA：Short-Beaked Common Dolphin](https://www.fisheries.noaa.gov/species/short-beaked-common-dolphin) |
| 21 `white_sided_dolphin` | ★ *Lagenorhynchus obliquidens*。本作採太平洋白側海豚：短吻、厚實體型、大背鰭，黑背、灰側、白腹與側面淺色長帶；會合作覓食。 | NOAA 列5.5–8英呎，約1.68–2.44 m；模型 **2.2 m**。 | [NOAA：Pacific White-Sided Dolphin](https://www.fisheries.noaa.gov/species/pacific-white-sided-dolphin) |
| 22 `commerson_dolphin` | ★ *Cephalorhynchus commersonii*。短鈍頭、低而圓的背鰭、槳狀胸鰭；白軀幹與黑頭、黑尾分區。尾葉上下擺動產生推力。 | 來源平均範圍1.2–1.7 m，並區分南美與較大的凱爾蓋朗族群；模型 **1.45 m** 參照南美族群。 | [SeaWorld：Physical Characteristics](https://seaworld.org/animals/all-about/commersons-dolphins/characteristics/) |
| 23 `orca` | ★ *Orcinus orca*。白眼斑、灰鞍斑、白腹與寬胸鰭；成年雄性的背鰭、胸鰭等比例較大。本模型採雄性高背鰭輪廓。社群、外觀與食性隨族群而異。 | NOAA 列可達32英呎，約9.75 m；模型 **7.2 m**。 | [NOAA：Killer Whale](https://www.fisheries.noaa.gov/species/killer-whale) |
| 24 `beluga` | ★ *Delphinapterus leucas*。成體白色、圓額、可活動頸部；無高背鰭，背部只有低隆脊。自然生活於北極與亞北極水域。 | NOAA 列可達16英呎，約4.88 m；模型 **4.2 m**。 | [NOAA：Beluga Whale](https://www.fisheries.noaa.gov/species/beluga-whale) |
| 25 `false_killer_whale` | ★ *Pseudorca crassidens*。深色細長身體、無長吻的圓錐頭、後彎背鰭，胸鰭前緣有 S 形隆起；腹面較淡。社會性強，捕食魚與魷魚。 | NOAA 列雌性可達16英呎、雄性20英呎，約4.88／6.10 m；模型 **5 m**。 | [NOAA：False Killer Whale](https://www.fisheries.noaa.gov/species/false-killer-whale) |
| 26 `rissos_dolphin` | ★ *Grampus griseus*。鈍圓頭、額前縱溝、細尾柄、高鐮形背鰭；成體隨年齡轉淡，常有淺色自然刮痕。捕食以魷魚為主。 | NOAA 列8.5–13英呎，約2.59–3.96 m；模型 **3.3 m**。 | [NOAA：Risso’s Dolphin](https://www.fisheries.noaa.gov/species/rissos-dolphin) |

白側海豚學名沿用所引 NOAA 頁面的分類標籤，並非宣稱分類學沒有其他處理。瑞氏海豚刮痕由確定性曲線生成，沒有複製特定真實個體，也不由刮痕推斷年齡。本作共用幻想海域與水族館展景並不表示這些物種自然共棲，尤其白鯨的暖礁展示不能當成真實棲地。模型沒有重現完整骨骼、呼吸生理、食物網、族群方言或生殖行為。

## 模型與資料接口

`cetaceans.js` 在 `fauna.js` 後、場景建立前載入。`registerFauna(entry, collection=FAUNA_SPECIES)` 可指定獨立集合；新種只加入 `CETACEAN_SPECIES` 與 `SPECIES`，原本八種微型／底棲生物不被混入鯨豚。索引0–19與資料保持不變，瓶鼻海豚仍是索引11。

- 座標：**+X 頭向前，+Y 向上，Z 左右側**；原點位於軀幹中央。全長標準約1模型單位，含尾葉的曲線外伸誤差不超過1.5%；`bodyLength=1`、`modelUnitLength=1`，`size` 為上表公尺尺度。
- `faunaGeometry(speciesOrId, lod=false)` 回傳原創 `Geometry`，`g.material=0`，`g.species` 為穩定索引；新鯨豚批次使用 `kind=9`。`modelBounds` 為包含鰭、尾與細節的實際高模界線。
- `tag1` 為軀幹與表面細節，`tag3` 為背鰭、胸鰭及尾葉，`tag4` 為雙側眼部。身體與鰭使用連續曲線截面、平滑法線和逐頂點色；左右胸鰭獨立建立並檢查面朝外。
- 每種擁有不同身體截面、吻部、背鰭、胸鰭及尾葉控制點；白鯨低脊、康氏圓鰭、偽虎鯨胸鰭曲線和虎鯨高背鰭並非同一模型換色。
- `traits.motion='cetacean'`、`micro=false`、`grabbable=true`、`feedable=false`。接觸／觀察／取景距離都是本作互動規則。`traits.floorOffset=-modelBounds.min[1]` 為原點到最低點的模型單位，轉為公尺時乘 `size`。
- `sp.thumb` 是使用實際輪廓控制點製作的自含 SVG 示意後備；正式圖鑑可由 `ASSETS['guide_'+id]` 提供實際 WebGL 模型 JPEG。資產交付和畫面檢查由版本總驗收記錄追蹤。

以下為工程界線映射，非自然物種體型評比；數字由實際網格量測，四捨五入至小數點後四位。

| ID | min [X,Y,Z] | max [X,Y,Z] | 高模／低模三角形 |
|---|---|---|---:|
| `common_dolphin` | [−.5006, −.0824, −.1720] | [.5000, .1835, .1720] | 11,474 / 2,368 |
| `white_sided_dolphin` | [−.5007, −.0845, −.1840] | [.5000, .2144, .1840] | 11,474 / 2,368 |
| `commerson_dolphin` | [−.4963, −.0978, −.1740] | [.5000, .1690, .1740] | 11,474 / 2,368 |
| `orca` | [−.5044, −.1372, −.2340] | [.5000, .3110, .2340] | 11,474 / 2,368 |
| `beluga` | [−.5018, −.1193, −.2160] | [.5000, .1279, .2160] | 11,474 / 2,368 |
| `false_killer_whale` | [−.5002, −.0899, −.1910] | [.5000, .1800, .1910] | 11,474 / 2,368 |
| `rissos_dolphin` | [−.5006, −.1022, −.2120] | [.5009, .2435, .2120] | 13,898 / 2,984 |

## 夥伴與動作參數

`partnerTraits(indexOrIdOrSp)` 接受索引、穩定ID或物種物件，回傳 `partnerProfile`；非夥伴物種回傳 `null`。`mouth`、`fin`、`ride` 是模型局部點，需按實際演員的尺度、朝向、俯仰及位置轉為世界座標；不得將新種的局部點直接當成公尺偏移。`length` 是代表個體公尺全長；`swimSpeed`／`approachSpeed` 是本作公尺／秒，`turnRate` 為弧度／秒。

舊瓶鼻海豚保持原模型座標：嘴部 `[1.8,-.04,0]`、胸鰭 `[0,-.14,.65]`、騎乘 `[-1.35,.45,0]`，`length=4`、`swimSpeed=3.7`、`approachSpeed=12`。新種的接觸點已由高、低網格逐一檢查，距相應可見幾何最近頂點不超過0.035模型單位。騎乘位置、速度與操作感是遊戲配置，不是自然行為或真實馴養方法。

`motionProfile` 四欄均完整提供：`cruiseSpeed` 公尺／秒、`beat` 弧度／秒、`surfacePeriod` 秒、`depthSwing` 公尺；均是本作的游動參數。動作系統負責垂直尾擺與胸鰭控制，不能為方便取景改變 `size`。`aquarium.cost` 是展景成本，不是動物空間需求的科學數據。

## 已執行的模型檢查

`tests/parity/cetaceans.cjs` 先以不存在的虎鯨模型形成失敗，再完成可見嘴部／胸鰭接觸與公尺尺度切片；另以有號體積檢查找出並修正鏡像鰭的反面問題。13個檢查通過：八種夥伴解析、原資料／微型集合保留、七種高低模有限頂點、有效法線與索引、無退化面、模型尺度與LOD界線、雙側眼部、實際接觸點、不同解剖輪廓、逐頂點色及自含縮圖。既有 `fauna.cjs` 的18項模型檢查亦通過。

這些純模型檢查不等同實際遊戲的光影、動作、訓練、保存、觸控或效能驗收。整合GPU驗收由本版總測試記錄列示；第一輪畫面發現的虎鯨小色斑取樣與白鯨陰影邊界問題由渲染切片追蹤，不以增加幾何或通過純測試宣稱已消除。
