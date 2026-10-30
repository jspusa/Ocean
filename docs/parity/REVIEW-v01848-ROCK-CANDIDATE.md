# v0.18.48 Rock Boulder Dry 候選：獨立視覺審查

**結論：可接受為有限的岩面表面改善。** 近礁、斜視與藍燈照明下，候選具有較自然的不規則灰色礦物紋理，原有淺灰綠的水下色調仍一致。這不是整體擬真完成，也沒有解決海溝的平直牆面、直線台階、岩體輪廓或生物造型。

本審查親自以 `view_image` 檢視下列 **32 張 PNG，16 組 original/candidate 配對**。桌機原始影像為 2560×1600，檢視工具顯示為 1996×1248；touch 影像為 585×1266。沒有啟動瀏覽器、GPU 測試、影像處理或額外變體；沒有改動正式材質、shader、版本或準備工具。圖片為 root 提供的固定場景視覺比較，desktop q2、touch q1；touch 是觸控設定的直向擷取，並非實體手機驗收。

星等是對本次可見項目的主觀評分，五星最好，並非量測的真實度、效能或與 Wii 遊戲的客觀排名。

| 評估項目 | original | candidate | 從實際畫面得到的判斷 |
|---|---|---|---|
| 近礁表面自然度 | ★★☆☆☆ | ★★★☆☆ | 原版較柔滑、粉筆般均勻；候選增加不規則的細小凹痕、礦物斑紋與細脈。兩種設定都可見，但仍是簡化輪廓上的材質改善。 |
| 水下色彩一致性 | ★★★★☆ | ★★★★☆ | 候選維持淺灰、灰綠的主要色調；局部少量暖色礦物痕跡沒有形成支配畫面的橙褐色斑塊。 |
| 斜視與藍燈下的凹凸讀感 | ★★☆☆☆ | ★★★☆☆ | 前方和左右岩面增加細節層次，藍燈下尤其清楚；表面較有起伏感，但不能把法線和色差當成新增的幾何厚度。 |
| 遠景可讀性 | ★★★☆☆ | ★★★☆☆ | 整體遠景差異有限；touch 前方小石頭和礁石中景更有紋理，未見大片髒色或對比崩潰。靜態圖不能證明移動時沒有閃爍。 |
| 大面積鋪排的自然性 | ★★★☆☆ | ★★☆☆☆ | 候選提高紋理辨識度，也讓 hadal-wall 的重複圖案更容易辨認；這是實際可見的取捨。 |
| 深海壁面局部細節 | ★★☆☆☆ | ★★★☆☆ | 頭燈照到的牆面與台階有較清楚的灰色細脈和斑駁；大尺度平面與直線邊界仍很人工。 |
| 海溝岩層輪廓與形狀 | ★☆☆☆☆ | ★☆☆☆☆ | 大牆、台階與轉角沒有改善，不能以本次表面更新宣稱自然岩層或壓迫感已完成。 |
| 泥沙與暗處保持情況 | ★★★☆☆ | ★★★☆☆ | cut-bottom 的可見泥沙沒有察覺改變；兩個 slope 視角的泥沙仍清楚。暗牆沒有新出現的大面積全黑，但原有低照明仍限制判讀。 |
| 本次有限表面改善的整體價值 | ★★☆☆☆ | ★★★☆☆ | 近礁的改善足以辨認，且沒有新的阻擋性視覺退步；尚不足以支持「超級擬真」或完成整體目標。 |

**逐項觀察與限制**

近距離 home-near 的中央岩體被海扇遮擋，因此本審查沒有只憑這個鏡頭評斷。desktop 前方側邊岩面、兩種設定的 home-oblique 與 home-blue-lamp 提供更完整的露出面積。候選在這些位置保留岩體的大形體明暗，增加大小不一的礦物斑紋。沒有看到新的開裂洞口、分離邊緣或大片不合環境的色塊；這只是所列靜態視角的觀察，不能代替碰撞與接觸驗證。

home-far 的大尺度構圖幾乎不變。候選在中景和前方小石頭上略多細節，尤其 touch 可辨認；沒有足夠證據宣稱遠距畫質有顯著提升。海床、礁群輪廓與環境疏密仍是現有版本的外觀。固定影像無法審查移動中的 mip 切換、閃爍、卡頓或黑色閃屏。

hadal-wall 是本次最重要的限制：desktop 下相似深色礦物形狀在寬牆上重複；touch 左側同一形狀在畫面上下兩段再次出現，水平台階兩側的圖案也容易對照。候選雖然增加細節，但大平面因此更容易看成鋪了同一張材質的牆。**此項列為非阻擋的表面取捨與後續必修項，不視為已解決。** 就這一有限更新而言，近礁的明確收益及未見廣泛色彩、照明退步，仍支持接受；若目標是驗收自然海溝岩層，則本組畫面不合格。

cut-bottom 兩個設定都只有受光泥沙表面，肉眼未見差異；不能用它證明新岩材更真實。slope-mud 的前景泥沙、遠方小生物與底部明暗保持一致，右上方岩壁的候選紋理略更可見。slope-arrival 大面積牆壁原本就很暗，候選變化細微，這組沒有足夠可見資訊給岩面品質加分。兩組 slope 仍保留生硬的直牆形狀。

**確切影像清單**

所有影像位於 `qa/parity/v01848-rock/visual-initial/`。以下列出實際檢視的完整檔名；每列即同一設定與固定視角的配對。

| 設定／視角 | original 檔名 | candidate 檔名 | 配對判斷 |
|---|---|---|---|
| desktop／near | `desktop-home-near-original.png` | `desktop-home-near-candidate.png` | ★★★☆☆：側面岩質提升，中央遮擋限制觀察。 |
| desktop／oblique | `desktop-home-oblique-original.png` | `desktop-home-oblique-candidate.png` | ★★★☆☆：較自然的細節，輪廓仍簡化。 |
| desktop／blue lamp | `desktop-home-blue-lamp-original.png` | `desktop-home-blue-lamp-candidate.png` | ★★★☆☆：岩質更可讀，保留主色。 |
| desktop／far | `desktop-home-far-original.png` | `desktop-home-far-candidate.png` | ★★★☆☆：有限差異，未見明顯退步。 |
| desktop／hadal wall | `desktop-hadal-wall-original.png` | `desktop-hadal-wall-candidate.png` | ★★☆☆☆：局部細節增加，重複鋪排與平牆仍明顯。 |
| desktop／cut bottom | `desktop-cut-bottom-original.png` | `desktop-cut-bottom-candidate.png` | ★★★☆☆：泥沙肉眼無明顯差異。 |
| desktop／slope arrival | `desktop-slope-arrival-original.png` | `desktop-slope-arrival-candidate.png` | ★★☆☆☆：牆面太暗，無充分改善證據。 |
| desktop／slope mud | `desktop-slope-mud-original.png` | `desktop-slope-mud-candidate.png` | ★★★☆☆：泥沙保持，右側暗牆細節略增。 |
| touch／near | `touch-home-near-original.png` | `touch-home-near-candidate.png` | ★★★☆☆：細節可見，海扇遮擋顯著。 |
| touch／oblique | `touch-home-oblique-original.png` | `touch-home-oblique-candidate.png` | ★★★☆☆：直向畫面仍有可辨的岩質改善。 |
| touch／blue lamp | `touch-home-blue-lamp-original.png` | `touch-home-blue-lamp-candidate.png` | ★★★☆☆：局部凹凸與灰色紋理更清楚。 |
| touch／far | `touch-home-far-original.png` | `touch-home-far-candidate.png` | ★★★☆☆：中景、小石頭略有細節，沒有大片異色。 |
| touch／hadal wall | `touch-hadal-wall-original.png` | `touch-hadal-wall-candidate.png` | ★★☆☆☆：上下重複圖案清楚，平面感未解決。 |
| touch／cut bottom | `touch-cut-bottom-original.png` | `touch-cut-bottom-candidate.png` | ★★★☆☆：泥沙肉眼無明顯差異。 |
| touch／slope arrival | `touch-slope-arrival-original.png` | `touch-slope-arrival-candidate.png` | ★★☆☆☆：背景很暗，不能據此提高岩質評分。 |
| touch／slope mud | `touch-slope-mud-original.png` | `touch-slope-mud-candidate.png` | ★★★☆☆：泥沙保持，暗牆局部細節更可見。 |

**候選身分與技術邊界**

本次來源是 [Poly Haven Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry)，攝影 Dimitrios Savva、處理 Rico Cilliers，依 [Poly Haven CC0 授權](https://polyhaven.com/license) 使用。官方 [info metadata](https://api.polyhaven.com/info/rock_boulder_dry) 的取樣面積約 1.8 m；來源是風化岩面素材，沒有證據可稱為石灰岩礦物鑑定或水下掃描。保留現有投影時，實際遊戲紋理尺度並不等於來源取樣尺度。

準備檔是 `qa/parity/v01848-rock/prepared/rock_diff.jpg` 與 `rock_nor_gl.jpg`，各 1536×1536，合計 **1,521,112 bytes**，比原正式配對的 2,215,377 bytes 少 **694,265 bytes（31.34%）**。來源核對、固定一次編碼、法線重新正規化及雜湊記錄見 `qa/parity/v01848-rock/prepared/receipt.json` 與 `ASSET-PREVIEW.md`。本審查沒有重跑編碼或做第二輪壓縮搜尋。

較小的檔案與圖片尺寸不是效能量測。非完整材質的既有行動路徑會把兩種來源尺寸都縮至 1024，因此不能宣稱手機材質常駐記憶體一定變小。這份視覺意見也不替代 root 負責的來源指標恢復、場景狀態、提交非空、材質載入、接觸／碰撞不變與正式發布驗證。

本次未發現足以否決有限表面更新的新增視覺問題。下一步的岩層擬真工作仍需處理大尺度形狀和可辨識的鋪排重複；這些是後續建議，未包含在本次接受範圍，亦未在此審查中實作。
