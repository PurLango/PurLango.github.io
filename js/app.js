let groupsData = [];
let currentFilter = 'all';
let previousPage = 'home';
const AVATAR_CACHE_VERSION = '20260429-5';
const LARGE_CARD_INDICES = new Set([]);
const TAG_COLORS = ['tag-cyan', 'tag-orange', 'tag-violet', 'tag-red'];

function getAvatarUrl(path) {
    if (!path) return '';
    return path.includes('?') ? path : `${path}?v=${AVATAR_CACHE_VERSION}`;
}

function getTagColor(index) {
    return TAG_COLORS[index % TAG_COLORS.length];
}

async function loadGroupsData() {
    try {
        const response = await fetch('./yundai-qianli-groups.json');
        groupsData = await response.json();
        renderGroups(groupsData.groups);
        renderTimeline(groupsData.groups);
        animateHeroCounters();
    } catch (error) {
        console.error('Failed to load data:', error);
        document.getElementById('groups-grid').innerHTML =
            '<p style="text-align:center;color:var(--text-2);grid-column:1/-1;padding:40px;">数据加载失败，请检查JSON文件</p>';
    }
}

function createGroupCard(group, index) {
    const avatarUrl = getAvatarUrl(group.avatar);
    const isDead = group.status === 'dead';
    const isPrivate = group.status === 'private';
    const canJoin = !(isDead || isPrivate);

    const tagsHtml = group.tags.slice(0, 3).map((tag, i) =>
        `<span class="tag ${getTagColor(i)}">${tag}</span>`
    ).join('');

    const joinBtn = canJoin
        ? `<a class="act-btn join" href="https://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=${group.qqNumber}&group_code=${group.qqNumber}" target="_blank" onclick="event.stopPropagation()">打开QQ</a>`
        : `<button class="act-btn locked" type="button" onclick="event.stopPropagation()">未公开</button>`;

    const actionsHtml = !canJoin
        ? `<div class="card-actions single">${joinBtn}</div>`
        : `<div class="card-actions">
                <button class="act-btn copy" type="button" onclick="copyGroupQQ(event, '${group.qqNumber}', this)">复制群号</button>
                ${joinBtn}
            </div>`;

    return `
        <div class="group-card" onclick="showDetail('${group.id}')" style="animation-delay: ${index * 60}ms">
            <div class="card-cover">
                <img src="${avatarUrl}" alt="${group.name}" class="avatar-img" />
                <div class="cover-fade"></div>
                <span class="card-type-badge">${group.gameType}</span>
            </div>
            <div class="card-body">
                <div class="card-head">
                    <span class="card-name">${group.name}</span>
                    <span class="card-abbr">${group.shortName}</span>
                </div>
                <p class="card-desc">${group.description}</p>
                <div class="card-meta">
                    ${canJoin ? `<span class="card-qq">QQ: ${group.qqNumber}</span>` : '<span></span>'}
                    <div class="card-tags">${tagsHtml}</div>
                </div>
                ${actionsHtml}
            </div>
        </div>
    `;
}

function renderGroups(groups) {
    const grid = document.getElementById('groups-grid');
    const countEl = document.getElementById('group-count');

    if (countEl) countEl.textContent = `${groups.length} 个群聊`;

    if (groups.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-2);grid-column:1/-1;padding:40px;">暂无匹配的群聊</p>';
        return;
    }
    grid.innerHTML = groups.map((g, i) => createGroupCard(g, i)).join('');
    initScrollAnimations();
}

function getGroupYear(group) {
    if (!group || !group.createdAt) return '';
    const year = new Date(group.createdAt).getFullYear();
    return Number.isNaN(year) ? '' : String(year);
}

function filterGroups(filterType) {
    currentFilter = filterType;

    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filterType);
    });

    const groups = Array.isArray(groupsData.groups) ? groupsData.groups : [];
    const filtered = filterType === 'all'
        ? groups
        : groups.filter(g => {
            const tags = Array.isArray(g.tags) ? g.tags : [];
            return g.gameType === filterType || tags.includes(filterType);
        });

    renderGroups(filtered);
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

function renderTimeline(groups) {
    const container = document.getElementById('timeline-content');
    if (!container) return;

    const sorted = [...groups].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (sorted.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-2);padding:40px;">暂无群聊数据</p>';
        return;
    }

    let previousYear = '';
    let sideIndex = 0;
    container.innerHTML = sorted.map((group) => {
        const avatarUrl = getAvatarUrl(group.avatar);
        const year = getGroupYear(group);
        const isDead = group.status === 'dead';
        const isPrivate = group.status === 'private';
        const isHidden = isDead || isPrivate;

        const yearDivider = previousYear === year ? '' : `
            <div class="tl-year-marker">
                <span class="tl-year-badge">${year}</span>
            </div>
        `;
        previousYear = year;

        const side = sideIndex % 2 === 0 ? 'tl-left' : 'tl-right';
        sideIndex++;

        return `
            ${yearDivider}
            <div class="tl-item ${side}" onclick="showDetail('${group.id}')">
                <div class="tl-content">
                    <div class="tl-date">${formatDate(group.createdAt)}</div>
                    <div class="tl-head">
                        <div class="tl-avatar">
                            <img src="${avatarUrl}" alt="${group.name}" class="avatar-img" />
                        </div>
                        <div>
                            <div class="tl-name">${group.name}</div>
                            <div class="tl-meta">${group.gameType} · 群主: ${group.owner}${isHidden ? '' : ` · QQ: ${group.qqNumber}`}</div>
                        </div>
                    </div>
                    <p class="tl-desc">${group.description}</p>
                    <span class="tl-arrow">→</span>
                </div>
                <div class="tl-dot-wrap">
                    <div class="tl-dot"></div>
                </div>
            </div>
        `;
    }).join('');
}

function showDetail(groupId) {
    const group = groupsData.groups.find(g => g.id === groupId);
    if (!group) return;

    const activePage = document.querySelector('.page.active');
    if (activePage) {
        previousPage = activePage.id.replace('page-', '');
    }

    const avatarUrl = getAvatarUrl(group.avatar);
    const isDead = group.status === 'dead';
    const isPrivate = group.status === 'private';
    const isHidden = isDead || isPrivate;
    let qqDisplay = isHidden ? '非公开' : group.qqNumber;

    const tagsHtml = group.tags.map((t, i) =>
        `<span class="tag ${getTagColor(i)}">${t}</span>`
    ).join('');

    const detailContent = document.getElementById('detail-content');
    detailContent.innerHTML = `
        <div class="detail-visual">
            <img src="${avatarUrl}" alt="${group.name}" class="avatar-img" />
            <div class="detail-visual-fade"></div>
            <span class="detail-type-badge">${group.gameType}</span>
        </div>
        <div class="detail-info-side">
            <h2 class="detail-name">${group.name}</h2>
            <span class="detail-abbr">${group.shortName}</span>
            <div class="detail-rows">
                <div class="detail-row">
                    <span class="detail-row-label">QQ群号</span>
                    <span class="detail-row-value">${qqDisplay}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-row-label">群主</span>
                    <span class="detail-row-value">${group.owner}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-row-label">建群时间</span>
                    <span class="detail-row-value">${group.createdAt}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-row-label">标签</span>
                    <div class="card-tags">${tagsHtml}</div>
                </div>
            </div>
            <div class="detail-desc-block">
                <div class="detail-desc-label">群简介</div>
                <p class="detail-desc-text">${group.description}</p>
            </div>
            ${isHidden ? '' : `<div class="detail-join-area">
                <a href="https://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=${group.qqNumber}&group_code=${group.qqNumber}" target="_blank" class="detail-join-btn">
                    加入QQ群
                </a>
            </div>`}
        </div>
    `;

    showPage('detail');

    if (window.CommentsComponent) {
        CommentsComponent.init(groupId);
    }
}

function copyGroupQQ(event, text, element) {
    event.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
        const originalText = element.textContent;
        element.textContent = '已复制';
        element.style.color = 'var(--green)';
        setTimeout(() => {
            element.textContent = originalText;
            element.style.color = '';
        }, 1200);
    });
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));

    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) targetPage.classList.add('active');

    const navLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
    if (navLink) navLink.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const mobileMenu = document.getElementById('mobile-menu');
    const menuBtn = document.querySelector('.menu-btn');
    if (mobileMenu) mobileMenu.classList.remove('open');
    if (menuBtn) menuBtn.classList.remove('active');
}

function toggleMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const menuBtn = document.querySelector('.menu-btn');
    if (mobileMenu) mobileMenu.classList.toggle('open');
    if (menuBtn) menuBtn.classList.toggle('active');
}

function dismissSplash() {
    const splashScreen = document.getElementById('splash-screen');
    if (!splashScreen || splashScreen.classList.contains('hidden')) return;
    splashScreen.classList.add('hidden');
    setTimeout(() => { splashScreen.style.display = 'none'; }, 800);
}

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.scroll-entry').forEach(el => {
        el.classList.remove('visible');
        observer.observe(el);
    });
}

function animateHeroCounters() {
    document.querySelectorAll('.hero-stat-num[data-count]').forEach(el => {
        const target = parseInt(el.dataset.count, 10);
        if (isNaN(target)) return;

        const duration = 1200;
        const start = performance.now();

        function step(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * target);

            el.textContent = target > 100 ? current : current;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = target;
            }
        }
        requestAnimationFrame(step);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadGroupsData();

    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        splashScreen.addEventListener('click', dismissSplash);
    }

    initScrollAnimations();
});