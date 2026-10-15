# 0.15 深海整合獨立審查

2026-10-15；基準 `3b03ff8`。依據 [本輪契約](DEEPSEA-SLICE.md)，審閱 `deepsea.js`、`voyage.js`、`navigation.js`、`exploration.js`、`expedition.js` 的實際接線與工作目錄差異。審查者未實作這些流程檔；自作的 renderer／地形只列驗證交接，不冒充獨立審查。未啟動 GPU。

## Standards：實際缺陷與修復

| 發現／重現 | 最小修復與複核 | 證據 |
|---|---|:---:|
| P2：由 1400m 站下降至 3000m 後取消，儲存的 station 仍為 slope；用 ID 判斷「已在本站」會拒絕返回 1400m。原航線也會先回訪上次站點 | `deepsea.travel/render` 改以實際距離判定；傳目前位置給 `OceanTrench.route`。永久回歸在 journey/free 兩模式執行 production init 後的 updatePlayer，真正抵達原站；另驗同深度離站後返回 | CPU 已關閉 ★★☆ |
| P2：深潛時設定的「卡住回錨地」仍呼叫淺海 entry，經深海 clamp 被送往邊界 600m，模式未退出 | deepsea 最外層 jumpTo 轉為回收 goHome；驗證 deployed／submersible 清除、未呼叫淺海跳點；退出後仍轉傳舊 jump | CPU 已關閉 ★★☆ |
| P2：free 模式由深海圖鑑觀察淺海或其他深度動物，略過 journey 距離 gate，會 teleport-follow／撞上研究區邊界 | findSpecies 加雙向區域 gate，以及所有深潛模式的 observeDistance gate。實際 wrapper 驗跨區／跨站均不改 position/follow；近處同區仍能進入 follow | CPU 已關閉 ★★☆ |
| P2：深潛 HUD 無條件隱藏 waypoint，連已標記海豬棲地也消失；exploration target 卻仍顯示遠端淺海打撈標記 | waypoint 只隱藏區外目的地，production paintVoyageHUD＋deepsea.paintHUD 驗真棲地保留／garden與boat隱藏。explorationTarget 加 pointRegion 相等條件 | waypoint CPU／探索標記來源已關閉 ★★☆ |

未再發現其他需修復的重要來源層缺陷。沒有要求改寫既有全域風格或以額外抽象取代本次狹窄接線。

## Spec：證據邊界

| 本輪要求 | 已核對 | 未完成的整合證據 |
|---|---|---|
| 真 700／1400／7000m、可中斷轉站、恢復位置 | 實際 Y、同位置航線接續、save reader 與研究身份驗證；底床與分層平台分開；CPU ★★☆ | 三尺寸實際部署／移動／轉站／重載／JSON 匯入 |
| 保留淺海進度且研究車不耗氣、不帶來淺海夥伴 | 深海不套船旁180m限制；呼吸氣量不減，日曆照常；訪客清空，夥伴動作在研究模式跳過；退出旗標恢復；CPU／來源 ★★☆ | 真第三人稱、氣泡／聲音與返回淺海畫面 |
| 可觀察、拍照與畫水中筆記 | 區域與距離 gate、深海筆記／trail sanitizer、照片燈光讀取共享 torch helper；CPU ★★☆ | 真點選／觸控、快門、深處筆畫與對應 JPEG |
| 自動畫質、模型和岩層美術 | 本輪未以來源／三角形數宣稱畫質完成；保持 adaptive 設定；來源 ★☆☆ | 最終烘焙桌機／觸控三尺寸目視、RAF效能、離線及公開 hash |

本審查獨立執行：`deepsea-lifecycle.cjs` **9/9**、`deepsea.cjs` **13/13**、`photography.cjs` **18/18**、`exploration.cjs` **32/32**、`expedition.cjs` **20/20**。lifecycle 使用 production init／函式的最小 DOM fixture，沒有 GL；保存腳本以 repo-relative 路徑可重跑，無 `/tmp` 依賴。

地形／光照作者交接證據另為 `trench-geometry.cjs` **12/12**、`trench-lighting.cjs` **6/6**；其中所有航線段以相同碰撞面與底床驗證，並有 3000m 重新啟航、平台上／下方接續案例。這兩組不是獨立審查，也不是 GPU 畫面證據。

完整 Wii 對等仍開放。實體手機、同硬體 Wii 畫質比較與透明軟組織的完整物理散射未因此取得驗收結論。

## 首輪實景的材質與地形修正交接

已實際讀取三站 desktop PNG。無日光的岩壁仍呈藍色三角帶，來源是未隨深度衰減的環境 Fresnel 邊緣項；已乘環境深度衰減。原探照燈只有 diffuse，深處 roughness 無法呈現；現加入同一 roughness／normal variance／水下 F0 的 GGX 項，不增加取樣或 pass，入射燈光評分參數不變。最終 GPU 效果仍待重拍。

泥底平板感另以真地形改善：底床5m主網格在各動物home的±2/3m插入固定座標列；2m核心保持平坦，外部緩丘振幅上限±0.29m。trench仍53 batches，65,656 triangles、7,184 solids；所有高度與實際三角面相符、內邊均兩面共用，沒有用裙邊遮縫。geometry12/12、六個全身路徑所在motion5/5、lifecycle9/9、舊regions17/17、lighting6/6通過。本段是作者交接，未冒充獨立美術審查。
