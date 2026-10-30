# 深海新潛次配置設計（待納入，非已實作）

基準：`dbd54ec34adcdad177014d01d3536197ea21fb59`，v0.18.44。這份研究只讀正式 source 與既有 `assets/reef.mesh.gz`，沒有改 production、建模、GPU、build 或部署。目標是同一趟位置穩定，下一趟的實際棲地有差異，保留可完成的導覽與調查。

## 已重現的缺口

最小入口：`node qa/parity/v01845-deep-variation/minimal-production-red.cjs`。預期 exit 1；JSON 位於同資料夾 `minimal-production-red.json`。使用正式 archived actors、`oceanFeatures` sanitize/reset/prepareDive 與正式 `oceanEncounters`；只替代入口亂數來源與 UI 副作用。讀 archive，不生成 geometry。

| 契約 | 目前證據 | 評級 |
|---|---|---|
| 新潛次真的改變深海配置 | seeds `123456789 / 987654321`，13 種、29 個體的 home/center/phase/orbit/homeYaw/radius/presence 全相同；自由浮游的有效配置變化為 0 | ★☆☆☆☆ RED |
| 同潛次重播 | resume、reset、JSON feature reload、途中修改 waypoint 後配置相同，總 entropy 仍只有 2 次 | ★★★★★ 已測 |
| 導覽、常駐可用性 | 8 個 guide 全在；13 種與 3 個深站代表物種皆存在 | ★★★★☆ 已測資料契約，未實游 |
| 穩定身份與資源數 | 379 life、62 decor、380 shoal、509 batches、3725 nodes 未增加，UID/scale/bio fields/範例照片引用不變 | ★★★★☆ 已測資料契約 |
| 新位置碰撞、動線、實機感受 | 本輪未產生新候選位置，也未跑動畫全包絡、導覽實游或 GPU | ☆☆☆☆☆ 尚未驗收 |

此 RED 只有 1 個預期失敗、6 個保護契約通過。它證明目前沒有變化，**不是未來候選位置安全或完整遊戲生命週期的驗收**。60 次 `afterLife` 呼叫只證明此 owner 沒有在該 hook 重抽配置，不是 60 次正式 render/motion frame。

## 單一 owner 與實際相依

| Owner / 消費者 | 現況與設計責任 | 適配度 |
|---|---|---|
| `src/encounters.js`: `prepareDive/apply/original` | 唯一抽 seed/套配置 owner。真正新潛次取一次 entropy，resume/init/reset 重播。擴充 baseline 以拷貝原始 home/center/homeYaw/radius/floor/ceiling；每次先恢復 baseline，再套絕對候選，禁止位移累加 | ★★★★★ 優先切入 |
| `src/voyage.js`: `startDive` | 已以 `resume:!!resume` 呼叫 feature lifecycle。先 legacy entry，再 prepareDive，再 startDive/save。不要新增第二套新潛次判斷或讓跳地標、開圖鑑重新抽 seed | ★★★★★ 保留 |
| `src/deepsea.js`: `deepseaEncounters / itinerary / beginTravel` | 目前讀 frozen authored gate/home；到 gate 後才用 encounterId 找 live actor。若直接搬 guide，可能無法 approach 而跳過該站 | ★★☆☆☆ guide 變動前須整合 |
| `DeepseaRules.swimScale` | 現在依 authored habitats/encounter homes 減速；新 home 若離原點太遠會錯過觀察減速區。應讀 owner 已套用的 deep home 快取，取代相應固定 home，不增加逐 frame actor 掃描或配置分配 | ★★★☆☆ v45 必要相依 |
| `src/voyage.js`: `voyageDestination('habitat:*')` | 已讀 live `f.home`，所以換 home 可反映地圖。但目前取第一個 species，未排除 absent/ecologyPresent=false；若變動 presence 會標到缺席個體 | ★★★★☆ 全員存在時可直接沿用 |
| `src/story.js` | `living-dark` 要求 coelacanth 與 giant_squid；hadal 要求 mariana_snailfish。現 encounters protection 沒讀 story；不能假定 accepted mail 已涵蓋 story | ★★☆☆☆ 必須保留代表或擴充快照 |
| `src/individuals.js` | abyss/trench path cache 檢查 home/radius，contact cache 用 encounterEpoch。home 改變可自然失效；floor/ceiling、center、路線方向也必須成套套用 | ★★★★☆ 可沿用，有配對條件 |
| `src/seasons.js` | `encounterPresent AND calendar`，owned companion 覆寫。配置後 `sync(true)` 已由 encounters 執行；不要建立第二個 visibility owner | ★★★★★ 保留 |

## 角色劃分與首輪範圍

下面是對現有 29 個體的互斥設計分類；不是新增動物。story-resident 是本設計保護角色，並非目前 runtime 已有欄位。

| 類別 | 現有數量 / 身份 | 首輪新潛次規則 | 達成需求 |
|---|---|---|---|
| 必達導覽 | 8：giant-squid-pass、pelican-pass、mud-fauna-pass、oarfish-pass、frilled-shark-pass、barreleye-pass、tripod-fish-pass、dumbo-octopus-pass | home/gate/route/presence 全維持。保留 encounterId 與 guide.passed | ★★★★★ 可找到；變化 ★☆☆☆☆ |
| 深站常駐 | 6：vampire_squid-001/002、sea_pig-001/002、mariana_snailfish-001/002 | 原棲地全保留，保障 observationTarget 與獅子魚調查 | ★★★★★ 可找到；變化 ★☆☆☆☆ |
| 故事常駐代表 | 2：coelacanth-001、giant_squid-001 | 保留目前故事敘述約 216 m / 680 m 與第一個 habitat 目的地，永不缺席 | ★★★★★ 低風險 |
| 自由浮游個體 | 6：coelacanth-002、pelican_eel-001/002/003（後者為 upper-pelican）、humpback_anglerfish-001/002 | 從同一深度帶、同一地貌附近的預驗證候選 home/route 取配置；全部仍存在 | ★★★★★ 首輪實質變化來源 |
| 自由底棲個體 | 7：japanese_spider_crab-001/002、sea_pig-003/004/006/007/008 | 首輪保持接地原位。未完成腳部/台地支撐證據前不搬移，也不靠拉高 y 偽裝可用 | ★★★★★ 保住接地；變化 ★☆☆☆☆ |

這是可評審的小切片，不能宣稱「全部深海每次隨機」。後續若要變動 guide/story 的位置，必須以同一配置 owner 同時提供 home、gate、slowdown anchor、guide definition；到站路線和觀察距離須一併驗證。底棲候選需要實際支撐面與完整足部接觸，不應共用浮游位移算法。

## 配置資料與保存

1. 用固定 catalog 定義每個可變 UID 的有限候選（建議各 3–4 個），包含 `key / home / homeYaw / radius / floor / ceiling`；保留原作者位置為可稽核 fallback。候選點不新增 renderer batch、mesh、actor 或 asset。候選資格以 UID + 預期 species 判定，不能用可因新增物種變動的 array index。
2. `value(seed,uid,channel)` 只在 apply 取一次候選。phase 可以附加細節，但不列入棲地變化驗收。route shape 應為實際 homeYaw/radius 差異；純 phase 或只換命名不算。
3. 候選保持原深度帶與地貌；首輪盡量等高，避免 coelacanth 離開大陸坡、pelican_eel 越層或小鮟鱇埋入岩壁。大致偏移量只能作設計範圍，**不能視為安全證據**；候選位置必須先通過真地形/真岩石的完整 motion envelope。
4. `original(f)` 抓取一份深拷貝原始位置及所有相依參數，每次 apply 復原後套候選。不要將前一潛次的變動位置當 baseline。center 與 home 的相對關係保持原值；floor/ceiling 使用該候選已驗證的中心限制，不能留下舊高度。
5. UID、bioSeed/bioMorph/bioGenes、s、modelCenter、discovery、partner、gallery、photo individual 引用保持不變。`f.p` 是目前動作姿態，不作保存身份；套配置後應由現有 motion owner 求新姿態，清除該 actor 的舊接觸/插值狀態，避免從前一 home 掃過整片海域。
6. 現存 schema2 存檔在升級後續玩應保持原來固定深海。建議新的 arrangement schema 帶 `deepLayoutVersion`；sanitize legacy 保存 seed/protection 並標為 legacy deep layout，真正新潛次才啟用 v1。不要在 init/reset 中把舊 seed 重新解讀成新深海位置。
7. 同一 layout version 下候選順序/數量須固定；未來編輯另增 version 或保存候選 key，而不能改陣列後讓同 seed 漂移。未知 version/非法 key 回到經驗證 legacy 配置並明確記錄 fallback，不抽新 seed、不清整份存檔。
8. protection snapshot 保留現有語意：新潛次抓 accepted/ready mail、waypoint、owned UIDs；同趟改任務不重排。若將來把故事常駐改成條件保護，應在這裡加入故事當前/未完成生物要求快照，不能 frame-by-frame 讀 story 再搬魚。

## 安全與成本邊界

| 風險 | 必要處理 | 首輪判定 |
|---|---|---|
| 位置合法但魚身/觸腕穿石 | 候選驗證涵蓋當前真模型動畫包絡 + 整條原 motion path；檢查實際岩 BVH、region solids、地形/頂棚。只查 home 點或半徑 .1 不成立 | ★★★★★ release gate |
| trench 台地被 global groundHeight 忽略 | upper-pelican 與任何 trench 候選檢查 `OceanTrench.floorAt/solids`；不把深站 terrace 當最深海床 | ★★★★★ release gate |
| 中途 home 被重置造成魚瞬移 | 僅 init/reset/真正入口套配置，同 seed重播一致；map/photo/guide pause/season tick 不改 layout | ★★★★★ release gate |
| 新 seed 隨機選到同整套配置 | 不要求每隻每趟不同，但若產品要保證「下一趟不同」，須保存配置 index 或用有限整套 catalog 並避開上一 index；不能只假設 hash 不會碰撞 | ★★★★☆ 明確取捨 |
| 高成本啟動或 per-frame allocations | 離線驗證少量候選，runtime 有界 table lookup；慢速區 anchor 清單在 apply 更新並重用。禁止新載入、每 frame rand/geometry build/full mesh scan | ★★★★★ release gate |
| 只縮 phase 卻聲稱隨機棲地 | 驗收至少記錄每 UID 的候選 key、米制 home 差、route shape、present；phase 明確排除 | ★★★★★ release gate |

推薦首輪全員 presence=true，不新增隱藏/補生物規則，先取得可見的空間變化。未來出席率若啟用，每種、每站及 guide/story/owned 必須至少保留一個可用個體，導航選擇 live present actor；相片與圖鑑不得刪 UID。

## 後續實作驗收（目前未執行）

| Gate | 精確驗收範圍 | 目前 |
|---|---|---|
| 有效變化 | 指定兩 seed 至少 3 個自由個體 home 真正移動 ≥1 m；所有候選都在原 habitat 範圍。再驗 32 seed 至少覆蓋每個候選；純 phase/radius 微量浮點差不算 | ☆☆☆☆☆ 待實作 |
| 重播/存檔 | 同一 seed 新 VM reload 的候選完全一致；續玩、匯入、mark habitat、guide pause/resume 不重新取 entropy；舊 schema2 在新程式仍保持 legacy deep 布局，下一新潛次才切換 | ☆☆☆☆☆ 待實作 |
| mandatory 身份 | 8 guide ID 與 passed、6 station resident、2 story representatives；live habitat marker、story current target、mail tripod/dumbo 均可找到且保護 UID 不換 | ☆☆☆☆☆ 待實作 |
| 碰撞與支撐 | 每候選抽完整 motion period 並以連續路徑包絡檢查，至少涵蓋轉向 extrema 與最大變形；不接受有限抽樣「沒碰到」當全週期證明 | ☆☆☆☆☆ 待實作 |
| guide 與速度 | 真 guide itinerary 無新增 skips，live home 近旁維持 slowdown，遠處仍使用海流加速；實際 observe route / 點選 / 相片與圖鑑一致 | ☆☆☆☆☆ 待實作 |
| CPU/資源 | 與 v44 同 actor/batch/mesh/asset 數；新配置處理固定有限查表；多次 updateLife 後 cache 不重建。報告入口與熱路徑成本，避免只說沒有加動物 | ☆☆☆☆☆ 待實作 |
| 視覺與手機 | 桌機/觸控各一趟、兩個不同 seed 的實景對照：確有空間變化、魚不穿岩、減速可觀察，auto quality 行為保留 | ☆☆☆☆☆ 待實作 |

現有 `tests/parity/encounters.cjs` 的「所有 homes 不變」是 v44 舊契約。正式實作若獲准，要改為「僅明確 whitelist 的深海 actor 可套已驗證候選；其他 home 完全不變」，保留 identity/照片/全員數量 assertions；不能直接刪除舊保護測試。此設計研究止於文檔與 RED，等待 root 決定是否併入 v45。
