// 用户兑换页面JavaScript

// HTML转义函数 - 防止XSS攻击
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) {
        return '';
    }
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 全局变量
let currentEmail = '';
let currentCode = '';
let availableTeams = [];
let selectedTeamId = null;

// Toast提示函数
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-circle';

    toast.innerHTML = `<i data-lucide="${icon}"></i><span>${message}</span>`;
    toast.className = `toast ${type} show`;

    if (window.lucide) {
        lucide.createIcons();
    }

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 切换步骤
function showStep(stepNumber) {
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
        step.style.display = ''; // 清除内联样式，交由CSS类控制显隐
    });
    const targetStep = document.getElementById(`step${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
    }
}

// 返回步骤1
function backToStep1() {
    showStep(1);
    selectedTeamId = null;
}

// 步骤1: 验证兑换码并直接兑换
document.getElementById('verifyForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const code = document.getElementById('code').value.trim();
    const verifyBtn = document.getElementById('verifyBtn');

    // 验证
    if (!email || !code) {
        showToast('请填写完整信息', 'error');
        return;
    }

    // 保存到全局变量
    currentEmail = email;
    currentCode = code;

    // 禁用按钮
    verifyBtn.disabled = true;
    verifyBtn.textContent = '正在兑换...';

    // 直接调用兑换接口 (team_id = null 表示自动选择)
    await confirmRedeem(null);

    // 恢复按钮状态 (如果 confirmRedeem 失败并显示了错误也没关系，因为用户可以点返回重试)
    verifyBtn.disabled = false;
    verifyBtn.textContent = '验证兑换码';
});

// 渲染Team列表
function renderTeamsList() {
    const teamsList = document.getElementById('teamsList');
    teamsList.innerHTML = '';

    availableTeams.forEach(team => {
        const teamCard = document.createElement('div');
        teamCard.className = 'team-card';
        teamCard.onclick = () => selectTeam(team.id);

        const planBadge = team.subscription_plan === 'Plus' ? 'badge-plus' : 'badge-pro';

        teamCard.innerHTML = `
            <div class="team-name">${escapeHtml(team.team_name) || 'Team ' + team.id}</div>
            <div class="team-info">
                <div class="team-info-item">
                    <i data-lucide="users" class="icon-xxs"></i>
                    <span>${team.current_members}/${team.max_members} 成员</span>
                </div>
                <div class="team-info-item">
                    <span class="team-badge ${planBadge}">${escapeHtml(team.subscription_plan) || 'Plus'}</span>
                </div>
                ${team.expires_at ? `
                <div class="team-info-item">
                    <i data-lucide="calendar" class="icon-xxs"></i>
                    <span>到期: ${formatDate(team.expires_at)}</span>
                </div>
                ` : ''}
            </div>
        `;

        teamsList.appendChild(teamCard);
        if (window.lucide) lucide.createIcons();
    });
}

// 选择Team
function selectTeam(teamId) {
    selectedTeamId = teamId;

    // 更新UI
    document.querySelectorAll('.team-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');

    // 立即确认兑换
    confirmRedeem(teamId);
}

// 自动选择Team
function autoSelectTeam() {
    if (availableTeams.length === 0) {
        showToast('没有可用的 Team', 'error');
        return;
    }

    // 自动选择第一个Team(后端会按过期时间排序)
    confirmRedeem(null);
}

// 确认兑换
async function confirmRedeem(teamId) {
    console.log('Starting redemption process, teamId:', teamId);

    // Safety check: Ensure confirmRedeem doesn't run if already running? 
    // The button disable logic handles that.

    try {
        const response = await fetch('/redeem/confirm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: currentEmail,
                code: currentCode,
                team_id: teamId
            })
        });

        console.log('Response status:', response.status);

        let data;
        const text = await response.text();
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse response JSON:', text);
            throw new Error('服务器响应格式错误');
        }

        if (response.ok && data.success) {
            // 兑换成功
            console.log('Redemption success');
            showSuccessResult(data);
        } else {
            // 兑换失败
            console.warn('Redemption failed:', data);

            // Extract error message safely
            let errorMessage = '兑换失败';

            if (data.detail) {
                if (typeof data.detail === 'string') {
                    errorMessage = data.detail;
                } else if (Array.isArray(data.detail)) {
                    // Handle FastAPI validation errors (array of objects)
                    errorMessage = data.detail.map(err => err.msg || JSON.stringify(err)).join('; ');
                } else {
                    errorMessage = JSON.stringify(data.detail);
                }
            } else if (data.error) {
                errorMessage = data.error;
            }

            showErrorResult(errorMessage);
        }
    } catch (error) {
        console.error('Network or logic error:', error);
        showErrorResult(error.message || '网络错误,请稍后重试');
    }
}

// 显示成功结果
function showSuccessResult(data) {
    const resultContent = document.getElementById('resultContent');
    const teamInfo = data.team_info || {};

    resultContent.innerHTML = `
        <div class="result-success">
            <div class="result-icon success"><i data-lucide="check-circle"></i></div>
            <div class="result-title success">兑换成功!</div>
            <div class="result-message">${escapeHtml(data.message) || '您已成功加入 Team'}</div>

            <div class="result-details">
                <div class="result-detail-item">
                    <span class="result-detail-label">Team 名称</span>
                    <span class="result-detail-value">${escapeHtml(teamInfo.team_name) || '-'}</span>
                </div>
                <div class="result-detail-item">
                    <span class="result-detail-label">邮箱地址</span>
                    <span class="result-detail-value">${escapeHtml(currentEmail)}</span>
                </div>
                ${teamInfo.expires_at ? `
                <div class="result-detail-item">
                    <span class="result-detail-label">到期时间</span>
                    <span class="result-detail-value">${formatDate(teamInfo.expires_at)}</span>
                </div>
                ` : ''}
            </div>

            <p class="result-hint">
                <i data-lucide="mail" class="icon-xxs"></i>
                邀请邮件已发送到您的邮箱，请查收并按照邮件指引接受邀请。
            </p>

            <div class="result-support">
                <p>
                    <strong>没收到邀请邮件？</strong><br>
                    如果您在 1-5 分钟后仍未收到邮件（或被拦截），请前往“质保查询”进行自助修复。
                </p>
                <button onclick="goToWarrantyFromSuccess()" class="btn btn-secondary btn-dashed">
                    <i data-lucide="shield"></i> 前往质保查询 / 自助修复
                </button>
            </div>

            <button onclick="location.reload()" class="btn btn-primary">
                <i data-lucide="refresh-cw"></i> 再次兑换
            </button>
        </div>
    `;
    if (window.lucide) lucide.createIcons();

    showStep(3);
}

// 显示错误结果
function showErrorResult(errorMessage) {
    const resultContent = document.getElementById('resultContent');

    resultContent.innerHTML = `
        <div class="result-error">
            <div class="result-icon error"><i data-lucide="x-circle"></i></div>
            <div class="result-title">兑换失败</div>
            <div class="result-message">${escapeHtml(errorMessage)}</div>

            <div class="result-actions">
                <button onclick="backToStep1()" class="btn btn-secondary">
                    <i data-lucide="arrow-left"></i> 返回重试
                </button>
                <button onclick="location.reload()" class="btn btn-primary">
                    <i data-lucide="rotate-ccw"></i> 重新开始
                </button>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();

    showStep(3);
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '-';

    try {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return dateString;
    }
}

function getTeamStatusInfo(teamStatus) {
    if (teamStatus === 'active') return { className: 'status-active', label: '正常' };
    if (teamStatus === 'full') return { className: 'status-full', label: '已满' };
    if (teamStatus === 'banned') return { className: 'status-banned', label: '封号' };
    if (teamStatus === 'error') return { className: 'status-error', label: '异常' };
    if (teamStatus === 'expired') return { className: 'status-expired', label: '过期' };
    return { className: 'status-unknown', label: teamStatus || '未知' };
}

// ========== 质保查询功能 ==========

// 查询质保状态
async function checkWarranty() {
    const input = document.getElementById('warrantyInput').value.trim();

    // 验证输入
    if (!input) {
        showToast('请输入原兑换码或邮箱进行查询', 'error');
        return;
    }

    let email = null;
    let code = null;

    // 简单判断是邮箱还是兑换码
    if (input.includes('@')) {
        email = input;
    } else {
        code = input;
    }

    const checkBtn = document.getElementById('checkWarrantyBtn');
    checkBtn.disabled = true;
    checkBtn.innerHTML = '<i data-lucide="loader" class="spinning"></i> 查询中...';
    if (window.lucide) lucide.createIcons();

    try {
        const response = await fetch('/warranty/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email || null,
                code: code || null
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showWarrantyResult(data);
        } else {
            showToast(data.error || data.detail || '查询失败', 'error');
        }
    } catch (error) {
        showToast('网络错误，请稍后重试', 'error');
    } finally {
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i data-lucide="search"></i> 查询质保状态';
        if (window.lucide) lucide.createIcons();
    }
}

// 显示质保查询结果
function showWarrantyResult(data) {
    const warrantyContent = document.getElementById('warrantyContent');

    // 处理“虚假成功自愈”后的特殊提示
    if ((!data.records || data.records.length === 0) && data.can_reuse) {
        warrantyContent.innerHTML = `
            <div class="result-info">
                <div class="result-icon success"><i data-lucide="check-circle"></i></div>
                <div class="result-title success">修复成功！</div>
                <div class="notice-panel notice-panel-success">
                    <p class="notice-text">
                    ${escapeHtml(data.message || '系统检测到异常并已自动修复')}
                    </p>
                </div>

                <div class="notice-panel text-left">
                    <div class="summary-label">请复制您的兑换码返回主页重试：</div>
                    <div class="code-copy-wrap">
                        <input type="text" value="${escapeHtml(data.original_code)}" readonly 
                            class="code-copy-input">
                        <button onclick="copyWarrantyCode('${escapeHtml(data.original_code)}')" class="btn btn-secondary btn-xs">
                            <i data-lucide="copy"></i> 复制
                        </button>
                    </div>
                </div>

                <div class="actions">
                    <button onclick="backToStep1()" class="btn btn-primary">
                        <i data-lucide="arrow-left"></i> 立即返回重兑
                    </button>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    if (!data.records || data.records.length === 0) {
        warrantyContent.innerHTML = `
            <div class="result-info">
                <div class="result-icon muted"><i data-lucide="info"></i></div>
                <div class="result-title">未找到兑换记录</div>
                <div class="result-message">${escapeHtml(data.message || '未找到相关记录')}</div>
            </div>
        `;
    } else {
        // 1. 顶部状态概览 (如果有质保码)
        let summaryHtml = '';
        if (data.has_warranty) {
            const warrantyStatus = data.warranty_valid ?
                '<span class="badge badge-success">✓ 质保有效</span>' :
                '<span class="badge badge-error">✗ 质保已过期</span>';

            summaryHtml = `
                <div class="warranty-summary">
                    <div class="warranty-summary-grid">
                        <div>
                            <div class="summary-label">当前质保状态</div>
                            <div class="summary-value">${warrantyStatus}</div>
                        </div>
                        ${data.warranty_expires_at ? `
                        <div>
                            <div class="summary-label">质保到期时间</div>
                            <div class="summary-value">${formatDate(data.warranty_expires_at)}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // 2. 兑换记录列表
        const recordsHtml = `
            <div class="records-section">
                <h4 class="records-section-title">我的兑换记录</h4>
                <div class="records-stack">
                    ${data.records.map(record => {
            const typeMarker = record.has_warranty ?
                '<span class="badge badge-warranty">质保码</span>' :
                '<span class="badge badge-normal">常规码</span>';
            const teamStatus = getTeamStatusInfo(record.team_status);
            const warrantyStateClass = record.warranty_valid ? 'warranty-valid' : 'warranty-expired';

            return `
                            <div class="record-card">
                                <div class="record-head">
                                    <div class="record-code">${escapeHtml(record.code || '-')}</div>
                                    <div>${typeMarker}</div>
                                </div>
                                <div class="record-grid">
                                    <div class="record-field">
                                        <div class="record-label">加入 Team</div>
                                         <div class="record-value team-line">
                                             <span>${escapeHtml(record.team_name || '未知 Team')}</span>
                                             <span class="status-dot ${teamStatus.className}">● ${escapeHtml(teamStatus.label)}</span>
                                             ${(record.has_warranty && record.warranty_valid && record.team_status === 'banned') ? `
                                             <button onclick="oneClickReplace('${escapeHtml(record.code)}', '${escapeHtml(record.email || currentEmail)}')" class="btn btn-xs btn-primary">
                                                 一键换车
                                             </button>
                                             ` : ''}
                                         </div>
                                     </div>
                                     <div class="record-field">
                                         <div class="record-label">兑换时间</div>
                                         <div class="record-value">${formatDate(record.used_at)}</div>
                                     </div>
                                     <div class="record-field span-2">
                                         <div class="record-label">Team 到期</div>
                                         <div class="record-value">${formatDate(record.team_expires_at)}</div>
                                     </div>
                                    ${record.has_warranty ? `
                                    <div class="record-field span-2">
                                        <div class="record-label">质保到期</div>
                                        <div class="record-value ${warrantyStateClass}">
                                            ${record.warranty_expires_at ? `${formatDate(record.warranty_expires_at)} ${record.warranty_valid ? '(有效)' : '(已过期)'}` : '尚未开始计算 (首次使用后开启)'}
                                        </div>
                                    </div>
                                    ` : ''}
                                     <div class="record-field span-2">
                                     <div class="record-foot">
                                         <div>
                                             <div class="record-label">设备身份验证 (Codex)</div>
                                             <div class="record-value">
                                                 ${record.device_code_auth_enabled ? '<span class="auth-status-enabled">已开启</span>' : '<span class="auth-status-disabled">未开启</span>'}
                                             </div>
                                         </div>
                                         ${(!record.device_code_auth_enabled && record.team_status !== 'banned' && record.team_status !== 'expired') ? `
                                         <button onclick="enableUserDeviceAuth(${record.team_id}, '${escapeHtml(record.code)}', '${escapeHtml(record.email)}')" class="btn btn-xs btn-primary">
                                             一键开启
                                         </button>
                                         ` : ''}
                                     </div>
                                     </div>
                                 </div>
                             </div>
                         `;
        }).join('')}
                </div>
            </div>
        `;

        // 3. 可重兑区域
        const canReuseHtml = data.can_reuse ? `
            <div class="notice-panel notice-panel-success">
                <div class="notice-header success">
                    <i data-lucide="check-circle" class="icon-sm"></i>
                    <span>发现失效 Team，质保可触发</span>
                </div>
                <p class="notice-text">
                    监测到您所在的 Team 已失效。由于您的质保码仍在有效期内，您可以立即复制兑换码进行重兑。
                </p>
                <div class="code-copy-wrap">
                    <input type="text" value="${escapeHtml(data.original_code)}" readonly 
                        class="code-copy-input">
                    <button onclick="copyWarrantyCode('${escapeHtml(data.original_code)}')" class="btn btn-secondary btn-xs">
                        <i data-lucide="copy"></i> 复制
                    </button>
                </div>
            </div>
        ` : '';

        warrantyContent.innerHTML = `
            <div class="warranty-view">
                ${summaryHtml}
                ${recordsHtml}
                ${canReuseHtml}
                <div class="actions">
                    <button onclick="backToStep1()" class="btn btn-secondary">
                        <i data-lucide="arrow-left"></i> 返回兑换
                    </button>
                </div>
            </div>
        `;
    }

    if (window.lucide) lucide.createIcons();

    // 显示质保结果区域
    document.querySelectorAll('.step').forEach(step => step.style.display = 'none');
    document.getElementById('warrantyResult').style.display = 'block';
}

// 复制质保兑换码
function copyWarrantyCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showToast('兑换码已复制到剪贴板', 'success');
    }).catch(() => {
        showToast('复制失败，请手动复制', 'error');
    });
}

// 一键换车
async function oneClickReplace(code, email) {
    if (!code || !email) {
        showToast('无法获取完整信息，请手动重试', 'error');
        return;
    }

    // 更新全局变量
    currentEmail = email;
    currentCode = code;

    // 填充Step1表单 (以便如果失败返回可以看到)
    const emailInput = document.getElementById('email');
    const codeInput = document.getElementById('code');
    if (emailInput) emailInput.value = email;
    if (codeInput) codeInput.value = code;

    const btn = event.currentTarget;
    const originalContent = btn.innerHTML;

    // 禁用所有按钮防止重复提交
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="spinning"></i> 处理中...';
    if (window.lucide) lucide.createIcons();

    showToast('正在为您尝试自动兑换...', 'info');

    try {
        // 直接调用confirmRedeem，传入null表示自动选择Team
        await confirmRedeem(null);
    } catch (e) {
        console.error(e);
        showToast('一键换车请求失败', 'error');
    } finally {
        // 如果页面未跳转（失败情况），恢复按钮
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalContent;
            if (window.lucide) lucide.createIcons();
        }
    }
}

// 用户一键开启设备身份验证
async function enableUserDeviceAuth(teamId, code, email) {
    if (!confirm('确定要在该 Team 中开启设备代码身份验证吗？')) {
        return;
    }

    const btn = event.currentTarget;
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="spinning"></i> 开启中...';
    if (window.lucide) lucide.createIcons();

    try {
        const response = await fetch('/warranty/enable-device-auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                team_id: teamId,
                code: code,
                email: email
            })
        });

        const data = await response.json();
        if (response.ok && data.success) {
            showToast(data.message || '开启成功', 'success');
            // 刷新当前状态
            checkWarranty();
        } else {
            showToast(data.error || data.detail || '开启失败', 'error');
            btn.disabled = false;
            btn.innerHTML = originalContent;
            if (window.lucide) lucide.createIcons();
        }
    } catch (error) {
        showToast('网络错误，请稍后重试', 'error');
        btn.disabled = false;
        btn.innerHTML = originalContent;
        if (window.lucide) lucide.createIcons();
    }
}

// 从成功页面跳转到质保查询
function goToWarrantyFromSuccess() {
    const warrantyInput = document.getElementById('warrantyInput');
    // 优先填入邮箱，因为邮箱查询更全面
    warrantyInput.value = currentEmail || currentCode || '';

    // 切换视图
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById('step1').classList.add('active');
    document.getElementById('step3').style.display = 'none';

    // 滚动到质保区域
    const warrantySection = document.querySelector('.warranty-section');
    if (warrantySection) {
        warrantySection.scrollIntoView({ behavior: 'smooth' });
    }

    // 自动触发查询
    checkWarranty();
}
