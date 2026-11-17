/* ==========================================================================
   台語世界政策島 island.js
   - 中央廣場：A郎台語小詞典（44 塊詞石，點開即收集，localStorage 記錄）
   - 11 座島：全部分類，建築由 posts.json＋frontmatter 自動產生
     （重用 posts-loader.js，已含預約發布過濾）
   - 角色彩蛋：做工á人小工人繞廣場走動，點他會講台語
   - 點建築／詞石開啟面板：標題、摘要、文章連結、音檔連結
   ========================================================================== */

(function () {
    'use strict';

    // 中央廣場（詞語收集）＝台語語詞；廣場導覽員＝台灣藍鵲（三視圖）
    const PLAZA = {
        cat: '台語語詞', top: '#c9b98a', side: '#9a8a5e', roof: '#8f8f98',
        char: 'island/chars/gisu_side.png', sideFaces: 'left',
        views: { side: 'island/chars/gisu_side.png', front: 'island/chars/gisu_front.png', back: 'island/chars/gisu_back.png' },
    };

    // 各島設定（top=島面、side=側面厚度、roof=屋頂）
    // 順序依首頁「主題」區塊的卡片順序；未出現在首頁卡片的分類
    // （A郎片頭尾、台語語詞、平台散文）插在相近主題旁邊
    // char＝島上小人物（去背自該系列特色圖）；flip＝左右翻面；round＝logo 圓徽章樣式
    const ISLANDS = [
        { cat: 'A郎', label: '阿郎廣播劇', top: '#4a9e8e', side: '#337066', roof: '#d1902f',
          char: 'island/chars/along_side.png', sit: 'island/chars/along_sit.png',
          // 三視圖（角色設定稿）：依行進方向切換；側面圖原始朝向為右
          views: { side: 'island/chars/along_side.png', front: 'island/chars/along_front.png', back: 'island/chars/along_back.png' } },
        { cat: 'A郎台語小詞典', label: '阿郎台語小詞典', top: '#9e9a4f', side: '#706d38', roof: '#2f9e75',
          char: 'island/chars/alongkid_side.png', sideFaces: 'left',
          views: { side: 'island/chars/alongkid_side.png', front: 'island/chars/alongkid_front.png', back: 'island/chars/alongkid_back.png' } },
        { cat: 'A郎片頭尾', label: '阿郎片頭尾', top: '#5d9e7c', side: '#41705a', roof: '#9e5dc1', char: 'images/logo.png', round: true },
        { cat: '英國囡仔古',   top: '#56a083', side: '#3b7260', roof: '#4a7fc1',
          char: 'island/chars/ukkid_side.png',
          views: { side: 'island/chars/ukkid_side.png', front: 'island/chars/ukkid_front.png', back: 'island/chars/ukkid_back.png' } },
        { cat: '民間故事',     top: '#4f9e58', side: '#377040', roof: '#7a5bb5',
          char: 'island/chars/folk_side.png', sideFaces: 'left',
          views: { side: 'island/chars/folk_side.png', front: 'island/chars/folk_front.png', back: 'island/chars/folk_back.png' } },
        { cat: '相招來看戲',   top: '#669e94', side: '#487068', roof: '#c14a4a',
          char: 'island/chars/khoannhi_side.png', sideFaces: 'left',
          views: { side: 'island/chars/khoannhi_side.png', front: 'island/chars/khoannhi_front.png', back: 'island/chars/khoannhi_back.png' } },
        { cat: '台灣舊地號名', top: '#8a9e4f', side: '#5f7038', roof: '#3b7ab5',
          char: 'island/chars/kutemia_side.png', sideFaces: 'left',
          views: { side: 'island/chars/kutemia_side.png', front: 'island/chars/kutemia_front.png', back: 'island/chars/kutemia_back.png' } },
        { cat: '台語講怪奇',   top: '#3f9e6e', side: '#2c6e4d', roof: '#b5543b',
          char: 'island/chars/kongkoaiki_side.png',
          views: { side: 'island/chars/kongkoaiki_side.png', front: 'island/chars/kongkoaiki_front.png', back: 'island/chars/kongkoaiki_back.png' } },
        { cat: '白蔥仔公主',   top: '#6aa06a', side: '#4a7347', roof: '#c75d8a',
          char: 'island/chars/pehchhanga_side.png', sideFaces: 'left',
          views: { side: 'island/chars/pehchhanga_side.png', front: 'island/chars/pehchhanga_front.png', back: 'island/chars/pehchhanga_back.png' } },
        { cat: '平台散文',     top: '#7c9e5d', side: '#587041', roof: '#b5763b', char: 'images/logo.png', round: true },
        { cat: '其他',         top: '#74937c', side: '#526858', roof: '#6b7fc1',
          char: 'island/chars/other_side.png',
          views: { side: 'island/chars/other_side.png', front: 'island/chars/other_front.png', back: 'island/chars/other_back.png' } },
    ];

    // 音檔平台的抽取規則（連結在各篇 markdown 內文開頭的圖示連結中）
    const PLATFORMS = [
        { name: '▶ YouTube',        re: /https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s"'<>)\]]+/ },
        { name: '🎙 SoundOn',       re: /https?:\/\/(?:player\.soundon\.fm|sndn\.link)[^\s"'<>)\]]+/ },
        { name: '🎧 Spotify',       re: /https?:\/\/(?:open\.spotify\.com|spoti\.fi)[^\s"'<>)\]]+/ },
        { name: '🎵 KKBOX',         re: /https?:\/\/podcast\.kkbox\.com[^\s"'<>)\]]+/ },
        { name: '🍎 Apple Podcast', re: /https?:\/\/podcasts\.apple\.com[^\s"'<>)\]]+/ },
    ];

    // 角色台詞（點擊時隨機講一句）
    const CHARACTER_LINES = [
        'Ló͘-la̍t！多謝你來𨑨迌！',
        '逐家好！我是做工á人！',
        'Lí hó！來廣場收集台語詞ŏ͘！',
        '咱ê話，咱來講！',
        '台語講kah輾轉，人人o-ló！',
    ];

    // ===================== 協作線（內容關聯，手動維護） =====================
    // 來源／目標填分類名稱（＝島嶼或中央廣場的 cat）；note 於滑鼠懸停時顯示
    const COOP_LINES = [
        { a: '民間故事',   b: '台灣舊地號名',   note: '故事場景會提到舊地名' },
        { a: 'A郎',        b: 'A郎片頭尾',      note: '同一部廣播劇的本篇與片頭尾' },
        { a: '英國囡仔古', b: '台語語詞',       note: '故事會講tio̍h ê台語語詞' },
        { a: 'A郎',        b: 'A郎台語小詞典',  note: '為故事內底chhōe ê語詞' },
    ];

    // 分類名 → 顯示名（島嶼設定有 label 時用 label，例如 A郎 → 阿郎廣播劇）
    function labelOf(cat) {
        for (let i = 0; i < ISLANDS.length; i++) {
            if (ISLANDS[i].cat === cat) return ISLANDS[i].label || cat;
        }
        return cat;
    }

    const COLLECT_KEY = 'chokangalang_island_words';
    const READ_KEY = 'chokangalang_island_read';   // 各島已讀文章（點開建築即算讀過）

    const sea = document.getElementById('isl-sea');
    const panel = document.getElementById('isl-panel');
    const panelBody = document.getElementById('isl-panel-body');
    const backdrop = document.getElementById('isl-backdrop');

    let allPosts = [];
    let collected = loadCollected();

    // ===================== 詞語收集（localStorage） =====================
    function loadCollected() {
        try {
            const raw = localStorage.getItem(COLLECT_KEY);
            return new Set(raw ? JSON.parse(raw) : []);
        } catch (e) { return new Set(); }
    }

    function saveCollected() {
        try { localStorage.setItem(COLLECT_KEY, JSON.stringify([...collected])); } catch (e) { /* 忽略 */ }
    }

    function collectWord(file) {
        if (collected.has(file)) return;
        collected.add(file);
        saveCollected();
        const stone = document.querySelector('.isl-building[data-file="' + file + '"]');
        if (stone) stone.classList.add('collected');
        updateProgress();
    }

    function updateProgress() {
        const el = document.getElementById('isl-progress');
        if (el) el.textContent = '已收集 ' + countCollected() + ' / ' + plazaTotal + ' 詞';
    }

    function countCollected() {
        // 只計算仍存在於廣場上的詞
        let n = 0;
        collected.forEach(function (f) { if (plazaFiles.has(f)) n++; });
        return n;
    }

    let plazaTotal = 0;
    let plazaFiles = new Set();

    // ===================== 各島閱讀進度（localStorage） =====================
    let readSet = (function () {
        try {
            const raw = localStorage.getItem(READ_KEY);
            return new Set(raw ? JSON.parse(raw) : []);
        } catch (e) { return new Set(); }
    })();

    function readCountOf(cat) {
        return postsOf(cat).filter(function (p) { return readSet.has(p.file); }).length;
    }

    function markRead(file, cat) {
        if (readSet.has(file)) return;
        readSet.add(file);
        try { localStorage.setItem(READ_KEY, JSON.stringify([...readSet])); } catch (e) { /* 忽略 */ }
        const btn = document.querySelector('.isl-building[data-file="' + file + '"]');
        if (btn) btn.classList.add('visited');
        const count = document.querySelector('.isl-island[data-cat="' + cat + '"] .isl-read-num');
        if (count) count.textContent = readCountOf(cat);
    }

    // ===================== 初始化 =====================
    document.addEventListener('DOMContentLoaded', async function () {
        try {
            const results = await Promise.all([
                loadPostsData(), // posts-loader.js（已過濾未發布文章）
                fetch('island/cooplinks.json').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
            ]);
            const data = results[0];
            allPosts = data._posts || [];
            allPosts.forEach(function (p) { postByFile[p.file] = p; });
            buildLinkIndex(results[1]);
            renderNavbar(data.menu);
            renderAll();
            window.addEventListener('resize', debounce(renderAll, 250));
        } catch (e) {
            document.getElementById('isl-loading').textContent = '島嶼載入失敗：' + e.message;
        }
    });

    function debounce(fn, ms) {
        let t;
        return function () { clearTimeout(t); t = setTimeout(fn, ms); };
    }

    // ===================== 頂部導覽列（與全站相同的選單） =====================
    function renderNavbar(menu) {
        const menuContainer = document.getElementById('menu-container');
        if (!menuContainer || !menu) return;

        function buildMenu(items, level) {
            const ul = document.createElement('ul');
            const hasAnySub = items.some(function (item) { return item.children && item.children.length > 0; });
            if (level === 0) { ul.className = 'nav-list'; ul.id = 'nav-list'; }
            else if (level === 1) { ul.className = 'dropdown-menu'; }
            else { ul.className = 'sub-dropdown-menu'; }
            if (level > 0 && !hasAnySub) ul.classList.add('scrollable-menu');

            items.forEach(function (item) {
                const li = document.createElement('li');
                li.className = level === 0 ? 'nav-item' : 'dropdown-item';
                const hasChildren = item.children && item.children.length > 0;
                if (hasChildren && level > 0) li.classList.add('has-sub');

                const linkClass = level === 0 ? 'nav-link' : 'dropdown-link';
                let targetUrl = '#';
                if (item.file === 'home') targetUrl = 'index.html';
                else if (hasChildren) targetUrl = 'category.html?cat=' + encodeURIComponent(item.title);
                else if (item.file) targetUrl = 'article.html?file=' + item.file;
                else if (item.url) targetUrl = item.url;

                let arrow = '';
                if (hasChildren) {
                    arrow = level === 0
                        ? '<span class="arrow" style="font-size:0.8em; margin-left:5px; transition:transform 0.3s; display:inline-block;">▼</span>'
                        : '<span class="arrow" style="margin-left:10px; transition:transform 0.3s; display:inline-block;">▶</span>';
                }
                li.innerHTML = '<a href="' + targetUrl + '" class="' + linkClass + '">' + item.title + arrow + '</a>';

                if (hasChildren) {
                    const childUl = buildMenu(item.children, level + 1);
                    li.appendChild(childUl);
                    li.querySelector('a').addEventListener('click', function (e) {
                        if (window.innerWidth <= 768) {
                            e.preventDefault();
                            const siblings = li.parentElement.children;
                            for (let i = 0; i < siblings.length; i++) {
                                const sibling = siblings[i];
                                if (sibling !== li && sibling.querySelector('ul')) {
                                    sibling.querySelector('ul').classList.remove('mobile-open');
                                    const sa = sibling.querySelector('.arrow');
                                    if (sa) sa.style.transform = 'rotate(0deg)';
                                }
                            }
                            childUl.classList.toggle('mobile-open');
                            const arrowSpan = this.querySelector('.arrow');
                            if (arrowSpan) {
                                const open = childUl.classList.contains('mobile-open');
                                arrowSpan.style.transform = open ? (level === 0 ? 'rotate(180deg)' : 'rotate(90deg)') : 'rotate(0deg)';
                            }
                        }
                    });
                }
                ul.appendChild(li);
            });
            return ul;
        }

        menuContainer.innerHTML = '';
        menuContainer.appendChild(buildMenu(menu, 0));

        const mobileToggle = document.getElementById('mobile-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', function () {
                const nav = document.getElementById('nav-list');
                if (nav) {
                    nav.classList.toggle('active');
                    this.textContent = nav.classList.contains('active') ? '✖' : '☰';
                }
            });
        }
    }

    function postsOf(cat) {
        return allPosts
            .filter(function (p) { return p.categories && p.categories.indexOf(cat) !== -1; })
            .sort(function (a, b) { return a.file.localeCompare(b.file, 'en', { numeric: true }); });
    }

    // ===================== 繪製整個世界 =====================
    let lastWidth = 0;
    let introPlayed = false;   // 開場「島嶼逐一浮現」只播一次

    function renderAll() {
        // 視窗尚未有尺寸（例如分頁在背景被收合）時先不渲染，等 resize 再來
        if (window.innerWidth < 200) return;
        const unit = window.innerWidth < 520 ? 52 : 74;
        if (window.innerWidth === lastWidth && sea.querySelector('.isl-island')) return;
        lastWidth = window.innerWidth;

        stopWalkers();
        sea.innerHTML = '';

        // 中央廣場（獨佔一列）
        const plazaPosts = postsOf(PLAZA.cat);
        plazaTotal = plazaPosts.length;
        plazaFiles = new Set(plazaPosts.map(function (p) { return p.file; }));
        if (plazaPosts.length > 0) {
            const row = document.createElement('div');
            row.className = 'isl-plaza-row';
            row.appendChild(buildIsland(PLAZA, plazaPosts, unit, true));
            sea.appendChild(row);
            // 廣場寬過螢幕（手機）時：改為可橫向捲動並捲到中央；
            // 捲動後航線／協作線位置會偏，停止捲動時重畫
            if (row.scrollWidth > row.clientWidth + 2) {
                row.style.justifyContent = 'flex-start';
                row.scrollLeft = (row.scrollWidth - row.clientWidth) / 2;
                let t = null;
                row.addEventListener('scroll', function () {
                    if (t) clearTimeout(t);
                    t = setTimeout(function () {
                        drawRoutes();
                        drawCoopLines();
                        drawAllRelationLines();
                    }, 120);
                });
            }
        }

        // 各島（順序＝ISLANDS 設定順序，對齊首頁主題區塊；島形為台灣本島輪廓）
        ISLANDS.forEach(function (island) {
            const posts = postsOf(island.cat);
            if (posts.length > 0) sea.appendChild(buildTaiwanIsland(island, posts, unit));
        });

        drawRoutes();
        drawCoopLines();
        drawAllRelationLines();

        // 開場動畫：島嶼一座接一座浮出海面，航線最後才浮現
        if (!introPlayed) {
            introPlayed = true;
            const sections = sea.querySelectorAll('.isl-island');
            sections.forEach(function (el, i) { el.style.animationDelay = (i * 0.3) + 's'; });
            const linesDelay = (sections.length * 0.3 + 0.5).toFixed(1) + 's';
            sea.querySelectorAll('.isl-routes, .isl-coop, .isl-coop-label').forEach(function (el) {
                el.style.animationDelay = linesDelay;
            });
        } else {
            sea.classList.add('no-anim');  // 之後重新排版（如轉向）不重播動畫
        }

        startWalkers();
        updateProgress();
    }

    // ===================== 協作線繪製（亮色實線，疊在環島航路上層） =====================
    function drawCoopLines() {
        const old = sea.querySelector('.isl-coop');
        if (old) old.remove();
        sea.querySelectorAll('.isl-coop-label').forEach(function (el) { el.remove(); });
        const routesSvg = sea.querySelector('.isl-routes');

        const seaRect = sea.getBoundingClientRect();
        const w = sea.scrollWidth;
        const h = sea.scrollHeight;

        function centerOf(cat) {
            const town = sea.querySelector('.isl-island[data-cat="' + cat + '"] .isl-town');
            if (!town) return null;
            const r = town.getBoundingClientRect();
            return {
                x: r.left - seaRect.left + r.width / 2,
                y: r.top - seaRect.top + r.height / 2,
                rx: r.width / 2 * 0.92,    // 以橢圓近似島形，讓線終止在岸邊
                ry: r.height / 2 * 0.9,
            };
        }

        // 沿方向 (ux,uy) 從中心推到橢圓邊緣的距離
        function edgeDist(c, ux, uy) {
            return 1 / Math.sqrt((ux / c.rx) * (ux / c.rx) + (uy / c.ry) * (uy / c.ry));
        }

        let parts = '';
        const labels = [];
        COOP_LINES.forEach(function (line, i) {
            const ca = centerOf(line.a);
            const cb = centerOf(line.b);
            if (!ca || !cb) return;
            let dx = cb.x - ca.x, dy = cb.y - ca.y;
            let clen = Math.hypot(dx, dy) || 1;
            const ux = dx / clen, uy = dy / clen;
            // 端點由島中心沿連線方向推到橢圓岸邊
            const da = edgeDist(ca, ux, uy);
            const db = edgeDist(cb, ux, uy);
            const a = { x: ca.x + ux * da, y: ca.y + uy * da };
            const b = { x: cb.x - ux * db, y: cb.y - uy * db };
            dx = b.x - a.x; dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const off = Math.min(90, len * 0.22) * (i % 2 ? -1 : 1);
            const cx = (a.x + b.x) / 2 - (dy / len) * off;
            const cy = (a.y + b.y) / 2 + (dx / len) * off;
            const d = 'M' + a.x.toFixed(0) + ',' + a.y.toFixed(0) +
                ' Q' + cx.toFixed(0) + ',' + cy.toFixed(0) +
                ' ' + b.x.toFixed(0) + ',' + b.y.toFixed(0);
            const label = labelOf(line.a) + ' ↔ ' + labelOf(line.b) + (line.note ? '：' + line.note : '');
            parts += '<path d="' + d + '" class="isl-coop-glow"><title>' + label + '</title></path>' +
                '<path d="' + d + '" class="isl-coop-line"><title>' + label + '</title></path>' +
                '<circle cx="' + a.x.toFixed(0) + '" cy="' + a.y.toFixed(0) + '" r="4.5"/>' +
                '<circle cx="' + b.x.toFixed(0) + '" cy="' + b.y.toFixed(0) + '" r="4.5"/>';
            // 線中點的關聯標籤（常駐顯示連到哪兩座島；懸停看說明）
            // 沿弧線外側再推一段，避免與島名牌重疊
            const sgn = off >= 0 ? 1 : -1;
            const mx = (a.x + 2 * cx + b.x) / 4 - (dy / len) * sgn * 24;
            const my = (a.y + 2 * cy + b.y) / 4 + (dx / len) * sgn * 24;
            labels.push('<div class="isl-coop-label" style="left:' + mx.toFixed(0) + 'px; top:' + my.toFixed(0) +
                'px;" title="' + (line.note || '') + '">🔗 ' + labelOf(line.a) + ' ↔ ' + labelOf(line.b) + '</div>');
        });
        if (!parts) return;

        const svg = '<svg class="isl-coop" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' + parts + '</svg>';
        if (routesSvg) routesSvg.insertAdjacentHTML('afterend', svg + labels.join(''));
        else sea.insertAdjacentHTML('afterbegin', svg + labels.join(''));
    }

    // ===================== 環島航路 =====================
    // 淡色點狀航線，由中央廣場依序串過每一座島（畫在島嶼下層）。
    // 未來的「協作線」將以亮色實線疊加在此層之上。
    function drawRoutes() {
        const old = sea.querySelector('.isl-routes');
        if (old) old.remove();

        const towns = Array.prototype.slice.call(sea.querySelectorAll('.isl-town'));
        if (towns.length < 2) return;

        const seaRect = sea.getBoundingClientRect();
        const w = sea.scrollWidth;
        const h = sea.scrollHeight;

        const centers = towns.map(function (t) {
            const r = t.getBoundingClientRect();
            return { x: r.left - seaRect.left + r.width / 2, y: r.top - seaRect.top + r.height / 2 };
        });

        let d = '';
        for (let i = 0; i < centers.length - 1; i++) {
            const a = centers[i], b = centers[i + 1];
            const dx = b.x - a.x, dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            // 控制點往航線垂直方向偏移，左右交替，讓航路蜿蜒
            const off = Math.min(70, len * 0.18) * (i % 2 ? 1 : -1);
            const cx = (a.x + b.x) / 2 - (dy / len) * off;
            const cy = (a.y + b.y) / 2 + (dx / len) * off;
            d += 'M' + a.x.toFixed(0) + ',' + a.y.toFixed(0) +
                ' Q' + cx.toFixed(0) + ',' + cy.toFixed(0) +
                ' ' + b.x.toFixed(0) + ',' + b.y.toFixed(0) + ' ';
        }

        const dots = centers.map(function (c) {
            return '<circle cx="' + c.x.toFixed(0) + '" cy="' + c.y.toFixed(0) + '" r="4" fill="#e8d9a8" opacity="0.5"/>';
        }).join('');

        sea.insertAdjacentHTML('afterbegin',
            '<svg class="isl-routes" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' +
            '<path d="' + d + '" fill="none" stroke="#e8d9a8" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 11" opacity="0.45"/>' +
            dots + '</svg>');
    }

    // ===================== 單座島／廣場 =====================
    function buildIsland(island, posts, unit, isPlaza) {
        const positions = ringPositions(posts.length);
        const maxR = positions.reduce(function (m, p) { return Math.max(m, Math.hypot(p.x, p.y / 0.82)); }, 0);

        // 不可寬過螢幕：必要時縮小此島的建築間距
        const avail = Math.min(window.innerWidth, 1100) - 32;
        unit = Math.min(unit, avail / ((maxR + 1.15) * 2));
        // 廣場詞石多，間距低於下限時字一定重疊：保留最小間距，
        // 寬過螢幕時由外層 .isl-plaza-row 橫向捲動（renderAll 會置中）
        if (isPlaza) unit = Math.max(unit, 52);

        const radius = (maxR + 1.15) * unit;
        const width = radius * 2;
        const height = radius * 2 * 0.82 + 30;

        const el = document.createElement('section');
        el.className = 'isl-island' + (isPlaza ? ' isl-plaza' : '');
        el.dataset.cat = island.cat;
        el.style.setProperty('--island-color', isPlaza ? '#d1902f' : island.top);

        const plaque = document.createElement('div');
        plaque.className = 'isl-plaque';
        plaque.innerHTML = '<span class="isl-plaque-name">' +
            (isPlaza ? '🏛️ 語詞中央廣場' : island.cat) +
            '<span class="isl-plaque-count">' + posts.length + ' 篇</span></span>' +
            (isPlaza ? '<div class="isl-progress" id="isl-progress"></div>' : '');
        el.appendChild(plaque);

        const town = document.createElement('div');
        town.className = 'isl-town';
        town.style.width = width + 'px';
        town.style.height = height + 'px';

        town.insertAdjacentHTML('afterbegin', isPlaza ? plazaSvg(island) : hexSvg(island));

        posts.forEach(function (post, i) {
            const pos = positions[i];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'isl-building' + (isPlaza ? ' isl-stone' : '') + (i % 2 ? ' label-top' : '');
            if (isPlaza && collected.has(post.file)) btn.classList.add('collected');
            btn.dataset.file = post.file;
            btn.style.left = (50 + (pos.x * unit / width) * 100) + '%';
            btn.style.top = (50 + (pos.y * unit / (height - 30)) * 100 - 4) + '%';
            btn.setAttribute('aria-label', post.title || post.file);
            btn.innerHTML = (isPlaza ? stoneSvg() : houseSvg(island.roof)) +
                '<span class="isl-building-label">' +
                (isPlaza ? wordLabel(post.title) : shortLabel(post.title || post.file)) +
                '</span>';
            btn.addEventListener('click', function () { openPanel(post, island, isPlaza); });
            town.appendChild(btn);
        });

        el.appendChild(town);

        // 角色彩蛋：小工人繞著廣場走
        if (isPlaza) spawnCharacter(town, width, height, radius);

        return el;
    }

    // 同心環排列：中心 1 棟，往外每圈最多 6×n 棟；
    // 最外圈若沒排滿，把剩下的棟數均勻繞一整圈分布（避免全部偏向一邊）
    function ringPositions(n) {
        const pos = [{ x: 0, y: 0 }];
        let ring = 1;
        while (pos.length < n) {
            const slots = ring * 6;
            const count = Math.min(slots, n - pos.length);
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2 + (ring % 2 ? -Math.PI / 2 : -Math.PI / 2 + Math.PI / count);
                pos.push({
                    x: ring * Math.cos(angle),
                    y: ring * Math.sin(angle) * 0.82, // 俯視壓扁
                });
            }
            ring++;
        }
        return pos;
    }

    // ===================== 台灣形島嶼 =====================
    // 簡化台灣本島輪廓（北端起點、順時針：東海岸向南 → 鵝鑾鼻 → 西海岸向北）
    // 正規化座標系：寬 0–100、高 0–140
    const TAIWAN_PTS = [
        [58, 3], [65, 5], [70, 10], [73, 18], [73, 28], [71, 40], [68, 52],
        [64, 64], [60, 76], [55, 88], [50, 99], [45, 109], [41, 118],
        [38, 127], [36, 134], [33, 137], [30, 133], [27, 126], [23, 117],
        [19, 107], [15, 96], [12, 84], [11, 72], [12, 60], [15, 48],
        [19, 37], [25, 27], [32, 18], [40, 11], [49, 5],
    ];
    const TAIWAN_SIDE = 7;   // 2.5D 側面厚度（正規化單位）
    const TAIWAN_H = 140;

    function polyArea(pts) {
        let a = 0;
        for (let i = 0; i < pts.length; i++) {
            const j = (i + 1) % pts.length;
            a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
        }
        return Math.abs(a) / 2;
    }

    function polyCentroid(pts) {
        let x = 0, y = 0;
        pts.forEach(function (p) { x += p[0]; y += p[1]; });
        return [x / pts.length, y / pts.length];
    }

    function pointInPoly(x, y, pts) {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
    }

    // 在台灣輪廓內產生 n 個建築位置（交錯網格、由島中心向外填）
    function taiwanSlots(n) {
        const c = polyCentroid(TAIWAN_PTS);
        // 內縮輪廓：建築不貼海岸線
        const inset = TAIWAN_PTS.map(function (p) {
            return [c[0] + (p[0] - c[0]) * 0.82, c[1] + (p[1] - c[1]) * 0.82];
        });
        let d = Math.sqrt(0.83 * polyArea(TAIWAN_PTS) / Math.max(n, 1));
        for (let tries = 0; tries < 10; tries++) {
            const pts = [];
            const rowH = d * 0.866;
            let row = 0;
            for (let y = 3; y <= TAIWAN_H; y += rowH, row++) {
                const offs = (row % 2) * d / 2;
                for (let x = 3 + offs; x <= 100; x += d) {
                    if (pointInPoly(x, y, inset)) pts.push([x, y]);
                }
            }
            if (pts.length >= n) {
                // 由北到南排序後均勻取樣，讓建築像城鎮一樣散布全島（含南端）
                pts.sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
                const step = pts.length / n;
                const chosen = [];
                for (let i = 0; i < n; i++) {
                    chosen.push(pts[Math.floor(i * step + step / 2)]);
                }
                return { pts: chosen, d: d };
            }
            d *= 0.9;
        }
        return { pts: TAIWAN_PTS.slice(0, n).map(function () { return [50, 70]; }), d: d };
    }

    // 2.5D 台灣島面（純裝飾圖形，無文字）
    function taiwanSvg(island) {
        const top = TAIWAN_PTS.map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
        const side = TAIWAN_PTS.map(function (p) { return p[0] + ',' + (p[1] + TAIWAN_SIDE); }).join(' ');
        return '<svg class="isl-hex" viewBox="0 0 100 ' + (TAIWAN_H + TAIWAN_SIDE) + '" preserveAspectRatio="none" aria-hidden="true">' +
            '<polygon points="' + side + '" fill="' + island.side + '"/>' +
            '<polygon points="' + top + '" fill="' + island.top + '" stroke="#e8d9a8" stroke-width="1.2"/>' +
            '</svg>';
    }

    // 建立一座台灣形狀的島
    function buildTaiwanIsland(island, posts, unit) {
        const layout = taiwanSlots(posts.length);

        let pxPerNorm = (unit * 0.95) / layout.d;
        const avail = Math.min(window.innerWidth, 1100) - 32;
        pxPerNorm = Math.min(pxPerNorm, avail / 100);

        const width = 100 * pxPerNorm;
        const height = (TAIWAN_H + TAIWAN_SIDE) * pxPerNorm;

        const el = document.createElement('section');
        el.className = 'isl-island';
        el.dataset.cat = island.cat;
        el.style.setProperty('--island-color', island.top);

        const plaque = document.createElement('div');
        plaque.className = 'isl-plaque';
        plaque.innerHTML = '<span class="isl-plaque-name">' + (island.label || island.cat) +
            '<span class="isl-plaque-count"><span class="isl-read-num">' + readCountOf(island.cat) +
            '</span> / ' + posts.length + ' 篇</span></span>';
        el.appendChild(plaque);

        const town = document.createElement('div');
        town.className = 'isl-town';
        town.style.width = width + 'px';
        town.style.height = height + 'px';
        town.insertAdjacentHTML('afterbegin', taiwanSvg(island));

        posts.forEach(function (post, i) {
            const slot = layout.pts[i];
            const parity = (Math.round(slot[0] / layout.d) + Math.round(slot[1] / (layout.d * 0.866))) % 2;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'isl-building' + (readSet.has(post.file) ? ' visited' : '') + (parity ? ' label-top' : '');
            btn.dataset.file = post.file;
            btn.style.left = (slot[0] * pxPerNorm) + 'px';
            btn.style.top = (slot[1] * pxPerNorm) + 'px';
            btn.setAttribute('aria-label', post.title || post.file);
            btn.innerHTML = houseSvg(island.roof) +
                '<span class="isl-building-label">' + buildingLabel(post.title || post.file, island.cat) + '</span>';
            btn.addEventListener('click', function () { openPanel(post, island, false); });
            town.appendChild(btn);
        });

        el.appendChild(town);

        // 島上小人物：沿海岸線環島走
        if (island.char) spawnIslandWalker(town, island, pxPerNorm);

        return el;
    }

    // 2.5D 圓形石板廣場（純裝飾圖形，無文字）
    function plazaSvg(island) {
        return '<svg class="isl-hex" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
            '<ellipse cx="50" cy="48" rx="48" ry="39.4" fill="' + island.side + '"/>' +
            '<ellipse cx="50" cy="41" rx="48" ry="39.4" fill="' + island.top + '" stroke="#e8d9a8" stroke-width="1.6"/>' +
            '<ellipse cx="50" cy="41" rx="38" ry="31" fill="none" stroke="#b3a478" stroke-width="0.8" stroke-dasharray="3 2"/>' +
            '<ellipse cx="50" cy="41" rx="26" ry="21" fill="none" stroke="#b3a478" stroke-width="0.8" stroke-dasharray="3 2"/>' +
            '</svg>';
    }

    // 小房子圖示（純裝飾圖形，無文字）
    function houseSvg(roof) {
        return '<svg width="30" height="26" viewBox="0 0 30 26" aria-hidden="true">' +
            '<rect x="6" y="11" width="18" height="13" rx="1.5" fill="#f5efe0" stroke="#8a7a55" stroke-width="1"/>' +
            '<polygon points="3,12 15,2 27,12" fill="' + roof + '" stroke="#5f4632" stroke-width="1"/>' +
            '<rect x="12.5" y="16" width="5" height="8" fill="#8a7a55"/>' +
            '</svg>';
    }

    // 詞石圖示（收集前灰石、收集後金石，由 CSS 控制填色）
    function stoneSvg() {
        return '<svg width="26" height="22" viewBox="0 0 26 22" aria-hidden="true">' +
            '<ellipse cx="13" cy="19" rx="11" ry="3" fill="rgba(0,0,0,0.18)"/>' +
            '<path class="stone-body" d="M4 16 Q2 8 8 5 Q13 1 19 5 Q24 8 22 16 Q21 20 13 20 Q5 20 4 16 Z" stroke="#56524a" stroke-width="1"/>' +
            '<path class="stone-shine" d="M8 7 Q11 4 15 6" fill="none" stroke-width="1.4" stroke-linecap="round"/>' +
            '</svg>';
    }

    // 建築短標籤：去掉開頭【系列】前綴
    function shortLabel(title) {
        return title.replace(/^【[^】]*】\s*/, '').trim() || title;
    }

    // 建築標籤：去掉開頭的集數編號（EP. 01、80.、123-2. 等），只留名稱
    // 例外：A郎片頭尾每集名稱都一樣（答嘴鼓），保留集數以便區分
    const KEEP_NUMBER_CATS = ['A郎片頭尾'];
    function buildingLabel(title, cat) {
        let t = shortLabel(title || '');
        if (KEEP_NUMBER_CATS.indexOf(cat) !== -1) {
            return t.replace(/^EP[.．]?\s*(\d+)\s*/i, 'EP.$1 ').trim();
        }
        t = t.replace(/^EP[.．]?\s*\d+\s*[-－.．]?\s*/i, '');
        t = t.replace(/^\d+(?:[-－]\d+)*\s*[.．]\s*/, '');
        return t.trim() || shortLabel(title || '');
    }

    // 詞石標籤：取出詞本身
    // 例：「【A郎台語小詞典】 EP. 01-坐賬/Chhē-siàu」→「坐賬」；「【台語語詞】27.面模á」→「面模á」
    function wordLabel(title) {
        let t = shortLabel(title || '');
        t = t.replace(/^EP\.?\s*\d+\s*[-－]?\s*/i, '');
        t = t.replace(/^\d+\s*[.．]\s*/, '');
        return t.split('/')[0].trim() || t;
    }

    // ===================== 角色（每座島一個小人物） =====================
    const walkers = [];       // 各角色的移動函數（每影格呼叫，參數為經過秒數）
    let walkRaf = null;
    let walkLastTs = 0;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function walkTick(ts) {
        const dt = walkLastTs ? Math.min(0.1, (ts - walkLastTs) / 1000) : 0.016;
        walkLastTs = ts;
        walkers.forEach(function (fn) { fn(dt); });
        walkRaf = requestAnimationFrame(walkTick);
    }

    function startWalkers() {
        if (!walkRaf && !reduceMotion && walkers.length) {
            walkLastTs = 0;
            walkRaf = requestAnimationFrame(walkTick);
        }
    }

    function stopWalkers() {
        if (walkRaf) { cancelAnimationFrame(walkRaf); walkRaf = null; }
        walkers.length = 0;
    }

    // 建立角色按鈕（圖、對話泡泡、點擊講話）
    function makeCharacter(town, imgSrc, isRound, flip, greet) {
        const guy = document.createElement('button');
        guy.type = 'button';
        guy.className = 'isl-character';
        guy.setAttribute('aria-label', greet + '（點我）');
        guy.innerHTML = '<img class="' + (isRound ? 'isl-character-img' : 'isl-char-fig' + (flip ? ' isl-char-flip' : '')) +
            '" src="' + imgSrc + '" alt="">' +
            '<span class="isl-bubble" hidden></span>';
        town.appendChild(guy);

        const bubble = guy.querySelector('.isl-bubble');
        guy.addEventListener('click', function () {
            const lines = [greet + '！'].concat(CHARACTER_LINES);
            bubble.textContent = lines[Math.floor(Math.random() * lines.length)];
            bubble.hidden = false;
            clearTimeout(bubble._t);
            bubble._t = setTimeout(function () { bubble.hidden = true; }, 3200);
        });
        return guy;
    }

    // 漫步行為：走一段 → 停下歇睏 → 再走，速度平滑加減速（較自然）
    // 若角色設有坐姿圖（guy.dataset.sitSrc），歇睏時換成坐姿、起行換回走路圖
    function makeStroll(guy, cruise, advance) {
        let speed = 0;
        let target = cruise;
        let modeLeft = 2 + Math.random() * 4;   // 此狀態剩餘秒數
        let resting = false;
        const img = guy.querySelector('img');

        return function (dt) {
            modeLeft -= dt;
            if (modeLeft <= 0) {
                resting = !resting;
                target = resting ? 0 : cruise * (0.8 + Math.random() * 0.4);
                modeLeft = resting ? 1.5 + Math.random() * 3 : 3 + Math.random() * 5;
                guy.classList.toggle('resting', resting);
                if (guy.dataset.sitSrc && img) {
                    img.src = resting ? guy.dataset.sitSrc : guy.dataset.walkSrc;
                }
            }
            speed += (target - speed) * Math.min(1, dt * 2.5); // 平滑加減速
            if (speed > 0.01) advance(speed * dt);
        };
    }

    // 方向感知視圖：依平滑後的行進方向切換 前／後／側（側面依朝向翻面）
    // 回傳一個以「目前座標」呼叫的更新函數；island 需有 views 設定
    function makeViewUpdater(guy, island) {
        const img = guy.querySelector('img');
        if (!island.views || !img) return function () {};
        Object.keys(island.views).forEach(function (k) {   // 預先載入，切換不閃爍
            const pre = new Image(); pre.src = island.views[k];
        });
        let prev = null, vx = 0, vy = 0, view = 'side', since = 99;
        return function (p) {
            if (prev) {
                vx = vx * 0.85 + (p[0] - prev[0]) * 0.15;
                vy = vy * 0.85 + (p[1] - prev[1]) * 0.15;
                since++;
                let want = (Math.abs(vy) > Math.abs(vx) * 1.2) ? (vy < 0 ? 'back' : 'front') : 'side';
                if (want !== view && since > 30) { view = want; since = 0; }
                if (!guy.classList.contains('resting')) {
                    const src = island.views[view];
                    if (img.getAttribute('src') !== src) img.src = src;
                    const facesLeft = island.sideFaces === 'left';
                    img.classList.toggle('isl-flip', view === 'side' && (facesLeft ? vx > 0 : vx < 0));
                }
            }
            prev = p;
        };
    }

    // 廣場角色：囡仔 A郎（三視圖）繞橢圓走
    function spawnCharacter(town, width, height, radius) {
        const guy = makeCharacter(town, PLAZA.char, false, false, '歡迎來到語詞中央廣場');
        const updateView = makeViewUpdater(guy, PLAZA);
        const cx = width / 2;
        const cy = (height - 30) / 2;
        const rx = radius * 0.86;
        const ry = radius * 0.86 * 0.82;
        let theta = -Math.PI / 2;

        function place() {
            const x = cx + rx * Math.cos(theta);
            const y = cy + ry * Math.sin(theta);
            setCharPos(guy, x, y);
            updateView([x, y]);
        }
        place();
        walkers.push(makeStroll(guy, 0.25, function (d) { theta += d; place(); }));
    }

    // 以 transform 定位（交給合成器處理，移動較滑順）
    function setCharPos(guy, x, y) {
        guy.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%, -85%)';
    }

    // 台灣輪廓周長（供島上角色沿海岸線行走）
    const TAIWAN_PERIM = (function () {
        const segs = [];
        let total = 0;
        for (let i = 0; i < TAIWAN_PTS.length; i++) {
            const a = TAIWAN_PTS[i];
            const b = TAIWAN_PTS[(i + 1) % TAIWAN_PTS.length];
            const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
            segs.push({ a: a, b: b, start: total, len: len });
            total += len;
        }
        return { segs: segs, total: total };
    })();

    function taiwanPointAt(dist) {
        let d = dist % TAIWAN_PERIM.total;
        if (d < 0) d += TAIWAN_PERIM.total;
        for (let i = 0; i < TAIWAN_PERIM.segs.length; i++) {
            const s = TAIWAN_PERIM.segs[i];
            if (d <= s.start + s.len) {
                const t = (d - s.start) / s.len;
                return [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t];
            }
        }
        return [50, 70];
    }

    // 島嶼角色：沿著台灣海岸線環島走
    function spawnIslandWalker(town, island, pxPerNorm) {
        const guy = makeCharacter(town, island.char, !!island.round, !!island.flip, '歡迎來到「' + (island.label || island.cat) + '」');
        if (island.sit) {
            guy.dataset.walkSrc = island.char;
            guy.dataset.sitSrc = island.sit;
            // 預先載入坐姿圖，切換時不閃爍
            const pre = new Image();
            pre.src = island.sit;
        }

        let dist = Math.random() * TAIWAN_PERIM.total;
        const updateView = makeViewUpdater(guy, island);

        function place() {
            const p = taiwanPointAt(dist);
            setCharPos(guy, p[0] * pxPerNorm, p[1] * pxPerNorm);
            updateView(p);
        }
        place();
        // 巡航速度（正規化單位／秒），各島略有差異
        const cruise = 6 + Math.random() * 3;
        walkers.push(makeStroll(guy, cruise, function (d) { dist += d; place(); }));
    }

    // ===================== 文章關聯（cooplinks.json） =====================
    const postByFile = {};
    const linkIndex = {};   // file → [{file, note}]

    let coopLinks = [];

    function buildLinkIndex(links) {
        coopLinks = links || [];
        coopLinks.forEach(function (l) {
            (linkIndex[l.a] = linkIndex[l.a] || []).push({ file: l.b, note: l.note });
            (linkIndex[l.b] = linkIndex[l.b] || []).push({ file: l.a, note: l.note });
        });
    }

    // 「顯示全部關聯線」開關（預設隱藏，避免地圖雜亂）
    let showAllLinks = false;

    function drawAllRelationLines() {
        sea.querySelectorAll('.isl-hl-all').forEach(function (el) { el.remove(); });
        if (!showAllLinks) return;
        const seaRect = sea.getBoundingClientRect();
        function posOf(el) {
            const r = el.getBoundingClientRect();
            return { x: r.left - seaRect.left + r.width / 2, y: r.top - seaRect.top + r.height / 2 };
        }
        let paths = '';
        coopLinks.forEach(function (l) {
            const ea = sea.querySelector('.isl-building[data-file="' + l.a + '"]');
            const eb = sea.querySelector('.isl-building[data-file="' + l.b + '"]');
            if (!ea || !eb) return;
            const a = posOf(ea), b = posOf(eb);
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2 - Math.min(70, Math.hypot(b.x - a.x, b.y - a.y) * 0.15);
            paths += '<path d="M' + a.x.toFixed(0) + ',' + a.y.toFixed(0) +
                ' Q' + mx.toFixed(0) + ',' + my.toFixed(0) +
                ' ' + b.x.toFixed(0) + ',' + b.y.toFixed(0) + '"/>';
        });
        if (!paths) return;
        sea.insertAdjacentHTML('beforeend',
            '<svg class="isl-hl-all" width="' + sea.scrollWidth + '" height="' + sea.scrollHeight +
            '" viewBox="0 0 ' + sea.scrollWidth + ' ' + sea.scrollHeight + '" aria-hidden="true">' + paths + '</svg>');
    }

    (function initLinkToggle() {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'isl-linkbtn';
        btn.textContent = '🔗 顯示關聯線';
        btn.addEventListener('click', function () {
            showAllLinks = !showAllLinks;
            btn.textContent = showAllLinks ? '🔗 隱藏關聯線' : '🔗 顯示關聯線';
            btn.classList.toggle('on', showAllLinks);
            drawAllRelationLines();
        });
        document.body.appendChild(btn);
    })();

    // 滑鼠移到建築上：亮起它與相關建築之間的線（桌機彩蛋）
    function showRelationLines(fromBtn) {
        hideRelationLines();
        const file = fromBtn.dataset.file;
        const rels = linkIndex[file];
        if (!rels) return;
        const seaRect = sea.getBoundingClientRect();
        function posOf(el) {
            const r = el.getBoundingClientRect();
            return { x: r.left - seaRect.left + r.width / 2, y: r.top - seaRect.top + r.height / 2 };
        }
        const a = posOf(fromBtn);
        let paths = '';
        rels.forEach(function (rel) {
            const target = sea.querySelector('.isl-building[data-file="' + rel.file + '"]');
            if (!target) return;
            target.classList.add('isl-rel');
            const b = posOf(target);
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2 - Math.min(70, Math.hypot(b.x - a.x, b.y - a.y) * 0.18);
            paths += '<path d="M' + a.x.toFixed(0) + ',' + a.y.toFixed(0) +
                ' Q' + mx.toFixed(0) + ',' + my.toFixed(0) +
                ' ' + b.x.toFixed(0) + ',' + b.y.toFixed(0) + '"/>';
        });
        if (!paths) return;
        sea.insertAdjacentHTML('beforeend',
            '<svg class="isl-hl" width="' + sea.scrollWidth + '" height="' + sea.scrollHeight +
            '" viewBox="0 0 ' + sea.scrollWidth + ' ' + sea.scrollHeight + '" aria-hidden="true">' + paths + '</svg>');
    }

    function hideRelationLines() {
        sea.querySelectorAll('.isl-hl').forEach(function (el) { el.remove(); });
        sea.querySelectorAll('.isl-building.isl-rel').forEach(function (el) { el.classList.remove('isl-rel'); });
    }

    sea.addEventListener('mouseover', function (e) {
        const btn = e.target.closest ? e.target.closest('.isl-building') : null;
        if (btn && btn.dataset.file && linkIndex[btn.dataset.file]) showRelationLines(btn);
    });
    sea.addEventListener('mouseout', function (e) {
        if (e.target.closest && e.target.closest('.isl-building')) hideRelationLines();
    });

    // ===================== 面板 =====================
    function openPanel(post, island, isPlaza) {
        let html = '';
        html += '<span class="isl-p-cat" style="--island-color:' + island.top + '">' + (island.label || island.cat) + '</span>';
        html += '<div class="isl-p-title">' + (post.title || post.file) + '</div>';
        if (post.date) html += '<div class="isl-p-date">📅 ' + post.date + '</div>';
        if (isPlaza) html += '<div class="isl-p-collected">✨ 詞語「' + wordLabel(post.title) + '」已收入你ê詞袋！</div>';
        if (post.image) html += '<img class="isl-p-img" src="' + post.image + '" alt="" loading="lazy" onerror="this.remove()">';
        const desc = post.excerpt || post.description || '';
        if (desc) html += '<div class="isl-p-desc">' + desc + '</div>';
        html += '<a class="isl-p-read" href="article.html?file=' + encodeURIComponent(post.file) + '">📖 閱讀文章</a>';
        // 相關文章（協作關聯；只列站上已發佈的）
        const rels = (linkIndex[post.file] || []).filter(function (r) { return postByFile[r.file]; });
        if (rels.length) {
            html += '<div class="isl-p-audio-title">🔗 相關文章（點擊跳到該建築）：</div><ul class="isl-p-rel">';
            rels.forEach(function (r) {
                html += '<li><button type="button" class="isl-p-rel-jump" data-file="' + r.file + '" title="' + (r.note || '') + '">' +
                    (postByFile[r.file].title || r.file) + '</button></li>';
            });
            html += '</ul>';
        }
        html += '<div class="isl-p-audio-title">收聽本篇：</div>';
        html += '<div class="isl-p-audio" id="isl-p-audio">尋揣音檔中⋯⋯</div>';

        panelBody.innerHTML = html;
        panel.hidden = false;
        backdrop.hidden = false;
        panel.scrollTop = 0;

        if (isPlaza) collectWord(post.file);
        else markRead(post.file, island.cat);
        loadAudioLinks(post.file);
    }

    // 從該篇 markdown 內文抽取各平台音檔連結
    function loadAudioLinks(file) {
        fetch('./markdowns/' + file + '.md')
            .then(function (r) { return r.ok ? r.text() : Promise.reject(); })
            .then(function (text) {
                const box = document.getElementById('isl-p-audio');
                if (!box) return;
                const links = [];
                PLATFORMS.forEach(function (p) {
                    const m = text.match(p.re);
                    if (m) {
                        const url = m[0].replace(/[)"'\].,]+$/, '');
                        links.push('<a href="' + url + '" target="_blank" rel="noopener">' + p.name + '</a>');
                    }
                });
                box.innerHTML = links.length
                    ? links.join('')
                    : '<span class="isl-p-noaudio">此篇為純文字文章，無音檔。</span>';
            })
            .catch(function () {
                const box = document.getElementById('isl-p-audio');
                if (box) box.innerHTML = '<span class="isl-p-noaudio">音檔資訊載入失敗。</span>';
            });
    }

    // 地圖跳轉：捲到目標建築、閃光提示，並開啟它的面板（解決關聯兩端距離太遠的問題）
    function jumpToBuilding(file) {
        const btn = sea.querySelector('.isl-building[data-file="' + file + '"]');
        if (!btn) return;
        closePanel();
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        btn.classList.add('isl-ping');
        setTimeout(function () { btn.classList.remove('isl-ping'); }, 2600);
        setTimeout(function () { btn.click(); }, 700);
    }

    panelBody.addEventListener('click', function (e) {
        const j = e.target.closest ? e.target.closest('.isl-p-rel-jump') : null;
        if (j) jumpToBuilding(j.dataset.file);
    });

    function closePanel() {
        panel.hidden = true;
        backdrop.hidden = true;
    }

    document.getElementById('isl-panel-close').addEventListener('click', closePanel);
    backdrop.addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
})();
