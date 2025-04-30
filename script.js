// 参加者のセレクトボックスを更新する関数
function updateParticipantSelects() {
    const participants = getParticipantsNames();
    const selects = document.querySelectorAll('.payer');
    
    selects.forEach(select => {
        const selectedValue = select.value;
        select.innerHTML = '';
        
        // デフォルトの空のオプション
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '選択してください';
        select.appendChild(defaultOption);
        
        participants.forEach(name => {
            if (name) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                select.appendChild(option);
            }
        });
        
        if (participants.includes(selectedValue)) {
            select.value = selectedValue;
        }
    });
    
    updateProportionalInputs();
}

// 参加者を追加する関数
function addParticipant() {
    const participantsBody = document.getElementById('participants-body');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>
            <input type="text" placeholder="名前を入力" class="participant-name">
        </td>
        <td class="actions-cell">
            <button onclick="removeParticipant(this)" class="btn-delete">削除</button>
        </td>
    `;
    participantsBody.appendChild(newRow);
    
    // イベントリスナーを追加
    const newInput = newRow.querySelector('.participant-name');
    newInput.addEventListener('input', updateParticipantSelects);
    
    updateParticipantSelects();
}

// 参加者を削除する関数
function removeParticipant(button) {
    const participantsBody = document.getElementById('participants-body');
    if (participantsBody.children.length > 1) {
        button.closest('tr').remove();
        updateParticipantSelects();
    } else {
        alert('最低1人の参加者が必要です。');
    }
}

// 支払い情報を追加する関数
function addPayment() {
    const paymentsBody = document.getElementById('payments-body');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>
            <input type="text" placeholder="項目名" class="description">
        </td>
        <td>
            <select class="payer"></select>
        </td>
        <td>
            <input type="number" placeholder="金額" class="amount" min="0" step="1">
        </td>
        <td class="actions-cell">
            <button onclick="removePayment(this)" class="btn-delete">削除</button>
        </td>
    `;
    paymentsBody.appendChild(newRow);
    updateParticipantSelects();
}

// 支払い情報を削除する関数
function removePayment(button) {
    const paymentsBody = document.getElementById('payments-body');
    if (paymentsBody.children.length > 1) {
        button.closest('tr').remove();
    } else {
        alert('最低1つの支払い情報が必要です。');
    }
}

// 参加者の名前リストを取得する関数
function getParticipantsNames() {
    const nameInputs = document.querySelectorAll('.participant-name');
    return Array.from(nameInputs).map(input => input.value.trim()).filter(name => name !== '');
}

// 清算方法のラジオボタンが変更されたときの処理
document.getElementById('settlement-equal').addEventListener('change', function() {
    if(this.checked) {
        document.getElementById('proportional-ratios').style.display = 'none';
    }
});

document.getElementById('settlement-proportional').addEventListener('change', function() {
    if(this.checked) {
        document.getElementById('proportional-ratios').style.display = 'block';
        updateProportionalInputs();
    }
});

// 割合入力欄を更新する関数
function updateProportionalInputs() {
    const participants = getParticipantsNames();
    const ratioBody = document.getElementById('ratio-body');
    ratioBody.innerHTML = '';
    
    participants.forEach(name => {
        if (name) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${name}</td>
                <td>
                    <input type="number" min="0" value="1" class="ratio-input" data-name="${name}">
                </td>
            `;
            ratioBody.appendChild(row);
        }
    });
}

// 計算を実行する関数
function calculate() {
    // 入力値を取得
    const participants = getParticipantsNames();
    if (participants.length === 0) {
        alert('参加者を入力してください。');
        return;
    }
    
    // 支払い情報を取得
    const payments = [];
    const paymentRows = document.querySelectorAll('#payments-body tr');
    let totalAmount = 0;
    
    paymentRows.forEach(row => {
        const payer = row.querySelector('.payer').value;
        const amount = parseFloat(row.querySelector('.amount').value);
        
        if (payer && !isNaN(amount) && amount > 0) {
            payments.push({
                payer,
                amount
            });
            totalAmount += amount;
        }
    });
    
    if (payments.length === 0) {
        alert('有効な支払い情報を入力してください。');
        return;
    }
    
    // 清算方法に応じて各参加者の負担額を計算
    const method = document.getElementById('settlement-proportional').checked ? 'proportional' : 'equal';
    const shares = {};
    
    participants.forEach(name => {
        shares[name] = {
            shouldPay: 0,
            paid: 0,
            balance: 0
        };
    });
    
    // 各参加者の支払い済み額を計算
    payments.forEach(payment => {
        shares[payment.payer].paid += payment.amount;
    });
    
    switch (method) {
        case 'equal':
            // 均等割り勘
            participants.forEach(name => {
                shares[name].shouldPay = totalAmount / participants.length;
            });
            break;
        case 'proportional':
            // 割合に応じた負担額を計算
            const ratioInputs = document.querySelectorAll('.ratio-input');
            let totalRatio = 0;
            
            ratioInputs.forEach(input => {
                totalRatio += parseFloat(input.value) || 0;
            });
            
            if (totalRatio === 0) {
                alert('少なくとも1人の参加者に1以上の割合を設定してください。');
                return;
            }
            
            ratioInputs.forEach(input => {
                const name = input.dataset.name;
                const ratio = parseFloat(input.value) || 0;
                shares[name].shouldPay = (ratio / totalRatio) * totalAmount;
            });
            break;
        default:
            alert('不正な清算方法が選択されました。');
            return;
    }

    // 差額を計算
    participants.forEach(name => {
        shares[name].balance = shares[name].paid - shares[name].shouldPay;
    });
    
    // 最小限の取引で清算する方法を計算
    const settlements = calculateMinimalTransactions(shares, participants);
    
    // 結果を表示
    displayResults(payments, shares, settlements, totalAmount);
}

// 最小限の取引で清算する方法を計算する関数
function calculateMinimalTransactions(shares, participants) {
    const creditors = [];
    const debtors = [];
    
    // 債権者（余りがある人）と債務者（不足がある人）に分類
    participants.forEach(name => {
        const balance = shares[name].balance;
        if (balance > 0) {
            creditors.push({ name, amount: balance });
        } else if (balance < 0) {
            debtors.push({ name, amount: -balance });
        }
    });
    
    // 金額で降順にソート
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
    
    // 債務者から債権者への支払いを計算
    const settlements = [];
    for (let i = 0; i < creditors.length; i++) {
        settlements.push({
            from: debtors[i].name,
            to: creditors[i].name,
            amount: Math.round(Math.min(debtors[i].amount, creditor[i].amount) * 100) / 100
        });
    }
    
    return settlements;
}

// 結果を表示する関数
function displayResults(payments, shares, settlements, totalAmount) {
    // 結果セクションを表示
    document.getElementById('results-section').style.display = 'block';
    
    // 支払い詳細テーブルを更新
    const paymentDetailsBody = document.getElementById('payment-details-body');
    paymentDetailsBody.innerHTML = '';
    
    payments.forEach(payment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${payment.description}</td>
            <td>${payment.payer}</td>
            <td>${payment.amount.toLocaleString()}円</td>
        `;
        paymentDetailsBody.appendChild(row);
    });
    
    document.getElementById('total-amount').textContent = `${totalAmount.toLocaleString()}円`;
    
    // 各自の負担額テーブルを更新
    const shareDetailsBody = document.getElementById('share-details-body');
    shareDetailsBody.innerHTML = '';
    
    Object.entries(shares).forEach(([name, data]) => {
        const row = document.createElement('tr');
        const balance = data.balance;
        
        row.innerHTML = `
            <td>${name}</td>
            <td>${data.shouldPay.toLocaleString()}円</td>
            <td>${data.paid.toLocaleString()}円</td>
            <td class="${balance >= 0 ? 'positive' : 'negative'}">
                ${(balance >= 0 ? '+' : '') + balance.toLocaleString()}円
            </td>
        `;
        shareDetailsBody.appendChild(row);
    });
    
    // 清算方法を表示
    const settlementResults = document.getElementById('settlement-results');
    settlementResults.innerHTML = '';
    
    if (settlements.length === 0) {
        settlementResults.innerHTML = '<div class="result-item">清算の必要はありません。</div>';
    } else {
        settlements.forEach(settlement => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `
                <!-- 右矢印svgアイコン -->
                <svg class="icon" viewBox="0 0 24 24" style="color: #3b82f6; margin-right: 8px;">
                    <path d="M5 12h14M12 5l7 7-7 7"></path>
                </svg>
                <strong>${settlement.from}</strong> から <strong>${settlement.to}</strong> へ: ${settlement.amount.toLocaleString()}円
            `;
            settlementResults.appendChild(div);
        });
    }
    
    // 結果までスクロール
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    // 初期参加者のイベントリスナーを設定
    document.querySelector('.participant-name').addEventListener('input', updateParticipantSelects);
    updateParticipantSelects();
});
