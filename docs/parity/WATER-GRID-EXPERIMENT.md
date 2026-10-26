# 未採用：共用水面頂點實驗

固定公開基準為 0.18.29 `4a3d9851ed4db525a52185f5d4f306f21ea05764`。候選 engine SHA-256 `db3b1786f0e2f82918f9d7171d405b2e2ac3a05d4d8661f83682e6c67169a0c2`，將展開水面改為共用頂點／Uint16 索引，三角形順序、完整 Float32 座標及所有 shader 保持一致。這個候選沒有發布，已恢復原幾何與配套 fixture；後續深海剔除為獨立實驗。

| 初始化資料 | 基準 | 索引候選 | 證據範圍 |
|---|---:|---:|---|
| 桌機 vertex＋index bytes | 903,168 | 303,756 | ★★★ 實際正式上傳資料 |
| 觸控 vertex＋index bytes | 294,912 | 99,852 | ★★★ 實際正式上傳資料 |

資料儲存下降未能轉化為可信的普遍 GPU 改善，故不採用。CPU 實際上傳契約有效 RED→GREEN；七個受影響 suite 共 47／47 通過，但不是效能證據。

全部原始資料在 `qa/parity/v01830-water-grid/`。`rejected-candidate/` 保存完整 patch、來源、測試、文件與逐檔雜湊；重現時須在隔離 checkout 套用 patch，將保存的兩個新測試放回其原路徑，不能對後續不同程式直接套用結論。

| 原生 run | 計時／完整 RGBA | 結果 |
|---|---|---|
| desktop-probe | 400 樣本／未開始圖像 | ☆ 深海 readiness 要求錯誤，逾時；原始資料保留 |
| hadal-readiness | 像素定向 | ★ 修正測試後通過；正式 sunless 可合法保留 pending shadow |
| desktop-final | 1,800 樣本／36 張完全相等 | ★★ 通過像素，GPU 多數差異弱或受順序影響 |
| touch-final | 1,800 樣本／未開始圖像 | ☆ 重訪駐留集合不同；below-window 20／25 組變慢，保留疑點 |
| touch-canonical | 1,800 樣本／36 張完全相等 | ☆ 清理失敗；below-window 較慢降為 14／25 組且先後順序翻號，無穩定收益 |
| cleanup-diagnostic | 不計時／8 張完全相等 | ★ 小範圍重現清理成功，GL 0；不能消除前次失敗或確認其原因 |

canonical 測試透過正式 loader 預載完整 keep 範圍並等駐留集合穩定，不是自然串流成本測量。與舊 preparation 的負載不同，不能混合樣本。下表為 25 組八幀平衡樣本的候選減基準平均 GPU ms；正數較慢，僅描述本機資料。

| 視角 | desktop-final | touch-canonical | 解讀 |
|---|---:|---:|---|
| initial-spawn | -0.111 | -0.058 | ★ 波動 |
| below-window | -0.114 | -0.028 | ★ 觸控組差中位仍 +0.329 ms，順序翻號 |
| up-through-window | +0.406 | -0.005 | ★ 桌機有時間漂移 |
| down-at-reef | -0.336 | +0.000 | ★★ 桌機局部改善，觸控近零 |
| above-surface | -0.139 | -0.099 | ★ 改善傾向 |
| hadal | +0.173 | +0.070 | ★ 退步傾向 |
| hadal-up | -0.089 | +0.003 | ★ 不穩定 |
| origin-before | -0.100 | +0.029 | ★ 波動 |
| origin-after | -0.092 | -0.041 | ★ 波動 |

不能採用單一中位百分比（例如桌機 down-at-reef 的 -14.45%）作為普遍改善；平衡組差的對應幅度較小。所有數據均為同一台 Apple M3 Max／原生 Chrome，觸控只是 viewport／輸入模擬，沒有實體手機、耗電或自然遊玩 FPS 結論。

原 full-run 清理錯誤的第一個數值 GL code 當時未被保留。後續補上各階段錯誤與初始 handle 有效性診斷，小範圍重現時初始 ARRAY_BUFFER 仍有效且還原成功。因此「串流退休初始 buffer」只是假說，未確認為產品缺陷或既有黑閃的原因。失敗版 harness 及失敗收據未覆寫。
