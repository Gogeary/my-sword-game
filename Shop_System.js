/* ==========================================
   [Shop_System.js] 
   상점 시스템 (장비 / 소비 아이템 통합 처리)
   ========================================== */

const ShopSystem = {
    currentTab: 'equip', // 현재 탭 상태 ('equip' 또는 'consume')

    // 1. 상점 열기 & 목록 표시
    open: (tab) => {
        ShopSystem.currentTab = tab;
        const list = document.getElementById('shop-list');
        const title = document.getElementById('shop-title');
        
        // UI 요소가 없으면 중단 (안전장치)
        if (!list || !title) return console.error("상점 UI 요소를 찾을 수 없습니다.");

        list.innerHTML = ''; // 목록 초기화
        
        let items = [];
        
        if (tab === 'equip') {
            title.innerText = "⚔️ 장비 상점";
            items = GameDatabase.EQUIPMENT;
        } else {
            title.innerText = "🧪 소비 아이템 상점";
            // 물약과 주문서 데이터를 안전하게 합침
            const potions = GameDatabase.CONSUMABLES.potions || [];
            const scrolls = GameDatabase.CONSUMABLES.scrolls || [];
            items = [...potions, ...scrolls];
        }

        // 아이템 카드 생성 및 추가
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'item-card';
            
            // 이미지 경로 처리 & 로딩 실패 시 대체 아이콘
            const imgPath = item.img ? `image/${item.img}` : '';
            const imgTag = item.img ? 
                `<img src="${imgPath}" class="item-icon" onerror="this.replaceWith(document.createElement('div')); this.className='item-icon'; this.innerText='💰';">` 
                : '<div class="item-icon">💰</div>';

            // 아이템 설명 텍스트 (타입별 분기)
            let subText = "";
            if (item.type === 'potion') {
                subText = `체력 회복: <span style="color:#e74c3c">${item.val}</span>`;
            } else if (item.type === 'scroll') {
                subText = `효과: 강화 파괴 방지`;
            } else {
                // 장비의 경우 티어 표시 (가격 기준 추정)
                const tier = Math.floor(item.p / 1000); 
                subText = `등급: Tier ${tier > 0 ? tier : 1}`;
            }

            div.innerHTML = `
                ${imgTag}
                <div class="item-info">
                    <strong>${item.name}</strong><br>
                    <span style="color:#aaa; font-size:0.85em;">${subText}</span><br>
                    <span style="color:var(--money); font-weight:bold;">${item.p.toLocaleString()} G</span>
                </div>
                <button class="item-btn" style="background:var(--money); color:#000; width:60px;" onclick="ShopSystem.buy('${item.name}')">구매</button>
            `;
            list.appendChild(div);
        });
        
        // 페이지 전환 (index.html의 함수 호출)
        if (typeof showPage === 'function') {
            showPage('page-shop-detail');
        }
    },

    // 2. 아이템 구매 로직
    buy: (name) => {
        // [검색] 장비, 물약, 주문서 전체 데이터에서 해당 이름의 아이템 찾기
        let item = GameDatabase.EQUIPMENT.find(i => i.name === name);
        if (!item) item = GameDatabase.CONSUMABLES.potions.find(i => i.name === name);
        if (!item) item = GameDatabase.CONSUMABLES.scrolls.find(i => i.name === name);

        if (!item) return alert("아이템 정보를 찾을 수 없습니다.");

        // [비용 체크]
        if (data.gold < item.p) return alert("골드가 부족합니다.");

        // [타입별 구매 처리]
        if (item.type === 'potion') {
            // 물약 소지 개수 제한 체크 (최대 10개)
            const currentPotions = data.inventory.filter(i => i.type === 'potion').length;
            if (currentPotions >= GameDatabase.SYSTEM.MAX_POTION_CAPACITY) {
                return alert(`물약은 최대 ${GameDatabase.SYSTEM.MAX_POTION_CAPACITY}개까지만 소지할 수 있습니다.`);
            }
            
            // 결제 및 인벤토리 추가
            data.gold -= item.p;
            data.inventory.push({
                id: Date.now() + Math.random(), // 고유 ID 부여
                name: item.name,
                type: 'potion',
                val: item.val,
                img: item.img,
                p: item.p,
                en: 0
            });
            alert(`${item.name}을(를) 구매했습니다!`);

        } else if (item.type === 'scroll') {
            // 주문서 구매
            data.gold -= item.p;
            data.inventory.push({ 
                id: Date.now() + Math.random(),
                ...item, 
                en: 0 
            });
            alert(`${item.name}을(를) 구매했습니다!`);
            
        } else {
            // 장비 구매
            data.gold -= item.p;
            data.inventory.push({
                id: Date.now() + Math.random(),
                ...item,
                en: 0
            });
            alert(`${item.name}을(를) 구매했습니다!`);
        }

        // UI 갱신 (골드 변화 등 반영)
        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
    }
};
