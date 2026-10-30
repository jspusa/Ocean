# v0.18.49 turtle contract notes

狀態：原始碼核對筆記，尚未指定新版模型、UV 或 rig 契約。Root 正調查創作者授權的完整海龜模型能否合法取得；該路徑的取得、授權、素材內容與可用性仍待確認。本筆記不將既有 procedural 模型當成已選方案，也不以較容易通過舊測試作為模型選擇依據。

本輪只讀現有測試與 production 原始碼，未執行 CPU 測試、GPU、browser 或 build，未修改 production，也未建立 `turtle-v49-contract.cjs`。下列行號以本輪讀取時的檔案為準。

## 已確認的驗收缺口

| 項目 | 現有證據 | 新版必須處理的契約 | 優先度 |
| --- | --- | --- | --- |
| 完整划水週期 | `tests/parity/turtle-rig-browser.cjs:12–16,27` 每個 LOD／分類抽樣約 60 個頂點，只看 `[0,.4,1.2,2.6,4.5]` 五個時刻；最晚時刻超過一個週期不等於連續覆蓋該週期 | 對兩個實際 LOD 的完整頂點集合，用實際 production VS 做固定完整週期取樣，記錄起終點閉合、位置／法線有限性、剛性部位、根部固定與變形範圍；保留獨立切線法線 oracle | ★★★★★ |
| 實景連續動作長度 | `tests/parity/turtle-render-browser.cjs:60–68` 的 120 幀跨約 2 秒；`src/engine.js:126–131` 的現有頻率為 1.45 rad/s，週期為 `2π/1.45 ≈ 4.33 s` | 實景動作覆蓋至少一個已宣告週期，含起終點；時間、相位、動畫來源和有限取樣步距都要記錄。新 rig 不一定使用現有頻率 | ★★★★★ |
| 海床／水面垂直範圍 | `src/individuals.js:64–66` 的 turtle `bodyY` 固定 `.31`，與新模型實際高度可能不同 | 依新版所有 LOD、完整動畫及實際 pose／scale 驗證垂直範圍；不可因球形 rock envelope 足夠，就推定 floor／ceiling clearance 也足夠 | ★★★★★ |
| 視錐裁切範圍 | `src/engine.js:1564–1567` 的 kind 2 直接用靜止 `b.radius × max(scale)`；該分支沒有加入現有划水位移 | 對實際 renderer 使用的 cull bound 獨立驗證完整動畫包絡，並檢查視錐邊緣不會在四肢仍可見時提前移除整隻動物；contact envelope 不能替代 cull bound 證據 | ★★★★★ |
| 全身 UV／atlas | `src/engine.js:33` 預設 UV 是位置 xz；舊材質 `:627–673` 多依 vLocal／tag 重新投影。現有 anatomy 測試沒有全身 UV 驗收 | 待正式模型契約後，驗證各部位 island、方向、三角形 UV 面積、跨 island 行為、seam／pole 例外、gutter／mips／wrap，以及實際完整 color atlas 使用 | ★★★★★ |

## 解析完整週期的注意事項

「涵蓋完整週期的有限取樣」與「對所有連續相位成立的上界」是兩種證據。即使取樣含週期兩端及四分之一週期，也不能宣稱已檢查所有中間時刻；更不能用五張姿態或兩秒實景代替完整 rig 驗證。

若仍使用本輪讀到的 kind 2 rig，對單一靜止頂點有：

```text
w = smoothstep(.51, 1.45, abs(z)), 0 <= w <= 1
delta_x = -.07 * cos(beat) * w
delta_y =  .37 * sin(beat - .7 * abs(z)) * w
delta_z = 0
||delta|| <= w * hypot(.07, .37)
||posed_vertex|| <= ||rest_vertex|| + w * hypot(.07, .37)
```

這個三角不等式界對所有 beat 相位成立，包含空間相位差；它是保守上界，並非精確最大值。旋轉保持長度，非均勻縮放可由最大 scale 分量界定。因此可對兩個 LOD 的全部實際頂點取得局部全相位球形界，再對每個實際 instance 的 scale 驗證。必須確認驗證的 shader 與包絡公式相符；不能把另一套 CPU 動畫當作 production VS 已正確的證據。

現有 `src/individuals.js:35–66` 從實際 batches 取各動物最大靜止 radius，kind 2 加上 `hypot(.37,.07)`，再乘最大 instance scale 並加 `.012`。這條路徑能隨新靜止幾何擴張，但固定垂直基準及 renderer 的 cull radius 是不同的所有者，仍須各自驗證。若新版 rig 改成骨架、skin weights、多個不同頻率或創作者動畫，上述常數與單一週期立即失效，應根據實際 rig 重新宣告合法動作範圍、週期／clip 邊界與保守包絡，不沿用舊公式。

建議將 native transform feedback 的有限取樣與解析／保守包絡互補使用。前者應直接處理實際上傳的完整兩個 LOD、實際 production VS 與實際 instance 屬性，檢查非有限值、法線、剛性／附著關係和週期閉合；後者負責覆蓋離散取樣之間的安全範圍。若只能提供取樣證據，報告須如實寫成取樣，不可聲稱解析證明。

## 可重用的測試接縫

| 現有接縫 | 可保留的內容 | 必須去除或更新的舊假設 | 適用度 |
| --- | --- | --- | --- |
| `turtle-anatomy.cjs:11–39,129–155` | 真實三角形 ray、位置焊接、連通分量、邊計數、有限值、單位法線、非退化與一致繞向 | 舊 tag／座標分區、cap 座標與特定光滑 rim 定義。UV seam 可有多份頂點，拓撲焊接應按位置，不能要求 seam 上 UV 相同 | ★★★★★ |
| `turtle-anatomy.cjs:56–83` 的 contact oracle | 使用閉合真實三角面、正距離內球，證明附屬部件正體積接合；移開同一眼睛作負控制 | 舊眼球／眼瞼／鼻孔橢球中心與尺寸、頭部固定 bounds。內部接合不代表外觀可見；舊 oracle 已明確區分鼻孔完全埋入的情況 | ★★★★☆ |
| `turtle-rig-browser.cjs:29–45` | production VS transform feedback、有限位置／法線、獨立微分切線法線檢查 | 抽樣頂點、五個時刻、固定 `.51` 根部、`.37` 位移及舊 fin 分區；新 rig 必須使用新契約 | ★★★★☆ |
| `turtle-render-browser.cjs:19–32` | 真實 compiled/uploaded VB／IB 與當前來源對照，索引 exact、浮點誤差明確記錄 | LOD 不應以固定頂點數或 index count 唯一識別；外部模型應核對其正式 owner 的 source／derived manifest 與實際 buffer，不能硬呼叫 procedural builder 當標準 | ★★★★★ |
| `turtle-render-browser.cjs:38–58` | 實際世界的正面、側面、背面、腹面、斜面及遠距影像；確認動物有提交且相機不在岩石內 | 舊 offset、放大 FOV 與 near plane 是展示配置，不能代替一般遊玩視角；新模型要事先定義合理鏡位並揭露設定，不可為遮瑕任意改燈光／尺度 | ★★★★☆ |
| `animal-rock-contact.cjs:8–57,75–86` | 實際 archive 岩石 catalogue、原始世界 update、全身 rock envelope、連續移動、時間跳轉、重入與 bounded query work | 必須讀新版 compiled bytes；不能拿舊 archive 的海龜驗證新 source。現有六相位 CPU 動畫抽樣須更新或由正式 rig 上界補足 | ★★★★★ |
| `turtle-material-browser.cjs:48–95` | 真實上傳三角形、實際 instance／texture、production shader 的 pre-lighting 診斷接縫 | 舊 head／shell／fin 固定座標、九張貼圖與 MIRRORED_REPEAT 斷言、僅三個部位。需依完整 atlas／owner 契約更新，且數值材質測試不等於完整外觀接受 | ★★★★☆ |

`turtle-anatomy.cjs:167–183` 的固定 v44 attributes hash、`1.719214937115194` 半徑、舊三角形／記憶體上限及限定 `turtleGeometry` 變更範圍，是舊版小修的界線，不能直接變成 v49 完整重製的規格。新版應事先宣告合理預算，保留 baseline／candidate 的實際三角數、bytes、textures、passes 與載入成本比較；不為通過舊數字縮小解剖範圍。

## 待正式模型與 UV 契約後的驗收原則

1. 先確認來源、授權／署名、合法原始下載、原始／衍生檔 hash、轉換工具與版本。外部模型若可用，沿用 Barramundi 類型的正式 owner 流程，保留載入、失敗恢復、資源生命週期及來源尺度契約；本筆記沒有確認該資產已取得。
2. 定義實際部位／island 識別、UV rect／方向、合法 seam／pole、gutter、sampler 與 mip 政策。檢查所有實際三角形，不能只憑 atlas 圖看似完整或三個局部樣本就聲稱全身覆蓋。閉合或被可靠埋入的開口應按實際模型設計宣告；不能把所有重疊分件一律視為單一 watertight mesh。
3. 保留有限數值、非退化、正常 winding／法線、可信外露表面與附著證據。雙側肢體、頭頸、眼睛、腹甲和尾部都須有可識別的驗收範圍；貼圖細節不能掩蓋分離、破洞或輪廓問題。
4. 針對實際 rig 宣告 clip／頻率、權重／關節與合法姿態範圍；完整兩個 LOD 的有限週期取樣、解析／保守 contact bound、垂直 bound 與 cull bound 分開驗證。若採 imported pipeline，其 render kind／owner 可能改變，不把 kind 2 寫死成新測試前提。
5. 在實際新 compiled 世界或正式 imported owner 上核對 geometry／material 身分，使用真實岩石 contact、一般遊玩 camera，以及固定解剖檢視鏡位。LOD handover 依真實門檻、相機 FOV／解析度與 instance scale 驗證輪廓及 atlas 延續；不可直接照搬舊模型的 14m／1.12／1080px 假設。
6. 維持桌面與觸控模擬的自動畫質進入流程，將受控凍結檢查、效能量測及正常遊玩分開。外觀接受需要實際看完整姿態與連續動作；不得由數值測試推論超越商業遊戲、實體手機、電池續航或完整擬真目標已完成。

下一步只等待 root 選定合法可用模型、完整 UV／材質與 rig 契約；本文件不預先建立會迫使實作回到舊 procedural 外形的測試。
