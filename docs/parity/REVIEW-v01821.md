# 0.18.21 雙人同游客戶端審查

基線 `2f4cc278c4cc17b413f5c139798dea5f0621263a`；規格見 [Stage C 契約](MULTIPLAYER-CLIENT-v01821-SPEC.md)。以下由 root 整理兩個不同代理的獨立審查，執行與公開交付另見 [本輪報告](../TEST_REPORT-v01821.md)。

| 獨立來源 | 最終結論及範圍 |
|---|---|
| Standards：`/root/multiplayer_standards_review` | ★★★ 最終來源及桌機 67/67 複審無剩餘 P1/P2、無已記錄的標準違反；不代替公網或真機驗收。 |
| Spec：`/root/multiplayer_spec_review` | ★★★ 最終來源、桌機與觸控各 67/67 及截圖複審無剩餘 P1/P2；確認觸控是真實輸入的同機模擬、完整多人缺口仍保留。 |

## 審查帶出的修正

- 新世代尚無 pose 時釋放舊模型，直到新姿態到達才建立，避免沿用舊連線位置。
- 真 WebGL context loss 清理房間與遠端資源，無有效 renderer 時不維持送姿態流程。
- 本端重連與對方暫停／離線在海圖及提示中分別呈現；不假裝位置仍即時。
- 遠端姿態直接更新既有 2D 海圖，不設 renderer.dirty，避免暫停時反覆畫三維海景。
- JSON null 等無效外部封包在 transport 邊界拒絕，不拋未捕捉例外。
- 控制操作回覆不明時採有界 resume 與權威快照恢復，不遺留 pending control 或猜測／重播操作。
- 遠端潛水員維持 kind=5；暫停只保持 transform，不切換成使用不同俯仰軸的 kind=0。
- 正式首頁入口可見；未准入的重連不顯示房號／下水控制，已准入者才使用「恢復原房間」。

驗證控制器保留初輪失敗，暫停海圖使用真實收件後 dirty=false 驗證；離房改以實際 TCP 數而非跨 document 不完整的 CDP close 事件判斷。缺失事件的舊識別碼照實保留，沒有改寫成已關閉。兩位複審均確認這是校正證據來源，沒有放寬真實關閉條件。

## 凍結來源

- `src/multiplayer.js`：`5dfbb27918efce19f931bf39c542be4619eff0ebe0c18998a6b0a6020b7df3b3`
- `src/room_client.js`：`368d400944180fe47c82e2759b73bd903d3d4af3243e5a38f96c50473c8e192f`
- `tests/parity/multiplayer-browser.cjs`：`35f8012e7570ba32acb8c6bb4a2f1fbe05d262bad599e3bae4d30a18bfaba472`

Root 執行桌機與觸控模擬各 67/67；兩種配置均為同一台 Apple M3 Max，不能推論實體手機 FPS 或耗電。持久身分／42 好友／邀請、共同世界／完整工具／全部外觀、自有公網服務、不同網路和實體裝置仍未完成。工作單 11 與整體商用目標不關閉。

Root 隨後完成最終 CPU 95/95、靜態 66/66、指定程式提交 Pages built、294 個公開檔案雜湊、兩種配置預設入海與公開未配置服務流程各 6/6；公開驗證未使用本機代理或代用服務。具體收據及邊界見本輪報告。
