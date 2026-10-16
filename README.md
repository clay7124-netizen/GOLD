# StockMaster PRO v4.1

以 React + Vite + Tailwind CSS + Recharts 製作的繁體中文台美股自選股工作站。本版本依聊天提供的 StockMaster PRO 程式規格整理為可安裝的專案結構，**不是原始貼文逐字複製**；為避免安全與數據誤導，部分原始功能已做調整。

## 使用

需要 Node.js 20+。安裝依賴並啟動：

~~~bash
npm install
npm run dev
~~~

建置生產版本：

~~~bash
npm run build
npm run preview
~~~

## 功能

- 台股、美股自選股清單及分組、釘選、依漲跌排序、搜尋與批次加入
- 持有股數、買進均價、台幣換算組合市值／損益
- 期間 K 線數據、MA5/20/60、KD(9,3,3)、MACD(12,26,9)、RSI14、布林通道、成交量
- 使用者自行輸入 Finnhub / Fugle API Key；FinMind、Yahoo 作為公開資料來源備援
- 可選擇輸入 Gemini API Key 生成技術分析；若無資料或金鑰，會顯示錯誤，不會捏造數據
- JSON 備份與還原（不含 API 金鑰）

## 重要說明

1. **原始碼內的預設 Finnhub 和 Fugle API Key 已移除。** 若曾把那兩組金鑰貼在任何公開場合，請至服務商後台立即停用／輪替；不要把金鑰存入版本庫。
2. 瀏覽器端輸入的 API Key 保存在該裝置的 localStorage，**不具備伺服器端秘密保護**。公開網站如需代替訪客付費讀取 API，應另建後端 proxy 和金鑰管理。
3. Yahoo 需經由公開 CORS proxy，可能因限流、政策、服務可用性而失敗；FinMind 免費接口亦可能限量／延遲，無法保證每 60 秒都是即時成交價。每筆行情以來源／日期辨識。
4. 原始貼文的「本益比河流」使用均線上下固定百分比，不是真正本益比河流，故未沿用誤導性的命名；實際本益比河流需要獲利 EPS 資料。
5. 原始貼文的指數及匯率有固定假值；本版本不顯示假指數，匯率讀取不到時不進行美股台幣換算。
6. 「大師 13F」區塊保留作為**示例追蹤名單**，不是即時 SEC 13F 持倉；未驗證的固定權重已移除。
7. 「1D」需要分時資料，不會用近 15 根日 K 冒充當日走勢。
8. K 線圖目前提供收盤趨勢與高低收盤圖，非專業繪製的蠟燭 OHLC 棒，原程式也是用收盤 bar 模擬 K 棒。

## 專案結構

- src/App.jsx — 工作站 UI、設定、13F 示例、持倉操作
- src/core.js — 股票字典、分類、技術指標
- src/api.js — 行情、匯率、歷史走勢、AI 請求
- src/index.css — Tailwind 樣式
- vite.config.js, tailwind.config.js — 前端建置設定

## GitHub 位置

本次先放在現有 **GOLD** 儲存庫的獨立 stockmaster-pro-v4 分支，沒有修改 main。未來可遷移到新建的 stockmaster-pro 專屬儲存庫。

> 投資風險自負；本工具僅作個人研究與觀察，不構成投資建議。
