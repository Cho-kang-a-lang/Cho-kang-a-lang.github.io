/* ==========================================================================
   台語世界政策島（原型） island.js
   - 三座島：台語講怪奇、民間故事、台灣舊地號名
   - 建築由 posts.json＋frontmatter 自動產生（重用 posts-loader.js，
     已含預約發布過濾：date 在未來的文章不會出現）
   - 點建築開啟面板：標題、摘要、文章連結、音檔連結（音檔於開啟時
     從該篇 markdown 內文抽取）
   ========================================================================== */

(function () {
    'use strict';

    // 三座原型島的設定（color 用於島面與面板分類色）
    const ISLANDS = [
        { cat: '台語講怪奇',   top: '#3f9e6e', side: '#2c6e4d', roof: '#b5543b' },
        { cat: '民間故事',     top: '#4f9e58', side: '#377040', roof: '#7a5bb5' },
        { cat: '台灣舊地號名', top: '#8a9e4f', side: '#5f7038', roof: '#3b7ab5' },
    ];

    // 音檔平台的抽取規則（連結在各篇 markdown 內文開頭的圖示連結中）
    const PLATFORMS = [
        { name: '▶ YouTube',        re: /https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s"'<>)\]]+/ },
        { name: '🎙 SoundOn',       re: /https?:\/\/(?:player\.soundon\.fm|sndn\.link)[^\s"'<>)\]]+/ },
        { name: '🎧 Spotify',       re: /https?:\/\/(?:open\.spotify\.com|spoti\.fi)[^\s"'<>)\]]+/ },
        { name: '🎵 KKBOX',         re: /https?:\/\/podcast\.kkbox\.com[^\s"'<>)\]]+/ },
        { name: '🍎 Apple Podcast', re: /https?:\/\/podcasts\.apple\.com[^\s"'<>)\]]+/ },
    ];

    const sea = document.getElementById('isl-sea');
    const panel = document.getElementById('isl-panel');
    const panelBody = document.getElementById('isl-panel-body');
    const backdrop = document.getElementById('isl-backdrop');

    let allPosts = [];

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

    // ===================== 繪製所有島 =====================
    let lastWidth = 0;

    function renderAll() {
        // 依視窗寬度決定建築間距（手機縮小）
        const unit = window.innerWidth < 520 ? 44 : 60;
        if (window.innerWidth === lastWidth && sea.querySelector('.isl-island')) return;
        lastWidth = window.innerWidth;

        sea.innerHTML = '';
        ISLANDS.forEach(function (island) {
            const posts = allPosts
                .filter(function (p) { return p.categories && p.categories.indexOf(island.cat) !== -1; })
                .sort(function (a, b) { return a.file.localeCompare(b.file, 'en', { numeric: true }); });
            if (posts.length > 0) sea.appendChild(buildIsland(island, posts, unit));
        });
    }

    // ===================== 單座島 =====================
    function buildIsland(island, posts, unit) {
        const positions = ringPositions(posts.length);
        const maxR = positions.reduce(function (m, p) { return Math.max(m, Math.hypot(p.x, p.y / 0.82)); }, 0);

        // 大島不可寬過螢幕：必要時縮小此島的建築間距
        const avail = Math.min(window.innerWidth, 1100) - 32;
        unit = Math.min(unit, avail / ((maxR + 1.15) * 2));

        // 島面半徑：最外圈建築再加一圈餘裕
        const radius = (maxR + 1.15) * unit;
        const width = radius * 2;
        const height = radius * 2 * 0.82 + 30; // 俯視壓扁 + 側面厚度

        const el = document.createElement('section');
        el.className = 'isl-island';
        el.style.setProperty('--island-color', island.top);

        const plaque = document.createElement('div');
        plaque.className = 'isl-plaque';
        plaque.innerHTML = '<span class="isl-plaque-name">' + island.cat +
            '<span class="isl-plaque-count">' + posts.length + ' 篇</span></span>';
        el.appendChild(plaque);

        const town = document.createElement('div');
        town.className = 'isl-town';
        town.style.width = width + 'px';
        town.style.height = height + 'px';

        town.insertAdjacentHTML('afterbegin', hexSvg(island));

        posts.forEach(function (post, i) {
            const pos = positions[i];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'isl-building';
            btn.style.left = (50 + (pos.x * unit / width) * 100) + '%';
            btn.style.top = (50 + (pos.y * unit / (height - 30)) * 100 - 4) + '%';
            btn.setAttribute('aria-label', post.title || post.file);
            btn.innerHTML = houseSvg(island.roof) +
                '<span class="isl-building-label">' + shortLabel(post.title || post.file) + '</span>';
            btn.addEventListener('click', function () { openPanel(post, island); });
            town.appendChild(btn);
        });

        el.appendChild(town);
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

    // 小房子圖示（純裝飾圖形，無文字）
    function houseSvg(roof) {
        return '<svg width="30" height="26" viewBox="0 0 30 26" aria-hidden="true">' +
            '<rect x="6" y="11" width="18" height="13" rx="1.5" fill="#f5efe0" stroke="#8a7a55" stroke-width="1"/>' +
            '<polygon points="3,12 15,2 27,12" fill="' + roof + '" stroke="#5f4632" stroke-width="1"/>' +
            '<rect x="12.5" y="16" width="5" height="8" fill="#8a7a55"/>' +
            '</svg>';
    }

    // 建築短標籤：去掉開頭【系列】前綴
    function shortLabel(title) {
        return title.replace(/^【[^】]*】\s*/, '').trim() || title;
    }

    // ===================== 面板 =====================
    function openPanel(post, island) {
        let html = '';
        html += '<span class="isl-p-cat" style="--island-color:' + island.top + '">' + island.cat + '</span>';
        html += '<div class="isl-p-title">' + (post.title || post.file) + '</div>';
        if (post.date) html += '<div class="isl-p-date">📅 ' + post.date + '</div>';
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
