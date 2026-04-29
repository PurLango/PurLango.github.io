let groupsData = [];
let currentFilter = 'all';
let previousPage = 'home';
const AVATAR_CACHE_VERSION = '20260410-4';

function getAvatarUrl(path) {
    if (!path) return '';
    return path.includes('?') ? path : `${path}?v=${AVATAR_CACHE_VERSION}`;
}

async function loadGroupsData() {
    try {
        const response = await fetch('./yundai-qianli-groups.json');
        groupsData = await response.json();
        renderGroups(groupsData.groups);
        renderTimeline(groupsData.groups);
    } catch (error) {
        console.error('Failed to load data:', error);
        document.getElementById('groups-grid').innerHTML =
            '<p style="text-align:center;color:var(--text-secondary);grid-column:1/-1;padding:40px;">数据加载失败，请检查JSON文件</p>';
    }
}

function createGroupCard(group) {
    const avatarUrl = getAvatarUrl(group.avatar);
    const tagsHtml = group.tags.slice(0, 3).map(tag =>
        `<span class="tag">${tag}</span>`
    ).join('');
    const isDead = group.status === 'dead';
    const isPrivate = group.status === 'private';
    const canJoin = !(isDead || isPrivate);
    const joinBtn = canJoin
        ? `<a class="action-btn join" href="https://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=${group.qqNumber}&group_code=${group.qqNumber}" target="_blank" onclick="event.stopPropagation()">打开QQ</a>`
        : `<button class="action-btn disabled" type="button" onclick="event.stopPropagation()">private</button>`;
    const actionsHtml = !canJoin
        ? `<div class="card-actions single">${joinBtn}</div>`
        : `<div class="card-actions">
                    <button class="action-btn copy" type="button" onclick="copyGroupQQ(event, '${group.qqNumber}', this)">
                        一键复制群号
                    </button>
                    ${joinBtn}
                </div>`;

    return `
        <div class="group-card" onclick="showDetail('${group.id}')">
            <div class="card-cover">
                <img src="${avatarUrl}" alt="${group.name}" class="avatar-img" />
                <div class="cover-overlay"></div>
                <span class="card-badge">${group.gameType}</span>
            </div>
            <div class="card-body">
                <div class="card-top">
                    <h3 class="card-title">${group.name}</h3>
                    <span class="card-short">${group.shortName}</span>
                </div>
                <p class="card-description">${group.description}</p>
                <div class="card-footer">
                    ${canJoin ? `<div class="qq-number">
                    <span>👥</span>
                    <span>QQ: ${group.qqNumber}</span>
                </div>` : ''}
                    <div class="tags">${tagsHtml}</div>
                </div>
                ${actionsHtml}
            </div>
        </div>
    `;
}

function renderGroups(groups) {
    const grid = document.getElementById('groups-grid');
    if (groups.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-secondary);grid-column:1/-1;padding:40px;">暂无匹配的群聊</p>';
        return;
    }
    grid.innerHTML = groups.map(createGroupCard).join('');
}

function getGroupYear(group) {
    if (!group || !group.createdAt) return '';
    const year = new Date(group.createdAt).getFullYear();
    return Number.isNaN(year) ? '' : String(year);
}

function filterGroups(filterType) {
    currentFilter = filterType;

    document.querySelectorAll('.filter-btn').forEach(btn => {
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

    // 年鉴页面始终显示所有群聊，不受过滤影响
    if (document.getElementById('timeline-content')) {
        renderTimeline(groupsData.groups);
    }
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
        container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:40px;">暂无群聊数据</p>';
        return;
    }

    let previousYear = '';
    container.innerHTML = sorted.map((group) => {
        const avatarUrl = getAvatarUrl(group.avatar);
        const year = getGroupYear(group);
        const isDead = group.status === 'dead';
        const isPrivate = group.status === 'private';
        const yearDivider = previousYear === year ? '' : `
            <div class="timeline-year-divider">
                <span class="timeline-year-label">${year}</span>
            </div>
        `;
        previousYear = year;

        return `
            ${yearDivider}
            <div class="timeline-item" onclick="showDetail('${group.id}')">
                <div class="timeline-dot"></div>
                <div class="timeline-card">
                    <div class="timeline-date">📅 ${formatDate(group.createdAt)}</div>
                    <div class="timeline-card-header">
                        <div class="timeline-avatar">
                            <img src="${avatarUrl}" alt="${group.name}" class="avatar-img" />
                        </div>
                        <div>
                            <div class="timeline-card-title">${group.name}</div>
                            <div class="timeline-card-meta">${group.gameType} · 群主: ${group.owner}${isDead || isPrivate ? '' : ` · QQ: ${group.qqNumber}`}</div>
                        </div>
                    </div>
                    <p class="timeline-card-desc">${group.description}</p>
                    <span class="timeline-arrow">→</span>
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

    let qqDisplay = group.qqNumber;
    if (isHidden) qqDisplay = '非公开';

    const detailContent = document.getElementById('detail-content');
    detailContent.innerHTML = `
        <div class="detail-hero">
            <div class="detail-cover">
                <img src="${avatarUrl}" alt="${group.name}" class="avatar-img" />
                <div class="cover-overlay"></div>
            </div>
            <div class="detail-header">
                <div class="detail-avatar">
                    <img src="${avatarUrl}" alt="${group.name}" class="avatar-img" />
                </div>
                <div>
                    <h2 class="detail-name">${group.name}</h2>
                    <span class="detail-short-name">${group.shortName} · ${group.gameType}</span>
                </div>
            </div>
        </div>
        <div class="detail-info">
            <div class="info-row">
                <span class="info-label">👥 QQ群号</span>
                <span class="info-value">${qqDisplay}</span>
            </div>
            <div class="info-row">
                <span class="info-label">👑 群主</span>
                <span class="info-value">${group.owner}</span>
            </div>
            <div class="info-row">
                <span class="info-label">📅 建群时间</span>
                <span class="info-value">${group.createdAt}</span>
            </div>
            <div class="info-row">
                <span class="info-label">🏷️ 标签</span>
                <div class="tags">${group.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
            </div>
        </div>
        <div class="detail-description">
            <strong>📝 群简介</strong><br><br>
            ${group.description}
        </div>
        ${isHidden ? '' : `<a href="https://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=${group.qqNumber}&group_code=${group.qqNumber}" target="_blank" class="join-btn">
            🚀 点击加入QQ群
        </a>`}
    `;

    showPage('detail');

    // 初始化评论组件
    if (window.CommentsComponent) {
        CommentsComponent.init(groupId);
    }
}

function copyGroupQQ(event, text, element) {
    event.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
        const originalText = element.textContent;
        element.textContent = '已复制';
        setTimeout(() => {
            element.textContent = originalText;
        }, 1200);
    });
}

function copyToClipboard(text, element) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = element.textContent;
        element.textContent = '已复制 ✓';
        element.style.background = 'rgba(0, 206, 201, 0.3)';
        setTimeout(() => {
            element.textContent = originalText;
            element.style.background = '';
        }, 1500);
    });
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) targetPage.classList.add('active');

    const navLink = document.querySelector(`.nav-links a[data-page="${pageId}"]`);
    if (navLink) navLink.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (pageId === 'home' || pageId === 'about' || pageId === 'timeline') {
        document.querySelector('.nav-links').classList.remove('show');
    }
}

function toggleMenu() {
    document.querySelector('.nav-links').classList.toggle('show');
}

function dismissSplash() {
    const splashScreen = document.getElementById('splash-screen');
    if (!splashScreen || splashScreen.classList.contains('hidden')) return;

    splashScreen.classList.add('hidden');

    setTimeout(() => {
        splashScreen.style.display = 'none';
    }, 800);
}

document.addEventListener('DOMContentLoaded', () => {
    loadGroupsData();

    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        splashScreen.addEventListener('click', dismissSplash);
    }
});
