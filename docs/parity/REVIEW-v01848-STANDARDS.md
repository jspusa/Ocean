# v0.18.48 Standards review — source only

結論：本次限定範圍通過原始碼審查，未發現需阻擋候選預覽的問題。這不是畫面接受、上線核准或效能量測結果；native desktop/touch 預覽與視覺判讀仍待 root 完成。

本次只讀 `tools/prepare_rock_surface.py`、`tests/parity/rock-scan-browser.cjs` 的 diff 與現有上下文，以及 `ROCK-REALISM-v01848-SPEC.md`。未執行測試、語法檢查、素材製備、GPU、瀏覽器或建置，未讀取預覽影像，也未修改 implementation。審查者曾編寫本次 `rock-scan-browser.cjs` 變更，因此該部分屬自我審查；素材製備工具由另一位代理撰寫。此報告不能代替另一位 reviewer 的獨立 Spec／視覺接受。

星等表示本次原始碼檢查的明確程度，並非候選畫質或執行成績。

| 檢查項目 | 判定 | 原始碼依據與邊界 |
| --- | --- | --- |
| 原生 GL 上傳觀察器 | ★★★★★ 通過 | `rock-scan-browser.cjs:119–145` 先用原本的 `this` 與參數呼叫原生 `texImage2D`／`generateMipmap`，再讀取目前 `TEXTURE_BINDING_2D`；沒有綁定貼圖、改動 pixel-store、建立 GPU 資源或呼叫 `getError`。只包裝 WebGL2 原型的兩個方法，未改 Renderer 方法。 |
| 原圖與候選的各層尺寸 | ★★★★★ 通過 | `rock-scan-browser.cjs:125–139,211–216,243–253,348` 分別保存實際 base upload 來源尺寸、RGBA8 格式、上傳次數及 mip 生成次數；各層尺寸依該次 base upload 推算。1536 平方為 11 層：1536、768、384、192、96、48、24、12、6、3、1；2048 平方為 12 層；現有手機路徑 1024 平方為 11 層。這是呼叫紀錄及層尺寸推算，不是 GL allocation 查詢或記憶體實測，方法說明 `:103` 已揭露。 |
| normal 重新取樣 | ★★★★★ 通過 | `prepare_rock_surface.py:58–98` 先將 RGB 解為有正負號的向量並正規化，再逐通道用相同 Lanczos 座標格取樣、重新正規化、量化為 RGB8；不做 sRGB 轉換或 channel flip。非有限或退化向量會報錯。`65–79` 與 `145–146` 保留 v47 預設 2048 路徑，只有明確指定 1536 才重新取樣。 |
| 編碼誤差解釋 | ★★★★★ 通過 | `prepare_rock_surface.py:90–97,101–139,206–207` 保存未量化、重新取樣後單位向量參考的 hash；對全部輸出像素計算 RGB8／JPEG 編碼角度誤差。明確排除從原始 2048 掃描縮小造成的資訊損失，沒有將此數值稱為原掃描等價或視覺品質分數。 |
| 資源與狀態恢復 | ★★★★☆ 通過，有明確範圍 | `rock-scan-browser.cjs:203–249` sampler 檢查及候選上傳以 `finally` 恢復 binding／flip；候選 texture 建立後立即登記，任何後續上傳失敗皆走 cleanup。`337–356,367–371` 每場恢復原指標，結束刪除新增貼圖並還原原型方法；控制範圍內驗證原圖恢復後像素 byte-exact。若 setup 在 `__rockScan` 註冊前失敗，則記錄 `notInitialized` 並關閉整個專用 browser context，沒有成功恢復 receipt 可主張。 |
| 僅兩張貼圖參與比較 | ★★★★★ 通過 | `rock-scan-browser.cjs:20–39` 限制候選目錄位於本 checkout 的 QA 樹、核對 receipt hash／bytes、角色、相同寬高及 ≤2048。`217,328–338` 僅切換 slots 2／3，檢查其餘 texture 指標及上傳紀錄、program／Renderer methods、批次、actor、世界和控制條件維持一致；沒有新增 render pass 或 shader 替換。 |
| 可重現來源與固定配方 | ★★★★★ 通過 | `prepare_rock_surface.py:168–182` 在寫入候選前驗證兩份官方 URL、bytes、MD5、RGB JPEG／尺寸／方向；`188–210,214–255` 固定 JPEG88／90、4:4:4、單次編碼，記錄來源／候選／工具／metadata hash、Python／Pillow／libjpeg／NumPy 版本、來源尺度與配方。`rock-scan-browser.cjs:93–99,152–165,375` 另核對本地來源與實際回應內容。未宣稱跨任意編碼器版本 byte-exact。 |
| 規格與證據範圍 | ★★★★★ 通過 | Spec `:9–23` 將 1536 格、下載預算、來源約 1.8m／既有投影 2.5m 的藝術縮放、手機 1024、固定實景及拒絕條件列明。素材製備僅輸出候選和 receipt；`within_budget` 是紀錄，並非自動接受。保留視覺、正式 loader、打包來源、一般進入流程及公開檔案驗證等後續 gate。 |

問題清單：本次 diff 未發現可定位的阻擋性 correctness 問題。沒有以降低檢查門檻、改曝光、改場景或放寬原圖恢復要求來配合候選。

需保留的操作邊界：製備工具仍是依序寫入 QA 候選，沒有承諾整對檔案原子置換（`prepare_rock_surface.py:185–210,254–255`）。中斷可能留下部分 QA 輸出；preview 的 receipt hash／bytes／解碼尺寸檢查會拒絕不符的 pair。不能將殘留檔案直接當成可發布素材。工具記錄的 mip bytes 是 RGBA8 尺寸計算（`:244–251`），不含驅動配置差異。

觀察器增加初始化／貼圖上傳時的 JavaScript 記錄與唯讀 `getParameter` 成本，且視覺 harness 會額外保留兩張候選 GPU 貼圖。因此本輪不能用來宣稱零額外成本、遊戲幀率、電池續航或正式遊戲峰值記憶體。沒有發現它改變 GPU 綁定／上傳參數的原始碼路徑；此結論的執行證據仍須是 root 的無 GL error 與恢復紀錄。

接受候選前仍須 root 完成八個固定場景在 desktop／touch 的原圖→候選→還原序列，確認各層紀錄、無錯誤、原圖還原與原始 PNG，再實際判讀顏色、凹凸對齊、重複紋理、遠距、沙地混合與深海燈照。即使通過，也只支持這對岩石材質；不代表深度、動物形態、接觸、完整擬真目標或實體手機已驗收。

本次讀取的 SHA-256：

```text
4942e440bd5afd14af71192e95230038dd9372578b9f8737901db516bff3e102  tools/prepare_rock_surface.py
0f6b3d4568818f0b36bfdf30ef5dee44d86a8539f1256953b507d6bbbd720550  tests/parity/rock-scan-browser.cjs
fbd0e69d193a4257176132bcb1306368c31b866cb803ca5f1feed1ab26e3c79e  docs/parity/ROCK-REALISM-v01848-SPEC.md
```
