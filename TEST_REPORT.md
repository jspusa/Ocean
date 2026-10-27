> 0.18.33 已發布，公開 300 個檔案吻合、桌機／觸控正常入海及公開音效故障 26 項檢查通過。修復卡在「準備海底聲景」：音效預備最多等待 1.5 秒，未回應的音效關閉也不再阻擋入海。CPU 105／105、靜態 68／68、音效生命週期最終合併 18／18 情境通過；見 [本輪報告](docs/TEST_REPORT-v01833.md)。

> 0.18.32 已發布並核對公開 300 個檔案與兩端入海：深海導覽可持續停留、手動接手、保存後明確續行。完整本機桌機 30／30、觸控模擬 32／32，含正式匯出／取消／匯入、原 JPEG 與 7,000 m 到站；既有完整海溝調查觸控 55／55。CPU 初跑 104／105，修正舊 schema 期望後合併 105／105；原生發現的焦點缺陷另修復，定向 CPU 58／58、最終靜態 68／68。失敗歷史、雙軸審查、公開與實體裝置界線見 [本輪報告](docs/TEST_REPORT-v01832.md)。完整內容及商用驗收仍在進行。

> 0.18.27 已發布並公開驗證：海溝實體層緣、細粒泥面、內面減量及皺鰓鯊導覽側身修復。CPU 最終合併 102／102、靜態 68／68、服務 101／101；本機兩端鯊魚自然流程各 26／26、海溝調查 41／41 與 55／55、已知 resize 黑閃回歸通過。公開 300／300 檔案與兩端預設入海通過；GPU 成本零增加仍未定，實體手機、耗電與完整商用門檻仍未完成。見 [本輪報告](docs/TEST_REPORT-v01827.md)。

> 0.18.26 已發布並公開驗證：不可讀航程保護、可見保存失敗與攝影狀態修正。三種畫面完整恢復流程 15 組、CPU 最終合併 100／100、靜態 68／68、服務 101／101、多分頁 10 組、崩潰恢復 10 組、原生節奏 55／55 及兩端 resize／顯示恢復回歸通過；公開 297／297 檔案、兩端預設入海與 10 組公開保存恢復流程通過。見 [本輪報告](docs/TEST_REPORT-v01826.md)。

> 0.18.25 已發布：新增 690 m 原尺寸桶眼魚、透明頭罩與轉動管眼，圖鑑 44 類。公開 297 個檔案與兩端預設入海已核對，公開觸控探索／照片重載 30／30；本機兩端正常流程各 30／30、水族館各 25／25、節奏各 28／28，CPU 最終 100／100、服務 101／101、靜態 68／68與已知 resize 黑閃回歸通過。完整內容、公網多人、實體裝置／耗電及商用門檻仍未完成。 見 [本輪報告](docs/TEST_REPORT-v01825.md)。以下保留 0.17 歷史結果。


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
