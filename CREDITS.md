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
