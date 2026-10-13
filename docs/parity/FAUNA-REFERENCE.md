# 0.11 生物形態與尺度依據

查核日：2026-10-13。範圍是八種新增原創程序生物，不代表 Wii 一代完整物種盤點已完成。所有網格、SVG、配色實作與遊戲模型渲染圖由本專案製作；沒有下載或轉用研究頁、原遊戲的照片、模型或貼圖。

## 生物資料與遊戲設定的界線

`SPECIES.size` 是本版代表個體的公尺尺度。海馬／花園鰻以模型高度計，鸚鵡螺以殼徑計；其餘按下表的全長或體長計。`naturalSize` 明示資料的量測對象，不能把模式標本大小、活體觀察值、最大值或外套長混為同一數字。資料來源支持形態與行為背景，並不支持本作的出現座標、族群量、靠近距離、餵食許可、信任值或活動動畫幅度。

★ 表示已找到下列博物館、水族館或原始研究支持；不是模型真實度評分。所有模型仍是簡化視覺表現，不作物種鑑定教材。

| 穩定 ID／盤點名稱 | 學名、主要識別線索與自然行為 | 尺寸依據／本版尺度 | 來源 |
|---|---|---|---|
| `pygmy_seahorse` / Pygmy Seahorse | *Hippocampus bargibanti*。短吻、圓凸疣、彎頸與可捲握尾；附於海扇，外形與宿主相似。 | ★ 成熟高度下限約13 mm，最大約24 mm；模型高度 **0.024 m**，不為近拍放大。 | [Museums Victoria / Fishes of Australia](https://fishesofaustralia.net.au/home/species/1540) |
| `cinderella_slug` / Cinderella Sea Slug | *Hypselodoris apolegma*。紫色外套膜與白邊，橘黃嗅角／鰓；有取食海綿的觀察。 | ★ 博物館收錄的活體記錄有2.5–3英吋個體（約63.5–76.2 mm），當時分類討論仍有保留；模型體長 **0.065 m**。不據此宣稱物種最大值。 | [Australian Museum：色彩描述](https://www.seaslugforum.net/factsheet/hypsapol)、[活體大小記錄及專家回覆](https://www.seaslugforum.net/find/21640)、[取食記錄](https://www.seaslugforum.net/find/19709) |
| `garden_eel` / Spotted Garden Eel | *Heteroconger hassi*。白黃底細黑斑及大側斑；在沙洞朝流取食，驚擾時退入洞內。 | ★ 常見全長36–41 cm，資料亦列更大個體；模型完整可伸展高度 **0.40 m**。自然觀察通常只見部分身體，遊戲退縮比例是動畫設計。 | [Georgia Aquarium](https://www.georgiaaquarium.org/animal/spotted-garden-eel/) |
| `pistol_shrimp` / Randall’s Pistol Shrimp | *Alpheus randalli*。紅白條帶、大小不等的螯、細長觸角；原始描述在砂與細珊瑚礫中發現與鰕虎魚共居。 | ★ 原始雄性模式標本28 mm；模型體長 **0.028 m**，不是物種最大值；伸出的觸角／螯超出體長。 | [Banner & Banner (1980), Pacific Science 34:401–405，Natural History Museum of Los Angeles County藏本](https://research.nhm.org/pdfs/24664/24664.pdf) |
| `frogfish` / Painted Frogfish | *Antennarius pictus*。小疣、斑駁厚身、長釣竿與絲狀餌；伏擊捕食，常停在海綿附近。避免做成另一種巨疣躄魚。 | ★ 可達24 cm標準體長／30 cm全長；模型全長 **0.20 m**。 | [Museums Victoria / Fishes of Australia](https://fishesofaustralia.net.au/home/species/3831) |
| `lionfish` / Luna Lionfish | *Pterois lunulata*。長背鰭棘、展開胸鰭、褐淺條帶；來源描述胸鰭鰭條V形斑及成魚軟鰭斑點。捕食魚與甲殼類。 | ★ 最大全長35 cm；模型全長 **0.28 m**。胸鰭、條帶與鰭斑採簡化原創幾何。 | [Museums Victoria / Fishes of Australia](https://fishesofaustralia.net.au/Home/species/3649) |
| `cuttlefish` / Broadclub Cuttlefish | *Ascarosepion latimanus*，舊名 *Sepia latimanus*。寬扁外套膜、環身鰭、八腕與兩捕食觸腕；可變色，靠鰭緣波動懸游及噴水移動。 | ★ Monterey Bay頁列含觸腕可達50 cm；不同文獻另用外套長，不能直接混用。本模型自然收攏腕冠全長 **0.45 m**，不宣稱最大個體。 | [Monterey Bay Aquarium](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/broadclub-cuttlefish)、[Australian Museum Lizard Island Field Guide：現用學名與變色](https://lifg.australian.museum/Group.html?groupId=06x7MW0Y&hierarchyId=qBHH2Q3E) |
| `nautilus` / Chambered Nautilus | *Nautilus pompilius*。盤捲外殼、褐白紋、皮質頭罩、針孔眼及無吸盤觸手；由漏斗噴水移動，活動水深依族群而異。 | ★ 成體殼徑20–25 cm；模型殼徑 **0.22 m**。遊戲深谷遠淺於自然深坡，不將關卡深度寫成生態資料。 | [Aquarium of the Pacific](https://www.aquariumofpacific.org/onlinelearningcenter/species/chambered_nautilus) |

烏賊眼部的 W 形瞳孔細節另參考[Monterey Bay Aquarium 分享的水族館解說](https://montereybayaquarium.tumblr.com/post/152315568529/cuttlefish-have-w-shaped-pupils-color-changing)；本版沒有模擬瞳孔隨明暗完整收縮。

來源頁的保育狀態、舊分類評論或其他非本切片所需文字可能過時，本版沒有據此新增保育等級。海蛞蝓體長以博物館收錄的現場記錄為參照，精確物種最大長度仍未知。模型沒有模擬槍蝦與真實鰕虎魚互利共生，也沒有模擬完整捕食鏈、繁殖或鸚鵡螺自然數百公尺遷移。

## 接口與座標

`fauna.js` 在 `open_world.js` 後載入，只追加索引12–19；舊12種的ID、順序與資料保持不變。`speciesTraits(indexOrId)` 提供能力及尺度接口；舊魚可餵食，舊龜／魟／鯨／海豚可抓握且不接受食物，完全保留舊遊戲規則。

新種渲染統一 `kind=8`、`g.material=0`、`g.species=SPECIES.indexOf(sp)`。`faunaGeometry(spOrId, lod)` 回傳可被現有 `indexGeometry` 索引的 `Geometry`；高低模型依固定規則生成，不消耗全域場景亂數。圖鑑優先使用 `ASSETS['guide_'+id]` 的實際 WebGL 模型 JPEG，讓縮圖與海中形態一致；`sp.thumb`／`faunaThumb(spOrId)` 另提供自含 SVG data URL 作為未載入圖鑑資產時的原創示意後備。JPEG 的交付與成像驗證見本版總測試記錄。

- **+X**：頭／口向前；**+Y**：向上；**Z**：左右側向。
- `sp.bodyLength=1`：標準化量測基準；各物種量測對象見上表。`sp.size` 不保證包含所有觸角／觸手。
- `sp.modelBounds`：懶載入的真實高模 `{min,max,size}`，包括鰭、觸角與觸手；不應把物理挑選半徑當作mesh全長。
- `traits.floorOffset`：原點高於最低點的標準模型單位；底棲五類為0。非零時乘上 `sp.size` 才是公尺。
- `traits.viewDistance`：既有觀察相機的建議偏移距離，**不是LOD cutoff**。新種類contact／observe／view距離皆為可玩性參數。
- `spawn`：候選原創座標，非自然地理分布資料；實際碰撞／棲地放置由 `fauna_world.js` 決定。

| 索引／模型 | Y界線（標準單位） | floorOffset | 高模／低模三角形 | 動作標記 |
|---|---:|---:|---:|---|
| 12 海馬 | 0 → 1 | 0 | 6,226 / 1,618 | tag1身體與捲尾；tag3小背鰭 |
| 13 海蛞蝓 | 0 → 0.45491 | 0 | 6,136 / 1,540 | tag3外套膜緣；tag5嗅角、鰓 |
| 14 花園鰻 | 0 → 1 | 0 | 4,942 / 1,386 | tag1垂直身體；tag3小鰭；根部不延伸至地下 |
| 15 槍蝦 | 0 → 0.31138 | 0 | 5,916 / 2,442 | tag3尾扇；tag5足、螯、觸角 |
| 16 躄魚 | 0 → 0.70036 | 0 | 6,868 / 2,068 | tag3支撐鰭／尾鰭；tag5釣竿誘餌 |
| 17 蓑鮋 | −0.20225 → 0.57402 | 0.20225 | 7,112 / 3,086 | tag3展鰭／背棘；tag5頭部皮瓣 |
| 18 烏賊 | −0.09845 → 0.09845 | 0.09845 | 8,016 / 2,400 | tag3連續鰭裙；tag5腕與觸腕 |
| 19 鸚鵡螺 | −0.455 → 0.545 | 0.455 | 10,576 / 3,420 | tag1殼／頭罩；tag5細觸手 |

上表是工程量測映射，不是自然個體大小的比較。低模保留識別附肢並減少段數與表面細節；鸚鵡螺只繪製代表性觸手群，不宣稱完整觸手數。每種細鰭具有相反方向的表面法線與邊壁，避免從一側消失。海馬尾／頸與躄魚誘餌莖使用通過原始控制點的平滑曲線，高模每段4分割、低模2分割；其餘管狀幾何保持原段數，尾握點和模型公尺尺度保留。

## 已執行的檢查與未驗證邊界

`tests/parity/fauna.cjs` 使用實際 `Geometry`、`indexGeometry` 和資料載入接口。先驗證新增模型尚不存在時的失敗，再完成海馬尺寸與舊資料保留；第二個紅綠切片發現小背鰭兩面同向，修正表面方向後通過。共18個檢查涵蓋有限頂點、可用法線、索引、無退化三角形、LOD輪廓尺度、落地原點、不同剪影、舊互動能力、縮圖與決定性。另以表面面積檢查花園鰻保持淺色斑點皮膚，修正早期誤加的深色環帶。所有可見眼部（包含烏賊 W 形瞳孔、鸚鵡螺針孔眼）均使用 tag4，避免連續體色著色覆蓋眼白和瞳孔；雙側眼部與 helper 還原標籤經過紅綠檢查。曲線新增檢查確認固定控制點、尾部握點與逐段轉角平滑，並持續通過24 mm海馬全高及LOD幾何檢查。

純模型檢查不能代替遊戲中的實際光影、動作、微觀取景、圖鑑解鎖、保存或水族館流程。整合後的GPU畫面、觸控、性能與保存驗收由本版總測試記錄另列；此文件不宣稱那些尚未完成的項目已驗證。
