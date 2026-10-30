# v0.18.48 Spec review — pre-public final

審查範圍：已發布 v0.18.47 `05e830e9f3ab80f9a1a4505c73a38087ff1027a5` 之上的岩石規格、素材與來源包、準備／比較工具、版本及產物 diff、root 完成的建置／本機普通入海收據。依據 [ROCK-REALISM-v01848-SPEC](ROCK-REALISM-v01848-SPEC.md)。本輪 reviewer 只讀取原始檔、收據與 diff，重算現有檔案雜湊；沒有產生素材、啟動 browser／GPU、執行 build 或更動 production。

**發布前結論：APPROVED for this bounded rock-surface change；沒有阻擋 Spec finding。** 離線素材、受控場景 invariants、獨立有限視覺接受、正式素材整合、pack-only 不變量與本機普通入海資料已核對。**Public gate 仍待 root；本文件不聲稱已上線。** 完整海溝形狀、生物擬真、實體手機效能與整體目標未因此完成。

## 固定審查身分

- `tools/prepare_rock_surface.py`：SHA-256 `4942e440bd5afd14af71192e95230038dd9372578b9f8737901db516bff3e102`。
- `tests/parity/rock-scan-browser.cjs`：SHA-256 `0f6b3d4568818f0b36bfdf30ef5dee44d86a8539f1256953b507d6bbbd720550`。
- `qa/parity/v01848-rock/prepared/receipt.json`：SHA-256 `c52d55c1c929484ad9622759a614b46e0ae0cc03c86f838aa29cf8b011235152`，schema 2，狀態明記 prepared candidate、未安裝／未視覺接受。
- 另讀取 `source-info.json`、`source-files.json`、`ASSET-PREVIEW.md`。獨立重算工具、兩份 metadata、兩原始素材、兩候選素材的 bytes／SHA-256／MD5，全部與收據相符。本審查以保存的官方 metadata／來源收據核對，不宣稱另做了一次線上授權查證。

## 規格逐項對照

星星表示本階段證據完整程度，不表示畫面品質或裝置效能。

| 項目 | 宣告規格 | 審查證據與結果 | 證據完整度 |
|---|---|---|---|
| 來源 | Poly Haven Rock Boulder Dry，正式 diffuse／OpenGL normal pair | metadata 與工具白名單一致；兩來源精確 URL、publisher size／MD5 與 local SHA 保存；作者 Dimitrios Savva／Rico Cilliers、CC0-1.0 已記錄 | ★★★★★ |
| 單一配方 | 2048→1536，diffuse q88、normal q90、4:4:4，不搜尋分數 | 工具接受明確尺寸；兩圖各一次 `save`，相同無裁切 Lanczos grid；收據 `fixed_encoding_runs_per_image: 1`；無 tint、旋轉或 flip 路徑 | ★★★★★ |
| 法線方向 | 浮點方向縮放後正規化 | decode → normalize → float component Lanczos → renormalize → RGB8 → JPEG；方向 reference hash 與最大單位長誤差保存 | ★★★★★ |
| 下載預算 | pair ≤2,215,377 bytes | 候選 1,521,112 bytes，減少 694,265 bytes／31.34%；兩檔 hash 重新核對一致 | ★★★★★ |
| 尺寸／記憶體宣稱 | 不超過2048，手機1024政策由 runtime 維持 | desktop原2048／候選1536，touch兩者1024；RGBA8完整pair mip帳面值25,165,808 bytes。文件未宣稱量測分配量或較低手機常駐容量 | ★★★★★ |
| 固定世界比較 | 只替換 slots 2／3；原版→候選→復原 | desktop／touch各八鏡位全valid；48個影像arm的checks全true，16／16復原RGBA及PNG精確一致、cleanup成功 | ★★★★★ |
| 新尺寸證據 | desktop1536／touch1024需如實記錄 | 被動轉送原生 `texImage2D`／`generateMipmap`，保存原版與候選上傳來源尺寸／推導mip chain；兩profile已記錄正確尺寸並復原原生方法。不把它稱為GL allocation query | ★★★★★ |
| 正式整合／建置 | engine／generator／archive／contact 不變 | root pack-only exit0；review獨立驗證7個主要不變檔、31個input、完整archive/index/growth；兩張正式素材及source package精確對應收據 | ★★★★★ |
| 本機普通入海 | desktop／touch正常click／tap與自動畫質 | local-delivery 3／3，330 hashes，兩profile正常入海；zero errors／warnings／network failures | ★★★★★ 本機證據 |
| 公開部署 | exact Pages revision及所有公開檔案 | 尚未提供公開部署收據，不由localhost測試推論已部署 | ★☆☆☆☆ 待root |

法線的 encoding-only 角誤差：mean 1.641°、p95 3.530°、p99 4.779°、max 13.766°，涵蓋全部 2,359,296 output pixels。比較對象為未量化的正規化縮放方向；收據清楚排除原2048來源的縮圖損失，不可拿這組數字聲稱與原掃描等價。

## 工具 diff 與擁有權

`prepare_rock_surface.py` 保留無參數的 v47 Rock Face／2048 image 路徑；新增白名單資產及1536選項。兩來源先驗完整來源身分再寫候選；禁止 production `assets/` 作為輸出祖先。schema 2 的新增欄位明列 resize、方向 reference、尺寸與帳面容量，沒有暗改 runtime shader 或地形生成器。

比較工具的新 `--pair-dir` 限於真實 checkout 的 `qa/` 樹；role、derived bytes／SHA、4:4:4、decoded dimensions 先核對。它容許歷史2048及新1536 pair；候選影像仍沿現有 `textureFull`／1024政策上傳。原生 upload observer 是 QA 證據收集，沒有另建 render pass 或更換 renderer 方法。原版資源和所有非岩石 textures 的上傳紀錄也納入 invariant；實際清理成功仍需結果證明。

本輪 rocks 範圍不包括生物、接觸、存檔、音訊 admission、曝光、世界投影尺度或深海地形輪廓。來源約1.8m、遊戲主岩石投影2.5m的比例差異已在規格揭露；不能把素材形容為經證實的海底石灰岩。後續生物方向另存 [ANIMAL-NEXT-v01848](ANIMAL-NEXT-v01848.md)，不據此聲稱已修改生物。

## 已收到的受控場景資料

核對 `qa/parity/v01848-rock/visual-initial/report.json`，SHA-256 `3e9eae112bbf490497970931cef00659336e0c8d374e06e692cdd7f3bc0eafc9`。報告狀態為 `passed-controlled-invariants-visual-review-required`；兩profile均無errors、GL error為0，指標復原、候選texture刪除、原生upload方法復原均為true。初始automatic quality為true；desktop q2／scale1，touch q1／scale1，均為compiled／streamed世界。

兩profile各八鏡位全部valid，逐arm所有checks為true，16／16原版與復原版RGBA與PNG hash精確一致。此review獨立重算48張PNG的SHA-256，全部與報告相符。每profile七鏡位有像素變化；`cut-bottom`的三arm一致，此處沒有可見rock-map影響，不能把不變的畫面列作已改善。

root 已表示照片檢視可接受有限surface改進；[獨立視覺審查](REVIEW-v01848-ROCK-CANDIDATE.md) 已檢視32張圖、16組original／candidate並給予有限接受。它明列近礁與藍燈收益，同時指出hadal-wall可辨識重複圖案更明顯、平牆與直線台階完全未改善。該項被獨立reviewer判為本次有限更新的非阻擋取捨；不能解讀成規格對自然海溝岩層的完整驗收。移動閃爍、實機效能不在靜態審查證據中。此Spec review引用該獨立視覺判斷，不把檔案存在或不變量通過當成美術接受。

## 正式整合、建置與本機入海

正式 `assets/rock_diff.jpg`／`assets/rock_nor_gl.jpg` 的bytes與SHA精確等於prepared receipt；`assets/rock-surface/preparation-receipt.json` 與QA原收據逐位元相同，兩份官方metadata亦逐位元相同。source package含LICENSE、CC0全文、來源與處理紀錄，正確保留歷史準備狀態並另說明已安裝，沒有改寫原始收據。CREDITS與COMMERCIAL-READINESS明示新來源取代歷史程序岩圖說明，未把素材許可提升成整體商業發售接受。

root 的 `qa/parity/v01848-release/build-verification.json` 狀態passed，build為 `python3 build.py --pack-only`；build log記錄509 batches、458 unique meshes、185 chunks。review另外從Git基準讀取並逐位元比較 `src/engine.js`、`src/world.js`、`src/app.js`、`src/audio.js`、`assets/reef.mesh.gz`、`assets/scene/index.json`、`assets/reef-growth.json`，七項全相同；因此完整contact catalogue也隨index保持精確。archive SHA仍為 `401f234343c2a405a6cec956812962a5b4b4034cb8c312384dea27f3c257b0c7`。

review獨立重算 `REEF_GROWTH_REPLAY.sourceInputs` 的31項bytes／SHA，全數相符，archive記錄亦相符；沒有改世界／接觸／生物生成來配合新表面。`src/config.js`、`src/shell.html`、`index.html` 均精確等於基準僅替換 `0.18.47`→`0.18.48`，沒有額外runtime算術改動。VERSION／README一致為0.18.48；README保留自動畫質、31.34%僅指下載bytes、不宣稱FPS或耗電及整體寫實完成。

`MANIFEST.json` 為0.18.48、330項；review重算當前330個本機檔案bytes／SHA，全相符。`qa/parity/v01848-release/local-delivery.json` 的實際URL是 `http://127.0.0.1:8765/`，status passed、completed true、3／3 checks、330／330 hashes。測試通用名稱含有Public／Published，但此結果**只能歸為localhost gate**。desktop正常click、touch正常tap，兩者compiled／streamed、adaptive true、12 programs、47 species、optional barramundi ready、GL0、未lost、viewportFits true；page／console error、warning、network failure全0。

音訊依賴的補充CPU收據 `audio-optional-boot.json` 為4／4；原本audio與app byteexact，正常入海有獨立結果支持。它只驗證boot依賴與受控constructor邊界，不宣稱重現或窮盡所有原生音訊掛起情境。

本階段收據身分：

- build-verification：`86878199908cf48710715d0eeb4cd4d674c183106a3b6ccf8437754d1b803a12`。
- local-delivery：`8e18a8d23d440ed9dea0fe18c3712d689cf8df09388fb880ea9b423b6a5b8247`。
- audio-optional-boot：`5c6ebfcb02fd47d86e50800ece6e3d0520ab410091587e624c39516b785a015c`。

## 剩餘公開門檻

root 仍需確認獨立Standards final、最終提交的exact Pages revision、每個公開manifest檔案與公開普通desktop／touch入海。若正式素材、工具或runtime再改動，須確認這組證據仍對應最終提交。此review沒有執行／暗示push、部署或公開接受；保持 **pre-public final / public acceptance pending root**。

本稿沒有 GPU效能、實體手機、耗電、普遍FPS或完整寫實目標完成的結論。
