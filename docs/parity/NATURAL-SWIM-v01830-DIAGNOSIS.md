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

下一步不開 Chrome trace，以不重疊的 `EXT_disjoint_timer_query_webgl2` 包住完整正式 renderer，延後非阻塞讀回，保留 disjoint／pending／deferred 以及每幀座標與 scale。保留原畫質、幾何、draw 與自動畫質；該區 GPU elapsed 若有峰值，再做獨立單 pass 診斷，否則追查 scheduling／presentation／backpressure。未取得證據前不刪除 framebuffer 檢查、不改變畫質門檻，不把單一等待事件當作已修復。完整商用及實體手機／耗電目標仍未完成。
