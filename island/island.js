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

    // 中央廣場（詞語收集）
    const PLAZA = { cat: 'A郎台語小詞典', top: '#c9b98a', side: '#9a8a5e', roof: '#8f8f98' };

    // 各島設定（top=島面、side=側面厚度、roof=屋頂）
    const ISLANDS = [
        { cat: '台語講怪奇',   top: '#3f9e6e', side: '#2c6e4d', roof: '#b5543b' },
        { cat: '民間故事',     top: '#4f9e58', side: '#377040', roof: '#7a5bb5' },
        { cat: '白蔥仔公主',   top: '#6aa06a', side: '#4a7347', roof: '#c75d8a' },
        { cat: '英國囡仔古',   top: '#56a083', side: '#3b7260', roof: '#4a7fc1' },
        { cat: 'A郎',          top: '#4a9e8e', side: '#337066', roof: '#d1902f' },
        { cat: 'A郎片頭尾',    top: '#5d9e7c', side: '#41705a', roof: '#9e5dc1' },
        { cat: '台灣舊地號名', top: '#8a9e4f', side: '#5f7038', roof: '#3b7ab5' },
        { cat: '台語語詞',     top: '#9e9a4f', side: '#706d38', roof: '#2f9e75' },
        { cat: '平台散文',     top: '#7c9e5d', side: '#587041', roof: '#b5763b' },
        { cat: '相招來看戲',   top: '#669e94', side: '#487068', roof: '#c14a4a' },
        { cat: '其他',         top: '#74937c', side: '#526858', roof: '#6b7fc1' },
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

    const COLLECT_KEY = 'chokangalang_island_words';

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

    // ===================== 初始化 =====================
    document.addEventListener('DOMContentLoaded', async function () {
        try {
            const data = await loadPostsData(); // posts-loader.js（已過濾未發布文章）
            allPosts = data._posts || [];
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

    function postsOf(cat) {
        return allPosts
            .filter(function (p) { return p.categories && p.categories.indexOf(cat) !== -1; })
            .sort(function (a, b) { return a.file.localeCompare(b.file, 'en', { numeric: true }); });
    }

    // ===================== 繪製整個世界 =====================
    let lastWidth = 0;

    function renderAll() {
        const unit = window.innerWidth < 520 ? 44 : 60;
        if (window.innerWidth === lastWidth && sea.querySelector('.isl-island')) return;
        lastWidth = window.innerWidth;

        stopCharacter();
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
        }

        // 各島
        ISLANDS.forEach(function (island) {
            const posts = postsOf(island.cat);
            if (posts.length > 0) sea.appendChild(buildIsland(island, posts, unit, false));
        });

        updateProgress();
    }

    // ===================== 單座島／廣場 =====================
    function buildIsland(island, posts, unit, isPlaza) {
        const positions = ringPositions(posts.length);
        const maxR = positions.reduce(function (m, p) { return Math.max(m, Math.hypot(p.x, p.y / 0.82)); }, 0);

        // 不可寬過螢幕：必要時縮小此島的建築間距
        const avail = Math.min(window.innerWidth, 1100) - 32;
        unit = Math.min(unit, avail / ((maxR + 1.15) * 2));

        const radius = (maxR + 1.15) * unit;
        const width = radius * 2;
        const height = radius * 2 * 0.82 + 30;

        const el = document.createElement('section');
        el.className = 'isl-island' + (isPlaza ? ' isl-plaza' : '');
        el.style.setProperty('--island-color', isPlaza ? '#d1902f' : island.top);

        const plaque = document.createElement('div');
        plaque.className = 'isl-plaque';
        plaque.innerHTML = '<span class="isl-plaque-name">' +
            (isPlaza ? '🏛️ 小詞典中央廣場' : island.cat) +
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
            btn.className = 'isl-building' + (isPlaza ? ' isl-stone' : '');
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

    // 同心六角環排列：中心 1 棟，往外每圈 6×n 棟
    function ringPositions(n) {
        const pos = [{ x: 0, y: 0 }];
        let ring = 1;
        while (pos.length < n) {
            const count = ring * 6;
            for (let i = 0; i < count && pos.length < n; i++) {
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

    // 2.5D 六角島面（純裝飾圖形，無文字）
    function hexSvg(island) {
        const pts = [];
        const ptsSide = [];
        for (let i = 0; i < 6; i++) {
            const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
            const x = 50 + 48 * Math.cos(a);
            const y = 41 + 48 * 0.82 * Math.sin(a);
            pts.push(x.toFixed(1) + ',' + y.toFixed(1));
            ptsSide.push(x.toFixed(1) + ',' + (y + 9).toFixed(1));
        }
        return '<svg class="isl-hex" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
            '<polygon points="' + ptsSide.join(' ') + '" fill="' + island.side + '"/>' +
            '<polygon points="' + pts.join(' ') + '" fill="' + island.top + '" stroke="#e8d9a8" stroke-width="1.6"/>' +
            '</svg>';
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

    // 詞石標籤：取出詞本身（例：「【A郎台語小詞典】 EP. 01-坐賬/Chhē-siàu」→「坐賬」）
    function wordLabel(title) {
        let t = shortLabel(title || '');
        t = t.replace(/^EP\.?\s*\d+\s*[-－]?\s*/i, '');
        return t.split('/')[0].trim() || t;
    }

    // ===================== 角色彩蛋 =====================
    let charTimer = null;

    function spawnCharacter(town, width, height, radius) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const guy = document.createElement('button');
        guy.type = 'button';
        guy.className = 'isl-character';
        guy.setAttribute('aria-label', '做工á人（點我）');
        guy.innerHTML = characterSvg() + '<span class="isl-bubble" hidden></span>';
        town.appendChild(guy);

        const bubble = guy.querySelector('.isl-bubble');
        guy.addEventListener('click', function () {
            bubble.textContent = CHARACTER_LINES[Math.floor(Math.random() * CHARACTER_LINES.length)];
            bubble.hidden = false;
            clearTimeout(bubble._t);
            bubble._t = setTimeout(function () { bubble.hidden = true; }, 3200);
        });

        // 繞著廣場外緣走（半徑略小於島緣）
        const cx = width / 2;
        const cy = (height - 30) / 2;
        const rx = radius * 0.86;
        const ry = radius * 0.86 * 0.82;
        let theta = -Math.PI / 2;

        function step() {
            theta += 0.012;
            const x = cx + rx * Math.cos(theta);
            const y = cy + ry * Math.sin(theta);
            const facing = Math.cos(theta + Math.PI / 2) >= 0 ? 1 : -1; // 行進方向
            guy.style.left = x + 'px';
            guy.style.top = y + 'px';
            guy.style.setProperty('--facing', facing);
        }

        step(); // 先放到定位
        if (!reduceMotion) charTimer = setInterval(step, 50);
    }

    function stopCharacter() {
        if (charTimer) { clearInterval(charTimer); charTimer = null; }
    }

    // 做工á人小工人（戴斗笠；純裝飾圖形，無文字）
    function characterSvg() {
        return '<svg width="30" height="38" viewBox="0 0 30 38" aria-hidden="true" class="isl-character-svg">' +
            '<ellipse cx="15" cy="36" rx="9" ry="2.2" fill="rgba(0,0,0,0.25)"/>' +
            '<g class="isl-char-body">' +
            '<rect x="10.5" y="26" width="3.6" height="9" rx="1.6" fill="#4a5568"/>' +
            '<rect x="15.9" y="26" width="3.6" height="9" rx="1.6" fill="#4a5568"/>' +
            '<rect x="8.5" y="15" width="13" height="13" rx="3" fill="#2f6fb5"/>' +
            '<circle cx="15" cy="11" r="5.5" fill="#f0c9a0"/>' +
            '<path d="M3.5 10 Q15 1 26.5 10 L24 11.5 Q15 5.5 6 11.5 Z" fill="#d9b35c" stroke="#a8863c" stroke-width="0.8"/>' +
            '<ellipse cx="15" cy="4.8" rx="4.2" ry="2.4" fill="#d9b35c" stroke="#a8863c" stroke-width="0.8"/>' +
            '<circle cx="13" cy="11.5" r="0.8" fill="#333"/>' +
            '<circle cx="17" cy="11.5" r="0.8" fill="#333"/>' +
            '<path d="M13 14 Q15 15.5 17 14" fill="none" stroke="#333" stroke-width="0.8" stroke-linecap="round"/>' +
            '</g></svg>';
    }

    // ===================== 面板 =====================
    function openPanel(post, island, isPlaza) {
        let html = '';
        html += '<span class="isl-p-cat" style="--island-color:' + island.top + '">' + island.cat + '</span>';
        html += '<div class="isl-p-title">' + (post.title || post.file) + '</div>';
        if (post.date) html += '<div class="isl-p-date">📅 ' + post.date + '</div>';
        if (isPlaza) html += '<div class="isl-p-collected">✨ 詞語「' + wordLabel(post.title) + '」已收入你ê詞袋！</div>';
        if (post.image) html += '<img class="isl-p-img" src="' + post.image + '" alt="" loading="lazy" onerror="this.remove()">';
        const desc = post.excerpt || post.description || '';
        if (desc) html += '<div class="isl-p-desc">' + desc + '</div>';
        html += '<a class="isl-p-read" href="article.html?file=' + encodeURIComponent(post.file) + '">📖 閱讀文章</a>';
        html += '<div class="isl-p-audio-title">收聽本篇：</div>';
        html += '<div class="isl-p-audio" id="isl-p-audio">尋揣音檔中⋯⋯</div>';

        panelBody.innerHTML = html;
        panel.hidden = false;
        backdrop.hidden = false;
        panel.scrollTop = 0;

        if (isPlaza) collectWord(post.file);
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

    function closePanel() {
        panel.hidden = true;
        backdrop.hidden = true;
    }

    document.getElementById('isl-panel-close').addEventListener('click', closePanel);
    backdrop.addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
})();
