/* ==========================================
   [Shop_System.js] 
   상점 기능 (장비/소비 구분 및 구매)
   ========================================== */

const ShopSystem = {
    currentTab: 'equip',

    open: (tab) => {
        ShopSystem.currentTab = tab;
        const list = document.getElementById('shop-list');
        const title = document.getElementById('shop-title');
        
        if (!list) return console.error("상점 리스트 요소를 찾을 수 없습니다.");
        if (!title) return console.error("상점 제목 요소를 찾을 수 없습니다.");

        list.innerHTML = '';
        
        let items = [];
        
        if (tab === 'equip') {
            title.innerText = "⚔️ 장비 상점";
            items = GameDatabase.EQUIPMENT;
        } else {
            // [수정] 안전하게 배열 합치기 (데이터가 없어도 에러 안 나게 처리)
            title.innerText = "🧪 소비 아이템 상점";
            const potions = GameDatabase.CONSUMABLES.potions || [];
            const scrolls = GameDatabase.CONSUMABLES.scrolls || [];
            items = [...potions, ...scrolls];
        }

        // 아이템 목록 렌더링
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'item-card';
            
            // 이미지 에러 처리
            const imgPath = item.img ? `image/${item.img}` : '';
            const imgTag = item.img ? 
                `<img src="${imgPath}" class="item-icon" onerror="this.parentNode.innerHTML='<div class=\\'item-icon\\'>💰</div>'">` 
                : '<div class="item-icon">💰</div>';

            let subText = "";
            if (item.type === 'potion') subText = `회복량: ${item.val}`;
            else if (item.type === 'scroll') subText = `강화 파괴 방지`;
            else subText = `Tier ${Math.floor(item.p/1000)}`;

            div.innerHTML = `
                ${imgTag}
                <div class="item-info">
                    <strong>${item.name}</strong><br>
                    <span style="color:#aaa; font-size:0.85em;">${subText}</span><br>
                    <span style="color:var(--money)">${item.p.toLocaleString()} G</span>
                </div>
                <button class="item-btn" style="background:var(--money); color:#000; width:60px;" onclick="ShopSystem.buy('${item.name}')">구매</button>
            `;
            list.appendChild(div);
        });
        
        // 페이지 전환 (index.html에 있는 함수 호출)
        if (typeof showPage === 'function') {
            showPage('page-shop-detail');
        }
    },

    buy: (name) => {
        // 전체 아이템에서 검색
        let item = GameDatabase.EQUIPMENT.find(i => i.name === name);
        if (!item) item = GameDatabase.CONSUMABLES.potions.find(i => i.name === name);
        if (!item) item = GameDatabase.CONSUMABLES.scrolls.find(i => i.name === name);

        if (!item) return alert("존재하지 않는 아이템입니다.");

        // 골드 체크
        if (data.gold < item.p) return alert("골드가 부족합니다.");

        // 타입별 처리
        if (item.type === 'potion') {
            // 물약 개수 제한 확인
            const currentPotions = data.inventory.filter(i => i.type === 'potion').length;
            if (currentPotions >= GameDatabase.SYSTEM.MAX_POTION_CAPACITY) {
                return alert(`물약은 최대 ${GameDatabase.SYSTEM.MAX_POTION_CAPACITY}개까지만 가질 수 있습니다.`);
            }
            
            data.gold -= item.p;
            data.inventory.push({
                id: Date.now() + Math.random(), // 고유 ID
                name: item.name,
                type: 'potion',
                val: item.val,
                img: item.img,
                p: item.p,
                en: 0
            });
            alert(`${item.name} 구매 완료!`);

        } else if (item.type === 'scroll') {
            data.gold -= item.p;
            data.inventory.push({ ...item, id: Date.now() + Math.random(), en:0 });
            alert(`${item.name} 구매 완료!`);
            
        } else {
            // 장비
            data.gold -= item.p;
            data.inventory.push({
                id: Date.now() + Math.random(),
                ...item,
                en: 0
            });
            alert(`${item.name} 구매 완료!`);
        }

        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
    }
};
