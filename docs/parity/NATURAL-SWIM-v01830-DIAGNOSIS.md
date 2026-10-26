# 0.18.30 正常游泳慢幀診斷

本輪延續 [完整規格](SPEC.md) 第 32 項及 [工作單 13](issues/13-full-acceptance.md)。公開程式已是 0.18.30，runtime 為 `5545a3f938ba30cf85a6588bbe59d57f73839d45`；診斷起點為文件提交 `97580f6cae13ac061c2b2217c6223e4f762c201a`。本輪診斷沒有改動正式遊戲。

## 方法與證據界線

`tests/parity/natural-swim-cost-browser.cjs` 使用原生 Chrome、全新 context、正常開始按鈕、鍵盤或 CDP 觸控，游出 30 秒後以反向輸入游回 30 秒，最後正常返回首頁。保留真時間、自然串流、自動畫質與原物理；不注入座標、存檔、慢幀或 GPU query，不讀回像素。

被動 RAF 與正式 `renderer.frame` 的增加分開記錄。完成提交間隔是 JavaScript 提交的時間間隔，不能當作 GPU 完成、compositor 呈現、物理螢幕 FPS 或電池證據。full 記錄同步 render 入口、life、stream、resize、frame 外 mesh attachment 及 buffer 上傳；普通 render 內上傳按幀聚合，慢呼叫和 attachment 保留逐筆資料。包含關係的 CPU 時間不能相加。light 只保留基本 RAF／提交觀測，不具備細項 CPU 證據，缺值不能當零。

桌機為 1280×800 DPR 2、預設 quality 2；觸控模擬為 390×844 DPR 3、預設 quality 1，在同一台 Apple M3 Max 執行。四輪按 desktop/full、touch/light、touch/full、desktop/light 串行，沒有同時執行其他 GPU 測試。不同輪的路徑、解析度及當下硬體狀態可能不同，full/light 是量測干擾檢查，不是固定工作量的效能 A/B。

## 先前量測干擾

初版每 10 秒取回觀測資料。桌機 `desktop-full.json` 中，四個完整按鍵窗內的 80.3–105.6 ms 長間隔與取回資料重疊；匯出資料的往返耗時為約 207–257 ms。這不能算作遊戲本身的性能退步。首次資料及觸控 light 資料均保留，不修改、不與新一輪混合。

因此預設改為 `--checkpoints=final`：兩腿游泳中不批次讀回資料，只在開始、兩腿結束後及最後收取。故障時仍保留可取得的 partial；若 drain 傳輸失敗，明示可能遺失資料，不稱完整。`periodic` 保留供故障診斷。

四份 final baseline 使用 harness SHA-256 `07fc2ffb0aab2abe20c0c1023d22a30bdd3f66bc64d9ecfaf0b8b88bdbaaf5d0`，原始程式另存 `qa/parity/v01830-natural-swim/baseline-harness.cjs`。正式 engine SHA-256 仍為 `8485d541e6f0587d155af47dfff53667cc8f415b56cc122a5cd52f900be16200`。

## 初步結果

四輪 final 正常流程均 11／11 通過，文件內容與本機 index 完全相同、WebGL 無錯誤、無 context loss、wrapper 還原成功、page／console errors 皆為空。原資料位於 `qa/parity/v01830-natural-swim/*-final.json`。

下表只計算起訖皆在真實按鍵或觸控持續輸入窗內的完整提交間隔，排除開始、鬆手、收資料及選單。門檻先將 ms 四捨五入至三位小數，避免浮點誤差改變邊界分類。兩位唯讀審查者獨立重算一致，完整分析與來源雜湊在 `qa/parity/v01830-natural-swim/final-analysis.json`。

| 模式／航段 | 樣本 | P95／P99／最大間隔 ms | >33.4／>50 ms 筆數 | 證據 |
|---|---:|---:|---:|---|
| 桌機 full 去程 | 1,760 | 19.3／37.4／52.3 | 22／2 | ★★★ 完整原始資料 |
| 桌機 full 返程 | 1,762 | 19.6／37.4／52.1 | 25／1 | ★★★ 完整原始資料 |
| 桌機 light 去程 | 1,763 | 18.7／35.0／48.4 | 20／0 | ★★★ 完整原始資料 |
| 桌機 light 返程 | 1,744 | 21.1／37.2／55.5 | 26／1 | ★★★ 完整原始資料 |
| 觸控 full 去程 | 1,800 | 18.9／20.9／28.3 | 0／0 | ★★★ 同機模擬 |
| 觸控 full 返程 | 1,801 | 20.0／23.4／28.9 | 0／0 | ★★★ 同機模擬 |
| 觸控 light 去程 | 1,801 | 18.8／20.1／22.0 | 0／0 | ★★★ 同機模擬 |
| 觸控 light 返程 | 1,801 | 19.5／20.3／21.7 | 0／0 | ★★★ 同機模擬 |

桌機 light 也在同一視域重現主要慢簇；該模式在主要慢簇之後觀測到 scale 1→0.935 及 canvas 2560×1600→2394×1496，另有 39.4 ms 單點，不能把這輪稱作沒有 resize。觸控兩種模式均經過同區，未見 >33.4 ms 間隔；但解析度與 quality 不同，不能把兩端差異宣稱為同負載速度比較。light 的 resize 呼叫數與細項 CPU 都維持 unavailable。

桌機 full 在去程及回程均於約 `[-12.8, -6.3, 8]` 的視域出現約一秒慢簇。該輪全程 quality 2／scale 1、沒有 resize、沒有 deferred render 或等待串流；簇內 render 與 life 同步 CPU 很短，沒有長 attachment 或外部 upload。這足以縮小可重現場景，尚不能判定 GPU、compositor、GC 或排程是哪個根因。

舊 periodic 資料另記錄三次 resize 同步耗時 24.7／19.4／53.0 ms，主要出現在 `checkFramebufferStatus` 呼叫期間。它可能包含等待先前 GPU 工作，不等於 shader 或配置本身的獨立耗時；final full 沒有 resize 仍有慢簇，因此不能直接把 resize 當作這段游泳的主要根因，也不能刪除 framebuffer 完整性驗證。

## Chrome trace

可選的 `--trace=PATH` 預設關閉。啟用時只記錄正常去程，完整往返之後才讀取及寫入資料，不開啟截圖、JS stack sampling、heap dump、system trace 或 CPU throttling。追蹤會增加成本，只供定位，不作效能 A/B。

首次因 Chrome 156 的 `Tracing.getCategories` 成功卻回傳空陣列而停止；失敗報告、metadata 與 harness SHA `937df4e0e9f33fde250177c1e0c00632a925d7d08bba1a6d3d312b770e68fa52` 均保留。這是工具前置假設失敗，不能推出瀏覽器不支援追蹤。[Chromium 的 GetCategories 實作](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/content/browser/devtools/protocol/tracing_handler.cc) 仍註記 Perfetto service 的支援缺口；修正後將空清單記為 `unknown-empty`，實際呼叫標準類別，再以真 trace 內容驗證。

修正版 harness SHA `4c8f1f7e04b1481ab23ef311f810c3595f71602123d3103068c11058aac03239` 通過語法及兩軸唯讀審查。單次桌機 light 追蹤與完整正常流程通過，`dataLossOccurred=false`；取得 1,181,971 個事件、233,343,928 bytes，raw SHA `cae0813360b7251b7363064b759a7e4f43c400eebb44019d7e42e1943732bc5c`。具名起訖 user-timing marks 在同一 renderer thread，兩個時鐘 offset 差 0.111 ms；期間有正式 timeline 與 thread/process metadata。各要求類別實際有事件，不表示完整涵蓋 native driver。

原始資料、能力／時鐘驗證與路線收據分別為 `desktop-light-trace-verified.json`、同名 `.meta.json` 及 `desktop-light-trace-verified-report.json`，位於同一 QA 目錄；首次失敗沒有被覆寫。追蹤期間同一礁區仍可重現長提交間隔。

主執行者與唯讀 Spec 審查分別核對 raw trace；下表為各 page-time 窗內完整 X 事件的最大耗時。巢狀事件不是額外獨立耗時，不能相加；跨界事件保留在 `trace-analysis.json`，例如後窗邊界另有 31.245 ms 的 SwapBuffers。

| 完整事件最大 ms | 前 9.5–10.5 s | 慢區 10.5–11.7 s | 後 11.7–12.7 s | 證據 |
|---|---:|---:|---:|---|
| Renderer task | 5.945 | 3.949 | 5.369 | ★★★ raw trace |
| MinorGC | 0.628 | 0.330 | 0.424 | ★★★ raw trace |
| GPU process SwapBuffers | 16.719 | 57.501 | 27.076 | ★★★ raw trace |
| Dawn scheduling wait | 16.349 | 57.115 | 26.679 | ★★★ raw trace |
| Viz event | 0.428 | 0.396 | 0.743 | ★★★ raw trace |

20 筆慢提交間隔與長等待時序重疊；同區在未追蹤的去程也有 20 筆 >33.4 ms 間隔。兩次自然 run 不能量化 trace 的性能影響。這是共享 GPU process 的 CPU 等待，未建立 flow ownership，不能直接叫作 GPU shader 執行時間，也不能指定某個 draw／光影 pass 為根因。完整獨立分析 SHA 為 `f0f17907256a485a42f1d9dd9eccceefcb0c35f251a0e2c6ae678facae2382f7`。

## 正常游泳的完整 GPU elapsed

後續依上述判斷加入預設關閉的 `--gpu=elapsed`，只容許 final checkpoints 且 Chrome trace 關閉。每次正式 `Renderer.render` 使用一個不重疊 query；包含該呼叫實際執行的串流／resize 命令，保留完整原 draw、場景、時間、輸入及自動畫質。遵循 [Khronos extension 規格](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/) 的 AVAILABLE／disjoint 檢查；本工具另外採至少延後四個被動 RAF、每 callback 至多八筆、pending 上限 128 的政策，不呼叫 flush／finish、不等待、不強迫補畫。這些數量是工具自訂界線，並非規範要求。

每次提交與結果各存不可變事件，以 render ID 串接，保留實際眼睛座標、前後解析度、品質、陰影 key／更新增量。disjoint、deferred、overflow、context loss 及停止時尚未完成的 query 不列入有效 GPU 值。只清除自己建立的 query，原生 renderer 的回傳和例外不被量測邏輯取代。GPU elapsed 是完整命令區間的計時，不能當作單一 shader 的獨占成本、螢幕呈現時間或 FPS；查詢本身也可能影響排程。

凍結 harness SHA `96b90eb3d7057cfae8541d552de947609bcabba1a9d03087bebad35dc7023263` 通過語法、十個外部 WebGL 邊界 fixture 及獨立 Standards／Spec 審查。fixture 驗證延遲、失效、容量、外部 ownership 及清理，不是 GPU 效能證據。兩次原生工作串行執行，資料分別是 `desktop-light-gpu.json` 和 `touch-light-gpu.json`；各 16／16 正常流程檢查通過，無 page／console error、GL 0、wrapper 及 query 清理成功，正式 runtime SHA 未變。

| 原生設定 | 有效 GPU query | 停止時 pending | 其他失效／overflow | 證據 |
|---|---:|---:|---:|---|
| 桌機，初始 2560×1600／quality 2／MSAA 4 | 3,826 | 1 | 0 | ★★★ 同機正常輸入 |
| 觸控模擬，585×1266／quality 1／MSAA 2 | 3,913 | 1 | 0 | ★★★ 同機正常輸入 |

這些總數含入海、停留及選單，不能當作兩個游泳航段的樣本數。停止時各一筆 pending 只有三個 RAF，保留身份並刪除資源，沒有當成 0 ms；清理後 created＝deleted、pending 為空且外部 current query 保留。量測 query begin／end／poll 的同步 CPU 最大值分別約 0.2／0.1／0.2 ms；這只涵蓋被計時的 API 呼叫，不是完整 observer 開銷或零干擾證明。

在讀取 GPU 結果前，依先前無 query 的慢區座標選定三個世界 z 區帶：前側 `[11.5,17.5)`、慢區 `[3.5,11.5)`、後側 `[-2.5,3.5)`。兩腿都以相同視線方向通過；表內有效樣本全數來自真實持續輸入窗，數值是完整 renderer 的 GPU 平均／P95，單位 ms。返程的「前側／後側」仍是世界位置標籤，沒有交換成時間先後。

| 設定／航段 | 前側：樣本／平均／P95 | 慢區：樣本／平均／P95 | 後側：樣本／平均／P95 | 證據 |
|---|---|---|---|---|
| 桌機去程 | 62／14.706／17.237 | 44／30.182／57.299 | 62／12.543／16.826 | ★★★ 原始 query |
| 桌機返程 | 63／12.812／14.630 | 44／31.118／58.779 | 63／13.279／14.774 | ★★★ 原始 query |
| 觸控模擬去程 | 62／5.536／9.334 | 83／7.276／10.021 | 62／6.598／9.563 | ★★★ 原始 query |
| 觸控模擬返程 | 62／6.894／10.242 | 83／6.142／9.942 | 63／7.053／10.132 | ★★★ 原始 query |

桌機去程前側與慢區固定 scale 1；離開慢區後在 z≈−0.432 自動降到 0.935，該後側區帶因此混合兩種解析度，該 render 呼叫 CPU 18.8 ms。返程在 z≈−12.522 恢復至 0.970，三個表列區帶都是 2483×1552，該較早 render CPU 16.5 ms。light 沒有 resize 細項包裝，這些是含尺寸變更的整個 render CPU，不能假稱純配置成本。觸控模擬表列區帶固定 scale 1；兩端在游完後 settle 收取資料期間另降 scale（桌機 0.905、觸控 0.935），該區段不納入游泳表。不同設定／自然 run 不是固定工作量 A/B，不能將差值換成手機或改版提升百分比。

桌機慢區的原 renderer 同步 CPU 平均兩腿皆約 0.834 ms、最大 2.4／1.9 ms。排除靜態陰影快取更新的幀後，仍有去程 19／42、返程 20／41 筆 GPU elapsed 超過 33.4 ms，最大 65.468／64.374 ms。因此這次完整 GPU 區間已直接重現慢區負載，靜態陰影重建不是發生慢幀的必要條件；仍不能指定某一材質、draw 或 pass 為根因。

原始資料與 root 分析保留於同一 QA 目錄的 `*-light-gpu-analysis.json`，獨立重算另存 `desktop-gpu-independent.json`／`touch-gpu-independent.json`。觸控兩腿 stage 各含一筆按下前 render；嚴格輸入窗樣本為 1,802／1,801，表列空間帶不含那兩筆，數值不受影響。原始桌機 report SHA 為 `9acd5f40191d1a7ba4875ca97be6b1dfb98d9bc1bc4bbd6e379931ce02db0fbf`，觸控為 `3eee25d17f57e3c34e7c3eea58c6eab7e6aa755c8dc9644e2d41a00606281d2e`。圖像定位另有正常游動後的 `reef-visual.png`／`reef-visual-state.json`；該截圖工作與計時分開，沒有拿截圖過程量效能。完整游泳 GPU 資料沒有畫面像素讀回，不能單憑這輪聲稱黑閃驗證。

下一步聚焦同一礁區的單一渲染區段，保留所有正式 draw，分開量測、保留 query 邊界對 tile GPU 的影響，不將分段時間相加當作自然整幀占比。另有自動畫質短暫慢簇未觸發長平均門檻的現象，需以實際修改及正常輸入驗證回應速度，不能僅由離線數列宣稱改善。未改畫質門檻、未刪除 framebuffer 檢查，本輪診斷沒有發布新的 runtime 修正。完整商用及實體手機／耗電目標仍未完成。
