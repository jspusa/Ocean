# 重返蔚藍 · 相遇之海 — LIVING OCEAN 0.12

一個可以直接在電腦與手機瀏覽器遊玩的原創海洋探索遊戲。

**[開始潛水](https://jspusa.github.io/Ocean/)**

從研究船下水，在珊瑚花園與遠洋之間游動，觀察二十七類生物、拍照、相遇和收藏。本版延續 0.8 的水下光影、原創模型與自動畫質，加入生物互動、探索工具、研究委託及水族館，並補上沖印、甲板生活與移船。Wii 第一代《Endless Ocean》的完整功能對等仍在進行，缺口列於 [功能追蹤](FEATURE_PARITY.md)。

## 0.12 海上的朋友

- 新增真海豚、太平洋白側海豚、康氏海豚、虎鯨、白鯨、偽虎鯨與瑞氏海豚，連同原有瓶鼻海豚共八種可結識的鯨豚。七種各有原創輪廓、斑紋、公尺尺度、巡游及尾擺；新增21個持續個體，場景合計725個體／27類。
- 在「工具 → 鯨豚夥伴」標記各自棲地。近距觀察與輕撫後邀請，名冊可有三位、每種一位新夥伴；支援命名、選擇、哨子、抓握、告別與直接替換。舊版既有同種夥伴及熟練度全部保留。
- 回船後在嘴部／胸鰭連點、輕撫或按住，下達旋轉跳躍、前／後空翻、尾行、鳴唱、握鰭六種指令。最多排列三個，再調整 Go 強度；熟練後可執行雙翻／螺旋及三翻／超級螺旋變體。各自熟練度、表演高度與時間會保存。
- 夥伴名冊、告別個體、名字及訓練一起納入完整存檔；大、小夥伴使用相應取景，手機直向與橫向均可直接操作身體。水族館沿用同一模型和尺寸，大型鯨豚有各自容量成本。

原作六指令與候選線索見 [夥伴研究](docs/parity/WII-PARTNER-REFERENCE.md)；精確熟練門檻、信任值、動作與容量是本作設計。尚未確認全部原作招式／解鎖，這次新增不等於完整對等。[形態來源與尺度](docs/parity/CETACEAN-REFERENCE.md)。

## 0.11 微小生命

- 新增豆丁海馬、灰姑娘海蛞蝓、花園鰻、蘭氏槍蝦、彩繪躄魚、月斑蓑鮋、寬腕烏賊與鸚鵡螺，八種各自建立原創幾何；共新增 31 個固定身分的個體，圖鑑目前為 20 類。
- 生物保持公尺尺度，例如豆丁海馬高 24 mm、槍蝦體長 28 mm。海馬附著、海蛞蝓爬行、花園鰻縮洞、槍蝦覓食躲藏、躄魚緩行、鰭裙波動與噴水滑行各有動作，沒有將牠們放大成大型魚。
- 下水後從「工具 → 微觀探索」沿聲音或畫面方向提示尋找微小生命。靠近可見的生物，再點標記進入局部鏡頭，環視、放大、安靜觀察及拍照；游泳位置不變，不能從遠處直接解鎖。
- 微觀照片沿用底片、回船沖印、相簿與完整備份。觀察筆記和個體身分會保存；藏起來或被礁石擋住的生物不會獲得觀察／照片進度，反覆開關鏡頭也不能累加同一次發現。
- 水族館使用相同尺寸、模型與動作，新增細小生物的近看與手機雙指縮放。動作與棲地是原創遊戲近似；尺寸與形態依據見 [生物參考](docs/parity/FAUNA-REFERENCE.md)。

## 0.10 延續的船上與攝影生活

- 水下拍攝保存到 20 格底片；回船在沖印桌選片，收入最多 120 張的相簿，才可用於攝影投稿。支援放大、下載 JPEG 原圖、刪除與投稿附件保護，不自動覆蓋照片。
- 原圖改存本機 IndexedDB，底片與相簿共用 96 MiB 上限。完整備份包含影像本體；舊版相簿自動搬移。空間不足、跨分頁衝突與遺失原圖會顯示可操作的恢復方式。
- 真實甲板路徑、可見人物與步行動畫，能走到船伴、告示板、收藏箱、躺椅、船艙與下水處。船艙有八類物件入口；角色外觀與可解鎖配件可修改，船上有海豹／企鵝來訪事件。
- 躺椅視角可欣賞海面、播放原創配樂或選擇本機音樂；音樂檔案不會上傳。
- 四個原創泊位會移動研究船、甲板物件、船邊訓練位置與下一次入水處。航程模式探索範圍為船邊 180 公尺，完成記憶或發現對應區域可開放泊位；自由探索模式可移動全部泊位、漫遊整片海。

這些泊位、解鎖、角色與容量是本作設計。相機 20 格有原作畫面依據；不將本作相簿容量或移船距離當作原作數值。完整原作內容仍待逐項補齊。

## 延續的相遇與探索

- 撫摸、點觸、投餵與熟悉度筆記。適用大型生物可抓握伴游；八種鯨豚可建立夥伴關係、命名、呼叫及船邊訓練，排列連續動作並調整訊號強度。
- 海圖隨探索揭開迷霧並記錄航跡；探索工具內支援縮放、平移與雙指縮放。五色水中筆跡留在海中，可擦除或撤銷；九件原創實體收藏可靠近打撈。
- 六封原創攝影／帶路委託逐步開放。帶路訪客會實際跟隨；攝影委託需從相簿選擇符合物種與構圖條件的照片，回船投稿並解鎖潛水衣配色。
- 相機視角、光圈、對焦和曝光補償會改變實際影像。這是即時景深近似，不是物理相機求解。拍攝後的底片與相簿流程見上方。
- 航程模式每瓶氣量可使用 20 分鐘；耗盡自動回船並保留成果，暫停時不消耗。自由重遊不消耗氣量。研究桌可休息到晨、昏、夜並選擇隨時間改變光照。
- 水族館依觀察進度解鎖，熟悉的生物可手動或自動配置、移除、清空，進入實際三維展缸觀賞。

氣量、熟悉度門檻、委託與水族館容量是本作設計值，不聲稱等於原作數值。尚缺完整潛區／故事／生物內容、完整角色及船上事件、完整夥伴解鎖／特技對照、完整微觀生態內容及雙人連線；這些需求仍保留。來源與驗收範圍見 [官方資料盤點](docs/WII-PARITY-REFERENCE.md) 和 [完整規格](docs/parity/SPEC.md)。

## 畫面與操作

水下色彩衰減、方向散射、受遮擋的光束、沙地流動光紋、海面波浪與 Snell 折射視窗延續 0.8；珊瑚、海草、魚群與大型生物使用原創程序模型。這不是攝影掃描或實測海域，未宣稱全面超越 Wii。

電腦使用 WASD／方向鍵游動、拖曳環視、E 上浮／Q 下潛、Shift 加速。V 切換第一／第三人稱，F 觀察，X 取景，空白鍵拍照。M 海圖、J 圖鑑、B 航程冊、T 潛水工具、Esc 退出工具／暫停、H 只看風景。設定內可開啟滑鼠自由環視。

手機使用左搖桿移動、右搖桿環視，↑／↓ 調整深度；支援多點觸控、直向與橫向。點「工具」可使用新系統。標準手把保留雙搖桿及扳機輸入；新增工具的完整手把操作尚未實作，實體手機和手把全面驗證仍待完成。

故事模式須親自游向地標，海圖只標記航向。自由重遊可從圖鑑選擇大型生物近距離觀察；微觀物種仍須親自接近棲地。桌機與手機預設自動畫質，可依負載降低或恢復解析度。

## 保存

航程、互動筆記、夥伴、筆跡、航跡、收藏、委託、水族館、角色、泊位與設定保存在目前瀏覽器；20 張底片與 120 張相簿照片使用獨立本機影像資料庫。航程冊可匯出／匯入完整 JSON 備份；匯入前確認替換，檔案只在本機處理。舊存檔會補入新功能初始值。清除網站資料會清除本機進度。

## 開發與發布

網站為純靜態檔案，不需要 npm、CDN、API key 或後端。保留 `index.html`、`src/`、`assets/`、`music/` 的相對位置；支援 GitHub Pages 專案子路徑。

Python 3.10+、Node.js 18+：

```sh
python3 build.py --pack-only
python3 -m http.server 8000
```

幾何改動需執行完整 `python3 build.py`。本版重新烘焙 0.12 場景，包含新增模型、實際尺度、固定個體與棲地支撐；船的定位標記繼續支援移船。編譯也產生可離線開啟的 `standalone.html`；它不列入 Git，網站沒有 Service Worker。

驗證：

```sh
python3 tests/parity/static_check.py
node tests/v08/reef_invariants.cjs
node tests/parity/expedition.cjs
node tests/parity/cetaceans.cjs
node tests/parity/cetacean-motion.cjs
node tests/parity/cetacean-world.cjs
node tests/parity/partner-state-review.cjs
node tests/parity/partners-browser.mjs
node tests/parity/fauna.cjs
node tests/parity/fauna-motion.cjs
node tests/parity/fauna-world.cjs
node tests/parity/microcosm.cjs
node tests/parity/microcosm-browser.mjs
node tests/parity/fauna-visual.cjs
node tests/parity/fauna-visual.cjs --touch
node tests/parity/ecology.cjs
node tests/parity/exploration.cjs
node tests/parity/aquarium.cjs
node tests/parity/photography.cjs
node tests/parity/photography-browser.mjs
node tests/parity/navigation.cjs
node tests/parity/navigation-browser.mjs
node tests/parity/navigation-browser.mjs --mobile
node tests/parity/ship.cjs
node tests/parity/ship-browser.cjs
node tests/parity/ship-browser.cjs --touch
node tests/parity/ship-browser.cjs --touch --landscape
node tests/parity/aquarium-browser.cjs http://127.0.0.1:8000/
node tests/parity/aquarium-browser.cjs http://127.0.0.1:8000/ --touch
node tests/parity/browser.mjs http://127.0.0.1:8000/
node tests/parity/browser.mjs http://127.0.0.1:8000/ --mobile
node tests/v08/browser-regression.mjs http://127.0.0.1:8000/
node tests/v08/browser-regression.mjs http://127.0.0.1:8000/ --mobile
node tests/parity/performance.mjs
node tests/parity/delivery.mjs
```

瀏覽器測試需要 Playwright 和 Chrome；可用 `PLAYWRIGHT_PATH` 指定已有套件。只屬開發驗證工具，不會隨網站載入。結果與限制見 [驗證報告](TEST_REPORT.md)。歷史版本的靜態版本檢查不作本版檢查。
