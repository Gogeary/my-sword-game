/* Chat_System.js - 해상도별 동적 토글 및 통합 관리본 (최종 수정) */

// [1] 파이어베이스 설정 및 초기화
const chatConfig = {
    apiKey: "AIzaSyAxR-oBND3fWbHUuq_LgjfgIayiFRrKGO8",
    authDomain: "orbisrpg-962b3.firebaseapp.com",
    databaseURL: "https://orbisrpg-962b3-default-rtdb.firebaseio.com",
    projectId: "orbisrpg-962b3",
    storageBucket: "orbisrpg-962b3.firebasestorage.app",
    messagingSenderId: "164223155724",
    appId: "1:164223155724:web:4408795def32952eac7829",
    measurementId: "G-6J3M1T531B"
};

let chatApp;
let chatDB;

try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            chatApp = firebase.initializeApp(chatConfig, "OrbisChat");
        } else {
            chatApp = firebase.app("OrbisChat");
        }
        chatDB = chatApp.database().ref('chats');
    }
} catch(e) {
    console.error("채팅 초기화 오류:", e);
}

// [2] 왼쪽 사이드 로그 (시스템/아이템 알림용)
const SideLog = {
    add: (msg) => {
        const win = document.getElementById('side-log-window');
        if(!win) return;

        const d = document.createElement('div');
        d.innerHTML = msg;
        d.style.cssText = "border-bottom: 1px solid rgba(255,255,255,0.05); padding: 6px 0; font-size: 0.85em; line-height: 1.4; text-align: left; color: #ccc;";

        win.appendChild(d);
        win.scrollTop = win.scrollHeight;

        if(win.children.length > 100) win.removeChild(win.firstChild);
    }
};

// [3] 로그 필터링 함수 (아이템 획득 감지)
function processLogLine(content) {
    if (!content || content.trim() === "") return;
    if (content.includes("획득") || content.includes("얻었습니다") || content.includes("🎁")) {
        SideLog.add(content);
    }
}

// [4] 통합 채팅 시스템 객체 정의
window.ChatSystem = {
    getMyName: () => {
        if (typeof data !== 'undefined' && data && data.name) return data.name;
        const loginId = document.getElementById('login-id');
        return (loginId && loginId.value) ? loginId.value : "익명모험가";
    },

    // 전송 함수 통합 (isMobile 인자를 통해 입력창 구분)
    send: (isMobile = false) => {
        const inputId = isMobile ? 'chat-input-mobile' : 'side-chat-input';
        const inputEl = document.getElementById(inputId);
        const msg = inputEl ? inputEl.value : "";

        if (!msg || msg.trim() === "") return;

        const myName = window.ChatSystem.getMyName();

        if (chatDB) {
            chatDB.push({
                user: myName,
                msg: msg,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        }
        if(inputEl) inputEl.value = "";
    },

    // HTML onclick 속성에서 호출하기 편하도록 래퍼 제공
    sendMobile: () => window.ChatSystem.send(true),

    drawMsg: (name, msg) => {
        const myName = window.ChatSystem.getMyName();
        const isMe = (name === myName);
        
        const mobileWin = document.getElementById('chat-log-mobile');
        const sideChatWin = document.getElementById('side-chat-window');

        // [모바일 챗박스 출력] 부모가 보이는 상태일 때만
        if (mobileWin && window.getComputedStyle(mobileWin.parentElement).display !== 'none') {
            const d = document.createElement('div');
            d.style.cssText = "padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 0.85em; color: #eee; text-align: left;";
            d.innerHTML = `<span style="color:var(--point); font-weight:bold;">${name}:</span> ${msg}`;
            mobileWin.appendChild(d);
            mobileWin.scrollTop = mobileWin.scrollHeight;
            if (mobileWin.children.length > 30) mobileWin.removeChild(mobileWin.firstChild);
        } 
        
        // [PC 사이드바 출력] 부모가 보이는 상태일 때만
        if (sideChatWin && window.getComputedStyle(sideChatWin.parentElement).display !== 'none') {
            const div = document.createElement('div');
            div.className = 'chat-msg ' + (isMe ? 'my-msg' : 'other-msg');
            if (isMe) {
                div.innerHTML = msg;
            } else {
                div.innerHTML = `<div style="font-size:0.75em; margin-bottom:3px; opacity:0.8; font-weight:bold; color:var(--point);">${name}</div>${msg}`;
            }
            sideChatWin.appendChild(div);
            sideChatWin.scrollTop = sideChatWin.scrollHeight;
            if (sideChatWin.children.length > 50) sideChatWin.removeChild(sideChatWin.firstChild);
        }
    }
};

// [5] DOM 로드 후 실행
document.addEventListener("DOMContentLoaded", () => {
    // 전투 로그 감시 로직
    const centerLogDiv = document.getElementById('battle-log');
    let lastContentHTML = "";

    if (centerLogDiv) {
        setInterval(() => {
            const currentHTML = centerLogDiv.innerHTML;
            if (currentHTML === lastContentHTML) return;

            let newPart = "";
            if (currentHTML.includes(lastContentHTML) && lastContentHTML !== "") {
                newPart = currentHTML.replace(lastContentHTML, "");
            } else {
                newPart = currentHTML;
            }

            lastContentHTML = currentHTML;

            if (newPart.trim() !== "") {
                const lines = newPart.split(/<br\s*\/?>|<\/div>/i);
                lines.forEach(line => {
                    if(line.trim() !== "") processLogLine(line);
                });
            }
        }, 300);
    }

    // 서버 연결 리스너 등록
    if (chatDB) {
        chatDB.off(); 
        chatDB.limitToLast(20).on('child_added', (snapshot) => {
            const chatData = snapshot.val();
            if (chatData && window.ChatSystem.drawMsg) {
                // DOM이 렌더링될 시간을 벌기 위한 미세 지연
                setTimeout(() => {
                    window.ChatSystem.drawMsg(chatData.user || "알수없음", chatData.msg);
                }, 10);
            }
        });
    }

    // 초기 연결 공지
    setTimeout(() => {
        SideLog.add("<span style='color:#f1c40f;'>[시스템] 서버 연결 완료.</span>");
    }, 1000);
});