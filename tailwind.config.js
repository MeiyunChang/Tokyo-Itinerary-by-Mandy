/** @type {import('tailwindcss').Config} */
export default {
  // *** 核心設定：告訴 Tailwind 掃描哪些檔案以生成 CSS 樣式 ***
  // 請根據您的專案結構調整路徑！如果您的代碼放在 'src' 資料夾內，請保留這個設定。
  content: [
    // 掃描專案根目錄下的主要 HTML 檔案
    "index.html", 
    
    // 掃描 'src' 資料夾下所有 .js, .ts, .jsx, 和 .tsx 檔案（涵蓋 React/Vue/Svelte 元件）
    "./src/**/*.{js,ts,jsx,tsx}",
    
    // 如果您使用的是 Vue，請取消註釋下面一行
    // "./src/**/*.vue", 
  ],
  theme: {
    // 您可以在此處擴展或自定義 Tailwind 的預設主題，例如顏色、字體、間距等。
    extend: {},
  },
  plugins: [
    // 您可以在此處添加 Tailwind 官方或其他第三方插件
  ],
}

