import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, deleteDoc, doc, updateDoc, onSnapshot, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA-2N_HZoej2Vv3vQa0P5hu0gvmwVs0R3o",
    authDomain: "gold-land2021.firebaseapp.com",
    projectId: "gold-land2021",
    storageBucket: "gold-land2021.firebasestorage.app",
    messagingSenderId: "580003463235",
    appId: "1:580003463235:web:4ebb43e8f3db552b3294f6"
};

let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    window.saveDataToFirebase = async function(orderData) { try { orderData.timestamp = serverTimestamp(); await addDoc(collection(db, "orders"), orderData); return true; } catch (e) { return false; } };
    window.deleteOrderFromFirebase = async function(docId) { await deleteDoc(doc(db, "orders", docId)); };
    window.updateOrderInFirebase = async function(docId, newData) { await updateDoc(doc(db, "orders", docId), newData); };
    
    // المزامنة الحية للطلبات (الأرشيف)
    window.listenToCloudOrders = function() {
        const q = query(collection(db, "orders"));
        let isFirstLoad = true;
        onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = { id_doc: change.doc.id, ...change.doc.data() };
                if (change.type === "added") {
                    allCloudOrders.push(data);
                    if(!isFirstLoad && data.addedBy !== loggedInUser) {
                        window.playAudioNotification();
                        window.showSuccessToast(`طلب جديد أضيف بواسطة ${data.addedBy}`);
                    }
                }
                if (change.type === "modified") {
                    const idx = allCloudOrders.findIndex(o => o.id_doc === change.doc.id);
                    if(idx > -1) allCloudOrders[idx] = data;
                }
                if (change.type === "removed") {
                    allCloudOrders = allCloudOrders.filter(o => o.id_doc !== change.doc.id);
                }
            });
            isFirstLoad = false;
            if(document.getElementById('cloudOrdersModal').style.display === 'flex') window.filterCloudOrders();
        });
    };

    window.loadSystemDataFromFirebase = async function() {
        try { let users = [], types = [], pages = []; const [uSnap, tSnap, pSnap] = await Promise.all([ getDocs(collection(db, "system_users")), getDocs(collection(db, "order_types")), getDocs(collection(db, "system_pages")) ]); uSnap.forEach(d => users.push({ id: d.id, ...d.data() })); tSnap.forEach(d => types.push({ id: d.id, ...d.data() })); pSnap.forEach(d => pages.push({ id: d.id, ...d.data() })); return { users, types, pages }; } catch (e) { return { users: [], types: [], pages: [] }; }
    };
    window.addSystemUserToFirebase = async function(data) { return await addDoc(collection(db, "system_users"), data); }; window.deleteSystemUserFromFirebase = async function(docId) { await deleteDoc(doc(db, "system_users", docId)); }; window.updateSystemUserInFirebase = async function(docId, data) { await updateDoc(doc(db, "system_users", docId), data); }; window.addOrderTypeToFirebase = async function(data) { return await addDoc(collection(db, "order_types"), data); }; window.deleteOrderTypeFromFirebase = async function(docId) { await deleteDoc(doc(db, "order_types", docId)); }; window.addSystemPageToFirebase = async function(data) { return await addDoc(collection(db, "system_pages"), data); }; window.deleteSystemPageFromFirebase = async function(docId) { await deleteDoc(doc(db, "system_pages", docId)); };
} catch(e) { console.warn("Firebase Init Error", e); }

let deferredPrompt; window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
window.showInstallInstructions = async function(os) { if (deferredPrompt && os !== 'ios') { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; } else { if(os === 'ios') alert("🍏 لتثبيت التطبيق على الآيفون:\n\n1. اضغط على زر 'المشاركة' أسفل المتصفح.\n2. اختر 'إضافة إلى الصفحة الرئيسية'."); else alert("📱 التطبيق جاهز للتثبيت! \n\nاضغط على النقاط الثلاث (خيارات المتصفح) واختر 'إضافة إلى الشاشة الرئيسية'."); } }
if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(err => console.log('SW error', err)); }); }

function safeGetStorage(key, def) { try { return localStorage.getItem(key) || def; } catch(e) { return def; } }
function safeSetStorage(key, val) { try { localStorage.setItem(key, val); } catch(e) {} }

let currentTheme = safeGetStorage('gl_theme', 'light');
window.applyTheme = function(theme) { const isDark = (theme === 'dark'); if (isDark) { document.body.classList.add('dark-mode'); document.querySelectorAll('.theme-toggle-btn').forEach(btn => btn.innerHTML = '☀️'); } else { document.body.classList.remove('dark-mode'); document.querySelectorAll('.theme-toggle-btn').forEach(btn => btn.innerHTML = '🌙'); } }
window.toggleTheme = function() { currentTheme = (currentTheme === 'light') ? 'dark' : 'light'; safeSetStorage('gl_theme', currentTheme); window.applyTheme(currentTheme); }
window.applyTheme(currentTheme);

setInterval(() => { const timeEl = document.getElementById('globalTime'); if(timeEl) { const now = new Date(); timeEl.innerText = `🕒 ${now.toLocaleTimeString('ar-IQ')} - 📅 ${now.toLocaleDateString('ar-IQ')}`; } }, 1000);

window.showSuccessToast = function(message) { let toast = document.getElementById('success-toast-alert'); if (!toast) { toast = document.createElement('div'); toast.id = 'success-toast-alert'; toast.className = 'success-toast'; document.body.appendChild(toast); } toast.innerHTML = `✨ ${message}`; toast.classList.add('show'); setTimeout(() => { toast.classList.remove('show'); }, 4000); };

const audioBeep = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18A"); 
window.playAudioNotification = function() { try { audioBeep.play(); } catch(e){} }

const ADMIN_USER = "Zain"; const ADMIN_PASS = "327798";
let additionalUsers = [], configuredOrderTypes = [], configuredPages = [];
let loggedInUser = "", loggedInUserCanDelete = false, loggedInUserCanEdit = false, loggedInUserCanSettings = false, loggedInUserCanReports = false; 
let feeBaghdad = parseInt(safeGetStorage('feeBaghdad', '5000')) || 5000;
let feeOther = parseInt(safeGetStorage('feeOther', '8000')) || 8000;

window.saveDeliveryFees = function() { feeBaghdad = parseInt(document.getElementById('feeBaghdadInput').value) || 0; feeOther = parseInt(document.getElementById('feeOtherInput').value) || 0; safeSetStorage('feeBaghdad', feeBaghdad); safeSetStorage('feeOther', feeOther); alert("تم الحفظ!"); }

let allCloudOrders = []; 
let currentConfirmAction = null; let currentEditDocId = null;
let financialChartInstance = null; let itemsPieChartInstance = null;

window.showConfirmDialog = function(msg, callback) { document.getElementById('confirmMessage').innerText = msg; currentConfirmAction = callback; document.getElementById('confirmModal').style.display = 'flex'; document.getElementById('confirmYesBtn').onclick = function() { if(currentConfirmAction) currentConfirmAction(); window.closeConfirmModal(); }; }
window.closeConfirmModal = function() { document.getElementById('confirmModal').style.display = 'none'; currentConfirmAction = null; }
window.handleEnter = function(event) { if (event.key === "Enter") window.login(); }
window.formatAmount = function(input) { let val = input.value.trim(); if (!val) return; let num = parseFloat(val.replace(/[^0-9.-]+/g, "")); if (!isNaN(num) && num > 0 && num < 1000) input.value = (num * 1000).toString(); }
window.toggleOrderInput = function(btn) { let c = btn.parentElement, s = c.querySelector('.orderTypeSelect'), i = c.querySelector('.orderTypeCustomInput'); if(s.style.display !== 'none') { s.style.display = 'none'; i.style.display = 'block'; i.focus(); btn.innerHTML = '📋'; } else { i.style.display = 'none'; i.value = ''; s.style.display = 'block'; btn.innerHTML = '✍️'; } }

// =========================================
// الدخول والتنقل
// =========================================
window.login = async function() {
    const user = document.getElementById("username").value.trim(), pass = document.getElementById("password").value.trim(), errorMsg = document.getElementById("login-error"), btn = document.getElementById("loginBtn");
    if(!user || !pass) return; let isManager = (user === ADMIN_USER && pass === ADMIN_PASS); btn.innerText = "جاري التحقق... ⏳"; btn.disabled = true;

    const completeLogin = () => {
        document.getElementById('globalUserBar').style.display = 'flex'; document.getElementById('globalUserName').innerText = '👤 ' + loggedInUser;
        window.listenToCloudOrders(); 
        window.initGlobalChatListener(); 
        window.showDashboard(); errorMsg.style.display = "none"; btn.innerText = "تسجيل الدخول"; btn.disabled = false;
    };

    try {
        if(window.loadSystemDataFromFirebase) {
            const cloudData = await window.loadSystemDataFromFirebase();
            additionalUsers = cloudData.users; configuredOrderTypes = cloudData.types; configuredPages = cloudData.pages;
            document.getElementById('feeBaghdadInput').value = feeBaghdad; document.getElementById('feeOtherInput').value = feeOther; window.updateOrderTypeSelects(); window.updatePagesDropdown();
        }
        if (isManager) { loggedInUser = user; loggedInUserCanDelete = true; loggedInUserCanEdit = true; loggedInUserCanSettings = true; loggedInUserCanReports = true; completeLogin(); return; }
        const isNormalUser = additionalUsers.find(u => u.username === user && u.password === pass);
        if (isNormalUser) { loggedInUser = user; loggedInUserCanDelete = isNormalUser.canDeleteCloud || false; loggedInUserCanEdit = isNormalUser.canEditCloud || false; loggedInUserCanSettings = isNormalUser.canAccessSettings || false; loggedInUserCanReports = isNormalUser.canAccessReports || false; completeLogin(); } else { errorMsg.style.display = "block"; btn.innerText = "تسجيل الدخول"; btn.disabled = false; }
    } catch (err) { alert("خطأ بالاتصال"); btn.innerText = "تسجيل الدخول"; btn.disabled = false; }
}

window.showDashboard = function() { document.getElementById("login-section").style.display = "none"; document.getElementById("dashboard-section").style.display = "none"; document.getElementById("chat-section").style.display = "none"; document.getElementById("main-menu-section").style.display = "flex"; }
window.openDistribution = function() { document.getElementById("main-menu-section").style.display = "none"; document.getElementById("dashboard-section").style.display = "block"; }
window.backToMainMenu = function() { document.getElementById("dashboard-section").style.display = "none"; document.getElementById("main-menu-section").style.display = "flex"; }

// زر الرجوع في الدردشة
window.backToMainMenuFromChat = function() { 
    currentChatId = null; 
    document.getElementById("chat-section").style.display = "none"; 
    document.getElementById("main-menu-section").style.display = "flex"; 
}

window.comingSoon = function(feature) { alert("ميزة " + feature + " سيتم إضافتها لاحقاً ⏳"); }
window.logout = function() { window.showConfirmDialog("تأكيد تسجيل الخروج؟", function() { loggedInUser = ""; allCloudOrders = []; document.getElementById('globalUserBar').style.display = 'none'; document.getElementById("dashboard-section").style.display = "none"; document.getElementById("main-menu-section").style.display = "none"; document.getElementById("chat-section").style.display = "none"; document.getElementById("login-section").style.display = "flex"; window.clearForm(); document.getElementById('tableBody').innerHTML = ""; }); }

// =========================================
// التوزيع الذكي
// =========================================
window.checkCustomerHistory = function(phone1, phone2) {
    let alertBox = document.getElementById('customerHistoryAlert'); if(!phone1 && !phone2) { alertBox.className = 'hidden'; return; }
    let history = allCloudOrders.filter(o => o.phone1 === phone1 || (phone2 && o.phone2 === phone2)); let total = history.length;
    if(total > 0) {
        let returned = history.filter(o => o.status === 'راجع').length; let delivered = history.filter(o => o.status === 'تم التوصيل').length;
        if(returned > 0) { alertBox.innerHTML = `⛔ تنبيه: هذا الزبون لديه (${returned}) طلب راجع سابقاً!`; alertBox.className = 'error-msg show'; alertBox.style.display = 'block'; alertBox.style.background = 'rgba(255, 71, 87, 0.1)'; } else if(delivered >= 2) { alertBox.innerHTML = `⭐ زبون VIP دائم (طلبات مكتملة: ${delivered})`; alertBox.className = 'success-msg show'; alertBox.style.display = 'block'; alertBox.style.color = '#b8860b'; alertBox.style.background = 'rgba(255, 215, 0, 0.1)'; } else { alertBox.innerHTML = `ℹ️ زبون سابق (إجمالي طلباته: ${total})`; alertBox.className = 'info-msg show'; alertBox.style.display = 'block'; alertBox.style.color = 'var(--primary-blue)'; alertBox.style.background = 'rgba(64, 123, 255, 0.1)'; }
    } else { alertBox.className = 'hidden'; alertBox.style.display = 'none'; }
}

window.extractValue = function(lines, keyword) { for (let i = 0; i < lines.length; i++) { if (lines[i].includes(keyword)) { let val = lines[i].split(':').pop().trim().replace(/🛑/g, '').trim(); if (val !== "" && val !== keyword.replace(/:/g, '').trim()) return val; if (i + 1 < lines.length) { let nVal = lines[i+1].replace(/🛑/g, '').trim(); if(nVal && !nVal.includes(':')) return nVal; } } } return ""; }
window.parseText = function() { 
    const txt = document.getElementById('pasteArea').value.trim(); if (!txt) return; const lines = txt.split('\n').map(l => l.trim()).filter(l => l !== ''); 
    document.getElementById('custId').value = window.extractValue(lines, 'تسلسل الزب'); document.getElementById('custName').value = window.extractValue(lines, 'اسم الزبون'); 
    let p1 = window.extractValue(lines, 'رقم الهاتف الاول'); document.getElementById('phone1').value = p1; 
    let p2 = window.extractValue(lines, 'رقم الهاتف الثاني'); document.getElementById('phone2').value = p2; 
    document.getElementById('gov').value = window.extractValue(lines, 'المحافظة'); document.getElementById('area').value = window.extractValue(lines, 'المنطقة'); 
    document.getElementById('amount').value = window.extractValue(lines, 'المبلغ الكلي'); window.formatAmount(document.getElementById('amount')); document.getElementById('note').value = window.extractValue(lines, 'ملاحظة مهمة'); 
    window.checkCustomerHistory(p1, p2); 
    let s = document.querySelector('.orderTypeSelect'), ci = document.querySelector('.orderTypeCustomInput'), tb = s.parentElement.querySelector('.toggle-custom-btn'); let extType = window.extractValue(lines, 'نوع الطلب'); if (extType && s) { if (Array.from(s.options).some(o => o.value === extType)) { if(s.style.display === 'none') window.toggleOrderInput(tb); s.value = extType; } else { if(s.style.display !== 'none') window.toggleOrderInput(tb); ci.value = extType; } } 
}


// =========================================
// نظام الدردشة الشامل (محدث ليعرض الأسماء فوراً)
// =========================================
let currentChatId = null; let allSystemUsersList = []; let allChatMessages = [];

window.initGlobalChatListener = function() {
    let isInitLoad = true;
    onSnapshot(collection(db, "chat_messages"), (snapshot) => {
        let unreadTotal = 0; let unreadPerChat = {};
        
        snapshot.docChanges().forEach(change => {
            const msg = { id_doc: change.doc.id, ...change.doc.data() };
            if(change.type === 'added') {
                allChatMessages.push(msg);
                if(!isInitLoad && msg.sender !== loggedInUser && (!msg.readBy || !msg.readBy.includes(loggedInUser))) {
                    window.playAudioNotification();
                    window.showSuccessToast(`رسالة جديدة من ${msg.sender} 💬`);
                }
            }
            if(change.type === 'modified') {
                const idx = allChatMessages.findIndex(m => m.id_doc === msg.id_doc);
                if(idx > -1) allChatMessages[idx] = msg;
            }
        });

        allChatMessages.forEach(msg => {
            if(msg.sender !== loggedInUser && (!msg.readBy || !msg.readBy.includes(loggedInUser))) {
                unreadTotal++;
                unreadPerChat[msg.chatId] = (unreadPerChat[msg.chatId] || 0) + 1;
            }
        });

        const mainBadge = document.getElementById('chatBadge');
        if(unreadTotal > 0) { mainBadge.style.display = 'flex'; mainBadge.innerText = unreadTotal; } 
        else { mainBadge.style.display = 'none'; }

        for (let chatId in unreadPerChat) {
            let b = document.getElementById('badge_' + chatId);
            if(b) { b.innerText = unreadPerChat[chatId]; b.style.display = 'inline-flex'; }
        }
        document.querySelectorAll('.chat-unread-badge').forEach(b => {
            let chatId = b.id.replace('badge_', '');
            if(!unreadPerChat[chatId] || unreadPerChat[chatId] === 0) { b.style.display = 'none'; }
        });

        if(currentChatId) {
            window.renderCurrentChatMessages();
            window.markChatAsRead(currentChatId);
        }
        isInitLoad = false;
    });
}

window.markChatAsRead = function(chatId) {
    let unreadMsgs = allChatMessages.filter(m => m.chatId === chatId && m.sender !== loggedInUser && (!m.readBy || !m.readBy.includes(loggedInUser)));
    unreadMsgs.forEach(async msg => {
        let newReadBy = msg.readBy || []; newReadBy.push(loggedInUser);
        try { await updateDoc(doc(db, "chat_messages", msg.id_doc), { readBy: newReadBy }); } catch(e){}
    });
}

window.renderCurrentChatMessages = function() {
    const messagesArea = document.getElementById('chatMessages');
    let msgs = allChatMessages.filter(m => m.chatId === currentChatId);
    msgs.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
    
    messagesArea.innerHTML = '';
    if(msgs.length === 0) { messagesArea.innerHTML = '<div style="text-align:center; margin-top: 50px; color: var(--text-muted);">لا توجد رسائل بعد. ✍️</div>'; return; }
    
    msgs.forEach(data => {
        const isSent = (data.sender === loggedInUser);
        const timeStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleTimeString('ar-IQ', {hour: '2-digit', minute:'2-digit'}) : '';
        
        let readStatusHtml = '';
        if(isSent && data.readBy && data.readBy.length > 0) {
            let readers = data.readBy.filter(u => u !== loggedInUser);
            if(readers.length > 0) {
                readStatusHtml = `<div style="font-size: 10px; color: #2ecc71; margin-top: 2px;">👁️ قرئت بواسطة: ${readers.join('، ')}</div>`;
            } else { readStatusHtml = `<div style="font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 2px;">✓ تم الإرسال</div>`; }
        } else if (isSent) { readStatusHtml = `<div style="font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 2px;">✓ تم الإرسال</div>`; }

        const msgDiv = document.createElement('div'); msgDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        msgDiv.innerHTML = `
            <div class="msg-sender">${isSent ? 'أنت' : data.sender}</div>
            <div class="msg-bubble">${data.text}<span class="msg-time">${timeStr}</span>${readStatusHtml}</div>
        `;
        messagesArea.appendChild(msgDiv);
    });
    messagesArea.scrollTop = messagesArea.scrollHeight; 
}

window.openChatSection = async function() {
    document.getElementById("main-menu-section").style.display = "none"; 
    document.getElementById("chat-section").style.display = "flex";
    
    // جلب مستخدمين كإجراء احتياطي إذا لم يكونوا موجودين
    if(additionalUsers.length === 0) {
        const cloudData = await window.loadSystemDataFromFirebase();
        additionalUsers = cloudData.users;
    }

    allSystemUsersList = [ADMIN_USER, ...additionalUsers.map(u => u.username)];
    const privateUsers = allSystemUsersList.filter(u => u !== loggedInUser); 
    
    let unreadPerChat = {};
    allChatMessages.forEach(msg => {
        if(msg.sender !== loggedInUser && (!msg.readBy || !msg.readBy.includes(loggedInUser))) {
            unreadPerChat[msg.chatId] = (unreadPerChat[msg.chatId] || 0) + 1;
        }
    });

    let privateHtml = '';
    privateUsers.forEach(u => { 
        const chatId = [loggedInUser, u].sort().join('_'); 
        const unreadCount = unreadPerChat[chatId] || 0;
        const badgeStyle = unreadCount > 0 ? 'inline-flex' : 'none';
        privateHtml += `<div class="chat-list-item" id="chatItem_${chatId}" onclick="openChat('${chatId}', '${u}')">
            <div class="chat-avatar">${u.charAt(0)}</div>
            <div class="chat-info"><h4>${u} <span class="chat-unread-badge" id="badge_${chatId}" style="display:${badgeStyle};">${unreadCount}</span></h4></div>
        </div>`; 
    });
    if(privateHtml === '') privateHtml = '<div style="text-align:center; padding: 20px; color: var(--text-muted); font-size:12px;">لا يوجد مستخدمين آخرين</div>';
    document.getElementById('chatListPrivate').innerHTML = privateHtml;
    
    loadChatGroups(); 
    window.switchChatTab('general'); 
    window.openChat('general', 'الدردشة العامة');
}

window.switchChatTab = function(tab) {
    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('chatListGeneral').style.display = 'none'; document.getElementById('chatListPrivate').style.display = 'none'; document.getElementById('chatListGroups').style.display = 'none';
    if(tab === 'general') { document.getElementById('tabGeneral').classList.add('active'); document.getElementById('chatListGeneral').style.display = 'block'; } else if(tab === 'private') { document.getElementById('tabPrivate').classList.add('active'); document.getElementById('chatListPrivate').style.display = 'block'; } else if(tab === 'groups') { document.getElementById('tabGroups').classList.add('active'); document.getElementById('chatListGroups').style.display = 'block'; }
}

window.openChat = function(chatId, title) {
    currentChatId = chatId; document.getElementById('currentChatTitle').innerText = title;
    document.querySelectorAll('.chat-list-item').forEach(el => el.classList.remove('active'));
    const activeItem = document.getElementById(`chatItem_${chatId}`); if(activeItem) activeItem.classList.add('active');
    if(window.innerWidth <= 768) { document.getElementById('chatSidebar').classList.add('hidden'); }
    window.renderCurrentChatMessages(); window.markChatAsRead(currentChatId);
}

window.sendMessage = async function() {
    const input = document.getElementById('chatInput'); const text = input.value.trim(); if(text === '' || !currentChatId) return; input.value = '';
    try { await addDoc(collection(db, "chat_messages"), { chatId: currentChatId, sender: loggedInUser, text: text, timestamp: serverTimestamp(), readBy: [] }); } catch(e) { window.showSuccessToast("فشل إرسال الرسالة."); }
}

window.showChatSidebar = function() { document.getElementById('chatSidebar').classList.remove('hidden'); }
window.showCreateGroupModal = function() { document.getElementById('newGroupName').value = ''; const container = document.getElementById('groupMembersSelection'); container.innerHTML = ''; const otherUsers = allSystemUsersList.filter(u => u !== loggedInUser); otherUsers.forEach(u => { container.innerHTML += `<label class="permission-badge" style="justify-content: flex-start;"><input type="checkbox" class="group-member-cb" value="${u}"> ${u}</label>`; }); document.getElementById('createGroupModal').style.display = 'flex'; }
window.closeCreateGroupModal = function() { document.getElementById('createGroupModal').style.display = 'none'; }
window.createChatGroup = async function() { const groupName = document.getElementById('newGroupName').value.trim(); if(!groupName) { alert("يرجى إدخال اسم المجموعة"); return; } let members = [loggedInUser]; document.querySelectorAll('.group-member-cb:checked').forEach(cb => members.push(cb.value)); try { await addDoc(collection(db, "chat_groups"), { name: groupName, createdBy: loggedInUser, members: members, timestamp: serverTimestamp() }); window.showSuccessToast("تم إنشاء المجموعة!"); closeCreateGroupModal(); loadChatGroups(); } catch(e) {} }
window.loadChatGroups = async function() {
    try {
        const snap = await getDocs(query(collection(db, "chat_groups"))); let groupsHtml = '';
        let unreadPerChat = {}; allChatMessages.forEach(msg => { if(msg.sender !== loggedInUser && (!msg.readBy || !msg.readBy.includes(loggedInUser))) { unreadPerChat[msg.chatId] = (unreadPerChat[msg.chatId] || 0) + 1; } });
        snap.forEach(doc => { const data = doc.data(); if((data.members && data.members.includes(loggedInUser)) || loggedInUser === ADMIN_USER) { const chatId = 'group_' + doc.id; const unreadCount = unreadPerChat[chatId] || 0; const badgeStyle = unreadCount > 0 ? 'inline-flex' : 'none'; groupsHtml += `<div class="chat-list-item" id="chatItem_${chatId}" onclick="openChat('${chatId}', '${data.name}')"><div class="chat-avatar" style="background: linear-gradient(135deg, #00b09b, #96c93d);">👥</div><div class="chat-info"><h4>${data.name} <span class="chat-unread-badge" id="badge_${chatId}" style="display:${badgeStyle};">${unreadCount}</span></h4><p>${data.members.length} أعضاء</p></div></div>`; } });
        if(groupsHtml === '') groupsHtml = '<div style="text-align:center; padding: 20px; color: var(--text-muted); font-size:12px;">لا توجد مجموعات بعد</div>'; document.getElementById('groupsListContainer').innerHTML = groupsHtml;
    } catch(e) {} 
}


// =========================================
// الأرشيف والطباعة المجمعة وتغيير الحالة والحذف
// =========================================
window.openCloudOrders = function() { 
    document.getElementById('cloudOrdersModal').style.display = 'flex'; 
    // إخفاء زر الحذف إذا لم يكن لديه صلاحية
    document.getElementById('bulkDeleteBtn').style.display = loggedInUserCanDelete ? 'inline-block' : 'none';
    window.filterCloudOrders(); 
}
window.closeCloudOrders = function() { document.getElementById('cloudOrdersModal').style.display = 'none'; }
function getWaLink(phone) { if(!phone) return '-'; let p = phone.replace(/\D/g,''); if(p.startsWith('07')) p = '964' + p.substring(1); return `<a href="https://wa.me/${p}" target="_blank" style="color:#2ecc71; text-decoration:none; font-weight:bold;">🟢 واتساب</a>`; }

window.toggleAllOrders = function(source) { document.querySelectorAll('.order-cb').forEach(cb => cb.checked = source.checked); }

window.filterCloudOrders = function() {
    const qt = document.getElementById('cloudSearchInput').value.toLowerCase(), pF = document.getElementById('cloudPageFilter').value, sF = document.getElementById('cloudStatusFilter').value, tb = document.getElementById('cloudOrdersTbody'); 
    tb.innerHTML = ''; document.getElementById('selectAllCb').checked = false; 
    let sortedOrders = [...allCloudOrders].sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    let filtered = sortedOrders.filter(o => ((o.name||"").toLowerCase().includes(qt) || (o.phone1||"").includes(qt) || (o.id||"").includes(qt)) && (pF === "" || (o.constant||"") === pF) && (sF === "" || (o.status||"جديد") === sF));
    
    filtered.forEach(o => {
        const tr = document.createElement('tr');
        let editBtn = loggedInUserCanEdit ? `<button class="btn-outline" style="padding: 5px; border-radius:6px; min-width:40px; box-shadow:none; border:none;" onclick="openEditModal('${o.id_doc}')">✏️</button>` : '-';
        const dateStr = o.timestamp ? new Date(o.timestamp.seconds * 1000).toLocaleDateString('ar-IQ') : '-';
        let statusColor = '#407bff'; let st = o.status || 'جديد';
        if(st === 'قيد التجهيز') statusColor = '#f39c12'; if(st === 'مسلم للمندوب') statusColor = '#8e44ad'; if(st === 'تم التوصيل') statusColor = '#2ecc71'; if(st === 'راجع') statusColor = '#e74c3c';

        tr.innerHTML = `
            <td style="text-align: center;"><input type="checkbox" class="order-cb" value="${o.id_doc}" style="width: 18px; height: 18px; box-shadow:none; padding:0; cursor:pointer;"></td>
            <td>${o.id||'-'}</td>
            <td><span style="background:${statusColor}; color:white; padding: 3px 8px; border-radius: 10px; font-size:11px; font-weight:bold;">${st}</span></td>
            <td style="color:var(--primary-blue); font-weight:bold;">${o.constant||'-'}</td> 
            <td>${o.name||'-'}</td>
            <td style="font-size:12px;">${getWaLink(o.phone1)}</td> 
            <td style="font-size:12px;">${o.gov||'-'}</td>
            <td style="color:var(--primary-blue); font-size:12px;">${o.type||'-'}</td> 
            <td>${o.amount||'-'}</td> 
            <td style="font-size:12px; font-weight:bold;">${o.addedBy||'-'}</td>
            <td style="font-size:12px; color:var(--text-muted);">${dateStr}</td>
            <td>${editBtn}</td>`;
        tb.appendChild(tr);
    });
}

// دالة الطباعة المجمعة (ورق A5 و المبلغ الكلي)
window.bulkPrintOrders = function() {
    let selectedIds = Array.from(document.querySelectorAll('.order-cb:checked')).map(cb => cb.value);
    if(selectedIds.length === 0) { alert("يرجى تحديد طلبات لطباعتها!"); return; }
    let printContainer = document.getElementById('printReceipt'); printContainer.innerHTML = '';

    selectedIds.forEach((id, index) => {
        let order = allCloudOrders.find(o => o.id_doc === id);
        if(order) {
            let amt = parseFloat((order.amount || "0").toString().replace(/[^0-9.-]+/g,"")) || 0;
            let receiptHtml = `
            <div class="receipt-page" style="${index > 0 ? 'page-break-before: always;' : ''}">
                <h2 style="text-align: center; margin: 0; font-size: 24px;">Gold Land</h2>
                <p style="text-align: center; margin: 5px 0 15px 0; font-size: 12px; border-bottom: 1px dashed #000; padding-bottom: 10px;">للتميز عنوان</p>
                <div style="margin-bottom: 10px;"><strong>الزبون:</strong> ${order.name || '-'}</div>
                <div style="margin-bottom: 10px;"><strong>الهاتف:</strong> <span dir="ltr">${order.phone1 || '-'}</span></div>
                <div style="margin-bottom: 10px;"><strong>العنوان:</strong> ${(order.gov || '') + ' - ' + (order.area || '')}</div>
                <div style="margin-bottom: 10px;"><strong>الطلب:</strong> <span dir="ltr">${order.type || '-'}</span></div>
                <div style="margin-bottom: 15px;"><strong>الملاحظات:</strong> ${order.note || 'لا يوجد'}</div>
                <h3 style="text-align: center; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 15px 0;">المبلغ الكلي: ${amt.toLocaleString()} دينار</h3>
                <div style="text-align: center; margin-top: 15px;"><svg id="barcode_${id}"></svg></div>
                <p style="text-align: center; font-size: 10px; margin-top: 10px;">تاريخ الطباعة: ${new Date().toLocaleString('ar-IQ')}</p>
            </div>`;
            printContainer.innerHTML += receiptHtml;
        }
    });
    selectedIds.forEach(id => { let order = allCloudOrders.find(o => o.id_doc === id); let bCode = order.id ? order.id.toString() : "0000"; JsBarcode("#barcode_" + id, bCode, { format: "CODE128", width: 1.5, height: 40, displayValue: true, fontSize: 14 }); });
    window.print();
}

// دالة تصدير وصولات محددة كـ PDF بحجم A5
window.bulkExportPDF = function() {
    let selectedIds = Array.from(document.querySelectorAll('.order-cb:checked')).map(cb => cb.value);
    if(selectedIds.length === 0) { alert("يرجى تحديد طلبات لتصديرها كـ PDF!"); return; }
    
    let printContainer = document.createElement('div');
    printContainer.style.background = '#fff'; printContainer.style.color = '#000'; printContainer.style.width = '148mm'; 
    
    selectedIds.forEach((id, index) => {
        let order = allCloudOrders.find(o => o.id_doc === id);
        if(order) {
            let amt = parseFloat((order.amount || "0").toString().replace(/[^0-9.-]+/g,"")) || 0;
            let receiptHtml = `
            <div style="width: 148mm; height: 195mm; padding: 20px; box-sizing: border-box; font-family: Arial; direction: rtl; text-align: right; margin: 0 auto; ${index > 0 ? 'page-break-before: always;' : ''}">
                <h2 style="text-align: center; font-size: 24px; margin:0;">Gold Land</h2>
                <p style="text-align: center; font-size: 12px; border-bottom: 1px dashed #000; padding-bottom: 10px;">للتميز عنوان</p>
                <div style="margin-bottom: 10px;"><strong>الزبون:</strong> ${order.name || '-'}</div>
                <div style="margin-bottom: 10px;"><strong>الهاتف:</strong> <span dir="ltr">${order.phone1 || '-'}</span></div>
                <div style="margin-bottom: 10px;"><strong>العنوان:</strong> ${(order.gov || '') + ' - ' + (order.area || '')}</div>
                <div style="margin-bottom: 10px;"><strong>الطلب:</strong> <span dir="ltr">${order.type || '-'}</span></div>
                <div style="margin-bottom: 15px;"><strong>الملاحظات:</strong> ${order.note || 'لا يوجد'}</div>
                <h3 style="text-align: center; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 15px 0;">المبلغ الكلي: ${amt.toLocaleString()} دينار</h3>
                <div style="text-align: center; margin-top: 15px;"><svg id="pdf_barcode_${id}"></svg></div>
                <p style="text-align: center; font-size: 10px; margin-top: 10px;">تاريخ الطباعة: ${new Date().toLocaleString('ar-IQ')}</p>
            </div>`;
            printContainer.innerHTML += receiptHtml;
        }
    });
    
    document.body.appendChild(printContainer);
    selectedIds.forEach(id => { let order = allCloudOrders.find(o => o.id_doc === id); let bCode = order.id ? order.id.toString() : "0000"; JsBarcode("#pdf_barcode_" + id, bCode, { format: "CODE128", width: 1.5, height: 40, displayValue: true, fontSize: 14 }); });
    
    const opt = { margin: 0, filename: `وصولات_${new Date().toLocaleDateString('ar-IQ')}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' } }; 
    html2pdf().set(opt).from(printContainer).save().then(() => { document.body.removeChild(printContainer); });
}

// دالة حذف المحددة
window.bulkDeleteOrders = function() {
    let selectedIds = Array.from(document.querySelectorAll('.order-cb:checked')).map(cb => cb.value);
    if(selectedIds.length === 0) { alert("يرجى تحديد طلبات لحذفها!"); return; }
    window.showConfirmDialog(`هل أنت متأكد من حذف ${selectedIds.length} طلب نهائياً؟`, async function() {
        document.body.style.cursor = 'wait';
        for(let id of selectedIds) {
            if(window.deleteOrderFromFirebase) await window.deleteOrderFromFirebase(id);
            allCloudOrders = allCloudOrders.filter(o => o.id_doc !== id);
        }
        document.body.style.cursor = 'default';
        window.filterCloudOrders();
        window.showSuccessToast(`تم حذف ${selectedIds.length} طلب بنجاح!`);
    });
}

// نافذة تعديل الحالة المجمعة
window.showBulkStatusModal = function() { let selectedIds = Array.from(document.querySelectorAll('.order-cb:checked')).map(cb => cb.value); if(selectedIds.length === 0) { alert("يرجى تحديد طلبات لتغيير حالتها!"); return; } document.getElementById('bulkStatusModal').style.display = 'flex'; }
window.closeBulkStatusModal = function() { document.getElementById('bulkStatusModal').style.display = 'none'; }
window.saveBulkStatus = async function() {
    let selectedIds = Array.from(document.querySelectorAll('.order-cb:checked')).map(cb => cb.value); let newStatus = document.getElementById('bulkStatusSelect').value; document.body.style.cursor = 'wait';
    for(let id of selectedIds) { if(window.updateOrderInFirebase) await window.updateOrderInFirebase(id, { status: newStatus }); }
    document.body.style.cursor = 'default'; window.closeBulkStatusModal(); window.showSuccessToast(`تم تغيير حالة ${selectedIds.length} طلب إلى (${newStatus}) بنجاح!`);
}

window.downloadExcelTemplate = function() { const ws = XLSX.utils.aoa_to_sheet([["تسلسل الزبون", "البيج", "اسم الزبون", "رقم الهاتف الأول", "رقم الهاتف الثاني", "المحافظة", "المنطقة", "الطلب", "العدد", "المبلغ الكلي", "ملاحظات"]]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "النموذج"); XLSX.writeFile(wb, "نموذج_رفع_الطلبات.xlsx"); }
window.uploadExcelFile = function(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async function(e) { const workbook = XLSX.read(new Uint8Array(e.target.result), {type: 'array'}); const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]); if(json.length === 0) return; if(!confirm(`سيتم رفع ${json.length} طلب؟`)) return; let sc = 0; document.body.style.cursor = 'wait'; for(let row of json) { const data = { id: (row["تسلسل الزبون"]||'').toString(), constant: (row["البيج"]||'').toString(), name: (row["اسم الزبون"]||'').toString(), phone1: (row["رقم الهاتف الأول"]||'').toString(), phone2: (row["رقم الهاتف الثاني"]||'').toString(), gov: (row["المحافظة"]||'').toString(), area: (row["المنطقة"]||'').toString(), type: (row["الطلب"]||'').toString(), qty: parseInt(row["العدد"])||1, amount: (row["المبلغ الكلي"]||'').toString(), note: (row["ملاحظات"]||'').toString(), addedBy: loggedInUser, status: 'جديد' }; if(data.constant && data.name) { if(await window.saveDataToFirebase(data)) sc++; } } document.body.style.cursor = 'default'; event.target.value = ''; window.showSuccessToast(`تم الرفع! (${sc})`); }; reader.readAsArrayBuffer(file); }

window.addEditOrderItemRow = function(tName = "", tQty = 1, tColor = "") { const wr = document.getElementById('editDynamicRowsWrapper'), r = document.createElement('div'); r.className = 'order-item-row'; r.innerHTML = `<div style="display:flex; flex: 2; min-width: 140px; gap:5px;"><select class="orderTypeSelect" style="flex: 1;"></select><input type="text" class="orderTypeCustomInput" placeholder="يدوي..." style="display:none; flex: 1;"><button type="button" class="btn-outline toggle-custom-btn" onclick="toggleOrderInput(this)" style="padding: 0 10px;">✍️</button></div> <input type="text" class="orderColorInput" placeholder="اللون" style="flex: 1; min-width: 80px;" value="${tColor}"> <div class="qty-controls" style="flex: 1; min-width: 110px;"><button type="button" class="qty-btn" onclick="changeQty(this, 1)">+</button><input type="number" class="orderQtyInput" value="${tQty}" min="1" style="width: 40px; text-align: center; box-shadow:none; padding:5px;"><button type="button" class="qty-btn" onclick="changeQty(this, -1)">-</button><button type="button" class="btn-danger" style="padding: 5px; border-radius: 10px; width: 35px; height: 35px; min-width:unset;" onclick="this.closest('.order-item-row').remove()">❌</button></div>`; wr.appendChild(r); window.updateOrderTypeSelects(); let sel = r.querySelector('.orderTypeSelect'), ci = r.querySelector('.orderTypeCustomInput'), tb = r.querySelector('.toggle-custom-btn'); if (tName) { if (Array.from(sel.options).some(o => o.value === tName)) { sel.value = tName; } else { window.toggleOrderInput(tb); ci.value = tName; } } }
window.openEditModal = function(docId) { let order = allCloudOrders.find(o => o.id_doc === docId); if(!order) return; currentEditDocId = docId; document.getElementById('editStatus').value = order.status || 'جديد'; document.getElementById('editConstant').value = order.constant || ''; document.getElementById('editName').value = order.name || ''; document.getElementById('editPhone1').value = order.phone1 || ''; document.getElementById('editPhone2').value = order.phone2 || ''; document.getElementById('editGov').value = order.gov || ''; document.getElementById('editArea').value = order.area || ''; document.getElementById('editAmount').value = order.amount || ''; document.getElementById('editDynamicRowsWrapper').innerHTML = ''; let items = order.type ? order.type.split(' + ') : []; if(items.length === 0) { window.addEditOrderItemRow(); } else { items.forEach(itemStr => { let match = itemStr.match(/\[([^)]+)\s\((\d+)\)\s*([^\]]*)\]/); if(match) { let code = match[1].trim(), qty = parseInt(match[2]) || 1, color = match[3] ? match[3].trim() : ""; let typeObj = configuredOrderTypes.find(t => t.code === code); window.addEditOrderItemRow(typeObj ? typeObj.name : code, qty, color); } else { window.addEditOrderItemRow(itemStr.replace(/\[\vert{}\]/g, ''), 1, ""); } }); } document.getElementById('editOrderModal').style.display = 'flex'; }
window.closeEditModal = function() { document.getElementById('editOrderModal').style.display = 'none'; currentEditDocId = null; }
window.saveEditedOrder = async function() { if(!currentEditDocId) return; let arr = [], totQty = 0; document.querySelectorAll('#editDynamicRowsWrapper .order-item-row').forEach(r => { let s = r.querySelector('.orderTypeSelect'), ci = r.querySelector('.orderTypeCustomInput'), cv = r.querySelector('.orderColorInput').value.trim(); let tv = (ci.style.display !== 'none') ? ci.value.trim() : s.value.trim(); let qv = parseInt(r.querySelector('.orderQtyInput').value) || 1; if (tv !== "") { let ft = configuredOrderTypes.find(t => t.name === tv), cd = ft ? ft.code : tv, colorText = cv ? ` ${cv}` : ""; arr.push(`[${cd} (${qv})${colorText}]`); totQty += qv; } }); const newData = { status: document.getElementById('editStatus').value, constant: document.getElementById('editConstant').value, name: document.getElementById('editName').value, phone1: document.getElementById('editPhone1').value, phone2: document.getElementById('editPhone2').value, gov: document.getElementById('editGov').value, area: document.getElementById('editArea').value, type: arr.join(' + '), qty: totQty, amount: document.getElementById('editAmount').value }; if(window.updateOrderInFirebase) { try { await window.updateOrderInFirebase(currentEditDocId, newData); window.closeEditModal(); window.showSuccessToast("تم التحديث! ✏️"); } catch(e) { alert("خطأ."); } } }

// =========================================
// التقارير المتقدمة والرسوم البيانية والإعدادات
// =========================================
window.updateOrderTypeSelects = function() { document.querySelectorAll('.orderTypeSelect').forEach(s => { const v = s.value; s.innerHTML = '<option value="">-- اختر الطلب --</option>' + configuredOrderTypes.map(t => `<option value="${t.name}">${t.name} ➡️ (${t.code})</option>`).join(''); s.value = v; }); }
window.addToTable = async function() { const pg = document.getElementById('constantField').value; if (!pg) { alert("يجب اختيار البيج!"); return; } let arr = [], totQty = 0; document.querySelectorAll('#itemsContainer .order-item-row').forEach(r => { let s = r.querySelector('.orderTypeSelect'), ci = r.querySelector('.orderTypeCustomInput'), cv = r.querySelector('.orderColorInput').value.trim(); let tv = (ci.style.display !== 'none') ? ci.value.trim() : s.value.trim(); let qv = parseInt(r.querySelector('.orderQtyInput').value) || 1; if (tv !== "") { let ft = configuredOrderTypes.find(t => t.name === tv); let cd = ft ? ft.code : tv; let colorText = cv ? ` ${cv}` : ""; arr.push(`[${cd} (${qv})${colorText}]`); totQty += qv; } }); const data = { id: document.getElementById('custId').value, name: document.getElementById('custName').value, phone1: document.getElementById('phone1').value, phone2: document.getElementById('phone2').value, gov: document.getElementById('gov').value, area: document.getElementById('area').value, type: arr.join(' + '), qty: totQty, amount: document.getElementById('amount').value, constant: pg, note: document.getElementById('note').value, addedBy: loggedInUser, status: 'جديد' }; if (!data.id && !data.name) return; if (window.saveDataToFirebase) { document.getElementById("mainSaveBtn").disabled = true; await window.saveDataToFirebase(data); document.getElementById("mainSaveBtn").disabled = false; } window.clearForm(); document.getElementById('pasteArea').value = ''; window.showSuccessToast("تمت إضافة الطلب! 🎉"); }

window.openReports = function() { if (!loggedInUserCanReports) { alert("❌ ليس لديك صلاحية."); return; } document.getElementById('reportsModal').style.display = 'flex'; let pagesHtml = '<option value="all">-- كل البيجات --</option>' + configuredPages.map(p => `<option value="${p.name}">${p.name}</option>`).join(''); document.getElementById('repPageFilter').innerHTML = pagesHtml; document.getElementById('repFinPageFilter').innerHTML = pagesHtml; let typesHtml = '<option value="all">-- كل الطلبات --</option>' + configuredOrderTypes.map(t => `<option value="${t.code}">${t.name} (${t.code})</option>`).join(''); document.getElementById('repTypeFilter').innerHTML = typesHtml; document.getElementById('repPageTypeFilter').innerHTML = typesHtml; window.generateReports(); }
window.closeReports = function() { document.getElementById('reportsModal').style.display = 'none'; }
window.switchReportTab = function(tabId, btn) { document.querySelectorAll('#reportsModal .tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('#reportsModal .tab-pane').forEach(p => p.classList.remove('active')); btn.classList.add('active'); document.getElementById(tabId).classList.add('active'); }

window.generateReports = function() { 
    if(allCloudOrders.length === 0) return; 
    const fromVal = document.getElementById('repDateFrom').value, toVal = document.getElementById('repDateTo').value; 
    let fromDate = fromVal ? new Date(fromVal) : null; if(fromDate) fromDate.setHours(0,0,0,0); 
    let toDate = toVal ? new Date(toVal) : null; if(toDate) toDate.setHours(23,59,59,999); 
    let targetOrders = allCloudOrders.filter(o => { if(fromDate || toDate) { if(!o.timestamp?.seconds) return false; const d = new Date(o.timestamp.seconds * 1000); if(fromDate && d < fromDate) return false; if(toDate && d > toDate) return false; } return true; }); 

    const selPage = document.getElementById('repPageFilter').value, selPageType = document.getElementById('repPageTypeFilter').value; let pageTargetOrders = targetOrders; if(selPage !== "all") pageTargetOrders = pageTargetOrders.filter(o => o.constant === selPage); if(selPageType !== "all") pageTargetOrders = pageTargetOrders.filter(o => o.type && o.type.includes(`[${selPageType}`)); let totalPageQty = 0, totalPageAmt = 0, pageTbodyHtml = ""; if (pageTargetOrders.length === 0) { pageTbodyHtml = '<tr><td colspan="3" style="text-align:center;">لا توجد بيانات</td></tr>'; } else { pageTargetOrders.forEach(o => { let amt = parseFloat((o.amount || "0").toString().replace(/[^0-9.-]+/g,"")) || 0, qty = parseInt(o.qty) || 1; totalPageQty += qty; totalPageAmt += amt; let safeType = (o.type || "").split(' + ').map(item => `<span dir="ltr" style="display: inline-block; padding: 0 5px;">${item}</span>`).join(' + '); pageTbodyHtml += `<tr><td style="font-size: 13px; text-align: center;">${safeType}</td><td>${qty}</td><td>${amt.toLocaleString()}</td></tr>`; }); } document.getElementById('repPageTbody').innerHTML = pageTbodyHtml; document.getElementById('totalPageQty').innerText = totalPageQty; document.getElementById('totalPageAmount').innerText = totalPageAmt.toLocaleString(); 

    const selType = document.getElementById('repTypeFilter').value; let typeStats = {}; targetOrders.forEach(o => { if(o.type && o.status === 'تم التوصيل') { o.type.split('+').forEach(item => { let match = item.match(/\[(.*?)\s\((\d+)\)/); if(match) { let code = match[1].trim(), qty = parseInt(match[2]) || 1; typeStats[code] = (typeStats[code] || 0) + qty; } }); } }); let typeCardsHtml = "", filteredTypes = Object.entries(typeStats); if(selType !== "all") filteredTypes = filteredTypes.filter(([tCode]) => tCode === selType); if(filteredTypes.length === 0) { typeCardsHtml = '<div style="width:100%; text-align:center; color:#ccc;">لا توجد طلبات مكتملة</div>'; } else { filteredTypes.forEach(([tCode, tQty]) => { let tNameObj = configuredOrderTypes.find(t => t.code === tCode); typeCardsHtml += `<div class="report-card"><h4>${tNameObj ? tNameObj.name : tCode} (${tCode})</h4><div class="val">${tQty}</div></div>`; }); } document.getElementById('repTypeCardsContainer').innerHTML = typeCardsHtml; 

    const selFinPage = document.getElementById('repFinPageFilter').value; let finTargetOrders = targetOrders.filter(o => o.status === 'تم التوصيل'); if(selFinPage !== "all") finTargetOrders = finTargetOrders.filter(o => o.constant === selFinPage); let finCount = finTargetOrders.length, finQty = 0, finGross = 0, finDelivery = 0; finTargetOrders.forEach(o => { let amt = parseFloat((o.amount || "0").toString().replace(/[^0-9.-]+/g,"")) || 0; finQty += parseInt(o.qty) || 1; finGross += amt; finDelivery += (o.gov || "").includes("بغداد") ? feeBaghdad : feeOther; }); document.getElementById('finCount').innerText = finCount; document.getElementById('finQty').innerText = finQty; document.getElementById('finGross').innerText = finGross.toLocaleString(); document.getElementById('finDelivery').innerText = finDelivery.toLocaleString(); document.getElementById('finNet').innerText = (finGross - finDelivery).toLocaleString(); 

    if(window.renderCharts) window.renderCharts(targetOrders);
}

window.renderCharts = function(orders) {
    let completed = orders.filter(o => o.status === 'تم التوصيل');
    let pageRevenues = {};
    completed.forEach(o => { 
        let net = (parseFloat((o.amount||"0").toString().replace(/[^0-9.-]+/g,"")) || 0) - ((o.gov || "").includes("بغداد") ? feeBaghdad : feeOther);
        pageRevenues[o.constant] = (pageRevenues[o.constant] || 0) + net;
    });

    if(financialChartInstance) financialChartInstance.destroy();
    let fcCanvas = document.getElementById('financialChart');
    if(fcCanvas) {
        financialChartInstance = new Chart(fcCanvas, { type: 'bar', data: { labels: Object.keys(pageRevenues), datasets: [{ label: 'الصافي (دينار)', data: Object.values(pageRevenues), backgroundColor: '#407bff', borderRadius: 5 }] }, options: { responsive: true, plugins: { legend: { display: false } } } });
    }

    let itemStats = {};
    completed.forEach(o => { if(o.type) { o.type.split('+').forEach(item => { let m = item.match(/\[(.*?)\s\((\d+)\)/); if(m) { itemStats[m[1].trim()] = (itemStats[m[1].trim()] || 0) + parseInt(m[2]); } }); } });
    let topItems = Object.entries(itemStats).sort((a,b)=>b[1]-a[1]).slice(0,5);
    
    if(itemsPieChartInstance) itemsPieChartInstance.destroy();
    let pcCanvas = document.getElementById('itemsPieChart');
    if(pcCanvas) {
        itemsPieChartInstance = new Chart(pcCanvas, { type: 'doughnut', data: { labels: topItems.map(i=>i[0]), datasets: [{ data: topItems.map(i=>i[1]), backgroundColor: ['#ffd700','#407bff','#2ecc71','#e74c3c','#9b59b6'] }] }, options: { responsive: true } });
    }
}

window.exportPageReportPDF = function() { const pageName = document.getElementById('repPageFilter').value, typeName = document.getElementById('repPageTypeFilter').value, tempDiv = document.createElement('div'); tempDiv.style.padding = '30px'; tempDiv.style.background = '#ffffff'; tempDiv.style.color = '#000000'; tempDiv.style.direction = 'rtl'; tempDiv.style.fontFamily = 'Arial, sans-serif'; let titleStr = 'تقرير المبيعات - ' + (pageName === 'all' ? 'جميع البيجات' : pageName); if(typeName !== 'all') titleStr += ' | صنف: ' + typeName; const title = document.createElement('h2'); title.innerText = titleStr; title.style.textAlign = 'center'; title.style.marginBottom = '25px'; tempDiv.appendChild(title); const tableClone = document.getElementById('pageReportTable').cloneNode(true); tableClone.style.width = '100%'; tableClone.style.borderCollapse = 'collapse'; tableClone.querySelectorAll('th, td').forEach(cell => { cell.style.border = '1px solid #ccc'; cell.style.padding = '12px'; cell.style.textAlign = 'center'; cell.style.color = '#000'; cell.style.background = '#fff';}); tempDiv.appendChild(tableClone); document.body.appendChild(tempDiv); const opt = { margin: 10, filename: `تقرير_المبيعات.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }; html2pdf().set(opt).from(tempDiv).save().then(() => { document.body.removeChild(tempDiv); }); }
window.switchReportTab = function(tabId, btn) { 
    document.querySelectorAll('#reportsModal .tab-btn').forEach(b => b.classList.remove('active')); 
    document.querySelectorAll('#reportsModal .tab-pane').forEach(p => p.classList.remove('active')); 
    btn.classList.add('active'); 
    document.getElementById(tabId).classList.add('active'); 

    // إضافة هذا الشرط لإعادة رسم المخططات بعد أن يصبح التبويب ظاهراً
    if (tabId === 'repChartsTab') {
        window.generateReports();
    }
}
window.openSettings = function() { document.getElementById('settingsModal').style.display = 'flex'; if (loggedInUserCanSettings) { document.getElementById('settingsAuthSection').style.display = 'none'; document.getElementById('settingsManagerSection').style.display = 'block'; window.renderPagesSettings(); window.renderOrderTypesSettings(); window.renderUsers(); } else { document.getElementById('settingsAuthSection').style.display = 'block'; document.getElementById('settingsManagerSection').style.display = 'none'; } }
window.closeSettings = function() { document.getElementById('settingsModal').style.display = 'none'; }
window.verifySettingsPass = function() { if (document.getElementById('settingsPass').value === ADMIN_PASS) { document.getElementById('settingsAuthSection').style.display = 'none'; document.getElementById('settingsManagerSection').style.display = 'block'; window.renderPagesSettings(); window.renderOrderTypesSettings(); window.renderUsers(); } else { document.getElementById('settings-error').style.display = 'block'; } }
window.switchTab = function(tabId, btn) { document.querySelectorAll('#settingsModal .tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('#settingsModal .tab-pane').forEach(p => p.classList.remove('active')); btn.classList.add('active'); document.getElementById(tabId).classList.add('active'); }
window.addPageType = async function() { const val = document.getElementById('newPageName').value.trim(); if(val && window.addSystemPageToFirebase) { const r = await window.addSystemPageToFirebase({name: val}); configuredPages.push({id: r.id, name: val}); window.renderPagesSettings(); window.updatePagesDropdown(); } }
window.deletePageType = async function(idx) { window.showConfirmDialog("حذف البيج؟", async function() { await window.deleteSystemPageFromFirebase(configuredPages[idx].id); configuredPages.splice(idx, 1); window.renderPagesSettings(); window.updatePagesDropdown(); }); }
window.renderPagesSettings = function() { document.getElementById("pagesListDisplay").innerHTML = configuredPages.map((p, i) => `<li class="settings-list-item"><span class="item-text">${p.name}</span><button class="btn-danger" onclick="deletePageType(${i})">حذف</button></li>`).join(''); }
window.updatePagesDropdown = function() { const s1 = document.getElementById('constantField'), s2 = document.getElementById('cloudPageFilter'), s3 = document.getElementById('repPageFilter'), s4 = document.getElementById('repFinPageFilter'); let h1 = '<option value="">-- اختر البيج --</option>' + configuredPages.map(p => `<option value="${p.name}">${p.name}</option>`).join(''), h2 = '<option value="">-- كل البيجات --</option>' + configuredPages.map(p => `<option value="${p.name}">${p.name}</option>`).join(''); if(s1) s1.innerHTML = h1; if(s2) s2.innerHTML = h2; if(s3) s3.innerHTML = h2; if(s4) s4.innerHTML = h2; }
window.addOrderType = async function() { const n = document.getElementById('newOrderName').value.trim(), c = document.getElementById('newOrderCode').value.trim(); if(n && c && window.addOrderTypeToFirebase) { const r = await window.addOrderTypeToFirebase({name: n, code: c}); configuredOrderTypes.push({id: r.id, name: n, code: c}); window.renderOrderTypesSettings(); window.updateOrderTypeSelects(); } }
window.deleteOrderType = async function(idx) { window.showConfirmDialog("حذف نوع الطلب؟", async function() { await window.deleteOrderTypeFromFirebase(configuredOrderTypes[idx].id); configuredOrderTypes.splice(idx, 1); window.renderOrderTypesSettings(); window.updateOrderTypeSelects(); }); }
window.renderOrderTypesSettings = function() { document.getElementById("orderTypesListDisplay").innerHTML = configuredOrderTypes.map((t, i) => `<li class="settings-list-item"><span class="item-text">${t.name} <span style="color:var(--primary-blue); font-size: 13px;">(${t.code})</span></span><button class="btn-danger" onclick="deleteOrderType(${i})">حذف</button></li>`).join(''); }
window.addUser = async function() { const u = document.getElementById("new-user-name").value.trim(), p = document.getElementById("new-user-pass").value.trim(); if(u === "" || p === "" || u === ADMIN_USER) return; const data = { username: u, password: p, canDeleteCloud: document.getElementById("new-user-can-delete").checked, canEditCloud: document.getElementById("new-user-can-edit").checked, canAccessSettings: document.getElementById("new-user-can-settings").checked, canAccessReports: document.getElementById("new-user-can-reports").checked }; const r = await window.addSystemUserToFirebase(data); additionalUsers.push({id: r.id, ...data}); window.renderUsers(); }
window.deleteUser = function(idx) { window.showConfirmDialog("حذف المستخدم؟", async function() { await window.deleteSystemUserFromFirebase(additionalUsers[idx].id); additionalUsers.splice(idx, 1); window.renderUsers(); }); }
window.togglePermission = async function(idx, field) { const u = additionalUsers[idx]; u[field] = !u[field]; await window.updateSystemUserInFirebase(u.id, {[field]: u[field]}); window.renderUsers(); }
window.renderUsers = function() { document.getElementById("users-list").innerHTML = additionalUsers.map((u, i) => `<li class="settings-list-item user-list-item"><div class="user-header-row"><span class="item-text" style="color:var(--primary-blue);">${u.username} <span style="font-size:12px; color:var(--text-muted);">(${u.password})</span></span><button class="btn-danger" onclick="deleteUser(${i})">حذف</button></div><div class="user-permissions-row"><span class="status-badge ${u.canDeleteCloud ? 'active' : 'inactive'}" onclick="togglePermission(${i}, 'canDeleteCloud')">مسح</span><span class="status-badge ${u.canEditCloud ? 'active' : 'inactive'}" onclick="togglePermission(${i}, 'canEditCloud')">تعديل</span><span class="status-badge ${u.canAccessSettings ? 'active' : 'inactive'}" onclick="togglePermission(${i}, 'canAccessSettings')">إعدادات</span><span class="status-badge ${u.canAccessReports ? 'active' : 'inactive'}" onclick="togglePermission(${i}, 'canAccessReports')">تقارير</span></div></li>`).join(''); }

window.addOrderItemRow = function() { const wr = document.getElementById('dynamicRowsWrapper'), r = document.createElement('div'); r.className = 'order-item-row'; r.innerHTML = `<div style="display:flex; flex: 2; gap:5px;"><select class="orderTypeSelect" style="flex: 1;"></select><input type="text" class="orderTypeCustomInput" placeholder="يدوي..." style="display:none; flex: 1;"><button type="button" class="btn-outline toggle-custom-btn" onclick="toggleOrderInput(this)">✍️</button></div> <input type="text" class="orderColorInput" placeholder="اللون" style="flex: 1; min-width: 80px;"> <div class="qty-controls" style="flex: 1; min-width: 110px;"><button type="button" class="qty-btn" onclick="changeQty(this, 1)">+</button><input type="number" class="orderQtyInput" value="1" style="width: 40px; text-align: center; box-shadow:none; padding:5px;"><button type="button" class="qty-btn" onclick="changeQty(this, -1)">-</button><button type="button" class="btn-danger" style="padding: 5px; border-radius: 10px; width: 35px; height: 35px; min-width:unset;" onclick="this.closest('.order-item-row').remove()">❌</button></div>`; wr.appendChild(r); window.updateOrderTypeSelects(); }
window.changeQty = function(btn, d) { let i = btn.parentElement.querySelector('input[type="number"]'), v = parseInt(i.value)||1; v += d; if(v<1) v=1; i.value = v; }
window.clearForm = function() { ['custId','custName','phone1','phone2','gov','area','amount','note'].forEach(id => document.getElementById(id).value = ''); document.getElementById('dynamicRowsWrapper').innerHTML = ''; window.addOrderItemRow(); document.getElementById('customerHistoryAlert').className = 'hidden'; document.getElementById('customerHistoryAlert').style.display = 'none'; }
window.clearAll = function() { document.getElementById('pasteArea').value = ''; document.getElementById('constantField').value = ''; window.clearForm(); }
