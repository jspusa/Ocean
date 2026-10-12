# 重返蔚藍 · 歸潮航程 v0.7 — 驗證報告

**交付狀態：單人航程開發版。未宣稱 Wii 全功能／畫質等效，也未取得商業發售放行。**

## 實際環境與方法

Chromium 144，Linux Xvfb，ANGLE / SwiftShader **軟體 GPU**，Python Playwright。未使用實體手機、Safari、Android 硬體、實體遊戲手把或硬體 GPU。

功能測試將完整 standalone.html 載入 set_content，使用記憶體 localStorage fixture。遊戲時鐘凍結，操作後以固定步長推進，驗證真實 JS／GLSL／WebGL 管線。照片、相簿與場景截圖是真正引擎輸出。**它們不是幀率跑分，也不是現地照片或 AI 風景圖。**

## 結果

| 組別 | 通過／檢查數 | 狀態 |
|---|---:|:---:|
| 桌機功能流程 | 48 / 48 | ★★★：該項檢查通過 |
| 手機多點觸控模擬與流程 | 62 / 62 | ★★★：該項檢查通過 |
| 程式／資產／全部索引網格 | 27 / 27 | ★★★：該項檢查通過 |
| CSS 點擊範圍（獨立版面檢查） | 3 / 3 | ★★★：該項檢查通過 |
| 七個桌機視角的實際 WebGL 截圖 | 7 / 7，GL error = 0 | ★★★：固定視角渲染成功 |
| HTTP 網站來源導覽 | 受環境政策阻擋 | ☆☆☆：不算通過 |
| 實體裝置／Wii 同場景對照／真人完整航程 | 未執行 | ☆☆☆ |

星數只標檢查狀態；不是美術分數。相同功能可能分別於桌機、手機測試，數量不可當成獨立玩法數量或商業品質評分。

## 航程與互動

實際檢查了研究船開場、錨地下水、鍵鼠移動、原生 CDP 雙觸控同時移動和轉向、放開／取消歸零、上下潛、橫直版面、巡航、攝影取景 FOV、地圖標記而不傳送、近距觀察、同種個體切換、12 類圖鑑、暫停與恢復。

六個委託的每項條件由控制 fixture 依序觸發，再回船確認結算、完成狀態和再次讀檔。大翅鯨條件使用真實動物位置、取景、遮擋及累計觀察時間。**流程測試不是無人協助的真人完整遊玩**；測試腳本會指定位置、收集紀錄和時間，不能據此聲稱關卡節奏已受玩家驗證。

攝影測試使用實際海龜模型、場景攝影機及真實 JPEG 輸出；幾何評分、個體 ID 與照片被保存。委託測試中另有 80 分 fixture，不能把 fixture 當成實際拍出的分數。原始測試 JSON 保存實際構圖數值。

手把驗證使用標準 Gamepad API 的軸／按鍵 fixture；測了死區、Start 暫停與恢復、斷線歸零，**沒有使用實體手把**。

## 保存、匯入與失敗處理

已實際下載 JSON 存檔、透過檔案 input 匯入、接受／取消覆蓋確認，核對設定、六段記憶與 JPEG 恢復。另驗證未知 ID／非法數值／外來格式篩選，以及儲存配額不足被攔截後顯示警告、可恢復寫入。

上述持久層仍是記憶體 fixture，不代表真實 HTTPS 來源跨瀏覽器重開、無痕視窗、更新或不同裝置已通過。備份程式存在；未做真機損壞恢復壓力測試。WebGL context-lost 有保存與錯誤畫面處理，本輪沒有實際觸發 GPU context loss 驗收。

## 渲染、網格與音訊

最新場景：**304 個索引網格批次、3331 個共享場景物件、673 個遊戲動物個體**。動物總數包含大量同類群游小魚，不是 673 種物種。12 類模型的真實生物學形態沒有獨立審查。

完整解析 gzip 後掃描所有頂點浮點數、三角索引和 instance 引用；皆有效。編譯器現在拒絕帶 NaN／Infinity 的網格。修正了參數曲面在 u 邊界採樣越界，導致船體／海豚及部分遠距模型法線無效的問題。

場景壓縮 13,995,465 bytes；解壓 31,361,808 bytes。固定視角渲染確認主場景 MSAA 已配置，實際取得 4 samples；包含陰影與後處理的渲染後 GL error 為 0。沒有把 MSAA 存在當作完全消除鋸齒／閃爍的證據。

新海豚圖鑑圖為獨立棚景下的實際 WebGL 模型渲染，其餘 11 類保留原有模型圖。兩條原創 MP3 實際啟動、解碼並有非零 PCM 樣本；不是耳機聆聽、配樂品質或循環接點的主觀驗收。

## 性能與開闊感的界線

本版保留 FPS／20 秒量測工具，但**本輪沒有實體 GPU 幀率、20 分鐘熱降頻、輸入延遲或真人暈動測試**。沒有以軟體 GPU 的耗時換算手機 FPS，也沒有宣稱穩定 60 FPS。

540 × 590 公尺是遊戲坐標尺度，沒有取得原作同尺度／同鏡頭量測，不能說「已比 Wii 更大／更真實」。第三人稱空間、海域連續性和七個視角已實際渲染；尚缺真人動態畫面和原作對照驗收。

## 部署狀態

所有模組資源路徑存在且使用相對路徑，單檔沒有遠端 runtime 依賴。下列 HTTP 測試仍受限：

`http://127.0.0.1:8777/ocean-v07/tests/v07/health.html`

結果：`Page.goto: net::ERR_BLOCKED_BY_ADMINISTRATOR at http://127.0.0.1:8777/ocean-v07/tests/v07/health.html`

沒有公開 GitHub Pages 網址驗收，沒有替使用者建立 repository、部署網站、開通支付或更動帳號。單檔與模組檔案均交付，不將 set_content 功能成功說成真實網站發布成功。

## 重現與記錄

先 `python build.py`。Python Playwright 與 Chromium 是測試依賴，不是遊戲執行依賴。

```sh
python tests/v07/static_check.py
python tests/v07/layout_check.py
xvfb-run -a python tests/v07/regression.py
xvfb-run -a python tests/v07/regression.py --mobile
xvfb-run -a python tests/v07/capture_suite.py
```

包含 desktop-results.json、mobile-results.json、static-results.json、layout-results.json、captures.json、guide-results.json、http-results.json。JSON 中保留各項範圍與錯誤。當前單檔 SHA-256：

`b63572c504d752b8258536d2d90aacb633ea84daaf0e7d0f7f7731f3fc29916a`

完整的對等差距與發售門檻分別見 FEATURE_PARITY.md、RELEASE_CHECKLIST.md；沒有以新增功能數取代這些驗收。
