const ShopSystem = {
    currentTab: 'equip', 

    // 1. 상점 열기 (기존과 동일)
    open: (tab) => {
        ShopSystem.currentTab = tab;
        const list = document.getElementById('shop-list');
        const title = document.getElementById('shop-title');
        
        if (!list || !title) return console.error("상점 UI 요소를 찾을 수 없습니다.");

        list.innerHTML = '';
        
        let items = [];
        
        if (tab === 'equip') {
            title.innerText = "⚔️ 장비 상점";
            items = GameDatabase.EQUIPMENT.filter(item => {
                const isLowTier = (item.tier || 1) <= 5;
                const isNotGlove = item.type !== 'gloves';
                return isLowTier && isNotGlove;
            });
        } else {
            title.innerText = "🧪 소비 아이템 상점";
            const potions = GameDatabase.CONSUMABLES.potions || [];
            const scrolls = GameDatabase.CONSUMABLES.scrolls || [];
            items = [...potions, ...scrolls];
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'item-card';
            
            const imgPath = item.img ? `image/${item.img}` : '';
            const imgTag = item.img ? 
                `<img src="${imgPath}" class="item-icon" onerror="this.replaceWith(document.createElement('div')); this.className='item-icon'; this.innerText='💰';">` 
                : '<div class="item-icon">💰</div>';

            let subText = "";
            if (item.info) subText = item.info;
            else if (item.type === 'potion') subText = `체력 회복: <span style="color:#e74c3c">${MainEngine.formatNumber(item.val)}</span>`;
            else if (item.type === 'scroll') subText = `효과: 강화 파괴 방지`;
            else {
                const tierVal = item.tier ? item.tier : Math.floor((item.p || 0) / 1000); 
                subText = `등급: Tier ${tierVal > 0 ? tierVal : 1}`;
            }

            div.innerHTML = `
                ${imgTag}
                <div class="item-info">
                    <strong>${item.name}</strong><br>
                    <span style="color:#aaa; font-size:0.85em;">${subText}</span><br>
                    <span style="color:var(--money); font-weight:bold;">${MainEngine.formatNumber(item.p)} G</span>
                </div>
                <button class="item-btn" style="background:var(--money); color:#000; width:60px;" onclick="ShopSystem.buy('${item.name}')">구매</button>
            `;
            list.appendChild(div);
        });
        
        if (typeof showPage === 'function') showPage('page-shop-detail');
    },

    // 2. [수정됨] 구매 로직 (MainEngine.addItem 사용)
    buy: (name) => {
        let item = GameDatabase.EQUIPMENT.find(i => i.name === name);
        if (!item) item = GameDatabase.CONSUMABLES.potions.find(i => i.name === name);
        if (!item) item = GameDatabase.CONSUMABLES.scrolls.find(i => i.name === name);

        if (!item) return alert("아이템 정보를 찾을 수 없습니다.");
        if (data.gold < item.p) return alert("골드가 부족합니다.");

        // 물약 소지 제한 체크
        if (item.type === 'potion') {
            const currentPotions = data.inventory.filter(i => i.type === 'potion').reduce((sum, i) => sum + (i.count || 1), 0);
            // 겹치기 때문에 총 개수(count 합)로 체크하거나, 슬롯 수로 체크할 수 있음. 
            // 여기서는 슬롯 수 제한을 유지하거나, 개수 제한으로 변경 가능. 
            // 일단 기존 로직(슬롯 수) 유지하되 겹치기 되므로 10슬롯이면 충분함.
            const potionSlots = data.inventory.filter(i => i.type === 'potion').length;
            if (potionSlots >= GameDatabase.SYSTEM.MAX_POTION_CAPACITY && !data.inventory.find(i=>i.name === item.name)) {
                 return alert(`물약 슬롯이 가득 찼습니다. (${GameDatabase.SYSTEM.MAX_POTION_CAPACITY}칸)`);
            }
        }

        // 결제
        data.gold -= item.p;

        // ★ [핵심] 겹치기 적용을 위해 addItem 호출
        // (깊은 복사를 위해 전개 연산자 사용)
        const newItem = { ...item, en: 0, count: 1 };
        
        // 장비일 경우에만 새 ID 생성 (addItem 내부에서 처리하지만 명시적으로 삭제)
        if (['weapon','armor','belt','gloves','shoes'].includes(item.type)) {
            newItem.id = Date.now() + Math.random();
        } 
        // 소비템은 ID를 DB 그대로 유지해야 addItem에서 이름/ID로 찾기 쉬움 (여기서는 이름으로 찾게 수정했으므로 상관없음)

        MainEngine.addItem(newItem);
        alert(`${item.name}을(를) 구매했습니다!`);
        
        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
    },

    // 3. [수정됨] 뽑기 로직 (MainEngine.addItem 사용)
    playGacha: (type, count) => {
        if (type !== 'enhance') return;
        if (!GameDatabase.GACHA || !GameDatabase.GACHA.ENHANCE_BOX) return alert("데이터 오류");

        const config = GameDatabase.GACHA.ENHANCE_BOX;
        const cost = config.COST * count;

        if (data.gold < cost) return alert(`골드가 부족합니다. (${MainEngine.formatNumber(cost)} G 필요)`);
        
        // 인벤토리 여유공간 체크 (겹치기가 되므로 슬롯 체크는 대략적으로만)
        if (data.inventory.length > 100) return alert("인벤토리가 가득 찼습니다!");

        if(!confirm(`${MainEngine.formatNumber(cost)} G를 사용하여 ${count}회 뽑으시겠습니까?`)) return;

        data.gold -= cost;
        const logBox = document.getElementById('gacha-log');
        if(logBox) logBox.innerHTML = ''; 

        let results = [];

        for (let i = 0; i < count; i++) {
            const rand = Math.random() * 100;
            let currentProb = 0;
            let selectedOption = null;

            for (let rate of config.RATES) {
                currentProb += rate.chance;
                if (rand < currentProb) {
                    selectedOption = rate;
                    break;
                }
            }
            if (!selectedOption) selectedOption = config.RATES[config.RATES.length - 1];

            let pick = null;
            if (selectedOption.type === 'ticket') {
                const ticketBase = GameDatabase.CONSUMABLES.tickets.find(t => t.val === selectedOption.val);
                if (ticketBase) pick = { ...ticketBase };
            } else {
                const scrollBase = GameDatabase.CONSUMABLES.scrolls.find(s => s.id === selectedOption.id);
                if (scrollBase) pick = { ...scrollBase };
            }

            if (pick) {
                // 시각적 효과용 속성 추가
                pick.displayColor = selectedOption.color;
                pick.displayName = selectedOption.name;
                pick.count = 1;
                
                // ★ 겹치기 적용
                MainEngine.addItem(pick);
                results.push(pick);
            } else {
                results.push({ displayName: "오류 발생", displayColor: "#555" });
            }
        }

        if(logBox) {
            results.forEach((res, idx) => {
                const div = document.createElement('div');
                div.style.padding = "5px";
                div.style.borderBottom = "1px solid #333";
                div.innerHTML = `<span style="color:#888;">#${idx+1}</span> <span style="color:${res.displayColor}; font-weight:bold;">${res.displayName}</span> 획득!`;
                logBox.appendChild(div);
            });
            logBox.scrollTop = logBox.scrollHeight;
        }

        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
    },

    // 4. [수정됨] 합성 로직 (MainEngine.addItem 사용)
    craft: (srcVal, dstVal) => {
        // ... (이전 코드의 craft 내부 로직 중 재료 찾기 부분 동일) ...
        const materialIndices = [];
        data.inventory.forEach((item, idx) => {
            if (item.type === 'ticket' && item.val === srcVal) {
                // 겹쳐진 아이템 처리 필요
                // 하지만 현재 합성 로직은 단순화를 위해 '슬롯' 기준이 아닌 '총 개수'로 처리하는게 좋음
                // 여기서는 기존 로직 유지하되, 겹쳐진 아이템에서 개수를 빼는 방식으로 수정해야 함.
            }
        });

        // ★ [중요] 겹치기가 적용되면 '인덱스'로 삭제하는 방식은 버그가 생깁니다.
        // 아래와 같이 '개수'를 차감하는 방식으로 로직을 변경합니다.

        // 1. 보유량 확인
        const srcItem = data.inventory.find(i => i.type === 'ticket' && i.val === srcVal);
        const currentCount = srcItem ? (srcItem.count || 1) : 0;

        if (currentCount < 3) return alert("재료가 부족합니다.");

        if (!confirm(`+${srcVal} 강화권 3개를 소모하여 +${dstVal} 강화권을 만드시겠습니까?`)) return;

        // 2. 재료 소모
        srcItem.count -= 3;
        if (srcItem.count <= 0) {
            // 개수가 0 이하면 인벤토리에서 제거
            const idx = data.inventory.indexOf(srcItem);
            if (idx > -1) data.inventory.splice(idx, 1);
        }

        // 3. 결과 지급
        const targetTicket = GameDatabase.CONSUMABLES.tickets.find(t => t.val === dstVal);
        if (targetTicket) {
            const newItem = { ...targetTicket, count: 1, en: 0 };
            MainEngine.addItem(newItem);
            alert(`🎉 합성 성공! [+${dstVal} 강화권] 획득!`);
        } else {
            alert("데이터 오류");
        }

        // UI 갱신 (합성 시스템 렌더링 호출 필요)
        SynthesisSystem.render(); // Main_Engine이 아닌 Shop_System 내부에서 호출되므로 그냥 씀
        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
    }
};
