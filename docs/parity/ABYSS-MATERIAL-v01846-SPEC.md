# v0.18.46 深海生物表皮與法線契約

範圍：`kind10` 的腔棘魚27、吞鰻29、駝背鮟鱇30。基準為 `5c43505718075b164e05039d3ad926df02d869b6`。本規格不以材質數值測試取代全動物畫面、正常探索與實體手機驗收。

## 預期行為

頭燈照到深海魚時，表面應呈現物種相符的斑塊、鱗片或細小皮紋，光澤隨表面移動與旋轉。自然黑色魚仍為黑色；口腔內襯、眼、牙齒與誘餌不應被通用魚皮覆寫。鰭形狀及鰭根連續性由幾何規格負責，本規格負責材質與既有動畫的法線一致性。

| 物種 | 表皮層次 | 保護部位 | 本輪優先度 |
|---|---|---|---|
| 腔棘魚 | model-local 不規則淡斑、厚鱗邊、薄的鰭面細節 | 眼、暗色嘴線與鰓線；先抵消個體tint再判定外皮，不能依已染色的maxRGB覆寫暗線 | ★★★★★ |
| 吞鰻 | 黑色外皮的有限張力紋、低幅粗糙度變化 | tag2口腔、tag4小眼、tag6尾燈、亮色牙齒 | ★★★★★ |
| 鮟鱇 | 深褐黑的不規則微細起伏，避免套腔棘魚鱗片 | tag2口腔、tag4眼、tag5誘餌柄、tag6發光端點、亮色牙齒 | ★★★★☆ |

材質 profile 原已正確供應。本輪保持三者原始 roughness/subsurface/patternScale，僅在 profile 套用後加入有限的物種粗糙度偏移。眼維持 roughness .12，吞鰻與鮟鱇口腔分別 .72/.81；口腔材質語意從tag1分離為tag2。鮟鱇tag變更不得改位置、法線、顏色、UV、索引或數量。

不新增貼圖、sampler、render pass、透明混合、coverage mask或全景曝光。不更動全域頭燈衰減、fog或水體光線吸收。quality0保留中低頻外觀與粗糙度，quality1/2允許依螢幕足跡淡出的微細法線。

腔棘魚的白斑使用兩次model-local value-noise取樣（cloud/flecks），吞鰻/鮟鱇也各使用兩次（grain/coarse）；body仍保留原共用profile的一次噪聲，所以body路徑共有三次原始碼noise呼叫，fin沒有這次共用profile噪聲。這些是固定數量、無新增貼圖與FBM迴圈的ALU運算；不以source呼叫數宣稱實際GPU成本。嘴線/鰓線保護允許原共用profile的±1.75%色彩變化，不能把新的白斑混色算成既有噪聲而放過。

## 變形及導數契約

- 保留 v45 的所有 kind10 位置映射；只補27/29平滑包絡線導數、27鰭變形normal、30誘餌雙向shear與30鰭normal。
- 27鰭的第二段剪切使用第一段變形後的 z，法線的變換順序必須與位置一致。
- 其他 kind 的 VS 不變。
- 顏色/高度使用變形前 model-local座標；高度梯度透過 `materialSurfaceNormal` 運送到真正變形後的表面。不能將 model-local方向直接加到world normal。
- height保持解析場；screen-footprint attenuation在gradient求值之後作為strength。所有tag分支重合後再呼叫normal helper。
- specular variance使用原始幾何法線，避免對由導數形成的normal再求導數。
- `importedFishShaderSources()` 的嚴格replacement anchor須同步更新。只編譯目標深海shader不足以證明相容。

## CPU 持續回歸

命令：

```sh
node tests/parity/abyss-material.cjs --out=qa/parity/v01846-material/source-contract.json
```

測試從真正 `VS` 以括號配對抽出完整 `if(uKind==10)` 區塊，只將scalar宣告型別改為JavaScript宣告，並綁定等義的scalar math；物種算式、條件、先後順序直接來自production。若出現目前adapter不支援的vector/matrix、迴圈或外部函式，測試拒絕執行，須先審查adapter。這是CPU double語法執行，不是GLSL float32執行。

實際 `faunaGeometry` 產生三物種兩個LOD。每個真實頂點的原位置、normal及tag皆來自該mesh；以tag分層取樣，在原始normal的獨立正交切平面上做中央有限差分，使用production算式的**位置輸出**建立參考normal。沒有第二份手寫「正確物種normal公式」。所有真實唯一頂點另以兩種effort及四種phase，比較現行與固定v45 production的實際位置輸出，必須完全相同。

| CPU gate | 固定規則 | 證據強度 |
|---|---|---|
| 實際source adapter | 只轉宣告型別與scalar math；不支援語法明確拒絕 | ★★★★★（source路徑） |
| 位置保留 | 全真實唯一mesh頂點、effort .08/1、phase 0/.93/2.27/4.91，與固定基準的最大差=0 | ★★★★★（CPU算術） |
| 法線有限差分 | 六個mesh、按tag最多72個真頂點、effort .08/1、16個phase；最大normal component error <3e-6 | ★★★★★（CPU算術） |
| 門檻反例 | 固定v45與刪除production normal賦值，皆須被同一法線門檻拒絕，且三物種各有反例 | ★★★★★（防空測） |
| 原profile與imported path | 執行真實speciesUniforms及imported shader generator，不只搜尋宣告字串 | ★★★★☆ |
| tag2保護 | 執行實際body/fin predicate；tag2/4/5/6不得進入；擴大body上界的負對照必須錯誤接納tag2 | ★★★★☆（source語意） |
| 嘴線/鰓線保護 | 受限AST直接讀取production的skin RHS及base=mix RHS；實際兩LOD解剖區域強暗線mask=0、正常body/fin=1；9組tint下強blotch不改暗線色；原maxRGB predicate必被同門檻拒絕 | ★★★★★（CPU材質算術） |
| native三角fixture | 用與原生測試同一selector，在實際六個mesh取出24種tissue/LOD三角；不得空測 | ★★★☆☆（尚非像素） |

`h=max(0,y-.19)`在精確折點沒有雙側導數，若實際選樣落在此邊界則逐筆計數揭露，不拿不存在的中央導數做通過證據；目前回歸未排除任何樣本。

材質AST只允許此遮罩/混色所需的scalar與vec3逐分量算術、swizzle、max、smoothstep與mix，不手寫替代predicate。正式四組phenotype極值外，再加入中性與四組正值stress tint；使用Float32頂點色、Float32 tint與原本vColor最低值。這不宣稱zero tint經clamp後仍可逆。強嘴線/鰓線頂點由獨立解剖座標挑選，並保留兩側、原始顏色範圍與反例，不以當前shader mask結果選樣。

## 原生材質數值驗收

此測試由root序列執行，避免與其他GPU工作互相干擾。需先重建compiled資產；否則實際VB/IB與現行builder不符應明確失敗。

```sh
node tests/parity/abyss-material-browser.cjs --url=http://127.0.0.1:8765/ --out=qa/parity/v01846-material/native-material.json
```

測試讀取真正streamed魚體的VB/IB，與現行 `indexGeometry(faunaGeometry(...))` 核對全部頂點及索引。三角選擇依部位tag、解剖位置、非退化形狀，嘴線另使用原始頂點的強暗色標註（兩個raw blue<.21的嘴線頂點，中心raw blue<.25）；兩LOD採相同規則，不依輸出的材質值或通過結果換三角。每個診斷三角保留原始36個浮點頂點詞與原本instance phenotype。原版VS透過transform feedback輸出真正姿態，據此放置可覆蓋該三角的鏡頭；以三角在鏡頭兩軸的各自範圍設置orthographic projection，避免細長鰭被正方形鏡頭壓縮到沒有內部像素。小眼睛使用相同規則，不以整隻魚鏡頭造成空白。CPU預檢另以16個phase及兩種effort確認24種fixture均有足夠內部投影樣本，這仍不是實際像素驗證。

FS只新增診斷輸出，在final profile/roughness套用後、lighting輸出前返回base、normal、geomN、vLocal、roughness、raw vColor，使用RGBA32F。沒有替代材質公式。動物與鏡頭共同旋轉identity/yaw90/pitch90，檢查相同解剖位置的像素。

| 原生矩陣 | 數量 / 規則 | 驗收優先度 |
|---|---|---|
| 物種/LOD | 27、29、30各high/low，共6個真正buffer | ★★★★★ |
| body/fin | 每物種、LOD各t=0與2.13，quality0/1/2 | ★★★★★ |
| eye | 每物種、LOD的t=0，quality0/1/2 | ★★★★★ |
| oral tag2 | 29/30各LOD的t=0，quality0/1/2 | ★★★★★ |
| mouth tag1 | 27各LOD的t=0，quality0/1/2；中央pixel原色抵消tint後blue<.265，最終色僅可有既有profile噪聲的變化 | ★★★★★ |
| 共同剛體旋轉 | identity對yaw90及pitch90，共216筆比較；另核對完整語意矩陣，不能只看總數 | ★★★★★ |
| 非空像素 | 中央12×12範圍、侵蝕2pixels後每筆≥16有效像素；相同vLocal最大差<3e-5 | ★★★★★ |
| 表面變化 | q1/2每body/fin witness需有可量非零normal差，q0不得有bump；避免全被關掉也通過 | ★★★★★ |

旋轉門檻採既有turtle numerical diagnostic量級：geometry normal與unit normal誤差<.0002、base/roughness/normal P95差<.008。口腔/眼的normal與原色保護門檻<.00002。這是數值回歸門檻，不是「肉眼無差」或擬真評分。失敗不得透過放寬門檻、丟掉樣本、換鏡頭或重試取好結果掩蓋；修正前後保留報告。若執行中失敗，保留已完成rows/geometry及當時fixture。

## 原生全場景與成本界線

數值通過後，仍需使用正常世界中的相同生物、光照、曝光與鏡頭做整隻魚視覺審查，包含移動時的鱗紋、暗口腔、鰭根、LOD切換與燈關閉。近距微細normal不可變成砂紙、金屬片或規則棋盤。尤其9cm鮟鱇的normal幅度與吞鰻黑色層次需看實際世界。

未新增texture/pass或CPU測試通過，都不代表GPU更快。若要宣稱成本降低，另做固定環境受控量測；沒有timer就報未量測。桌面上的quality0/1/2或觸控模擬不等於實體手機耗電/效能驗收。

生物依據：[NOAA腔棘魚](https://www.fisheries.noaa.gov/species/african-coelacanth)、[Australian Museum吞鰻](https://australian.museum/learn/animals/fishes/pelican-eel-eurypharynx-pelecanoides/)、[MBARI鮟鱇觀察](https://www.mbari.org/news/amazing-black-sea-devil-anglerfish-observed-in-monterey-bay/)。未從其他超黑物種研究挪用精確反射率；粗糙度與皮紋幅度是作者近似。
