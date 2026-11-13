# CLAUDE.md — 做工á人台語工作室網站

這是做工仔人台語工作室的 GitHub Pages 靜態網站（https://cho-kang-a-lang.github.io/ ）。
純靜態 HTML＋瀏覽器端 JavaScript，沒有建置流程、沒有後端、沒有框架。

## 基本規矩

- 不要修改現有頁面，除非我明確要求
- 台語世界政策島放在 `island.html` 與 `island/` 資料夾
- 白話字、漢羅文字一律用一般 HTML 呈現，不要畫進 3D／canvas 場景
- 島上建築資料要從現有文章索引（posts.json＋frontmatter）自動產生，不要手寫每一篇
- 第一版不做協作線（文章關聯資料尚未建立）
- 畫面採 2.5D／俯視平面風格，不用 three.js 等 3D 引擎（手機效能考量）
- 每次都開新分支，不要直接推到 master
- 推上 GitHub 前要先讓我在本機預覽確認

## 網站架構

| 檔案 | 作用 |
|---|---|
| `posts.json` | 全站資料中樞：`files[]` 是文章檔名清單（對應 markdowns/*.md）；`menu[]` 是導覽選單樹 |
| `posts-loader.js` | 共用載入器：抓 posts.json → 逐篇抓 markdown 解析 frontmatter → 注入選單。含 sessionStorage 快取與「預約發布」過濾（date 在未來的文章自動隱藏） |
| `article.html` | 文章閱讀頁。`article.html?file=<檔名>` 動態抓 `markdowns/<檔名>.md` 用 marked.js 渲染 |
| `index.html` | 首頁（含最新文章、搜尋） |
| `category.html` | 分類列表頁。`category.html?cat=<選單標題>` |
| `style.css` | 全站共用樣式。HTML 以 `style.css?v=日期` 引用，改 CSS 必須同步改版本參數（4 個頁面：index/article/category/404） |
| `markdowns/` | 所有文章原始檔（.md with frontmatter） |
| `htmls/` | 自製遊戲的獨立 HTML |
| `medias/`, `images/` | 圖片等媒體 |
| `llms.txt` | AI 搜尋引擎索引（新增文章後用工作資料夾的 gen-llms.py 重生） |

### 選單 menu[] 節點型態

- `{title, file}`：連到 article.html?file=X
- `{title, children:[...]}`：下拉選單，父層連到 category.html
- `{title, auto_category: "分類名"}`：由 posts-loader 自動注入該分類的所有文章
- `{title, url}`：任意網址（同分頁開啟）——island.html 入口未來可用這個掛上選單

## 文章資料格式（島嶼建築的資料來源）

共 223 篇。frontmatter 欄位與覆蓋率：

| 欄位 | 覆蓋 | 說明 |
|---|---|---|
| `title` | 223/223 | 完整標題，如「【台灣舊地號名】80.豆仔埔」 |
| `date` | 223/223 | `YYYY-MM-DD HH:MM:SS`，未來日期＝預約發布（不可顯示） |
| `categories` | 219/223 | 即「系列」＝島嶼。三種寫法都存在：`categories: X`、`categories: [X]`、多行列表，解析要全部相容 |
| `img` | 206/223 | 特色圖路徑（可當建築縮圖） |
| `description` | 220/223 | 摘要 |
| `tags` | 220/223 | 標籤列表 |

**音檔連結不在 frontmatter**，在內文開頭的圖示連結裡，格式固定如：
`[<i class="fab fa-youtube fa-2x" ...></i>](https://youtu.be/xxx "YouTube Podcast")`
可用網域規則抽取：YouTube（youtube.com/youtu.be，160 篇）、SoundOn（player.soundon.fm，100 篇）、
Spotify／KKBOX／Apple（各 100 篇）。63 篇純文字文章無音檔（主要是台灣舊地號名系列），面板要能優雅處理「無音檔」。

### 分類分佈（＝各島規模）

台灣舊地號名 46、台語語詞 46、A郎台語小詞典 44、英國囡仔古 19、平台散文 14、
A郎 13、A郎片頭尾 13、民間故事 6、台語講怪奇 6、白蔥仔公主 6、其他 3、相招來看戲 3

注意：46 篇的大島建築過多，需要分區／捲動等設計，不能全部平鋪。

## 技術地雷（過去踩過的坑）

1. **換行必須用 LF**：article.html 移除 frontmatter 的正則要求 `---\n`，CRLF 會讓整段 frontmatter 漏到頁面上。Python 寫檔用 `newline=''` 並確保內容無 `\r`
2. **部分舊檔有 BOM**：讀 markdown 用 `utf-8-sig`
3. **CDN 要釘版本**：如 Babel 曾因未釘版本自動升級導致整頁空白。新引入的函式庫一律釘精確版本
4. **快取三層**：GitHub Pages 部署 1–3 分、瀏覽器 HTTP 快取 10 分（max-age=600）、posts-loader sessionStorage。驗證要 Ctrl+F5；改 style.css 要 bump `?v=`
5. **posts.json 是單一真相**：動它之前先確認拿到的是最新版（git pull），用舊版覆蓋會讓已發布文章從網站消失

## 開發流程

- 本儲存庫（D:\GitHub\chokangalang）是唯一正式來源，分支開發：`git checkout -b <分支名>`
- 本機預覽：在專案資料夾執行 `python -m http.server 8000`，開 http://localhost:8000/ （file:// 直開讀不到資料檔）
- 手機版面：瀏覽器 F12 → 裝置模擬模式
- 預約發布規則：island 頁面顯示文章前，必須沿用 posts-loader 的 publishAt 過濾，未到日期的文章不可出現
