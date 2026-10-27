# 三腳魚：原創模型、來源與整合契約

查核日期：2026-10-27。實作起點：`f70cb3b`，供 v0.18.34 深淵泥底內容整合。此文件描述 `src/tripod_fish.js` 的模型與 CPU 幾何證據；**不表示已部署、正常探索、GPU 動畫、實際畫面、實體手機或商用門檻已驗收**。完整目標仍依 [SPEC](SPEC.md)、[08 生物內容](issues/08-fauna-catalogue.md)、[12 原作範圍查證](issues/12-content-audit.md)；新增物種不代表 Wii 214 條目盤點完成。

## 來源支持與創作界線

| 來源 | 已讀內容／支持範圍 | 在本作的使用 |
|---|---|---|
| [Museums Victoria／Fishes of Australia：Bathypterois grallator](https://fishesofaustralia.net.au/home/species/2779) | 館方物種形態整理：黑色、無脂鰭；一對延長腹鰭與下尾鰭支撐、末端有接地墊；感覺胸鰭朝上或朝前。第一腹鰭條大於 SL，第二條較細、約前者一半；下尾鰭條記錄為 38–134% SL。自然深度列 900–4,720 m，最大 37 cm SL。 | 保留正確三腳來源、三點接地與獨立感覺胸鰭；不把伸出鰭條算成身體。 |
| [NOAA：Windows to the Deep 2019，Tripod Fish](https://oceanexplorer.noaa.gov/multimedia/okeanos-explorations-ex1903-dailyupdates-june29-media-tripod-fish-2/) | 原始 ROV 觀察頁的檢索內容指認 B. grallator，說明支起身體守候、胸鰭前伸感知獵物。本次開啟完整頁逾時，未作影像比例量測。 | 支持守候姿態及感覺胸鰭用途；不據此聲稱模型比例是原始影像的精密復原。 |
| [Sulak 1977 系統分類研究](https://digit.snm.ku.dk/Documentsonline/GalatheaReports/galathea-vol.14-pp_049-108.pdf)；[Davis & Chakrabarty 2011 行為研究](https://doi.org/10.1080/17451000.2010.515231) | 由館方書目確認。前者 PDF 本次取得逾時；後者未核讀全文。 | 不作已讀全文的一手解剖／步行／降落證據；本次維持靜止支撐，不增加未查證的步行循環。 |

所有比例、網格、SVG 縮圖、色彩與細節均為原創。材質採深炭灰背部至較淺腹部的中性色階，在共享線性光照與原探照燈下保留輪廓細節；此配色並非實測反射率，沒有新增發光或更改全場燈光。館方照片註明 OET／WoRMS、CC BY-NC-SA，未下載作交付素材；NOAA 圖片也未匯入遊戲。25 cm SL 代表個體、2,400 m 遊戲位置、站姿、眼部細節及感覺鰭微動幅度是設計值，不是實測標本，也不宣稱全身物理、覓食或生態模擬。

## 尺度與公開介面

- 物種 ID `tripod_fish`；學名 `Bathypterois grallator`；附加到既有 44 類之後（index 44），不插入或重排。獨立 `TRIPOD_FISH_COLLECTION`，不追加淺礁 `FAUNA_SPECIES` 生成清單。
- `renderKind:11`、`motionProfile.type:'tripod_fish'`、`traits.motion:'crawl'`；不餵食、不抓握。`crawl` 是接地框架分類，**不授權一般爬行位移**；本模型的 speed、radius、bob 均為 0。
- `size:.25` 米、`modelUnitLength:1`、`measureAxis:0`。+X 為前方、+Y 為上方、Z 為左右。SL 尾柄在 `[-.5,.96,0]`，吻端在 `[.5,.958,0]`；沿 X 的長度恰為 1 model unit。前方胸鰭、後方尾鰭與支撐鰭均可超出該長度。
- 海床在 local y=0；模型原點是站姿所在海床，不是魚身中心。魚身中軸約 y=.96，相當於 .24 m 離床高度。`faunaArt.build` 的接地正規化在本模型不額外移動，因實際最低點已是 0。
- `faunaGeometry('tripod_fish', low).anatomy` 是凍結的正式幾何附件，兩個 LOD 都有 `standardLength`、`supports`、`sensoryPectorals`、`supportPlaneY:0`。`range.first/count` 以 **vertex** 計，不是 float offset 或 triangle 數；每點 12 floats。

| 支撐 | `root`（model units） | `contact`（model units） | 標籤 |
|---|---|---|---:|
| 左腹鰭 `pelvic_left` | `[.025,.925,.026]` | `[.38,0,.48]` | 7 |
| 右腹鰭 `pelvic_right` | `[.025,.925,-.026]` | `[.38,0,-.48]` | 7 |
| 下尾鰭 `lower_caudal` | `[-.49,.953,0]` | `[-1.10,0,0]` | 7 |

每個 `supports` 項含 `id/fin/root/contact/tag/range`；範圍包括實際支撐管與末端接地墊，腹鰭還保留較短的第二鰭條。額外的小腹鰭膜也屬 tag 7，但不另算腳點。三個接觸頂點在同一平面，魚身投影位於三角形內。世界配置需對 **三點及完整網格** 驗地形，不能只測原點；不得用整隻 bob、通用 crawl 位移或自轉破壞固定接地。

## 動畫與渲染交接

| 標籤 | 幾何 | 動畫契約 |
|---|---|---|
| 1 | 黑色細長魚身 | 固定 |
| 3 | 左右感覺胸鰭，連續薄膜與各 13 條造型鰭條 | 唯一可微動部分 |
| 4 | 小型眼部 | 固定；不自發光 |
| 5 | 背鰭、臀鰭、普通尾鰭、口縫與鰓蓋細節 | 固定；沒有脂鰭 |
| 7 | 支撐鰭條、接地墊及小腹鰭膜 | 全部固定；不得套用鸚鵡螺殼的特殊效果 |

`sensoryPectorals` 每側有 `side/root/tag/range`，根部為 `[.27,.971,±.039]`，薄膜基部延至 `[.252,.959,±.039]`。最遠處約距根部 .50 model unit。建議距根部 .03 內保持固定，外側漸增微幅變形，並同步修正法線；不可只用 X 判斷，因較後方的感覺射線仍向上延伸。CPU 幾何不含時間位移；正式 rig、陰影 pass 與原生畫面由整合驗證負責。

近看全模型外框：`min=[-1.116,0,-.491]`、`max=[.6892345900103828,1.3220657604714179,.491]`。乘以 .25 m 後約 **.45131 × .33052 × .24550 m**，與 25 cm SL 是不同量測。觀察與攝影可用 local `[.05,.96,0]` 作魚身焦點，並把三腳至胸鰭頂端納入視野；直接朝海床原點會錯過魚身。圖鑑圖示不能代替實際拍攝證據。

## CPU 驗證與後續驗收

下列星號只比較模型細節層級，不是畫質、效能或完成度評分。

| 模型層級 | 細節層級 | 實際三角形 | 上限 | 保留特徵 |
|---|---|---:|---:|---|
| 近看 | ★★★★★ | 6,028 | <9,000 | 真三點支撐、較密身體曲面、胸鰭、眼口與一般鰭 |
| 遠看 | ★★★☆☆ | 2,900 | <3,000 | 同一尺寸、三腳、感覺胸鰭及主要解剖輪廓 |

兩級索引後總資料為 **446,976 bytes**，不含 GPU driver／實例／陰影成本。`node tests/parity/tripod-fish.cjs` 目前 6/6；註冊、三點支撐、胸鰭分離、臉部及根部與魚身的實際連接各先有真實失敗再完成。檢查透過既有 catalogue、`faunaGeometry`、`indexGeometry` 接口，驗真頂點接地與全長鰭條、SL、原44索引、來源 winding／法線、索引後不退化、非發光、外框及幾何預算，沒有用模型旗標代替幾何。

尚須由正式整合完成：地形接觸、固定 UID／home、停留觀察、滑鼠／觸控主動選取、真畫面攝影與保存重載、原生 GPU rig／陰影、正常玩家到達、桌機／手機自動畫質的可見性與效能。此文件不把 CPU 通過當作以上驗收，也不聲稱實體手機或耗電已量測。
