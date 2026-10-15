# 0.15 真深度生物模型與動作依據

查核日：2026-10-15。三種模型、配色與 SVG 均為本專案原創程序幾何，沒有下載或轉用館方、研究者、原作的照片、貼圖或模型。`TRENCH_SPECIES` 獨立追加索引32–34；既有32類及三個既有集合不重排。新海溝場景的六個實例由 `trench_world.js` 追加，模型模組不生成世界個體。

## 生物事實與本作代表個體

★ 表示以下一手來源支持該形態／尺度背景，不是畫質評分；700／1400／7000m 是本作選用的原創研究地點，並非某次野外調查的座標。

| 穩定 ID／名稱 | 形態與自然行為 | 自然深度／本模型尺度 | 一手來源 |
|---|---|---|---|
| `vampire_squid`／吸血烏賊 | ★ *Vampyroteuthis infernalis*；八腕間有蹼、兩片外套鰭、大側眼及兩條細長攝食絲。絲用來收集下沉有機物，不能改畫成巨型烏賊的兩條捕食腕穗。 | 600–900m；來源列最大總長30cm。本作外套至腕冠約 **.28m**，伸出的細絲另計在實際模型界線內。 | [MBARI：Vampire squid](https://www.mbari.org/animal/vampire-squid/) |
| `sea_pig`／海豬 | ★ *Scotoplanes* sp.；軟泥底海參，長管足撐起柔軟身體，口邊觸手處理有機碎屑。模型保留長管足、背乳突和10支分枝口觸手，不添加魚眼。 | 1000–6000m；屬級頁列最大17cm，館方 *S. globosa* 圖說列常見8–14cm。本作軀幹 **.14m**，附肢伸出另計；不把屬級範圍當單一種的精確資料。 | [MBARI：Sea pig](https://www.mbari.org/animal/sea-pig/)、[MBARI：S. globosa 圖說](https://www.mbari.org/gallery/deep-sea-wallpapers/sea-pig/) |
| `mariana_snailfish`／馬里亞納獅子魚 | ★ *Pseudoliparis swirei*；原始描述活體粉白、柔軟且皮膚／腹壁透明；小眼、低寬頭、分葉胸鰭、腹吸盤和連續背／臀鰭。 | 原始採集6898–7966m。本作代表個體全長 **.20m**，不是物種最大值。論文保存標本與活體量測不可混用，保存後會縮短。 | [Gerringer et al. 2017 原始描述](https://www.biotaxa.org/Zootaxa/article/view/zootaxa.4358.1.7)、[出版社全文 PDF](https://www.mapress.com/zt/article/download/zootaxa.4358.1.7/13080/13100) |

馬里亞納獅子魚於2017年命名，是**本作原創海溝追加**；不能把2007年 Wii 的 Snailfish 名稱當作本種的精確復刻。700m 吸血烏賊站與1400m 海豬站不是 hadal；7000m 終站才是本作海溝深度段。舊約94m裂谷仍是另一個原創縮景。

## 真實模型及測量接口

`faunaGeometry(speciesOrId, low=false)` 回傳實際可索引的 `Geometry`，`material=0` 保留頂點色，世界批次為 **kind11**。+X 朝前，+Y 向上。`size` 是公尺；`modelUnitLength=1` 固定量測基準，不用觸手尖的最大距離重新縮放身體。吸血烏賊以外套後端至八腕冠為一單位，海豬以軀幹為一單位，獅子魚以全長為一單位。`modelBounds` 是包含附肢的實際高模邊界；`traits.floorOffset` 由最低頂點計算。

以下是工程測量，不是物種比較評分。

| 模型 | 高／低三角形 | 最小 XYZ（標準單位） | 最大 XYZ | 高低 indexed bytes |
|---|---:|---|---|---:|
| vampire_squid | 11324 / 3008 | −.500, −.19563, −.32122 | .65049, .19468, .32122 | 601584 |
| sea_pig | 8558 / 2412 | −.500, 0, −.32627 | .53628, .68142, .32627 | 461832 |
| mariana_snailfish | 7760 / 2320 | −.50001, −.18824, −.24907 | .500, .15699, .24907 | 550176 |

三種高低模型 indexed vertex + index 合計 **1,613,592 bytes**；這不是完整場景或下載壓縮量。海豬原點在腳尖支撐平面，身體本身懸在腳上；另外兩種原點在軀幹附近。每種均有獨立原創 SVG 示意後備，正式圖鑑 JPEG 必須由真實模型渲染，不以科學照片或 SVG 冒充遊戲畫面。

頂點標籤：tag1身體、tag3薄膜／鰭、tag4眼、tag5腕／絲／管足／腹吸盤、tag6保留發光器。這三種目前沒有新增發光器或觸發式生物發光玩法。`motionProfile.type` 分別為 `vampire`、`sea_pig`、`snailfish`，由 renderer 映射到 rig，不用物種索引寫死變形。kind11 的 `aPose.w=f.trenchBeat`（rad/s）供共同色彩與陰影 vertex shader 使用，尺寸只來自 `f.s`。

## 動作、棲地和水族館契約

公開 `trenchMotionPose(f,time,out=f.p,context=null)`，由 `faunaMotionPose` 對 `sp.trench` 分流；按時間決定姿態，反覆渲染同一時刻不累積位移。home、UID 和 s 不修改。`motionProfile={type,speed,beat,radius,bob}` 的數值依序是 m/s、rad/s、m、m（type除外），是作者動畫設定，不是自然游速。

Spawn 必須提供 `home`／`homeYaw`／`radius`／`s`，可提供 `habitatFloor`、`habitatCeiling` 作已扣動物高度的中心點Y界線。活動半徑依包含完整附肢的水平包絡與 `OceanTrench.nearbySolids` 縮小，保留真正公尺尺寸。路徑查詢以 home/scale/radius 快取；每次姿態以九點支撐包絡檢查同層地面。`context.solids=[]` 明確覆蓋世界碰撞，不能被假值預設重新填回。

**海豬以 `OceanTrench.floorAt(x,z,home.y+bodyTop+.1)` 取1400m那一層的地板**；全域 `groundHeight` 指向最底海床，不能用於平台步行。六個真實棲地600秒抽樣路徑已檢查全部低模頂點對實際地面與凸岩面；海豬腳尖保持−1402m。此 CPU 檢查不等於 GPU 鰭／附肢動作驗收。

水族館以 `{exhibit:true}` 使用獨立支撐位置，略減路徑及速度，不查世界海床、不調大動物。海豬展示巡徑最多 .065m，整體腳展仍在底床內；這是數位展示，不是現實飼養可行性的聲明。

## 材質與視覺邊界

`materialProfile={skin,roughness,subsurface,patternScale}` 是作者渲染參數；patternScale 表示標準模型體長上的局部微細節頻率。吸血烏賊使用 cephalopod，海豬及獅子魚使用 gelatinous。既有8種小型生物和5種深水生物亦有各自粗糙度；眼、薄膜、殼依標籤分開。這些參數不是量測皮膚係數。

當前透明組織以表面顏色、微細節與有限散射近似，**沒有完整皮下器官／體積折射模型**；薄膜透光不等於所有畫質都能看穿背景。吸血烏賊的絲／腕與海豬口觸手有動作，但沒有建立逐顆海洋雪的捕獲、消化或泥粒守恆模擬。圖鑑自然行為說明不可當作這些模擬已完成。

目前 CPU：`trench-fauna.cjs` 9/9、`trench-motion.cjs` 5/5；各物種依次從沒有可用模型的 RED 完成到 GREEN，海豬 motion 由原先未知物種靜止 fallback 的 RED 完成到 GREEN。測試涵蓋識別附肢、真尺度、有限法線／索引、無退化面、LOD、舊資料不重排、真棲地全身淨空、決定性、速度連續、明確空碰撞和實際展示底床。紅例輸出保留於 `/tmp/ocean-015-{trench,seapig,snailfish,trench-motion}-red.log`。

已完成四模型正／側／左右斜視、真實世界個體位置與水族館的實際 WebGL 截圖；三視窗與23張當前材質圖鑑 JPEG 的紀錄見 [0.15 生物目視驗收](LIFE-VISUAL-015.md)。數量、CPU或繪製呼叫通過均不代表照片級擬真。觸控是桌面 Chromium 模擬，不是實體手機驗收。

本輪目視找到獅子魚眼睛埋入身體、封閉頭端法線亮凹點；以模型局部表面位置修正眼球，閉合軸點共用向外法線。新增兩項公開幾何測試先得到 RED，再 9/9 GREEN，未增加三角形或改變真實尺度。`/tmp/ocean-015-eyes-red.log` 保留舊失敗。
