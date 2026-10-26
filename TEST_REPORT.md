> 最新 0.18.21 本機驗證完成、公開發布驗證中，請見 [本輪報告](docs/TEST_REPORT-v01821.md)。桌機／觸控模擬雙端操作各 67/67，服務與客戶端 66/66、CPU 95/95、靜態 66/66；公網多人服務未配置。以下保留 0.17 歷史驗證，不作為現行完整驗收結果。

# 0.17 外海相遇：驗證紀錄

驗證日期：2026-10-17。[0.16 報告](docs/TEST_REPORT-v016.md) 保留前版結果。

## 完成的驗證

- 25 組 CPU 規則、幾何與整合測試，共 294 項通過。包含模型連通性／法線／鼻端切線、四視角 LOD 輪廓重合率、真實渲染器的陰影與互補切換、30 分鐘外海巡游、十分鐘深海身體包絡、蟹足接地、冷水物種保存與選單、水面操作、區域鏡頭、任務、攝影及音訊路由。
- 主要瀏覽器流程 33/33：桌面 1100×740、手機直向 390×844、橫向 844×390。驗證編譯場景與 shader、極簡首頁／設定、真實鍵盤／觸控輸入、入水區無大型生物、跨海域游動、海圖不傳送、7,000 m 保存重載與實際外海／海溝畫面。最後整合後重跑桌面 15/15，追加確認外海區域名稱。沒有 pageerror 或 WebGL 錯誤。
- 水面操作瀏覽器 17/17：桌機與手機直向，含實際鍵盤、原生觸控、標準手把資料經正式 poll、拖曳環視、游動退出、深度門檻及真實儲存重載。水面相機不改寫潛水員的保存深度。
- 大型生物畫面 18/18：三種動物各有側面、斜前、正面、尾部、低細節及另一尾擺時間。使用新來源幾何、原遊戲 shader 與獨立公尺尺度個體，另外檢視實際棲地畫面。修正檢查中發現的鯨鯊鼻端紋理收束、鰭上斑點拉伸與 GLSL 保留字錯誤後，重新完成畫面檢查。
- 最終場景 481 個 indexed meshes、3647 個共享 instances；21,633,234 bytes gzip、58,493,988 bytes 解壓，符合 24 MiB／80 MiB 載入上限。220 m 台地沿用同一地形網格，渲染和碰撞一致；既有三個更深研究站保留。
- 保留 37 類圖鑑索引與既有個體識別。大型生物全路徑距入水區至少 224 m；新增藍鯨與鯨鯊至少 343 m。冷水物種停止自然出現，但既有夥伴和獨立水族館仍可使用。

## 方法與限制

瀏覽器為 Chromium／SwiftShader；觸控與手把是受控模擬，沒有實體手機／手把或長時間 FPS 成績。模型工作室隔離了背景以檢查解剖與表面，不能當作自然遊玩遭遇；實際棲地截圖另由正式場景及角色產生。位置、時間和物理步長使用明示 fixture。CPU 音訊檢查證明路由與增益控制，沒有宣稱人耳音質驗收。

路線、深度與外形調整提升遊戲的自然合理性，但不是一比一海域調查或攝影掃描。完整 Wii 第一代功能對等仍未完成，尤其雙人同遊、內容總量及實體裝置驗證。

0.15 的船邊限制、耗氣返船與潛航器部署案例不再是現行產品規格。舊 `deepsea-lifecycle.cjs` 的強制回船斷言因此不適用，由自由游泳、深海狀態及本版瀏覽器續玩案例覆蓋；未宣稱所有歷史腳本通過。

## 重現

```sh
python3 build.py
python3 tests/parity/static_check.py
node tests/parity/free-swimming.cjs
node tests/parity/free-ocean-exploration.cjs
node tests/parity/pelagic-life.cjs
node tests/parity/pelagic-geometry.cjs
node tests/parity/pelagic-rendering.cjs
node tests/parity/surface-controls.cjs
node tests/parity/region-camera.cjs
node tests/parity/seasons.cjs
node tests/parity/ecology.cjs
node tests/parity/ship-audio.cjs
node tests/parity/abyss-world.cjs
node tests/parity/abyss-motion.cjs
node tests/parity/cetacean-motion.cjs
node tests/parity/story.cjs
node tests/parity/story-framing.cjs
node tests/parity/navigation.cjs
node tests/parity/deepsea.cjs
node tests/parity/terrain-lod.cjs
node tests/parity/trench-geometry.cjs
node tests/parity/trench-lighting.cjs
node tests/parity/trench-motion.cjs
node tests/parity/trench-fauna.cjs
node tests/parity/exploration.cjs
node tests/parity/selection.cjs
node tests/parity/photography.cjs
python3 -m http.server 8000
# 另一終端依序執行，避免多個軟體 GPU 相互爭用
node tests/parity/free-ocean-browser.cjs http://127.0.0.1:8000/
node tests/parity/surface-controls-browser.cjs http://127.0.0.1:8000/
node tests/parity/pelagic-models.cjs http://127.0.0.1:8000/
```

截圖與原始結果輸出於 `qa/parity/`，不隨網站發布。
