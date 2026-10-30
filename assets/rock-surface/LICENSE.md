# Rock Boulder Dry surface — v0.18.48

The shipped `../rock_diff.jpg` and `../rock_nor_gl.jpg` are derived from [Poly Haven Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry), photography by **Dimitrios Savva**, processing by **Rico Cilliers**, under **CC0-1.0**. [Publisher license](https://polyhaven.com/license); [CC0 legal text](https://creativecommons.org/publicdomain/zero/1.0/); [local legal text](CC0-1.0.txt). Source and license checked 2026-10-30.

Official metadata: [information](https://api.polyhaven.com/info/rock_boulder_dry), [files](https://api.polyhaven.com/files/rock_boulder_dry). The retrieved metadata is retained in `source-info.json` and `source-files.json`. Only the registered 2048-square diffuse and OpenGL normal JPEGs were used; other maps, preview renders and the source site's branding are not shipped.

Exact source URLs, verified publisher MD5/byte counts, local SHA-256, derived hashes, encoder versions and recipe are recorded in [preparation-receipt.json](preparation-receipt.json). That receipt preserves the original offline preparation status and local QA paths; this notice records its subsequent installation in the game. The raw source JPEGs remain in local QA, not the runtime package. To reproduce, download the two exact URLs in the receipt to a local QA folder with the metadata, then run `tools/prepare_rock_surface.py --asset=rock_boulder_dry --output-size=1536 --source-dir=<that-folder>` using the recorded Pillow/NumPy versions.

Both maps use the same uncropped 1536-square Lanczos grid. Diffuse JPEG quality is 88 and normal quality is 90, both 4:4:4. Normal directions are normalized, resampled as signed floating-point channels and renormalized before encoding. No channel flip, tint, rotation or semantic image edit is applied. The preparation tool's historical default remains the rejected, unshipped Rock Face experiment; select this asset and size explicitly. The old procedural `make_textures.py` is not the reproduction path for these two replacement maps.

| Shipped file | Bytes | SHA-256 |
| --- | ---: | --- |
| `rock_diff.jpg` | 757,507 | `ed0102ccab22c65e11dfd715ac56b752cfe5486d0a347c71add3be1ed24ea50e` |
| `rock_nor_gl.jpg` | 763,605 | `ed025b06f325174558245e758d7dfda52ea041bf0d440af32a680c1cc558e363` |

The publisher describes a dry weathered boulder surface approximately 1.8 m across. Mineralogy and underwater capture are not established. The existing main-rock projection repeats over 2.5 m (about 1.39 times source scale); secondary terrain projections use their existing scales. This is game-art adaptation, not a geological reconstruction or a complete measured PBR material. Geometry, roughness behavior and underwater light remain the game's existing approximations.

Normal-angle statistics measure RGB8/JPEG encoding relative to the normalized resized reference, excluding resizing loss against the original scan. Texture dimensions and compressed bytes do not establish FPS, battery use or physical-device performance. See the v0.18.48 validation and visual review under `docs/parity/` for the inspected scenes and remaining limitations.
