/* =========================================
   [Toast.js] 전역 토스트 시스템 매니저
   ========================================= */

const Toast = {
    // 메시지 출력 함수
    show: function(message, duration = 2000) {
        // 1. 기존에 떠 있는 토스트가 있다면 즉시 제거
        this.removeOld();

        // 2. 토스트 요소 생성
        const toast = document.createElement('div');
        toast.className = 'toast-popup';
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">⚠️</span>
                <span class="toast-text">${message}</span>
            </div>
        `;

        // 3. 바디에 추가
        document.body.appendChild(toast);

        // 4. 지정된 시간 후 제거 애니메이션 실행
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 500);
        }, duration);
    },

    // 중복 방지를 위한 기존 토스트 제거 함수
    removeOld: function() {
        const existing = document.querySelector('.toast-popup');
        if (existing) existing.remove();
    }
};

// 전역 윈도우 객체에 등록 (어디서든 접근 가능)
window.Toast = Toast;