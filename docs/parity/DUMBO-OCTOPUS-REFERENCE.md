# 小飛象章魚：屬級原創模型與使用界線

核讀日期：2026-10-27。對象為 **Grimpoteuthis sp.**，不指定未確認的種名。這是新增的原創深海內容，不是 Wii 圖鑑中已確認的逐項替代，也不抵銷完整內容盤點缺口。

## 已核讀來源

- [Ocean Exploration Trust，Micronesian Dumbo Octopus Shows Off for the Camera，2026-08-07](https://nautiluslive.org/video/2026/08/07/micronesian-dumbo-octopus-shows-camera)：直接 ROV 相遇的說明將對象保留在 Grimpoteuthis 類群；可支持成對耳狀鰭、八腕、每腕單排吸盤及 cirri。本輪讀取頁面文字與說明，沒有逐幀量測影片比例。
- [Smithsonian Ocean，Grimpoteuthis, The Dumbo Octopus](https://ocean.si.edu/ocean-life/invertebrates/grimpoteuthis-dumbo-octopus)：館方背景介紹成對外套鰭、腕間蹼及近底懸游；約八英吋高與約 3,000–4,000 m 是概括性背景，不是特定種的最大值、指定個體尺寸或本作棲地的實測資料。
- [Ocean Exploration Trust，Dumbo Octopus Wows Team With Tentacles，2025-10-19](https://nautiluslive.org/video/2025/10/19/dumbo-octopus-wows-team-tentacles)：頁首科學更新已將原稱 Grimpoteuthis 的超過 5,000 m 個體改判為 **Cirroteuthidae，可能 Cirrothauma**。本模型不援引舊標籤來擴張 Grimpoteuthis 的深度、物種身份或比例。

資料只作生物特徵與設計參考；未複製來源照片、影片、圖版或任何第三方模型。程式幾何與備用圖鑑小圖皆為本作原創。配色、大小、相遇深度、吸盤和 cirri 的可見數量、運動節律及密度都是遊戲設計值，不能稱為精確生理模擬。

## 模型與 rig 契約

物種 ID 為 `dumbo_octopus`，登錄透過既有 `registerFauna`，另用自己的 collection，既有 44 個索引與淺礁族群不改。`renderKind: 11`、`motionProfile.type: dumbo_octopus`；完整應用程式由主整合依序追加三腳魚及本種類。獨立模型測試只在既有 44 類後載入小飛象章魚，不代表正式版本總數為 45。

- **尺度**：本作代表個體在靜止造型下，外套頂至腕冠末端的高度為 **0.20 m**；`size: .20`、`measureAxis: 1`、`modelUnitLength: 1`。不是單獨外套長、完全伸展腕長、物種最大值或某已知種的精密測量。
- **座標**：+Y 外套頂，八腕向 -Y 及四周展開，+X 面向，耳狀鰭在 ±Z。主軸高度為 `[-.5,.5]` model unit。
- **tag 1**：閉合外套與寬頭部。下端延伸到 `y=-.14`；在腕蹼根圈 `y=-.06,r=.17` 保持實際重疊，避免懸空腕冠。
- **tag 3**：兩片獨立、封閉的耳狀鰭。左右根為 `[-.018,.16,±.17]`，外端為 `[.027,.24,±.56]`；未傾斜截面中段弦寬約 `.26`，靜止鰭弦採約 0.6 rad 的前緣上抬原創姿態，讓正面可讀鰭面；不是生物學量測角度。左右、根部、末端與總包圍盒維持一致。rig 應在根部保持零位移，逐漸增加遠端擺幅，同步變換法線。
- **tag 5**：八腕、內外兩面的連續腕蹼、單排凹形吸盤及吸盤兩側的細 cirri。根在 `y=-.06`，末端 `y=-.5`；腕蹼使用同一條腕弧線作支撐，到各腕約 84% 處結束，腕間凹緣較短。全部必須使用一致的柔動變形與法線，不能讓吸盤、cirri 或蹼與手臂分離。
- **tag 4**：兩側前方的暗色眼睛，位於約 `[.15,-.005,±.15]`；沒有自發光器官、吸血烏賊的細攝食絲或透明頭罩。

固定造型 raw bounds 為 `min [-.3958424386103687,-.5,-.56]`、`max [.3958424386103687,.5,.56]`；乘 `.20` 後的包圍盒為 X ±0.07917 m、Y ±0.10 m、Z ±0.112 m。這是靜態 CPU 幾何界線，不是包含 shader、actor 旋轉與游動的最終碰撞保證；主整合仍須驗證動畫全週期與真實底面間距。接觸距離 `.6 m`、觀察距離 `6 m`、近看距離 `.9 m`、挑選半徑 `.12 m` 皆為遊戲操作設定。

## 已完成的 CPU 證據與未完成範圍

在公開 catalogue → `faunaGeometry` seam，登錄缺失、模型缺失、口腕細節缺失及腕冠連接缺口各先出現失敗，再完成對應行為；未一次預寫全部功能測試。目前 `node tests/parity/dumbo-octopus.cjs` 為 6／6：保留既有索引、兩級輪廓、八腕間蹼、單排吸盤與兩側 cirri、暗色眼睛、真實外套接合、有限值／單位法線／朝外繞序／索引後非退化及有界幾何。

高階 8,688 三角形、低階 2,288 三角形，兩級索引後合計 470,208 bytes；兩級皆保留八腕、兩片鰭及口腕特徵。只有既有不透明組織材質，沒有新增透明 pass。這些數量不等於 GPU 成本或手機效能結果。

本檔不證明 shader rig、世界生成／棲地、安全間距、正常玩家到達、主動選取、拍照原 JPEG、保存、水族館或公開交付已完成；這些由主整合另外取證。實體手機、耗電與全程畫面穩定性也不由此 CPU 模型測試證明。
