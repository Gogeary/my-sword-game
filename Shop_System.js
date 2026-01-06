/* ==========================================
   [Shop_System.js] 
   장비 및 소비 아이템 구매 시스템 (최종 보완본)
   ========================================== */

const ShopSystem = {
    // 1. 상점 페이지 열기 및 리스트 생성
    open: (category) => {
        showPage('page-shop-detail');
        const list = document.getElementById('shop-list');
        if (!list) return;
        list.innerHTML = '';
        
        if (category === 'equip') {
            document.getElementById('shop-title').innerText = '장비 상점';
            // GameDatabase.EQUIPMENT 참조
            GameDatabase.EQUIPMENT.forEach(item => {
                const card = document.createElement('div');
                card.className = 'item-card';
                // 이미지 파일이 없을 경우를 대비한 기본 아이콘 처리
                const imgPath = item.img ? `image/${item.img}` : '';
                const imgHtml = item.img ? `<img src="${imgPath}" class="item-icon" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMzMzIi8+PC9zdmc+'">` : '<div class="item-icon">⚔️</div>';
                
                card.innerHTML = `
                    ${imgHtml}
                    <div style="flex:1;">
                        <strong>${item.name}</strong> (Lv.${item.lv})<br>
                        <span style="color:var(--money)">${item.p.toLocaleString()}G</span>
                    </div>
                    <button class="item-btn" style="background:var(--money); color:#000;" 
                        onclick="ShopSystem.buy('equip', ${JSON.stringify(item).replace(/"/g, '&quot;')})">구매</button>
                `;
                list.appendChild(card);
            });
        } 
        else if (category === 'consume') {
            document.getElementById('shop-title').innerText = '소비 상점';
            
            // 2-1. 포션 리스트 출력
            GameDatabase.CONSUMABLES.potions.forEach(p => {
                const card = document.createElement('div');
                card.className = 'item-card';
                card.innerHTML = `
                    <img src="image/${p.img}" class="item-icon" onerror="this.innerText='🧪'">
                    <div style="flex:1;">
                        <strong>${p.n}</strong> (회복: ${p.r.toLocaleString()})<br>
                        <span style="color:var(--money)">${p.p.toLocaleString()}G</span>
                    </div>
                    <button class="item-btn" style="background:var(--mine); color:#000;" 
                        onclick="ShopSystem.buy('potion', ${JSON.stringify(p).replace(/"/g, '&quot;')})">구매</button>
                `;
                list.appendChild(card);
            });

            // 2-2. 방지권 리스트 출력
            GameDatabase.CONSUMABLES.scrolls.forEach(s => {
                const card = document.createElement('div');
                card.className = 'item-card';
                card.innerHTML = `
                    <img src="image/${s.img}" class="item-icon" onerror="this.innerText='📜'">
                    <div style="flex:1;">
                        <strong>${s.n}</strong><br>
                        <span style="color:var(--money)">${s.p.toLocaleString()}G</span>
                    </div>
                    <button class="item-btn" style="background:var(--hunt); color:#fff;" 
                        onclick="ShopSystem.buy('scroll', ${JSON.stringify(s).replace(/"/g, '&quot;')})">구매</button>
                `;
                list.appendChild(card);
            });
        }
    },

    // 2. 아이템 구매 처리
    buy: (type, proto) => {
        // 골드 부족 체크
        if (data.gold < proto.p) return alert("골드가 부족합니다.");

        if (type === 'equip') {
            data.gold -= proto.p;
            const newItem = {
                ...proto,
                en: 0,
                id: Date.now() + Math.random()
            };
            data.inventory.push(newItem);
        } 
        else if (type === 'potion') {
            // 요구사항: 포션은 종류 상관없이 최대 10개까지 소지 가능
            if (data.potionCount >= GameDatabase.SYSTEM.MAX_POTION_CAPACITY) {
                return alert("물약은 최대 10개까지만 소지할 수 있습니다.");
            }
            data.gold -= proto.p;
            data.potions += proto.r; // 총 회복량 누적
            data.potionCount += 1;   // 소지 개수 증가
        } 
        else if (type === 'scroll') {
            data.gold -= proto.p;
            // 방지권 데이터 구조 (item1, item2, item3 등)에 맞춰 저장
            const scrollKey = `item${proto.id || 1}`;
            data.scrolls[scrollKey] = (data.scrolls[scrollKey] || 0) + 1;
        }

        MainEngine.updateUI();
        MainEngine.saveGame();
        alert(`${proto.name || proto.n} 구매 완료!`);
    }
};
