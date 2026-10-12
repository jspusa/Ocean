# Ocean · 重返蔚藍

## 目前狀態：匯入流程已建立，遊戲檔案尚未上傳

這個儲存庫目前只有 v0.7 的自動匯入設定。**尚未放入遊戲的完整程式、模型、材質與音樂，也尚未發布可玩的 GitHub Pages 網站。**

## 只需上傳原始 ZIP，不必逐一上傳 70 個檔案

1. 從 ChatGPT 對話下載 **`Shilang_Ocean_GitHub_Pages_v0.7.zip`**。請保留原始檔名，不要重新壓縮；原始檔案為 23,936,326 bytes（約 22.83 MiB）。
2. 開啟 [Ocean 檔案上傳頁](https://github.com/jspusa/Ocean/upload/main)，將 ZIP 上傳至儲存庫根目錄，並提交至 `main`。
3. 前往 [Actions](https://github.com/jspusa/Ocean/actions/workflows/import-v07.yml)，確認 **Import Ocean v0.7 release** 成功完成。

流程會核對原始 ZIP 的 SHA-256，以及清單中的 69 個檔案雜湊，接著將含清單在內的 **70 個檔案**解壓並提交至 `main`。匯入完成後，這份 README 會被遊戲原本的完整說明取代。ZIP 會保留；清單以外的檔案不會被刪除。這個流程只接受下列指定版本，不會任意下載外部網址或執行 ZIP 裡的建置腳本。

```text
原始 ZIP SHA-256
c27229f5159e4d89b4faa15867984b7d7d3c1183a1f131afa9878363296da58d
```

GitHub 官方的瀏覽器上傳限制是每檔 25 MiB；這份 ZIP 小於該限制。參考：[Adding a file to a repository](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)。請勿改上傳較大的單檔 HTML。

若匯入工作失敗，先查看 Actions 的錯誤訊息。請勿把尚未完整匯入的儲存庫當成已發布遊戲。需要重跑時，可在上述工作流程頁面選擇 **Run workflow**。

## 匯入成功後，啟用網頁

在 **Settings → Pages → Build and deployment** 選擇：

- Source：**Deploy from a branch**
- Branch：**main**
- Folder：**/(root)**

按 **Save**，再以 Pages 顯示的正式網址開啟。**目前沒有確認網站已上線。** 自動匯入流程不會更動儲存庫的公開／私人設定，也不會自動啟用 Pages。

## 版本界線

v0.7 是可玩的單人航程開發版，不是已通過 Wii feature parity 或正式販售驗收的成品；海域是原創概念場景，不是石朗實測地形。完整功能、已知限制及測試紀錄隨 ZIP 提供。
