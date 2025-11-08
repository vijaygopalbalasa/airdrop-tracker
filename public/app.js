const API_BASE = '/api';

let currentFilters = {
    category: '',
    status: '',
    platform: ''
};

// Load opportunities
async function loadOpportunities() {
    const loadingEl = document.getElementById('loading');
    const emptyEl = document.getElementById('empty');
    const opportunitiesEl = document.getElementById('opportunities');

    loadingEl.style.display = 'block';
    emptyEl.style.display = 'none';
    opportunitiesEl.innerHTML = '';

    try {
        const params = new URLSearchParams();
        if (currentFilters.category) params.append('category', currentFilters.category);
        if (currentFilters.status) params.append('status', currentFilters.status);
        if (currentFilters.platform) params.append('platform', currentFilters.platform);

        const response = await fetch(`${API_BASE}/opportunities?${params}`);
        const result = await response.json();

        loadingEl.style.display = 'none';

        if (result.success && result.data.length > 0) {
            renderOpportunities(result.data);
        } else {
            emptyEl.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading opportunities:', error);
        loadingEl.style.display = 'none';
        emptyEl.textContent = 'Error loading opportunities. Please try again.';
        emptyEl.style.display = 'block';
    }
}

// Render opportunities
function renderOpportunities(opportunities) {
    const opportunitiesEl = document.getElementById('opportunities');

    opportunities.forEach(opp => {
        const card = document.createElement('div');
        card.className = 'opportunity-card';

        const priorityClass = opp.priority >= 70 ? 'high' : opp.priority >= 40 ? 'medium' : 'low';
        const priorityLabel = opp.priority >= 70 ? 'High' : opp.priority >= 40 ? 'Medium' : 'Low';

        card.innerHTML = `
            <div class="opportunity-header">
                <span class="category-badge category-${opp.category}">${opp.category}</span>
                <span class="priority-badge priority-${priorityClass}">${priorityLabel} Priority</span>
            </div>
            <div class="opportunity-title">${opp.title}</div>
            <div class="opportunity-description">${opp.description}</div>
            ${opp.deadline ? `<div class="deadline">⏰ ${opp.deadline}</div>` : ''}
            <div class="opportunity-meta">
                <span>${opp.source_platform} • ${new Date(opp.created_at).toLocaleDateString()}</span>
                ${opp.source_url ? `<a href="${opp.source_url}" target="_blank" class="source-link">View Source</a>` : ''}
            </div>
            <div class="opportunity-actions">
                <button class="status-btn interested" onclick="updateStatus(${opp.id}, 'interested')">⭐ Interested</button>
                <button class="status-btn applied" onclick="updateStatus(${opp.id}, 'applied')">✅ Applied</button>
                <button class="status-btn ignored" onclick="updateStatus(${opp.id}, 'ignored')">❌ Ignore</button>
            </div>
        `;

        opportunitiesEl.appendChild(card);
    });
}

// Update opportunity status
async function updateStatus(id, status) {
    try {
        const response = await fetch(`${API_BASE}/opportunities/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            loadOpportunities();
            loadStats();
        }
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const result = await response.json();

        if (result.success) {
            const stats = result.data;
            document.getElementById('totalCount').textContent = stats.total;
            document.getElementById('weekCount').textContent = stats.lastWeek;

            const newCount = stats.byCategory.reduce((sum, cat) => sum + cat.count, 0);
            document.getElementById('newCount').textContent = stats.total;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Event listeners
document.getElementById('categoryFilter').addEventListener('change', (e) => {
    currentFilters.category = e.target.value;
    loadOpportunities();
});

document.getElementById('statusFilter').addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    loadOpportunities();
});

document.getElementById('platformFilter').addEventListener('change', (e) => {
    currentFilters.platform = e.target.value;
    loadOpportunities();
});

document.getElementById('refreshBtn').addEventListener('click', () => {
    loadOpportunities();
    loadStats();
});

// Initial load
loadOpportunities();
loadStats();

// Auto-refresh every 2 minutes
setInterval(() => {
    loadOpportunities();
    loadStats();
}, 120000);
