/* ==========================================
   [상점 시스템] 장비 및 소비 아이템 구매
   ========================================== */
const ShopSystem = {
    // 상점 페이지 열기 및 리스트 생성
    open: (category) => {
        showPage('page-shop-detail');
        const list = document.getElementById('shop-list');
        list.innerHTML = '';
        
        if (category === 'equip') {
            document.getElementById('shop-title').innerText = '장비 상점';
            EQUIP_DB.forEach(item => {
                const card = document.createElement('div');
                card.className = 'item-card';
                const img = item.img ? `<img src="image/${item.img}" class="item-icon">` : '<div class="item-icon">⚔️</div>';
                card.innerHTML = `
                    ${img}
                    <div style="flex:1;"><strong>${item.name}</strong><br>${item.p.toLocaleString()}G</div>
                    <button class="item-btn" style="background:var(--money); color:#000;" onclick="ShopSystem.buy('equip', ${JSON.stringify(item).replace(/"/g, '&quot;')})">구매</button>
                `;
                list.appendChild(card);
            });
        } else if (category === 'consume') {
            document.getElementById('shop-title').innerText = '소비 상점';
            // 물약, 방지권 등 소비 아이템 로직 추가 가능
        }
    },

    // 아이템 구매 처리
    buy: (type, proto) => {
        if (data.gold < proto.p) return alert("골드가 부족합니다.");
        
        data.gold -= proto.p;
        const newItem = {
            ...proto,
            en: 0,
            id: Date.now() + Math.random()
        };
        data.inventory.push(newItem);
        
        updateUI();
        saveGame();
        alert(`${proto.name}을(를) 구매했습니다!`);
    }
};