# 海龜皮膚色彩貼圖 v0.18.45

本專案以內建 imagegen 生成的原創遊戲色彩素材，沒有取用 Nintendo、博物館或研究網站影像。不是實體海龜掃描、照片、法線／高度圖或物種精密重建。由兩次生成／編修後選取 B 作候選，經實際遊戲畫面審視後才可接受。

正式檔案：[`assets/turtle_skin_v45.jpg`](../../assets/turtle_skin_v45.jpg)，1024 × 1024、JPEG。原始 B 保存在 QA；生成器原檔保留在使用者的 generated_images 資料夾。以 macOS `sips` 只縮放與轉檔，JPEG quality 88，沒有另行繪製或混合來源。RGBA8 讀入後沿既有色彩管線處理；鏡像重複與 mipmaps 用於接縫和遠距過濾。

生成方式：內建 `image_gen.imagegen`；B 使用 A 的本機檔案作 reference，無外部圖片輸入。

## A 提示詞

```text
Create one production-ready seamless square PBR BASE COLOR / ALBEDO texture for the dorsal flipper and head skin of an adult green sea turtle (Chelonia mydas), for a realistic underwater exploration game. This is an original digital texture, not a photograph of a specific animal. Entire image filled edge-to-edge by the flat skin surface, orthographic flat scan, with approximately 10 to 14 irregular polygonal scales across the full square. Small and medium asymmetrical scales with rounded uneven borders, dark muted olive-brown centers, subtle warm gray-ivory narrow inter-scale skin. Naturally uneven scale size, worn mottling and fine leather grain within each scale, subdued saturation. Vary pigment inside the scales without baked lighting. Tileable on all four sides, no identifiable subject silhouette, no turtle head or flipper outline, no shell scutes, no eye, no water, no bubbles, no framing, no text, no labels, no logos, no shadows or highlights or directional lighting, no bump/normal-map purple colors. Make the texture biologically plausible and detailed at game viewing distance. Avoid a uniform geometric honeycomb, regular grid, cobblestone relief, circular spots, moss, and plastic appearance. Output a clean square color texture, ideally 1024 by 1024 pixels, opaque background.
```

## B 最終編修提示詞

```text
Refine this original game albedo texture. Keep the muted olive-brown, natural scale pigment and realistic fine leather detail. The current polygon scales are far too large: make each scale about one third the current linear size so there are approximately 12 to 16 irregular polygon scales across the entire square image, and at least 120 scales total. Make the warm gray-ivory inter-scale lines narrower and less bright, so the result reads as relatively flat sea turtle flipper skin rather than large raised shell plates or cobblestones. Flatten all directional shading, no highlights and no cast shadows: base color only. Preserve natural irregularity and mottled pigment, without moss growth or a uniform honeycomb. Make all four edges wrap seamlessly; output one opaque square texture with no text, labels, frame, animal silhouette or other objects. Ideally 1024 by 1024 pixels.
```

生成結果沒有精確達成提示詞中的鱗片數量與天然無縫要求；實作以模型座標密度與鏡像取樣控制呈現，不把提示詞當成成品質量證明。圖中細色斑只用作色彩，不直接當成精密高度／法線資料。
