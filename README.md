# 重返蔚藍 · 相遇之海 — LIVING OCEAN 0.9

一個可以直接在電腦與手機瀏覽器遊玩的原創海洋探索遊戲。

**[開始潛水](https://jspusa.github.io/Ocean/)**

從研究船下水，在珊瑚花園與遠洋之間游動，觀察十二類生物、拍照、相遇和收藏。本版延續 0.8 的水下光影、原創模型與自動畫質，加入生物互動、探索工具、研究委託及水族館。Wii 第一代《Endless Ocean》的完整功能對等仍在進行，缺口列於 [功能追蹤](FEATURE_PARITY.md)。

## 0.9 可玩的新內容

- 撫摸、點觸、投餵與熟悉度筆記。適用大型生物可抓握伴游；海豚可建立夥伴關係、命名、呼叫及船邊訓練，排列連續動作並調整訊號強度。
- 海圖隨探索揭開迷霧並記錄航跡；探索工具內支援縮放、平移與雙指縮放。五色水中筆跡留在海中，可擦除或撤銷；九件原創實體收藏可靠近打撈。
- 六封原創攝影／帶路委託逐步開放。帶路訪客會實際跟隨；攝影委託需從相簿選擇符合物種與構圖條件的照片，回船投稿並解鎖潛水衣配色。
- 相機視角、光圈、對焦和曝光補償會改變實際影像。這是即時景深近似，不是物理相機求解。獨立沖印及完整相簿管理仍待完成。
- 航程模式每瓶氣量可使用 20 分鐘；耗盡自動回船並保留成果，暫停時不消耗。自由重遊不消耗氣量。研究桌可休息到晨、昏、夜並選擇隨時間改變光照。
- 水族館依觀察進度解鎖，熟悉的生物可手動或自動配置、移除、清空，進入實際三維展缸觀賞。

氣量、熟悉度門檻、委託與水族館容量是本作設計值，不聲稱等於原作數值。尚缺完整潛區／故事／生物內容、實體甲板互動、虎鯨夥伴、微觀探索及雙人連線；這些需求仍保留。來源與驗收範圍見 [官方資料盤點](docs/WII-PARITY-REFERENCE.md) 和 [完整規格](docs/parity/SPEC.md)。

## 畫面與操作

水下色彩衰減、方向散射、受遮擋的光束、沙地流動光紋、海面波浪與 Snell 折射視窗延續 0.8；珊瑚、海草、魚群與大型生物使用原創程序模型。這不是攝影掃描或實測海域，未宣稱全面超越 Wii。

電腦使用 WASD／方向鍵游動、拖曳環視、E 上浮／Q 下潛、Shift 加速。V 切換第一／第三人稱，F 觀察，X 取景，空白鍵拍照。M 海圖、J 圖鑑、B 航程冊、T 潛水工具、Esc 退出工具／暫停、H 只看風景。設定內可開啟滑鼠自由環視。

手機使用左搖桿移動、右搖桿環視，↑／↓ 調整深度；支援多點觸控、直向與橫向。點「工具」可使用新系統。標準手把保留雙搖桿及扳機輸入；新增工具的完整手把操作尚未實作，實體手機和手把全面驗證仍待完成。

故事模式須親自游向地標，海圖只標記航向。自由重遊可從圖鑑選擇近距離觀察。桌機與手機預設自動畫質，可依負載降低或恢復解析度。

## 保存

航程、互動筆記、夥伴、筆跡、航跡、收藏、委託、水族館、設定與最多八張照片（包含持續保留的投稿附件）保存在目前瀏覽器。航程冊可匯出／匯入完整 JSON 備份；匯入前確認替換，檔案只在本機處理。舊存檔會補入新功能初始值。清除網站資料會清除本機進度。

## 開發與發布

網站為純靜態檔案，不需要 npm、CDN、API key 或後端。保留 `index.html`、`src/`、`assets/`、`music/` 的相對位置；支援 GitHub Pages 專案子路徑。

Python 3.10+、Node.js 18+：

```sh
python3 build.py --pack-only
python3 -m http.server 8000
```

幾何改動需執行完整 `python3 build.py`。本版繼續載入未改動的 0.8 編譯礁體；應用程式與場景格式版本分開。編譯也產生可離線開啟的 `standalone.html`；它不列入 Git，網站沒有 Service Worker。

驗證：

```sh
python3 tests/parity/static_check.py
node tests/v08/reef_invariants.cjs
node tests/parity/expedition.cjs
node tests/parity/ecology.cjs
node tests/parity/exploration.cjs
node tests/parity/aquarium.cjs
node tests/parity/aquarium-browser.cjs http://127.0.0.1:8000/
node tests/parity/aquarium-browser.cjs http://127.0.0.1:8000/ --touch
node tests/parity/browser.mjs http://127.0.0.1:8000/
node tests/parity/browser.mjs http://127.0.0.1:8000/ --mobile
node tests/v08/browser-regression.mjs http://127.0.0.1:8000/
node tests/v08/browser-regression.mjs http://127.0.0.1:8000/ --mobile
node tests/parity/delivery.mjs
```

瀏覽器測試需要 Playwright 和 Chrome；可用 `PLAYWRIGHT_PATH` 指定已有套件。只屬開發驗證工具，不會隨網站載入。結果與限制見 [驗證報告](TEST_REPORT.md)。歷史版本的靜態版本檢查不作本版檢查。
