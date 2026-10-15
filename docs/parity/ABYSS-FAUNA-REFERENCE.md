# 深水生物模型與動作依據

本切片新增五種原創程序模型，對照 `WII-CONTENT-INVENTORY.md` 的 C17、C27、C29、C30；原作名稱用於內容盤點，沒有使用原作模型、貼圖、音樂或擷取畫面。這五種並不代表完整原作圖鑑，也不構成天然棲息地或科學游速的重建。

查閱日期：2026-10-13。現有 27 類順序維持；新 ID 依序追加 27–31，使用獨立 `ABYSS_SPECIES`，不寫入原有 `FAUNA_SPECIES` 或 `CETACEAN_SPECIES`。

## 形態與公尺尺度

- **Coelacanth／腔棘魚，`coelacanth`，Latimeria chalumnae。** 模型全長 1.5 m。[Australian Museum](https://australian.museum/learn/animals/fishes/coelacanth-latimeria-chalumnae-smith-1939/) 列約 2 m 的體型，辨識重點包括肉質成對鰭及尾端額外中央尾葉；西印度洋種是鋼藍色，不能把另一種印尼腔棘魚的棕色當同一種。本模型有成對葉狀胸／腹鰭、分開的兩個背鰭、鰓蓋與三部分尾形。配色使用平滑頂點取樣。[Smithsonian Ocean](https://ocean.si.edu/ocean-life/fish/coelacanth) 支持成對鰭的肢狀擺動；這不表示腔棘魚會在海底用鰭步行。
- **Giant Squid／巨型烏賊，`giant_squid`，Architeuthis dux。** 模型全長 8 m，包含伸展的兩條捕食觸腕，外套膜本體約占全長 28%。[Natural History Museum 館藏](https://www.nhm.ac.uk/discover/giant-squid.html) 的 Archie 為 8.62 m，這是個體量測，不是物種最大值。保留八條沿內側有吸盤的較短腕，加兩條平滑細長、末端有腕穗與吸盤的觸腕；大側眼、後端小型外套鰭及腹側漏斗亦有獨立幾何。[館方解剖說明](https://www.nhm.ac.uk/discover/giant-and-colossal-squid-revealing-secrets-largest-invertebrates.html) 區分腕、觸腕與腕穗，並說明 giant squid 與 colossal squid 的身形不同。本模型沒有套用大王酸漿魷的鉤爪。
- **Pelican Eel／吞鰻，`pelican_eel`，Eurypharynx pelecanoides。** 盤點使用 Pelican Eel；Gulper Eel 是通用別名，不另建重複種類。模型全長 0.75 m。[Australian Museum](https://australian.museum/learn/animals/fishes/pelican-eel-eurypharynx-pelecanoides/) 列可達 80 cm、巨大嘴部、靠近吻端的小眼、多排小牙、黑色細長身體及尾端發光器。模型採實際開口的口袋狀嘴腔、細小牙齒與細長尾；不使用鮟鱇式大獠牙。來源列天然紀錄深度 500–3000 m，本作約百公尺內的深谷是縮小的遊戲配置。
- **Humpback Anglerfish／駝背鮟鱇，`humpback_anglerfish`，Melanocetus johnsonii。** 模型是全長 **0.09 m** 的雌性外觀個體，不能解讀為此種最大尺寸。[MBARI 原始觀察](https://www.mbari.org/news/amazing-black-sea-devil-anglerfish-observed-in-monterey-bay/) 記錄 2014-11-17、約 580 m 深度；[Monterey Bay Aquarium 對應物種頁](https://www.montereybayaquarium.org/es/animales-y-el-oceano/animales-de-la-a-a-la-z/pez-diablo-negro-del-mar) 圖片說明明列 9 cm，並說明雌魚用頭頂發光誘餌吸引獵物。頁面拉丁名拼作 `johnsoni`，本作採 MBARI 的 `johnsonii`。圓厚頭身、開口嘴腔、向內彎細牙、長誘餌莖與末端 esca 均為獨立形態；微觀鏡頭放大視角，動物本身不放大。
- **Japanese Spider Crab／日本蜘蛛蟹，`japanese_spider_crab`，Macrocheira kaempferi。** 模型 **3 m 是左右步足展幅**，不是甲殼長；甲殼本體長約 40 cm。[Aquarium of the Pacific 物種頁](https://www.aquariumofpacific.org/onlinelearningcenter/species/giant_spider_crab) 支持巨大的足展與緩慢步行、攝食螯足；[館方 Currents 2011 秋季刊](https://www.aquariumofpacific.org/downloads/CURRENTS_FALL_11.pdf) 區分八條步足與兩條有螯的攝食肢，列足展可達 12 ft。模型保留八條落地步足、前方兩條螯足、雙眼柄、短額刺、甲殼凸刺及橙白甲殼色。3 m 是本作選用的大型個體尺度，並非場景中所有蟹的自然平均值。

## 模型與介面

`faunaGeometry(idOrSpecies, low)` 回傳與舊模組相同的 `Geometry`；`material=0` 保留原創頂點色。所有新增批次使用 **kind 10**，`+X` 朝頭部／腕冠，`+Y` 向上，`Z` 左右側。`bodyLength=1`；蟹用 `measureAxis=2`，其餘沿 X 全長正規化。海馬、鯨豚及 12 種舊類的資料、行為與批次類型未更改。

以下是工程量測，並非物種評分。高／低細節都保留眼、主要附肢與正規化尺度。

| ID | 高／低三角形數 | 模型 min XYZ | 模型 max XYZ | 公尺尺度 |
|---|---:|---|---|---|
| coelacanth | 8412 / 2512 | −.510, −.178, −.276 | .490, .229, .276 | 1.5 |
| giant_squid | 12198 / 2964 | −.500, −.077, −.104 | .500, .077, .104 | 8 |
| pelican_eel | 6678 / 2228 | −.522, −.169, −.143 | .478, .130, .143 | .75 |
| humpback_anglerfish | 13624 / 4210 | −.560, −.264, −.309 | .440, .484, .309 | .09 |
| japanese_spider_crab | 8032 / 2676 | −.190, 0, −.500 | .407, .257, .500 | 3 |

游泳類原點在軀幹附近，不在模型邊界中心；蟹原點在腳尖站立平面，最低 Y 為 0。`sp.modelBounds` 是實際高模量測，`traits.floorOffset` 仍由共同 registry 根據最小 Y 算出。巨型烏賊的 `viewDistance=12.5 m`、`observeDistance=35 m` 供完整取景；其他互動距離與水族館容量為本作規則，並非生物學數據。

頂點 tag：1 身體／甲殼／牙；3 鰭；4 眼睛、虹膜與瞳孔；5 腕、腿或誘餌莖；6 僅鮟鱇誘餌末端與吞鰻尾部發光器。**眼睛不發光**。共享色彩／陰影 vertex shader 使用相同 kind10 變形，`aPose.w=f.abyssBeat` 的單位是 radians/second，`aPose.y` 仍是 0–1 活動強度；動物尺寸只來自 `f.s`。

五種共用公開 `abyssMotionPose(f,time,out=f.p,context=null)`，由既有 `faunaMotionPose` 依 `sp.abyss` 呼叫。模型尺度、home、UID 不受 pose 更新修改。`motionProfile={speed,beat,radius,bob}` 的單位依序為 m/s、rad/s、m、m；全是原創動畫參數，不是實測野外游速。

Spawn 合約：提供 `home`、`homeYaw`、`radius`，以及可选 `habitatFloor`／`habitatCeiling`（**已扣模型高度的中心點 Y 範圍**）。`radius=0` 允許原地低幅擺腕；不會把巨大烏賊壓縮以塞進通道。動作保留單一安全巡徑半徑，依 `OceanRegions.solids` 到 home 的 AABB 距離及完整水平身體包絡縮小，不做遇牆瞬移；完整包絡另外以九個取樣點檢查 seabed／`ceilingAt`。初始 home 必須在完整身體可容納的開放位置，不能用位於牆內的 home 期待動作自動搬家。`context` 可提供 `{exhibit,groundHeight,ceilingAt,solids}` 供隔離測試；展示模式不用世界地形。

水族館仍複用世界幾何而建立自己的 instance。新生物保留實際公尺尺寸；蟹的獨立底床寬 3.8 m、巡徑半徑 .3 m，其餘新增展示巡徑最多 1.15 m。這是數位展示配置，不是飼養建議或真實水族館可飼養性的宣稱。

每種有不引用外部媒體的 SVG 示意縮圖。共用 `fauna-guide.mjs --abyss` 已從實際 kind10 幾何產生五張 WebGL JPEG 縮圖，並逐張目視確認；SVG 保留作示意 fallback。五種高／低模型的 indexed vertex + index 合計 **2,963,688 bytes**；這不是整座場景或下載壓縮後大小。

## 0.13 已發布基線的測試界線

TDD seam 首次未註冊腔棘魚時，公開圖鑑／geometry 測試為 RED；完成第一個模型後 GREEN，再以巨型烏賊及吞鰻的公開模型輪廓切片擴充。動作測試先重現未知 fauna 原地不動的 RED，再接 `abyssMotionPose`。

- `node tests/parity/abyss-fauna.cjs`：13 項通過。包含解剖線索、有限頂點／法線／顏色、無坍塌三角形、低模輪廓尺度、獨立 registry、舊 27 種內容保持與原創縮圖；另驗證嘴部接合後所有初版 bounds 精確保留，以及蟹三分之四視角的完整網格取景。
- `node tests/parity/abyss-motion.cjs`：8 項通過。包含真實模型的上下邊界、固定 8 m 烏賊、實體牆完整身體限制、時間跳轉決定性、正常逐幀連續性、kind10 instance 編碼、水族館尺度，以及九個實際出生點在 0–180 秒間遍歷所有低模頂點的地形／區域實體碰撞檢查。
- 舊契約回歸：fauna 模型 18、fauna 動作 14、cetacean 模型 13、cetacean 動作 12 項均通過。

- `node tests/parity/abyss-browser.mjs http://127.0.0.1:8765/?still`：最終 **135/135**，1440×900、390×844、844×390 各 45 項；Chrome 觸控模擬，並非實體手機驗證。報告為 `qa/parity/abyss-browser-desktop-portrait-landscape.json`。
- GPU 驗證包含 32 張玩家可見圖鑑卡、九隻真實深水 actor、五種 high/low kind10 的實際 draw 與 GL error=0；9 cm 鮟鱇的工具選單、微觀停留、首次發現、真實快門、照片與穩定 UID 重載；8 m 烏賊和 3 m 蟹的實際水族館配置、完整取景、房間邊界、正確底床、退出還原與 44 px 控制。
- 三區在相同相機／同一時間各產生 daytime/night 的燈關閉與開啟圖；對同一洞壁另測 2.4 m / 4.8 m 光照遞減。已目視暖色光落在表面、中心與外圈照度差，以及三區實際安全路線站位的廣角圖。證據檔為 `qa/parity/abyss-{desktop,portrait,landscape}-*.png`。

測試明示界線：透過真實「自由探索」入口後，fixture 只移動潛水員到已驗證安全的觀察位置；世界生物從未搬動或縮放。遠距離低模相機與固定 tick 是隔離測試，不等於從船自然游到深淵。水族館解鎖知識為單獨配置測試所提供，不宣稱玩家於此腳本完成二級研究。圖片中的五種生物輪廓可辨，但鮟鱇前頭、鰭面、節肢材質仍屬簡化程序造型；洞壁與岩柱也較規則。這些通過結果不構成照片級擬真、真實自然棲地、完整原作內容或已發布的證明。

首輪整合實際抓到「短暫看見→離開→18 秒內重新微觀」無法獲得第一次圖鑑發現，以及水族館拉遠按鈕只有約 41.9 px 寬。前者由 ecology 限制首次發現獎勵的條件修正，保留重複遇見防刷規則；後者加入 44 px 最小寬。最終三尺寸上述真實 UI 情境全部通過。


## 0.14 鮟鱇解剖修整與實際 GPU 目視

重新查閱前述 MBARI 原始觀察與 Monterey Bay Aquarium 物種頁，保留 9 cm 觀察個體、深色圓厚頭身、雌性發光誘餌及張口吞食的形態依據。原創建模將舊三段式「身體、直線頸圈、漏斗口」更換成單一連續外殼；非平面馬蹄形嘴緣的口角退到側眼下方，下顎略前伸。內凹口腔與外殼共用終端邊界，喉部位於頭身內，不以黑色平面冒充洞口。小側眼嵌在臉頰；24 根疏密不一、向內彎的牙各自從上下顎內側生出；薄胸、尾、背鰭有彎曲外緣與獨立鰭條。牙數、各控制點與有限張口姿勢是本作造型選擇，不是來源的精密形態量測。

所有改動仍為公尺尺度原創幾何，保留 kind10、材質管線、tag1/3/4/5/6 和 .09m instance 尺度。實際 bounds 隨解剖改進重測，沒有加入隱形極值點以硬保留舊數字。其他四種網格不變。頂點色只保留細微深褐皮膚差異；改善重點是輪廓、開口空間、牙根及鰭薄度，而非增加表面噪點。

新的公開網格射線測試先在 0.13 舊模型重現 RED（正面先撞到過淺的漏斗後壁），新模型正面和左右斜角都能射入頭內的真實喉腔。CPU 模型、尺寸與動作檢查不能代替新圖鑑、真微觀、水族館及多角度 GPU 目視；上一節記錄已發布 0.13 基線，本節另列 0.14 整合後重新執行的結果。

目前新 CPU 驗證：`abyss-fauna.cjs` 15/15（包含真三角面射線、各顆牙的連通分群及與顎面接合），`abyss-motion.cjs` 9/9（包含九個實際出生點全身路徑，以及局部索引與完整區域實體列表的動作等價性）。`individuals.js` 僅將深海路徑的障礙候選查詢改用 `OceanRegions.nearbySolids`，保留顯式 `context.solids`（包括空陣列）的優先權。查詢半徑包含巡徑、水平全身包絡、上下高度及浮動量；九個實際棲地在 0–180 秒的姿態與全列表版本逐項一致。未修改 engine 或水族館行為。

2026-10-13 最終烘焙後，在獨占 GPU 時段重新執行：

- `fauna-guide.mjs --species humpback_anglerfish` 只更新鮟鱇 WebGL JPEG，其餘圖鑑 JPEG 不變。
- `angler-visual.mjs`：5/5 draw／GL 檢查，並逐張目視高模正面、左45°、右45°、側面及低模45°。證據 `qa/parity/angler-014-{front,left45,right45,side,low45}.png`，數據 `qa/parity/angler-014-visual.json`。此隔離攝影棚使用真正編譯模型的獨立 .09 m instance，沒有搬動世界 actor；它不是自然棲地證據。
- `abyss-browser.mjs`：重新取得 **135/135**，1440×900、390×844、844×390 各45項；報告 `qa/parity/abyss-browser-desktop-portrait-landscape.json`。真實工具入口、微觀停留、真快門、照片／UID重載、高低細節、獨立8 m烏賊／3 m蟹展示、控制與退出均通過。所有瀏覽器均關閉，GPU已釋出。
- 已目視五種實際棲地畫面、鮟鱇微觀桌面／直橫向、三區廣角與同幀燈光對照。證據 `qa/parity/abyss-{desktop,portrait,landscape}-*.png`；只將潛水員放到經碰撞檢查的觀察位置，未改世界生物 UID／home／尺度。移動 fixture 並非從船連續游到現地的宣稱。Chrome觸控模擬不是實體手機驗證。
- 三區夜間 off/on 可見暖色光落在材質表面且外圈保持暗；相同洞壁2.4／4.8 m的中央亮度增量依三尺寸約為191–193／157–161。這是8-bit影像亮度差，不是物理照度；不作實測燈具宣稱。水族館所有控制實際最小44×44 px。

以下星等是本輪主觀造型成熟度記錄，並非科學量測、Wii比較或135項測試分數。

| 項目 | 本輪目視可確認的改善 | 仍存限制／造型成熟度 |
|---|---|---|
| 鮟鱇頭顎 | 舊獨立圓筒口已消除，口角連續，正面可見深口腔，左右斜面有接在顎上的內彎牙 | 完全張口仍過度對稱，侧面偏楔形；缺少更自然的唇顎起伏 ★★★☆☆ |
| 鮟鱇皮膚與鰭 | 薄鰭和獨立鰭條可辨，真9 cm尺度與取景保持 | 黑色皮膚太均勻光滑，有塑膠感；鰭仍不透光；誘餌末端是簡單光滑橢圓 ★★☆☆☆ |
| 洞窟空間 | 實際拱頂、側室連通及天窗取代方形通道；可見表面與碰撞同源 | 長拱過於規則，地壁接縫偏直，礦脈研究面仍像整齊展示板 ★★☆☆☆ |
| 深水裂谷 | 兩側岩肩形成連續起伏，背景中的真生物與觀測台有尺度關係 | 地面偏平滑；岩體缺少大小層次，腳部與遠端地形仍可見規則邊界 ★★☆☆☆ |
| 其餘深海模型 | 腔棘魚肉質鰭、烏賊長腕、吞鰻口囊、蜘蛛蟹長腿均能辨認 | 腔棘魚鰭仍像薄板、烏賊頭與外套膜略呈積木接合、吞鰻口囊偏幾何漏斗、蟹關節像規則球接頭；本輪未改這四種 ★★☆☆☆ |

本輪成立的是解剖接合、可玩性與渲染兼容性的具體改善。**135/135不等於擬真，尚未达到照片級自然度或「全面超越Wii」的完成條件。**
