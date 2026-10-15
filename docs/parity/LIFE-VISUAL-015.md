# 0.15 生物實際畫面驗收

2026-10-15。以本地整合版 Chrome WebGL2 實際繪製並人工目視；所有圖片來自遊戲網格，沒有以研究照片、生成圖片或平面看板代替動物。此次目視證實了可辨識輪廓與幾個具體缺陷的修復，**沒有證明照片級擬真，也沒有做同硬體的 Wii 畫質比較**。

## 證據與操作界線

`tests/parity/trench-models.mjs` 最終 **105/105**：1440×900、390×844、844×390 各35項，page errors為0。四個對象為鸚鵡螺、吸血烏賊、海豬、馬里亞納獅子魚；每種涵蓋正面、左右斜視、側面、實際低模、現地相機及水族館。圖像位於 `qa/parity/trench-model-{desktop,portrait,landscape}-{species}-{angle,low,habitat,aquarium}.png`。QA原圖與JSON保留於本機測試資料夾，不隨網站發布；正式總結果為 `qa/parity/trench-model-desktop-portrait-landscape-results.json`。

工作室使用獨立等公尺比例實例，只共用原網格；低模刻意在近處強制顯示，便於查看簡化外形。現地檢查只移動相機，使用真實個體UID、home與姿態；夜間時刻是明示fixture，以顯示鸚鵡螺。水族館觀察資格明示預先建立，之後放置、進入、聚焦與退出使用實際按鈕及觸控。世界個體UID、home、s和退出鏡頭恢復皆通過。海豬在實際展示底床的腳尖間距為0；所有視窗水族館按鈕至少44×44px。這些是桌面瀏覽器的觸控模擬，不是實體手機測試。

取景檢查投影的是實際靜態模型頂點，**不是動畫後所有GPU頂點覆蓋率的證明**；再配合實際截圖檢查附肢是否出框。自然探索、研究車、拍照與保存流程另見總測試報告。

## 本輪找到並修復的問題

| 問題 | 修復證據 | 驗證層級 |
|---|---|---|
| 獅子魚小眼被頭部遮住；頭端有明亮凹點 | 眼球依真實局部表面突出、閉合端點共用軸向法線；左右斜視可見眼；幾何兩項先RED後GREEN | ★★★ 公開幾何與GPU |
| 鸚鵡螺頭罩有棋盤色塊，殼色帶匯聚成風車 | 相同曲面點使用連續色；殼內圈色素退去、外緣條帶保留；`first-nautilus-right45`與最終同角度可比較 | ★★★ 公開幾何與GPU |
| 直向檢查誤把空AABB角當成生物裁切；吸血烏賊細絲有兩張真的碰到攝影框 | 改投影真實網格頂點，保留原門檻；只將離線直向工作室相機拉遠，實際水族館相機與動物尺度不改 | ★★★ 三視窗實際圖 |
| 首張桌面水族館PNG黑畫面，繪製呼叫檢查卻通過 | 測試原本跨兩次evaluate讀取不保留畫布；合併同次render/capture並加入非黑畫面檢查；產品無需改動 | ★★★ 最終105/105 |
| 少數圖鑑觸鬚、腳尖太接近邊界 | 只為槍蝦、躄魚、吸血烏賊、海豬的離線圖鑑相機留出邊距，真實比例不變 | ★★★ 全23張逐張目視 |

原94/105結果保留為 `qa/parity/trench-model-first-combined-results.json`；黑PNG保留為 `trench-model-first-desktop-nautilus-aquarium.png`。最初解剖缺陷圖保留 `trench-model-first-{nautilus,mariana_snailfish,sea_pig}-right45.png`。不刪除初次失敗，也不把修正測試fixture說成產品行為修復。

## 外觀完成度與仍存差距

以下星星是針對本次實際近距畫面的主觀自然程度，五顆為目標，並非性能評分或跨遊戲排名。

| 對象 | 目前目視 | 仍可直接看出的差距 | 圖片 |
|---|---|---|---|
| 鸚鵡螺 | ★★☆☆☆；殼口、內唇、眼與密集觸手可分辨，原外貼螺線已移除 | 頭罩偏光滑圓盾、殼條帶仍規律；觸手群排列像梳束；眼與軟組織仍偏模型感 | 右斜視：`qa/parity/trench-model-desktop-nautilus-right45.png`、左斜視：`qa/parity/trench-model-desktop-nautilus-left45.png` |
| 吸血烏賊 | ★★☆☆☆；兩鰭、八腕蹼與兩條細絲互不混淆 | 腕蹼過於對稱、花瓣般規則，顏色偏均勻；沒有防禦包覆與逐顆海洋雪捕獲模擬 | 正面：`qa/parity/trench-model-desktop-vampire_squid-front.png`、700m現地：`qa/parity/trench-model-desktop-vampire_squid-habitat.png` |
| 海豬 | ★★☆☆☆；管足真正支撐身體，背乳突和口觸手清楚 | 身體仍太平滑不透明，強光下像粉色塑料；足節輪廓仍有程序折角，與自然柔軟組織差距明顯 | 斜視：`qa/parity/trench-model-desktop-sea_pig-left45.png`、1400m泥底：`qa/parity/trench-model-desktop-sea_pig-habitat.png` |
| 馬里亞納獅子魚 | ★★☆☆☆；小眼、兩葉胸鰭、連續背臀鰭及腹吸盤可讀 | 皮膚與鰭仍比真實透明組織不透光；沒有皮下器官，強光下偏白色模型；形狀與口線略對稱 | 右斜視：`qa/parity/trench-model-desktop-mariana_snailfish-right45.png`、7000m現地：`qa/parity/trench-model-desktop-mariana_snailfish-habitat.png` |

其他19張更新材質的原創生物圖鑑亦逐張查看：鯨豚輪廓與色區可辨識，但小型珊瑚魚、海馬、海蛞蝓及深海動物仍有硬鰭、均勻表面或簡化配色；本輪沒有因新增材質參數就宣稱所有模型已擬真。深海近照使用遊戲實際燈光，沒有把工作室背景當成天然棲地。

## 輸出與幾何預算

更新23張 `assets/guide_*.jpg`（8小型、7鯨豚、5舊深水、3真深度），加12張既有圖鑑共35張；JPEG均由真網格渲染，SVG仍是原創示意fallback。縮圖生成器在獨立頁面關閉後不殘留GPU程序。

最終模型檢查：`trench-fauna.cjs`9/9、`trench-motion.cjs`5/5、`nautilus-anatomy.cjs`3/3；全場景編譯後舊個體保存4/4、小型生物生成8/8。四項視覺修正沒有新增面數或修改動物公尺尺度。三新模型高低索引共1,613,592bytes，鸚鵡螺688,944bytes。最後全場景423網格／3590節點，解壓51,744,216bytes、gzip19,539,355bytes，仍在既定80MB／24MB預算內。

此驗收不涵蓋所有畫質、裝置、動畫時刻或自然生態完整性；發布、公開服務和最後效能證據由主流程另記。GPU於本次驗收後已關閉並交回主流程。
