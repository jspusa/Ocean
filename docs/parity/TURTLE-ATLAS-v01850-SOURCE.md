# 原創海龜全身色彩素材

`assets/turtle_atlas_v50.jpg` 是以內建 imagegen 製作的原創遊戲色圖。輸入是本專案之前生成的 atlas，沒有 Nintendo 圖像、外部動物照片或掃描模型；不是生物測繪或完整 PBR 掃描。模型、UV 與材質著色由本專案製作。綠蠵龜的外形仍屬美術近似。

## 來源與處理

- 保留的最終生成原圖：[turtle-atlas-muted-original.png](../assets/v01850/turtle-atlas-muted-original.png)，1254²，SHA-256 `6e7d655ce1767532a3345b755db71b74efd88092683d399d5e68c66629b1cbe7`。
- 最後色素修正提示詞：[soft-pigment-prompt.txt](../assets/v01850/soft-pigment-prompt.txt)。盾片修正提示詞：[correction-prompt.txt](../assets/v01850/correction-prompt.txt)。最初生成與版面修正提示詞一併保存於該資料夾。
- 技術製備：[prepare_turtle_atlas.py](../../tools/prepare_turtle_atlas.py)：整張 RGB 轉換、等比例 Lanczos 縮至 1024²、JPEG quality 90、4:4:4。沒有裁切、重排、調色或繪製新像素內容。
- 正式色圖 434,733 bytes，SHA-256 `a5ab171bbcd879851d90d4b9374af67ee4750baf191978f876506281043f6aa8`。舊色圖保留供已開啟的舊頁面使用；新版只載入新的 slot 5。

## 迭代與限制

最初圖像未遵守等大方格，UV 因此依實際六個區域定位。第二張圖的中央盾片約六片，且接縫過亮，未獲接受。最終修正可辨五片中央及每側四片大型盾片，降低白色描邊，保留不規則褐色／橄欖色素。邊緣小盾片另計。實際模型預覽仍偏金橙且皮膚邊線太亮，因此再次透過 imagegen 調整素材本身，改成柔和褐橄欖色與較低對比細紋；不是用額外 gamma 解碼掩蓋問題。

原圖審查後另以正式遊戲的桌機與觸控模擬共14張畫面、完整划鰭及材質診斷完成本次有限範圍接受，詳見[驗證報告](VALIDATION-v01850.md)。臉部仍簡化，斜角及遠景會淡化細節；不能由提示詞或生成成功推定照片級擬真。

六區使用16像素內縮、最大mip層3、各向異性1，實際UV footprint在4至8像素間淡出細節，避免遠景及斜角跨區取色。色圖沿用現有統一色彩轉換，不重複作gamma解碼；凹凸來自極淺的獨立皮革細節，不將深色色素轉成凹槽。
