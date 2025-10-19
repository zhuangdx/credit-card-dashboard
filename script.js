document.addEventListener('DOMContentLoaded', () => {
    // --- Auth Check ---
    const token = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // --- DOM Elements ---
    const userInfo = document.getElementById('user-info');
    const logoutBtn = document.getElementById('logout-btn');
    const cardInputsContainer = document.getElementById('card-inputs');
    const addCardButton = document.getElementById('add-card');
    const resultsTableBody = document.querySelector('#results-table tbody');
    const importFileInput = document.getElementById('import-file-input');
    const importBtn = document.getElementById('import-btn');
    
    const specificDateInput = document.getElementById('transaction-date');
    const calculateSpecificDateButton = document.getElementById('calculate-specific-date');
    const specificResultsContainer = document.getElementById('specific-results-container');
    const specificResultsTableBody = document.querySelector('#specific-results-table tbody');

    // --- API & State ---
    const API_BASE_URL = 'http://localhost:3000/api';
    let cards = []; // Local cache of card data

    // --- Helper Functions ---
    const apiFetch = async (endpoint, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

        if (response.status === 401) {
            // Token expired or invalid
            localStorage.clear();
            window.location.href = '/login.html';
            throw new Error('Unauthorized');
        }
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'API request failed');
        }
        return response.json();
    };

    // --- Calculation Logic (remains client-side) ---
    const calculatePeriods = (transactionDate, cardsData) => {
        const results = [];
        cardsData.forEach(card => {
            const { name, billing_day, repayment_day, current_bill_amount, unbilled_amount } = card;

            const transYear = transactionDate.getFullYear();
            const transMonth = transactionDate.getMonth();
            const transDay = transactionDate.getDate();

            let billDate = new Date(transYear, transMonth, billing_day);
            if (transDay > billing_day) {
                billDate.setMonth(billDate.getMonth() + 1);
            }

            let repaymentDate = new Date(billDate.getFullYear(), billDate.getMonth(), repayment_day);
            if (repayment_day <= billing_day) {
                repaymentDate.setMonth(repaymentDate.getMonth() + 1);
            }

            const startOfDayTransaction = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
            const diffTime = repaymentDate - startOfDayTransaction;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            results.push({
                name,
                repaymentDate: repaymentDate.toLocaleDateString('zh-CN'),
                interestFreeDays: diffDays,
                current_bill_amount,
                unbilled_amount
            });
        });

        results.sort((a, b) => b.interestFreeDays - a.interestFreeDays);
        return results;
    };

    // --- UI Rendering ---
    const renderResults = (results, tableBody) => {
        tableBody.innerHTML = '';
        results.forEach(result => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${result.name}</td>
                <td>${result.repaymentDate}</td>
                <td>${result.interestFreeDays}</td>
                <td>${(result.current_bill_amount || 0).toFixed(2)}</td>
                <td>${(result.unbilled_amount || 0).toFixed(2)}</td>
            `;
        });
    };

    const renderCardInputs = (cardsData) => {
        cardInputsContainer.innerHTML = '';
        cardsData.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.classList.add('card-input');
            cardDiv.dataset.id = card.id;
            cardDiv.innerHTML = `
                <button class="remove-card" title="删除此卡">&times;</button>
                <div class="input-row">
                    <div class="input-col">
                        <label>信用卡名称:</label>
                        <input type="text" class="card-data" name="name" value="${card.name}">
                    </div>
                </div>
                <div class="input-row">
                    <div class="input-col">
                        <label>账单日 (每月几号):</label>
                        <input type="number" class="card-data" name="billing_day" min="1" max="31" value="${card.billing_day}">
                    </div>
                    <div class="input-col">
                        <label>最后还款日 (每月几号):</label>
                        <input type="number" class="card-data" name="repayment_day" min="1" max="31" value="${card.repayment_day}">
                    </div>
                </div>
                <div class="input-row">
                    <div class="input-col">
                        <label>当前账单金额:</label>
                        <input type="number" class="card-data" name="current_bill_amount" step="0.01" value="${card.current_bill_amount || 0}">
                    </div>
                    <div class="input-col">
                        <label>未出账金额:</label>
                        <input type="number" class="card-data" name="unbilled_amount" step="0.01" value="${card.unbilled_amount || 0}">
                    </div>
                </div>
            `;
            cardInputsContainer.appendChild(cardDiv);
        });
    };

    // --- Main Data & UI Update Function ---
    const loadAndRender = async () => {
        try {
            cards = await apiFetch('/cards');
            renderCardInputs(cards);
            const todayPeriods = calculatePeriods(new Date(), cards);
            renderResults(todayPeriods, resultsTableBody);
        } catch (error) {
            console.error("Failed to load cards:", error);
            alert(error.message);
        }
    };

    // --- Event Listeners ---
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/login.html';
    });

    addCardButton.addEventListener('click', async () => {
        const newCard = {
            name: '新信用卡',
            billing_day: 1,
            repayment_day: 20,
            current_bill_amount: 0,
            unbilled_amount: 0
        };
        try {
            await apiFetch('/cards', { method: 'POST', body: JSON.stringify(newCard) });
            loadAndRender();
        } catch (error) {
            console.error("Failed to add card:", error);
            alert(error.message);
        }
    });

    cardInputsContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('remove-card')) {
            const cardId = e.target.closest('.card-input').dataset.id;
            if (confirm('确定要删除这张信用卡吗？')) {
                try {
                    await apiFetch(`/cards/${cardId}`, { method: 'DELETE' });
                    loadAndRender();
                } catch (error) {
                    console.error("Failed to delete card:", error);
                    alert(error.message);
                }
            }
        }
    });

    let debounceTimer;
    cardInputsContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('card-data')) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                const cardDiv = e.target.closest('.card-input');
                const cardId = cardDiv.dataset.id;
                const inputs = cardDiv.querySelectorAll('.card-data');
                const updatedData = {};
                inputs.forEach(input => {
                    const value = input.type === 'number' ? parseFloat(input.value) : input.value;
                    updatedData[input.name] = value;
                });

                try {
                    await apiFetch(`/cards/${cardId}`, { method: 'PUT', body: JSON.stringify(updatedData) });
                    // Find and update local cache to avoid full reload
                    const cardIndex = cards.findIndex(c => c.id == cardId);
                    if (cardIndex > -1) {
                        cards[cardIndex] = { ...cards[cardIndex], ...updatedData };
                    }
                    // Recalculate and render results table
                    const todayPeriods = calculatePeriods(new Date(), cards);
                    renderResults(todayPeriods, resultsTableBody);
                } catch (error) {
                    console.error("Failed to update card:", error);
                    alert(error.message);
                }
            }, 500); // Debounce by 500ms
        }
    });

    importBtn.addEventListener('click', () => {
        const file = importFileInput.files[0];
        if (!file) {
            alert('请先选择一个 .json 文件。');
            return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedCards = JSON.parse(e.target.result);
                if (!Array.isArray(importedCards)) throw new Error("JSON文件格式不正确，必须是一个数组。");
                
                // The backend expects billingDay, repaymentDay, not the old format
                const formattedCards = importedCards.map(c => ({
                    name: c.name,
                    billingDay: c.billingDay || c.billing_day, // Support both old and new property names
                    repaymentDay: c.repaymentDay || c.repayment_day
                }));

                if (confirm(`即将导入 ${formattedCards.length} 张信用卡。确定吗？`)) {
                    await apiFetch('/cards/import', { method: 'POST', body: JSON.stringify(formattedCards) });
                    alert('导入成功！');
                    loadAndRender();
                }
            } catch (error) {
                console.error("Import failed:", error);
                alert(`导入失败: ${error.message}`);
            }
        };
        reader.readAsText(file);
    });

    calculateSpecificDateButton.addEventListener('click', () => {
        const transactionDate = new Date(specificDateInput.value);
        if (isNaN(transactionDate.getTime()) || !specificDateInput.value) {
            alert('请输入有效的消费日期！');
            return;
        }
        const results = calculatePeriods(transactionDate, cards);
        renderResults(results, specificResultsTableBody);
        specificResultsContainer.style.display = 'block';
    });

    // --- Initial Load ---
    userInfo.textContent = `用户: ${username}`;
    specificDateInput.valueAsDate = new Date();
    loadAndRender();
});