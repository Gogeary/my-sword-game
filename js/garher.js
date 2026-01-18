/* =========================================
   [File: js/gather.js]
   약초밭 시스템 (씨앗 선택 및 팝업 기능 포함)
   ========================================= */

console.log("Gather Module Loaded.");

// [데이터] 정원 단계별 설정 (총 10단계)
const GARDEN_LEVELS = [
    { lv: 1, cost: 0,      name: "입문자의 텃밭" },
    { lv: 2, cost: 5000,   name: "초보 농사꾼의 밭" },
    { lv: 3, cost: 15000,  name: "숙련된 농부의 밭" },
    { lv: 4, cost: 50000,  name: "비옥한 토지" },
    { lv: 5, cost: 150000, name: "마력이 깃든 정원" },
    { lv: 6, cost: 500000, name: "정령의 숲" },
    { lv: 7, cost: 1500000, name: "고대 유적 정원" },
    { lv: 8, cost: 5000000, name: "에덴의 동쪽" },
    { lv: 9, cost: 20000000, name: "세계수의 뿌리" },
    { lv: 10, cost: 100000000, name: "신의 정원" }
];

// [상태] 플레이어 정원 정보
let playerGarden = {
    level: 1,      // 현재 정원 레벨
    selectedSeedTier: 1, // ★ 현재 선택된 씨앗 티어 (기본값 1)
    
    // 보유 씨앗 (테스트용: 모든 티어 2개씩 지급)
    seeds: { 
        1: 5, 2: 2, 3: 0, 4: 0, 5: 0, 
        6: 0, 7: 0, 8: 0, 9: 0, 10: 0 
    },

    // 16개 슬롯
    slots: Array(16).fill().map((_, i) => ({
        id: i, state: 'empty', plantTime: null, seedTier: 0, type: null
    }))
};

// [가상] 플레이어 골드
let tempPlayerGold = 50000; 

/* =========================================
   [View] 화면 렌더링 함수
   ========================================= */
function renderGarden() {
    const gridContainer = document.getElementById('garden-grid');
    if (!gridContainer) return; // 에러 방지

    const currentLvData = GARDEN_LEVELS[playerGarden.level - 1];
    const nextLvData = GARDEN_LEVELS[playerGarden.level];

    // 1. 텍스트 정보 갱신
    setText('garden-lv-display', `Lv.${currentLvData.lv} ${currentLvData.name}`);
    setText('garden-size-display', `재배 가능: ${playerGarden.level}티어 이하`);

    // 2. [핵심] 현재 선택된 씨앗 정보 UI 표시
    const curTier = playerGarden.selectedSeedTier;
    const curCount = playerGarden.seeds[curTier] || 0;
    
    // HTML에 해당 ID가 있는지 확인 후 변경
    setText('selected-seed-name', `🌱 ${curTier}티어 씨앗`);
    setText('selected-seed-count', `(보유: ${curCount}개)`);

    // 3. 업그레이드 버튼 상태
    const upgradeBtn = document.getElementById('garden-upgrade-btn');
    if (upgradeBtn) {
        if (nextLvData) {
            upgradeBtn.innerHTML = `⬆ 강화 (${Number(nextLvData.cost).toLocaleString()} G)`;
            upgradeBtn.disabled = false;
            upgradeBtn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
            upgradeBtn.onclick = tryUpgradeGarden;
        } else {
            upgradeBtn.innerHTML = `MAX LEVEL`;
            upgradeBtn.disabled = true;
            upgradeBtn.style.background = '#334155';
        }
    }

    // 4. 그리드 그리기 (16칸)
    gridContainer.innerHTML = '';
    
    playerGarden.slots.forEach((slot, index) => {
        const div = document.createElement('div');
        div.className = `garden-slot ${slot.state}`;
        div.onclick = () => handleSlotClick(index);

        // 상태별 아이콘 표시
        if (slot.state === 'growing') {
            div.innerHTML = `<div class="plant-icon">🌱</div><div class="tier-tag">T${slot.seedTier}</div>`;
        } else if (slot.state === 'ready') {
            let icon = '🌿';
            if (slot.type) {
                if (slot.type.includes('버섯')) icon = '🍄';
                if (slot.type.includes('꽃') || slot.type.includes('광분')) icon = '🌺';
                if (slot.type.includes('인삼') || slot.type.includes('뿌리')) icon = '🥕';
                if (slot.type === '만드라고라') icon = '😱';
            }
            div.innerHTML = `<div class="plant-icon">${icon}</div><div class="tier-tag">T${slot.seedTier}</div>`;
        }
        
        gridContainer.appendChild(div);
    });
}

/* =========================================
   [Popup] 씨앗 선택 모달 관련
   ========================================= */

// 모달 열기
function openSeedModal() {
    const modal = document.getElementById('seed-selector-modal');
    const listContainer = document.getElementById('seed-list-container');
    
    if(!modal || !listContainer) return;

    let html = '';
    
    // 1티어 ~ 10티어 목록 생성
    for (let t = 1; t <= 10; t++) {
        const count = playerGarden.seeds[t] || 0;
        
        // 정원 레벨보다 티어가 높으면 잠김 처리
        const isUnlock = t <= playerGarden.level; 
        const isActive = playerGarden.selectedSeedTier === t;

        // 버튼 클래스 및 속성
        let btnClass = `seed-item-btn ${isActive ? 'active' : ''}`;
        let disabledAttr = isUnlock ? '' : 'disabled';
        
        // 상태 텍스트
        let statusText = `<span style="color:#fbbf24; font-weight:bold;">${count}개</span> 보유`;
        if (!isUnlock) statusText = `🔒 정원 Lv.${t} 필요`;

        html += `
            <button class="${btnClass}" onclick="selectSeed(${t})" ${disabledAttr}>
                <div class="item-left">
                    <span class="item-tier-badge">T${t}</span>
                    <span style="font-size:0.9rem;">알 수 없는 씨앗</span>
                </div>
                <div style="font-size:0.8rem; color:#94a3b8;">${statusText}</div>
            </button>
        `;
    }

    listContainer.innerHTML = html;
    modal.classList.remove('hidden'); // 모달 보여주기
}

// 씨앗 선택 (클릭 시 실행)
function selectSeed(tier) {
    playerGarden.selectedSeedTier = tier;
    renderGarden(); // 선택된 씨앗 이름 갱신
    closeSeedModal(); // 창 닫기
}

// 모달 닫기
function closeSeedModal() {
    const modal = document.getElementById('seed-selector-modal');
    if(modal) modal.classList.add('hidden');
}

/* =========================================
   [Logic] 심기 / 수확 / 업그레이드
   ========================================= */

function handleSlotClick(index) {
    const slot = playerGarden.slots[index];

    if (slot.state === 'empty') {
        tryPlantSeed(index);
    } else if (slot.state === 'ready') {
        harvestHerb(index);
    } else if (slot.state === 'growing') {
        alert("아직 자라는 중입니다... 🌱");
    }
}

// 씨앗 심기 (선택된 씨앗 사용)
function tryPlantSeed(index) {
    const tier = playerGarden.selectedSeedTier;
    const count = playerGarden.seeds[tier] || 0;

    // 1. 개수 체크
    if (count <= 0) {
        Toast.warn(`[T${tier} 씨앗]이 없습니다. (상점/사냥 획득)`);
        return;
    }

    // 2. 레벨 체크 (이중 보안)
    if (tier > playerGarden.level) {
        Toast.warn(`정원 레벨이 부족하여 [T${tier} 씨앗]을 심을 수 없습니다.`);
        return;
    }

    // 3. 심기 처리
    playerGarden.seeds[tier]--; // 개수 차감
    
    const slot = playerGarden.slots[index];
    slot.state = 'growing';
    slot.plantTime = Date.now();
    slot.seedTier = tier;

    // 화면 갱신 (개수 줄어든 것 반영)
    renderGarden();

    // 3초 후 성장 완료 (테스트)
    setTimeout(() => {
        // 슬롯 상태가 여전히 growing일 때만
        if (slot.state === 'growing') {
            slot.state = 'ready';
            slot.type = getRandomHerbByTier(tier);
            
            // 현재 화면이 약초밭이면 리렌더링
            if(document.getElementById('garden-grid')) renderGarden();
        }
    }, 3000);
}

// 수확 하기
function harvestHerb(index) {
    const slot = playerGarden.slots[index];
    
    console.log(`수확함: [T${slot.seedTier}] ${slot.type}`);
    Toast.success(`수확: [T${slot.seedTier}] ${slot.type}`);
    // 실제 인벤토리 추가 로직 필요: Inventory.addItem(slot.type, 1);
    
    // 슬롯 초기화
    slot.state = 'empty';
    slot.type = null;
    slot.seedTier = 0;
    
    renderGarden();
}

// 정원 업그레이드
function tryUpgradeGarden() {
    if (playerGarden.level >= 10) return;
    const nextData = GARDEN_LEVELS[playerGarden.level];
    
    if (tempPlayerGold < nextData.cost) {
        Toast.warn(`골드가 부족합니다. (필요: ${nextData.cost.toLocaleString()} G)`);
        return;
    }

    if (confirm(`[정원 강화]\n등급: ${nextData.name}\n비용: ${nextData.cost.toLocaleString()} G\n\n업그레이드 하시겠습니까?`)) {
        tempPlayerGold -= nextData.cost;
        playerGarden.level++;
        Toast.success("🎉 정원이 업그레이드 되었습니다!");
        renderGarden();
    }
}

/* =========================================
   [Helper] 유틸리티 함수
   ========================================= */

// 티어별 랜덤 약초 뽑기
function getRandomHerbByTier(tier) {
    if (typeof GameDatabase === 'undefined' || !GameDatabase.HERBS) return "잡초";
    
    // DB에서 해당 티어의 약초만 필터링
    const candidates = Object.entries(GameDatabase.HERBS)
        .filter(([name, data]) => data.type === 'herb' && data.tier === tier)
        .map(([name]) => name);
    
    if (candidates.length === 0) return "잡초";
    return candidates[Math.floor(Math.random() * candidates.length)];
}

// 텍스트 안전 변경
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

// 테스트 치트: 씨앗 획득
function cheatGetSeed() {
    // 1~10티어 씨앗 1개씩 추가
    for(let i=1; i<=10; i++) {
        playerGarden.seeds[i] = (playerGarden.seeds[i]||0) + 1;
    }
    renderGarden();
}

// 초기 로딩
window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('garden-grid')) {
        renderGarden();
    }
});