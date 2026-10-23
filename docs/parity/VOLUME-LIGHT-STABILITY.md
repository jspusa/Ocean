# 游動時水體光團：診斷與修復紀錄

日期：2026-10-24。舊版基準：`bc68a54`（0.18.5）。依 AskMatt diagnosing-bugs 流程先保留可重現的 RED，再改 shader；以下只接受實際量到的範圍。

## 重現與可反證假設

原生 Chrome／Apple M3 Max／ANGLE Metal，在淺礁 `[0,-8,7]`、固定 `t=12.98`，以及前移／下降 0.6 m 的視角，都能看見柔藍光團。診斷固定時間、關閉手電與氣泡，只將 `VOLUME_FS` 最終 scatter RGB 歸零、保留 AO alpha：光團大幅消失，海床焦散仍在。這將問題定位到水體散射；不能以此宣稱自然氣泡或海床焦散有錯。

| 假設 | 可反證的單變量檢查 | 結果與證據強度 |
|---|---|---|
| 稀疏、隨相機移動的積分節點對尖銳光場欠採樣 | 同一 production shader 改為 128／256 步；另只改近距加權節點 | ★★★★★ 原 shader 對收斂參考明確 RED；加權改善部分光團，不能單獨解決外觀 |
| isotropic noise 經高次聚焦，本身形成圓團光場 | 只換為與水面相位一致的兩個長波 | ★★★★★ 原生三視角對照更自然；完整 GPU 數值回歸 GREEN |
| 細焦散 atlas 在水體內逐步取樣增加細碎漂動與成本 | 只將水體 atlas 項換成常數，保留海床 atlas | ★★★★☆ 單獨改善有限，不能解釋所有大光團；新長波不需要此細節來源 |

CPU 曾比較原取樣、平方加權、指數加權與兩種長波候選。它只用來提出下一個可反證 GPU probe，不是效能或最終畫質證據。平方加權在原 4 步下會增加誤差，因此未採用；也未降低任何品質級別的步數。

## 最終改動

`src/engine.js` 共用 `WATER_PHASE_GLSL`：水面原有 10 波的方向、頻率與時間公式維持一致。水體只使用其中最長的兩波，形成平滑、沿太陽方向投影且固定於世界的光場。每條視線的相位起點與變化率移到 loop 外。

移除水體內的 noise／caustic atlas 取樣，省下每條視線 8／16／24 次 atlas fetch（低／中／高品質）。這個數字是 shader 靜態工作量，並非整體 GPU 耗時的降幅。海床焦散、自然氣泡、4／8／12 步、光學衰減、光源遮擋、手電、AO、雙邊濾波與抗鋸齒都保留。

另有獨立修復：靜態陰影 cache key 現包含 render origin，避免深度或座標跨原點邊界時沿用錯誤相對座標矩陣；由 `tests/parity/shadow-origin.cjs` 的實際 `Renderer.render()` fixture 驗證，4／4 通過。

## 原生 GPU 回歸

`tests/parity/volume-stability-browser.cjs` 直接以 `Renderer.makeProgram()` 編譯 production `VOLUME_FS`。參考版本只更改積分步數與 loop 上限為 128／256，不在 CPU 重新實作光學公式。比較最終 RGBA，並以真實 scene-depth mask 排除水面、物件輪廓及鄰近邊緣；空水區 ROI 為 normalized x=.15..85、y=.48..72。全圖含遮擋邊緣的誤差另行記錄，不與空水門檻混用。

桌機：1200×800、DPR 1；固定攝影機前移／下降以及 `t=0,12.98,90`，三個品質級別共 15 案例。以下數字都是 8-bit channel code error，相對同光場的 256 步參考；不是新舊藝術外觀的差異。

| 測試 | 最大 RMS | P95 上限 | 最大 channel error | 游動殘差 RMS 上限 | 積分穩定性 |
|---|---:|---:|---:|---:|---|
| 舊版 q2，三視角 RED | 5.6173 | 7 | 9 | 1.4022 | ★☆☆☆☆ |
| 新版 q2，五案例 GREEN | 0.5592 | 1 | 1 | 0.4247 | ★★★★★ |
| 新版 q1，五案例 GREEN | 0.9467 | 2 | 2 | 0.6778 | ★★★★☆ |
| 新版 q0，五案例 GREEN | 2.8205 | 4 | 8 | 0.6431 | ★★★☆☆ |

新版 128／256 參考收斂誤差 RMS ≤0.0517；無 page error，GL error=0。q0 仍是低成本近似，沒有宣稱四步能重建所有光束細節。

另以 390×844、DPR 1 的觸控模擬完成相同三品質共 15／15 案例：全體最大 channel error 為 4，參考收斂 RMS ≤0.0509，無 page／GL error。證據：`qa/parity/volume-stability-current-touch.json`。這是觸控版畫面與積分穩定性驗證，不是實體手機效能測試。

證據：`qa/parity/volume-stability-legacy-desktop.json`、`qa/parity/volume-stability-current-desktop.json`。GPU 由 root 獨占執行；此紀錄依實際 JSON 核對。

## 完整畫面 GPU 耗時

原生 Chrome／Apple M3 Max／ANGLE Metal，同一個淺礁視角、時間、幾何、抗鋸齒與解析度，只切換新舊 `VOLUME_FS`。ABBA 每段 10 暖機幀、25 個完整 frame timer query；以下是兩段各 25 個有效樣本合併後的中位數，並非單獨 volume pass 的時間。

| 配置 | 舊版 GPU 中位數 | 新版 GPU 中位數 | 解讀 | 效能改善證據 |
|---|---:|---:|---|---|
| 桌機 1200×800、DPR 2 → 2400×1600，q2／4×MSAA | 22.103250 ms | 20.924875 ms | 此固定視角完整 frame 減少 5.331% | ★★★★☆ |
| 觸控模擬 390×844、DPR 3／cap 1.5 → 585×1266，q1／2×MSAA | 7.102000 ms | 7.097875 ms | 差 0.058%，無可辨識的效能提升 | ★☆☆☆☆ |

桌機四段皆為 141 draws／1,417,592 triangles；觸控模擬四段皆為 63 draws／407,744 triangles。兩者都保持相同內容、尺寸、品質、MSAA，GL error=0。觸控結果支持這個視角沒有觀察到新增成本，**不宣稱手機效能提高 0.058%**；視覺穩定度改善與效能改善是不同證據。這些桌機 GPU 上的觸控模擬不能代替實體手機 FPS、溫度或耗電測試，也不能外推所有海域。

證據：`qa/parity/volume-gpu-performance-current-desktop.json`、`qa/parity/volume-gpu-performance-current-touch.json`。兩份報告保存 shader hash、所有完整 frame 樣本及固定內容檢查。

## 重跑

需要可用的原生 Chrome、Playwright（可用 `PLAYWRIGHT_PATH` 指定）及含 `bc68a54` 的 Git history。不得與另一個 GPU benchmark 同時執行。

```sh
# 舊版應為 RED；只跑三個高品質視角。
node tests/parity/volume-stability-browser.cjs http://127.0.0.1:8765/ --legacy --quick
# 新版完整三品質與時間／視角測試。
node tests/parity/volume-stability-browser.cjs http://127.0.0.1:8765/
node tests/parity/volume-stability-browser.cjs http://127.0.0.1:8765/ --touch
# 分別執行，固定內容／時間／尺寸／MSAA，只切換 volume shader。
node tests/parity/volume-stability-browser.cjs http://127.0.0.1:8765/ --perf
node tests/parity/volume-stability-browser.cjs http://127.0.0.1:8765/ --perf --touch
```

效能模式採 ABBA，每段 10 暖機幀與 25 個完整 frame 的單一 timer query。禁止以逐 draw query 的總和推估 tile GPU 各 pass 成本。所有新增 GL program／mask FBO／texture 與 browser 均在 `finally` 清理。
