# 0.11 微小生命：新增原創內容

新增八種原創程序生物、棲地幾何、分物種動作、微觀鏡頭与聲音提示。新圖鑑縮圖由本作 WebGL 模型實際渲染；沒有使用生成圖片、任天堂資產或外部模型。博物館、水族館及分類資料只作生物形態／尺寸的参考，完整來源及量測定義在 [FAUNA-REFERENCE](docs/parity/FAUNA-REFERENCE.md)。

目前 20 類包含前版 12 類及本版八種；數量、棲地、距離和行為節奏是遊戲設定。程序模型不是掃描模型，也未完成原作全圖鑑或科學生態模擬。

# 0.8 光之海：新增原創內容

2026-10-12。新增水體色彩衰減、散射與海面折射近似、原創波浪場、光紋與接觸陰影。這些為即時遊戲美術近似，未經光學科學校正；海面使用解析天空與海水反射，不是完整場景光線追蹤。

新模型與調整：珊瑚遠景、海扇、中空桶狀海綿、海草、沉船附著生物、魚種體形與腹鰭、魟魚腹面與斑點、海豚吻部與背鰭。沒有新增外部模型、掃描材質或生成圖片。十二張圖鑑縮圖由目前模型在隔離 WebGL 展示場景重新渲染；它們不是海洋照片。

原有原創音樂雙軌與合成聲景延續使用。Nintendo Wii《Endless Ocean》僅是使用者提出的體驗參考；沒有擷取其任何資產，也未驗證全面超越原作。

以下保留前版來源紀錄。

# 內容來源與使用界線 · v0.7

原創程式、程序幾何、貼圖及音樂延續本對話 v0.1–v0.6，按附帶 LICENSE 提供。未使用任天堂程式、模型、曲目或音效；沒有納入 Poly Haven、Sketchfab、Khronos 或其他第三方模型。外部素材曾被考察，但本版沒有成功下載或使用任何新外部素材。

## v0.7 新增與修改

`src/open_world.js`：連續海域、研究船、島、開闊環礁石門、眠海號原創船殼、記錄器、海豚原創曲面與遠方生物配置。沒有新增任何第三方模型。

`src/voyage.js`：原創六段航程、字幕通信、攝影評分、地圖航向、單隻海豚伴游、保存／讀取與匯入匯出、回船結算。沉船信件為本專案原創文字。

`src/engine.js`：天空與海面近似、視距與視野、空氣／水下分開處理、新素材類型。這不是流體光學或真實天候求解器。

`assets/guide_dolphin.jpg` 由新模型實際 WebGL 棚景繪製；其他 11 張延用 v0.6 的實際模型棚景。沒有把 Nintendo 說明書或遊戲截圖納入發布包。

## 沿用的 v0.6 修改

- `src/individuals.js`：固定個體 ID、形態／花紋／色調變化、連續路徑與姿態、障礙物空間索引、魚類曲面、珊瑚及礁岩改形。這是美術程序，不是生物統計模型。
- `src/engine.js`：擴充實例資料與頂點形變、個體著色、微表面光照、細節取樣過濾、離屏 MSAA、陰影修正、資源釋放和回退。光學都是即時遊戲近似，未經科學校正。
- `src/app.js`／`style.css`：同種個體切換、固定 ID 顯示、照片個體記錄、行動版配置。
- `bake_scene.cjs`／`src/scene_cache.js`：新版模型及個體資料的壓縮索引場景與版本檢查。
- `assets/guide_*.jpg`：11 類均已用本版實際 WebGL 模型重新渲染，不是實景照片。

## 沿用原創內容

沙、岩石、珊瑚、龜殼 diffuse／normal 與 64 格光紋貼圖均來自前版的原創程序素材；沒有新的攝影掃描。`assets/coral_forms.json` 為融合分枝等值面來源，本版再做連續形變、根部與法線調整。`tools/sculpt_coral.py` 可選用 numpy/scipy/scikit-image 重製基本融合形狀，這些離線依賴不隨網頁載入。

潛水員、海龜、魟魚、鯨類仍以先前模型為基礎；本版主要重新製作的是魚類、珊瑚／岩石形狀及通用材質，不能說全部生物都是新掃描模型。

`music/shallows.mp3` 與 `music/blue_silence.mp3` 是 `compose_music.py` 原創生成的 120 秒同步雙軌；規格在 `music/score.json`。Web Audio 即時合成呼吸、氣泡及回聲。沒有第三方錄音、soundfont、Wii 樂曲或真實鯨魚錄音。

## 展示與資料限制

交付場景截圖由本版實際 WebGL2 程式渲染，沒有用生成圖片、其他遊戲截圖或照片代替。固定時間與相機取景的截圖不證明實際幀率。

`phenotype-fixture-A/B.png` 是隔離背景和光照的固定姿態測試，僅用來驗證個體參數真的改變像素；不是正常海底遊玩截圖。`guide_*.jpg` 同屬模型棚景用途。文件明確區分這些測試與完整海底截圖。

使用者提供的 Wii《Endless Ocean》為體驗目標，沒有完成逐鏡、同場景或同硬體的對照驗收，不宣稱所有面向已超越 Wii。

本版仍未接入石朗測繪、定位或觀測資料。個體大小、花紋、色調、數量與路線不是性別、年齡、健康或真實分布的證據；深水鯨類為想像延伸。不能作潛水導航或認證訓練。

前版背景連結（不是本版幾何或生態配置的驗證）：
- 石朗地點靈感：https://www.eastcoast-nsa.gov.tw/zh-tw/attractions/detail/66/
- 綠蠵龜延伸資料：https://www.fisheries.noaa.gov/species/green-turtle
- Nintendo 原作資訊：https://www.nintendo.co.jp/wii/rfbj/index.html

介面僅使用系統字型，未附字型檔。所有外部網站、商標及其內容保有各自權利。

## 0.12 鯨豚夥伴

`src/cetaceans.js` 的七種輪廓、鰭、斑紋與後備圖為原創程序幾何；生物學來源及物理尺度列於 [CETACEAN-REFERENCE](docs/parity/CETACEAN-REFERENCE.md)。`src/cetacean_world.js` 的棲地、數量與巡游座標為原創遊戲設定。圖鑑 JPG 使用這些實際 WebGL 模型生成，沒有把參考網站的照片或 Nintendo 影像納入素材。

新增鳴唱音效由 Web Audio 合成，屬遊戲聲音，不是真實鯨豚錄音。六基本手勢與進階動作的來源界線列於 [WII-PARTNER-REFERENCE](docs/parity/WII-PARTNER-REFERENCE.md)，信任／熟練門檻及動作時序為本作設定。

## 0.13 洞窟、遺跡與深海調查

`src/regions.js` 的三處空間、實體雕刻與路線，以及 `src/story.js`《回聲潮譜》的角色對話、圖形線索與調查流程皆為原創。參考 Wii 第一代的探索語義，未複製原作地圖、程式、逐字故事或素材；可核對的來源界線见 [WII-WORLD-REFERENCE](docs/parity/WII-WORLD-REFERENCE.md)。

`src/abyss_fauna.js` 五種生物、`src/abyss_world.js` 九個體及棲地是原創幾何與遊戲編排。形態、尺度與資料来源見 [ABYSS-FAUNA-REFERENCE](docs/parity/ABYSS-FAUNA-REFERENCE.md)。新圖鑑 JPEG 由實際模型的 WebGL 棚景製作，不是外部生物照片。9 cm 鮟鱇、8 m 含觸腕的巨型烏賊、3 m 步足展幅的蜘蛛蟹採各自明示尺度；深淵空間經微縮，不能作自然棲息深度的依據。

頭燈為即時近似的世界座標光錐、表面法線照明及水色衰減，未作物理或生態測量認證。

## 0.14 季節與自然曲面

航程日曆、三種生物時段及季節安排、船上訪客月份為本作原創遊戲設計。季節機制的原作依據與生態方向見 [SEASONS-REFERENCE](docs/parity/SEASONS-REFERENCE.md)，不把本作日期、精確月份或鐘點歸給 Nintendo 或實際海域。洞腔、岩肩與鮟鱇更新均為原創程序幾何；沒有使用原作模型、貼圖或音樂。

## 0.15 原創深海研究

三個深海研究站、研究潛航器、斷層幾何、相機相對坐標、材質與動作為原創即時圖像。新三種生物依MBARI及原始分類文獻的形態、尺寸與深度資料建立；參考來源與推定界線見 [TRENCH-FAUNA-REFERENCE](docs/parity/TRENCH-FAUNA-REFERENCE.md)。圖鑑縮圖由本作實際WebGL模型產生；未使用Wii模型、貼圖或音樂。光照、柔軟組織與動作仍是即時遊戲近似，並非實測或物理完整模擬。

## 0.16 連續海域與大型生物

新增藍鯨、鯨鯊皆為本專案程序建立的原創模型及縮圖，沒有下載第三方模型。體型與形態參考 [NOAA 藍鯨](https://www.fisheries.noaa.gov/species/blue-whale) 與 [NOAA 鯨鯊](https://www.fisheries.noaa.gov/species/whale-shark)。代表個體為 26 m 與 8.5 m；巡游路線、共棲海域和深海助游為遊戲編排。

## 0.17 大型生物與棲地修訂

藍鯨、鯨鯊與大翅鯨的連續曲面、鰭根、尾鰭、表面斑紋及喉褶為本專案重新建立的原創程序幾何／著色器，沒有使用外部模型、掃描或貼圖。形態參考沿用上述 NOAA 資料；鯨豚與深海物種的自然棲地依據見 [鯨豚參考](docs/parity/CETACEAN-REFERENCE.md) 與 [深海生物參考](docs/parity/ABYSS-FAUNA-REFERENCE.md)。棲地分層不代表這些物種在同一真實海域共存，路徑、數量和遭遇頻率仍為遊戲編排。

水面環視與快速回頭的功能依據為 [Wii 原版說明書研究](docs/WII-PARITY-REFERENCE.md)，鍵盤、觸控與手把映射由本作設計。

## 0.18 礁間新訪客與散布授權

`src/reef_fauna.js` 的金背花鱸類群造型、邦蓋天竺鯛、長吻蝶魚與雷達魚，使用本庫程序曲面、鰭形及著色函式建立原創模型。四類共 64 隻的配置、巡游範圍與相遇頻率是遊戲編排；沒有下載外部照片、模型、材質或 Nintendo 資產。各類形態／棲地的參考與界線見 [REEF-FISH-REFERENCE](docs/parity/REEF-FISH-REFERENCE.md)，不以這個虛構海域宣稱牠們自然共存。

新四類圖鑑後備縮圖是 `ReefFishArt.thumbnail()` 定義的原創 SVG 插圖，不是外部生物照片，也不是把插圖標成實際遊戲截圖。原有模型棚景 JPEG 的來源紀錄保留。

`src/gamepad_ui.js` 的標準手把選單控制、無效 uniform 提交略過及本機音樂非同步替換修正為本庫程式更新，沒有新增執行時第三方程式庫。網站與離線單檔的建置保留既有 MIT 版權及許可原文，沒有改變版權人或另創授權。

現有授權允許商用及銷售；素材來源、散布條件、代管用途與尚缺的獨立權利證據見 [商用授權與來源紀錄](docs/COMMERCIAL-READINESS.md)。這項紀錄不宣稱 Nintendo 商標或參考網站內容已獲授權，也不等同於所有付費發售條件已通過。

## 0.18.11 皇帶魚

`src/oarfish.js` 的長冠皇帶魚（Regalecus glesne）由本庫程序曲面、鰭膜與細鰭條建立；銀色皮膚、暗斑、紅鰭及背鰭波動為原創美術與動畫。代表全長 4 m、約 480 m 的位置、個體數與懸停節律是遊戲配置，沒有下載研究網站的照片、影片、網格或材質。科學形態與觀察紀錄的來源及限制見 [OARFISH-REFERENCE](docs/parity/OARFISH-REFERENCE.md)。SVG 後備圖由本庫自行繪製；隨版圖鑑 JPEG 使用同一原創遊戲模型的 WebGL 棚景，不是實景照片。

## 0.18.19 皺鰓鯊

`src/frilled_shark.js`、`src/frilled_shark_world.js` 為原創程序模型、色彩與路線，`engine.js` 的專屬動作為即時遊戲近似。形態和深度參考 [來源說明](docs/parity/FRILLED-SHARK-REFERENCE.md)；沒有納入博物館照片、掃描、外部模型或貼圖。圖鑑 JPEG 由本作實際 WebGL 模型生成，SVG 為原創後備；棚景不是自然棲地照片。

## 0.18.25 桶眼魚

`src/barreleye.js` 的高低模型、膜鰭、透明頭罩、成對銀色管眼、綠色晶狀體及 SVG 備援為原創程序幾何與插圖；`assets/guide_barreleye.jpg` 由本作模型在隔離 WebGL 棚景繪製。未將參考照片、外部模型或 Nintendo 素材納入發布包。生物形態依據與假說界線見 [BARRELEYE-REFERENCE](docs/parity/BARRELEYE-REFERENCE.md)。

代表全長 0.14 m、690 m 遭遇位置、數量、動作與眼動節律是本作編排。透明罩使用既有畫面上的局部薄組織近似，沒有折射、體積液體或完整透明組織光學；綠色晶狀體不自發光。此內容不代表完整圖鑑、科學生態模擬或全面超越 Wii 的驗收。
