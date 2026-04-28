/**
 * posts-loader.js
 * 注意：frontmatter 的 categories 欄位請用行內格式：
 *   categories: 分類名稱
 *   categories: [分類名稱]
 *   categories: [分類一, 分類二]
 * 不支援 YAML 多行陣列格式。
 *
 * 從 markdown 檔案的 YAML frontmatter 自動讀取文章 metadata，
 * 並注入至 posts.json 的選單骨架 (auto_category) 節點中。
 *
 * 使用方式：
 *   在 posts.json 的 menu 中，將需要動態填入文章的節點設定 "auto_category": "分類名稱"
 *   系統會自動讀取 files 清單中所有 markdown 的 frontmatter，
 *   依 categories 欄位將文章填入對應的選單節點。
 *
 * 新增文章只需：
 *   1. 將 markdown 檔案放入 markdowns/ 資料夾
 *   2. 在 posts.json 的 "files" 陣列中加入檔名（不含 .md）
 *   3. 確認 markdown frontmatter 中有 categories 欄位
 */

const POSTS_CACHE_KEY = 'chokangalang_posts_v2';

/**
 * 從文章內文中抽取純文字摘要（移除 HTML 標籤與 Markdown 語法）
 */
function extractExcerpt(body, maxLength = 120) {
    // 移除 markdown 連結語法 [text](url)，保留 text 部分
    let text = body.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
    // 移除所有 HTML 標籤
    text = text.replace(/<[^>]+>/g, '');
    // 移除水平分隔線
    text = text.replace(/^[-*]{3,}\s*$/gm, '');
    // 移除 Markdown 標題 (#, ##, ...)
    text = text.replace(/^#+\s+/gm, '');
    // 移除粗體、斜體符號
    text = text.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');
    // 合併空白
    text = text.replace(/\s+/g, ' ').trim();

    if (!text) return '';
    if (text.length <= maxLength) return text;
    // 在字元邊界截斷（避免切斷表情符號或漢字）
    return text.slice(0, maxLength) + '…';
}

/**
 * 解析 markdown 檔案頭部的 YAML frontmatter，同時抽取文章摘要
 * 支援格式：
 *   categories: 分類名稱
 *   categories: [分類名稱]
 *   categories: [分類一, 分類二]
 */
function parseFrontmatter(text, filename) {
    const data = { file: filename };
    const match = text.match(/^---\r?\n([\s\S]+?)\r?\n---/);
    if (!match) {
        data.excerpt = extractExcerpt(text);
        return data;
    }

    const yaml = match[1];

    const get = (key) => {
        const m = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
        return m ? m[1].trim() : null;
    };

    const title = get('title');
    if (title) data.title = title;

    const date = get('date');
    if (date) data.date = date.split(' ')[0]; // 只保留 YYYY-MM-DD 部分

    const desc = get('description');
    if (desc) data.description = desc;

    const img = get('img');
    // 將絕對路徑 /medias/... 轉為相對路徑 ./medias/...，本地與 GitHub Pages 皆可用
    if (img) data.image = img.replace(/^\//, './');

    // 支援 "categories: 分類" 與 "categories: [分類一, 分類二]"
    const cat = get('categories');
    if (cat) {
        const cleaned = cat.replace(/^\[|\]$/g, '').trim();
        data.categories = cleaned.split(',').map(s => s.trim()).filter(Boolean);
    }

    // 從 frontmatter 之後的內文抽取摘要
    const bodyStart = match.index + match[0].length;
    data.excerpt = extractExcerpt(text.slice(bodyStart));

    return data;
}

/**
 * 並行載入所有 markdown 的 frontmatter metadata
 * 使用 sessionStorage 快取，避免同一 session 重複抓取
 * 若 posts.json 的 files 清單有變動，自動重新載入
 */
async function loadAllPostsMeta(files) {
    const filesKey = files.join(',');

    // 嘗試從 sessionStorage 讀取快取
    const cacheStr = sessionStorage.getItem(POSTS_CACHE_KEY);
    if (cacheStr) {
        try {
            const cached = JSON.parse(cacheStr);
            if (cached._files === filesKey) {
                return cached.posts;
            }
        } catch (e) { /* 快取損毀，重新載入 */ }
    }

    // 並行抓取所有 markdown 檔案
    const posts = await Promise.all(
        files.map(filename =>
            fetch(`./markdowns/${filename}.md`)
                .then(r => r.ok ? r.text() : Promise.reject(new Error('not found')))
                .then(text => parseFrontmatter(text, filename))
                .catch(() => ({ file: filename, title: filename })) // 找不到時以檔名當標題
        )
    );

    // 存入 sessionStorage 快取
    try {
        sessionStorage.setItem(POSTS_CACHE_KEY, JSON.stringify({ _files: filesKey, posts }));
    } catch (e) { /* sessionStorage 可能已滿，忽略 */ }

    return posts;
}

/**
 * 將文章 metadata 注入至選單骨架的 auto_category 節點
 * 每個分類內的文章按日期從新到舊排序
 */
function injectPostsIntoMenu(menuItems, posts) {
    // 建立 category → posts 對應表
    const categoryMap = {};
    posts.forEach(post => {
        if (!post.categories) return;
        post.categories.forEach(cat => {
            if (!categoryMap[cat]) categoryMap[cat] = [];
            categoryMap[cat].push(post);
        });
    });

    // 每個分類內按日期排序（新的在前）
    Object.values(categoryMap).forEach(arr => {
        arr.sort((a, b) => {
            const dA = a.date ? new Date(a.date.replace(/-/g, '/')).getTime() : 0;
            const dB = b.date ? new Date(b.date.replace(/-/g, '/')).getTime() : 0;
            return (isNaN(dB) ? 0 : dB) - (isNaN(dA) ? 0 : dA);
        });
    });

    // 遞迴走訪選單，將文章注入 auto_category 節點
    function inject(items) {
        items.forEach(item => {
            if (item.hasOwnProperty('auto_category')) {
                const key = item.auto_category;
                item.children = (categoryMap[key] || []).map(p => ({
                    title: p.title || p.file,
                    file: p.file,
                    date: p.date || null,
                    description: p.description || null,
                    image: p.image || null
                }));
                delete item.auto_category;
            }
            if (item.children) inject(item.children);
        });
    }
    inject(menuItems);
    return menuItems;
}

/**
 * 主函數：載入 posts.json → 讀取所有 markdown frontmatter → 注入選單
 * 回傳包含完整選單與 _posts 平面陣列的 data 物件
 *
 * data._posts: 所有文章的 metadata 平面陣列（供搜尋功能使用）
 */
async function loadPostsData() {
    const resp = await fetch('posts.json?v=' + new Date().getTime());
    if (!resp.ok) throw new Error('無法載入 posts.json');
    const data = await resp.json();

    if (data.files && data.files.length > 0) {
        const posts = await loadAllPostsMeta(data.files);
        injectPostsIntoMenu(data.menu, posts);
        data._posts = posts; // 保存平面清單供搜尋使用
    }

    return data;
}
