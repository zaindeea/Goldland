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

    window.saveDataToFirebase = async function(orderData) {
        try { orderData.timestamp = serverTimestamp(); await addDoc(collection(db, "orders"), orderData); return true; } 
        catch (e) { return false; }
    };
    
    window.getCloudOrdersFromFirebase = async function() {
        try { 
            const q = query(collection(db, "orders")); 
            const snap = await getDocs(q); 
            let orders = []; 
            snap.forEach(d => orders.push({ id_doc: d.id, ...d.data() })); 
            return orders; 
        } catch (e) { return []; }
    };
    
    window.deleteOrderFromFirebase = async function(docId) { await deleteDoc(doc(db, "orders", docId)); };
    window.updateOrderInFirebase = async function(docId, newData) { await updateDoc(doc(db, "orders", docId), newData); };
    
    window.loadSystemDataFromFirebase = async function() {
        try {
            let users = [], types = [], pages = [];
            const [uSnap, tSnap, pSnap] = await Promise.all([ 
                getDocs(collection(db, "system_users")), 
                getDocs(collection(db, "order_types")), 
                getDocs(collection(db, "system_pages")) 
            ]);
            uSnap.forEach(d => users.push({ id: d.id, ...d.data() }));
            tSnap.forEach(d => types.push({ id: d.id, ...d.data() }));
            pSnap.forEach(d => pages.push({ id: d.id, ...d.data() }));
            return { users, types, pages };
        } catch (e) { return { users: [], types: [], pages: [] }; }
    };
    
    window.addSystemUserToFirebase = async function(data) { return await addDoc(collection(db, "system_users"), data); };
    window.deleteSystemUserFromFirebase = async function(docId) { await deleteDoc(doc(db, "system_users", docId)); };
    window.updateSystemUserInFirebase = async function(docId, data) { await updateDoc(doc(db, "system_users", docId), data); };
    window.addOrderTypeToFirebase = async function(data) { return await addDoc(collection(db, "order_types"), data); };
    window.deleteOrderTypeFromFirebase = async function(docId) { await deleteDoc(doc(db, "order_types", docId)); };
    window.addSystemPageToFirebase = async function(data) { return await addDoc(collection(db, "system_pages"), data); };
    window.deleteSystemPageFromFirebase = async function(docId) { await deleteDoc(doc(db, "system_pages", docId)); };
} catch(e) { console.warn("Firebase Init Error", e); }

// =========================================
// التخزين وتغيير المظهر والساعة الحية
// =========================================
function safeGetStorage(key, def) { try { return localStorage.getItem(key) || def; } catch(e) { return def; } }
function safeSetStorage(key, val) { try { localStorage.setItem(key, val); } catch(e) {} }

let currentTheme = safeGetStorage('gl_theme', 'light');

window.applyTheme = function(theme) {
    const isDark = (theme === 'dark');
    if (isDark) { document.body.classList.add('dark-mode'); document.querySelectorAll('.theme-toggle-btn').forEach(btn => btn.innerHTML = '☀️');
    } else { document.body.classList.remove('dark-mode'); document.querySelectorAll('.theme-toggle-btn').forEach(btn => btn.innerHTML = '🌙'); }
}
window.toggleTheme = function() { currentTheme = (currentTheme === 'light') ? 'dark' : 'light'; safeSetStorage('gl_theme', currentTheme); window.applyTheme(currentTheme); }
window.applyTheme(currentTheme);

setInterval(() => {
    const timeEl = document.getElementById('globalTime');
    if(timeEl) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateStr = now.toLocaleDateString('ar-IQ');
        timeEl.innerText = `🕒 ${timeStr} - 📅 ${dateStr}`;
    }
}, 1000);

window.showSuccessToast = function(message) {
    let toast = document.getElementById('success-toast-alert');
    if (!toast) { toast = document.createElement('div'); toast.id = 'success-toast-alert'; toast.className = 'success-toast'; document.body.appendChild(toast); }
    toast.innerHTML = `✨ ${message}`; toast.classList.add('show'); setTimeout(() => { toast.classList.remove('show'); }, 3000);
};

const ADMIN_USER = "Zain"; 
const ADMIN_PASS = "327798";
let additionalUsers = [], configuredOrderTypes = [], configuredPages = [];
let loggedInUser = "", loggedInUserCanDelete = false, loggedInUserCanEdit = false, loggedInUserCanSettings = false, loggedInUserCanReports = false; 
let feeBaghdad = parseInt(safeGetStorage('feeBaghdad', '5000')) || 5000;
let feeOther = parseInt(safeGetStorage('feeOther', '8000')) || 8000;

window.saveDeliveryFees = function() { feeBaghdad = parseInt(document.getElementById('feeBaghdadInput').value) || 0; feeOther = parseInt(document.getElementById('feeOtherInput').value) || 0; safeSetStorage('feeBaghdad', feeBaghdad); safeSetStorage('feeOther', feeOther); alert("تم حفظ أجور التوصيل بنجاح!"); }

let allCloudOrders = [], filteredCloudOrders = []; 
let currentConfirmAction = null;
let currentEditDocId = null;

let deferredPrompt; window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
window.showInstallInstructions = async function(os) { if (deferredPrompt && os !== 'ios') { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; } else { if(os === 'ios') alert("🍏 لتثبيت التطبيق على الآيفون:\n\n1. اضغط على زر 'المشاركة' أسفل المتصفح.\n2. اختر 'إضافة إلى الصفحة الرئيسية'."); else alert("📱 التطبيق مثبت بالفعل، أو قم بإضافته من خيارات المتصفح."); } }

window.showConfirmDialog = function(msg, callback) { document.getElementById('confirmMessage').innerText = msg; currentConfirmAction = callback; document.getElementById('confirmModal').style.display = 'flex'; document.getElementById('confirmYesBtn').onclick = function() { if(currentConfirmAction) currentConfirmAction(); window.closeConfirmModal(); }; }
window.closeConfirmModal = function() { document.getElementById('confirmModal').style.display = 'none'; currentConfirmAction = null; }
window.handleEnter = function(event) { if (event.key === "Enter") window.login(); }
window.formatAmount = function(input) { let val = input.value.trim(); if (!val) return; let numericVal = parseFloat(val.replace(/[^0-9.-]+/g, "")); if (!isNaN(numericVal) && numericVal > 0 && numericVal < 1000) input.value = (numericVal * 1000).toString(); }
window.toggleOrderInput = function(btn) { let c = btn.parentElement, s = c.querySelector('.orderTypeSelect'), i = c.querySelector('.orderTypeCustomInput'); if(s.style.display !== 'none') { s.style.display = 'none'; i.style.display = 'block'; i.focus(); btn.innerHTML = '📋'; } else { i.style.display = 'none'; i.value = ''; s.style.display = 'block'; btn.innerHTML = '✍️'; } }

// =========================================
// نظام الدخول
// =========================================
window.login = async function() {
    try {
        const user = document.getElementById("username").value.trim(), pass = document.getElementById("password").value.trim(), errorMsg = document.getElementById("login-error"), btn = document.getElementById("loginBtn");
        if(user === "" || pass === "") return;

        let isManager = (user === ADMIN_USER && pass === ADMIN_PASS);
        btn.innerText = "جاري التحقق... ⏳"; btn.disabled = true;

        const completeLogin = () => {
            document.getElementById('globalUserBar').style.display = 'flex'; 
            document.getElementById('globalUserName').innerText = '👤 ' + loggedInUser;
            window.showDashboard(); errorMsg.style.display = "none"; btn.innerText = "تسجيل الدخول"; btn.disabled = false;
        };

        if (isManager) {
            loggedInUser = user; loggedInUserCanDelete = true; loggedInUserCanEdit = true; loggedInUserCanSettings = true; loggedInUserCanReports = true;
            if(window.loadSystemDataFromFirebase) {
                window.loadSystemDataFromFirebase().then(cloudData => { additionalUsers = cloudData.users; configuredOrderTypes = cloudData.types; configuredPages = cloudData.pages; document.getElementById('feeBaghdadInput').value = feeBaghdad; document.getElementById('feeOtherInput').value = feeOther; window.updateOrderTypeSelects(); window.updatePagesDropdown(); completeLogin(); }).catch(e => { console.log(e); completeLogin(); });
            } else { completeLogin(); }
            return;
        }

        if(window.loadSystemDataFromFirebase) {
            const cloudData = await window.loadSystemDataFromFirebase();
            additionalUsers = cloudData.users; configuredOrderTypes = cloudData.types; configuredPages = cloudData.pages;
            document.getElementById('feeBaghdadInput').value = feeBaghdad; document.getElementById('feeOtherInput').value = feeOther;
            window.updateOrderTypeSelects(); window.updatePagesDropdown();
        }

        const isNormalUser = additionalUsers.find(u => u.username === user && u.password === pass);
        if (isNormalUser) { 
            loggedInUser = user; loggedInUserCanDelete = isNormalUser.canDeleteCloud || false; loggedInUserCanEdit = isNormalUser.canEditCloud || false; loggedInUserCanSettings = isNormalUser.canAccessSettings || false; loggedInUserCanReports = isNormalUser.canAccessReports || false; 
            completeLogin();
        } else { errorMsg.style.display = "block"; btn.innerText = "تسجيل الدخول"; btn.disabled = false; }
    } catch (err) { alert("تعذر الاتصال. تحقق من الإنترنت."); document.getElementById("loginBtn").innerText = "تسجيل الدخول"; document.getElementById("loginBtn").disabled = false; }
}

window.showDashboard = function() { document.getElementById("login-section").style.display = "none"; document.getElementById("dashboard-section").style.display = "none"; document.getElementById("chat-section").style.display = "none"; document.getElementById("main-menu-section").style.display = "flex"; }
window.openDistribution = function() { document.getElementById("main-menu-section").style.display = "none"; document.getElementById("dashboard-section").style.display = "block"; }
window.backToMainMenu = function() { document.getElementById("dashboard-section").style.display = "none"; document.getElementById("main-menu-section").style.display = "flex"; }
window.backToMainMenuFromChat = function() { if(unsubscribeChat) { unsubscribeChat(); unsubscribeChat = null; } document.getElementById("chat-section").style.display = "none"; document.getElementById("main-menu-section").style.display = "flex"; }
window.comingSoon = function(feature) { alert("ميزة " + feature + " سيتم إضافتها لاحقاً ⏳"); }
window.logout = function() { window.showConfirmDialog("هل أنت متأكد من تسجيل الخروج؟", function() { if(unsubscribeChat) { unsubscribeChat(); unsubscribeChat = null; } loggedInUser = ""; document.getElementById('globalUserBar').style.display = 'none'; document.getElementById("dashboard-section").style.display = "none"; document.getElementById("main-menu-section").style.display = "none"; document.getElementById("chat-section").style.display = "none"; document.getElementById("login-section").style.display = "flex"; window.clearForm(); document.getElementById('tableBody').innerHTML = ""; }); }

// =========================================
// نظام الدردشة التفاعلية
// =========================================
let currentChatId = null; let unsubscribeChat = null; let allSystemUsersList = [];

window.openChatSection = async function() {
    document.getElementById("main-menu-section").style.display = "none"; 
    document.getElementById("chat-section").style.display = "flex";
    allSystemUsersList = [ADMIN_USER, ...additionalUsers.map(u => u.username)];
    const privateUsers = allSystemUsersList.filter(u => u !== loggedInUser);
    let privateHtml = '';
    privateUsers.forEach(u => {
        const chatId = [loggedInUser, u].sort().join('_');
        privateHtml += `<div class="chat-list-item" id="chatItem_${chatId}" onclick="openChat('${chatId}', '${u}')"><div class="chat-avatar">${u.charAt(0)}</div><div class="chat-info"><h4>${u}</h4></div></div>`;
    });
    if(privateHtml === '') privateHtml = '<div style="text-align:center; padding: 20px; color: var(--text-muted); font-size:12px;">لا يوجد مستخدمين</div>';
    document.getElementById('chatListPrivate').innerHTML = privateHtml;
    loadChatGroups();
    window.switchChatTab('general'); window.openChat('general', 'الدردشة العامة');
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
    if(unsubscribeChat) unsubscribeChat(); 
    const messagesArea = document.getElementById('chatMessages');
    messagesArea.innerHTML = '<div style="text-align:center; margin-top: 50px; color: var(--text-muted);">جاري التحميل... ⏳</div>';
    const q = query(collection(db, "chat_messages"), where("chatId", "==", chatId));
    
    unsubscribeChat = onSnapshot(q, (snapshot) => {
        let msgs = []; snapshot.forEach(doc => msgs.push(doc.data()));
        msgs.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
        messagesArea.innerHTML = '';
        if(msgs.length === 0) { messagesArea.innerHTML = '<div style="text-align:center; margin-top: 50px; color: var(--text-muted);">لا توجد رسائل بعد. ✍️</div>'; return; }
        msgs.forEach(data => {
            const isSent = (data.sender === loggedInUser);
            const timeStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleTimeString('ar-IQ', {hour: '2-digit', minute:'2-digit'}) : '';
            const msgDiv = document.createElement('div'); msgDiv.className = `message ${isSent ? 'sent' : 'received'}`;
            msgDiv.innerHTML = `<div class="msg-sender">${isSent ? 'أنت' : data.sender}</div><div class="msg-bubble">${data.text}<span class="msg-time">${timeStr}</span></div>`;
            messagesArea.appendChild(msgDiv);
        });
        messagesArea.scrollTop = messagesArea.scrollHeight; 
    }, (error) => { console.error(error); messagesArea.innerHTML = '<div style="text-align:center; margin-top: 50px; color: #ff4757;">خطأ في الاتصال بالدردشة.</div>'; });
}

window.sendMessage = async function() {
    const input = document.getElementById('chatInput'); const text = input.value.trim(); if(text === '' || !currentChatId) return; input.value = '';
    try { await addDoc(collection(db, "chat_messages"), { chatId: currentChatId, sender: loggedInUser, text: text, timestamp: serverTimestamp() }); } catch(e) { window.showSuccessToast("فشل إرسال الرسالة."); }
}

window.showChatSidebar = function() { document.getElementById('chatSidebar').classList.remove('hidden'); }
window.showCreateGroupModal = function() { document.getElementById('newGroupName').value = ''; const container = document.getElementById('groupMembersSelection'); container.innerHTML = ''; const otherUsers = allSystemUsersList.filter(u => u !== loggedInUser); otherUsers.forEach(u => { container.innerHTML += `<label class="permission-badge" style="justify-content: flex-start;"><input type="checkbox" class="group-member-cb" value="${u}"> ${u}</label>`; }); document.getElementById('createGroupModal').style.display = 'flex'; }
window.closeCreateGroupModal = function() { document.getElementById('createGroupModal').style.display = 'none'; }
window.createChatGroup = async function() {
    const groupName = document.getElementById('newGroupName').value.trim(); if(!groupName) { alert("يرجى إدخال اسم المجموعة"); return; }
    let members = [loggedInUser]; document.querySelectorAll('.group-member-cb:checked').forEach(cb => members.push(cb.value));
    try { await addDoc(collection(db, "chat_groups"), { name: groupName, createdBy: loggedInUser, members: members, timestamp: serverTimestamp() }); window.showSuccessToast("تم إنشاء المجموعة!"); closeCreateGroupModal(); loadChatGroups(); } catch(e) {}
}
window.loadChatGroups = async function() {
    try {
        const snap = await getDocs(query(collection(db, "chat_groups"))); let groupsHtml = '';
        snap.forEach(doc => { const data = doc.data(); if((data.members && data.members.includes(loggedInUser)) || loggedInUser === ADMIN_USER) { const chatId = 'group_' + doc.id; groupsHtml += `<div class="chat-list-item" id="chatItem_${chatId}" onclick="openChat('${chatId}', '${data.name}')"><div class="chat-avatar" style="background: linear-gradient(135deg, #00b09b, #96c93d);">👥</div><div class="chat-info"><h4>${data.name}</h4><p>${data.members.length} أعضاء</p></div></div>`; } });
        if(groupsHtml === '') groupsHtml = '<div style="text-align:center; padding: 20px; color: var(--text-muted); font-size:12px;">لا توجد مجموعات بعد</div>'; document.getElementById('groupsListContainer').innerHTML = groupsHtml;
    } catch(e) {}
}

// =========================================
// الأرشيف السحابي واستيراد إكسل وتعديل الطلبات
// =========================================
window.openCloudOrders = async function() {
    document.getElementById('cloudOrdersModal').style.display = 'flex';
    if(window.getCloudOrdersFromFirebase) {
        allCloudOrders = await window.getCloudOrdersFromFirebase();
        allCloudOrders.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        filteredCloudOrders = [...allCloudOrders]; window.filterCloudOrders();
    }
}
window.closeCloudOrders = function() { document.getElementById('cloudOrdersModal').style.display = 'none'; }

window.filterCloudOrders = function() {
    const qt = document.getElementById('cloudSearchInput').value.toLowerCase(), pF = document.getElementById('cloudPageFilter').value, tb = document.getElementById('cloudOrdersTbody'); 
    tb.innerHTML = '';
    filteredCloudOrders = allCloudOrders.filter(o => ((o.name||"").toLowerCase().includes(qt) || (o.phone1||"").includes(qt)) && (pF === "" || (o.constant||"") === pF));
    
    filteredCloudOrders.forEach(o => {
        const tr = document.createElement('tr');
        let actionsHtml = '';
        if (loggedInUserCanEdit) actionsHtml += `<button style="padding: 5px 10px; margin-left: 5px; background: #3498db; border-radius:6px; box-shadow:none; color:white; border:none;" onclick="openEditModal('${o.id_doc}')">✏️</button>`;
        if (loggedInUserCanDelete) actionsHtml += `<button style="padding: 5px 10px; border-radius:6px; background: #e74c3c; box-shadow:none; color:white; border:none;" onclick="deleteCloudOrder('${o.id_doc}')">🗑️</button>`;
        if (!actionsHtml) actionsHtml = '-';

        const dateStr = o.timestamp ? new Date(o.timestamp.seconds * 1000).toLocaleDateString('ar-IQ') : '-';

        tr.innerHTML = `<td>${o.id||'-'}</td> <td style="color:var(--primary-blue); font-weight:bold;">${o.constant||'-'}</td> <td>${o.name||'-'}</td>
            <td dir="ltr" style="font-size:12px;">${o.phone1}<br>${o.phone2||''}</td> <td style="font-size:12px;">${o.gov||'-'}</td>
            <td style="color:var(--primary-blue); font-size:12px;">${o.type||'-'}</td> <td>${o.amount||'-'}</td> 
            <td style="font-size:12px; font-weight:bold;">${o.addedBy||'-'}</td>
            <td style="font-size:12px; color:var(--text-muted);">${dateStr}</td>
            <td>${actionsHtml}</td>`;
        tb.appendChild(tr);
    });
}

window.downloadExcelTemplate = function() {
    const ws_data = [
        ["تسلسل الزبون", "البيج", "اسم الزبون", "رقم الهاتف الأول", "رقم الهاتف الثاني", "المحافظة", "المنطقة", "الطلب", "العدد", "المبلغ الكلي", "ملاحظات"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "النموذج");
    XLSX.writeFile(wb, "نموذج_رفع_الطلبات.xlsx");
}

window.uploadExcelFile = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        
        if(json.length === 0) { alert("الملف فارغ!"); return; }
        if(!confirm(`هل أنت متأكد من رفع ${json.length} طلب إلى السحابة؟`)) return;
        
        let successCount = 0;
        document.getElementById('cloudOrdersModal').style.pointerEvents = 'none';
        document.body.style.cursor = 'wait';
        
        for(let row of json) {
            const orderData = {
                id: (row["تسلسل الزبون"] || '').toString(),
                constant: (row["البيج"] || '').toString(),
                name: (row["اسم الزبون"] || '').toString(),
                phone1: (row["رقم الهاتف الأول"] || '').toString(),
                phone2: (row["رقم الهاتف الثاني"] || '').toString(),
                gov: (row["المحافظة"] || '').toString(),
                area: (row["المنطقة"] || '').toString(),
                type: (row["الطلب"] || '').toString(),
                qty: parseInt(row["العدد"]) || 1,
                amount: (row["المبلغ الكلي"] || '').toString(),
                note: (row["ملاحظات"] || '').toString(),
                addedBy: loggedInUser,
                status: 'جديد'
            };
            if(orderData.constant && (orderData.name || orderData.phone1)) {
                if(await window.saveDataToFirebase(orderData)) successCount++;
            }
        }
        
        document.getElementById('cloudOrdersModal').style.pointerEvents = 'auto';
        document.body.style.cursor = 'default';
        event.target.value = ''; 
        
        window.showSuccessToast(`تم رفع ${successCount} طلب بنجاح!`);
        allCloudOrders = await window.getCloudOrdersFromFirebase();
        allCloudOrders.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        window.filterCloudOrders();
    };
    reader.readAsArrayBuffer(file);
}

window.addEditOrderItemRow = function(tName = "", tQty = 1, tColor = "") {
    const wr = document.getElementById('editDynamicRowsWrapper');
    const r = document.createElement('div');
    r.className = 'order-item-row';
    r.innerHTML = `<div style="display:flex; flex: 2; min-width: 140px; gap:5px;">
        <select class="orderTypeSelect" style="flex: 1;"></select>
        <input type="text" class="orderTypeCustomInput" placeholder="يدوي..." style="display:none; flex: 1;">
        <button type="button" class="btn-outline toggle-custom-btn" onclick="toggleOrderInput(this)" style="padding: 0 10px;" title="كتابة يدوية">✍️</button>
    </div> 
    <input type="text" class="orderColorInput" placeholder="اللون" style="flex: 1; min-width: 80px;" value="${tColor}"> 
    <div class="qty-controls" style="flex: 1; min-width: 110px;">
        <button type="button" class="qty-btn" onclick="changeQty(this, 1)">+</button>
        <input type="number" class="orderQtyInput" value="${tQty}" min="1" style="width: 40px; text-align: center; box-shadow:none; padding:5px;">
        <button type="button" class="qty-btn" onclick="changeQty(this, -1)">-</button>
        <button type="button" class="btn-danger" style="padding: 5px; border-radius: 10px; width: 35px; height: 35px; min-width:unset;" onclick="this.closest('.order-item-row').remove()">❌</button>
    </div>`;
    wr.appendChild(r);
    
    window.updateOrderTypeSelects();
    
    let sel = r.querySelector('.orderTypeSelect');
    let ci = r.querySelector('.orderTypeCustomInput');
    let tb = r.querySelector('.toggle-custom-btn');
    
    if (tName) {
        let exists = Array.from(sel.options).some(o => o.value === tName);
        if (exists) {
            sel.value = tName;
        } else {
            window.toggleOrderInput(tb);
            ci.value = tName;
        }
    }
}

window.openEditModal = function(docId) { 
    let order = allCloudOrders.find(o => o.id_doc === docId); if(!order) return; 
    currentEditDocId = docId; 
    document.getElementById('editConstant').value = order.constant || ''; 
    document.getElementById('editName').value = order.name || ''; 
    document.getElementById('editPhone1').value = order.phone1 || ''; 
    document.getElementById('editPhone2').value = order.phone2 || ''; 
    document.getElementById('editGov').value = order.gov || ''; 
    document.getElementById('editArea').value = order.area || ''; 
    document.getElementById('editAmount').value = order.amount || ''; 
    
    document.getElementById('editDynamicRowsWrapper').innerHTML = '';
    let items = order.type ? order.type.split(' + ') : [];
    if(items.length === 0) {
        window.addEditOrderItemRow();
    } else {
        items.forEach(itemStr => {
            let match = itemStr.match(/\[([^)]+)\s\((\d+)\)\s*([^\]]*)\]/);
            if(match) {
                let code = match[1].trim();
                let qty = parseInt(match[2]) || 1;
                let color = match[3] ? match[3].trim() : "";
                
                let typeObj = configuredOrderTypes.find(t => t.code === code);
                let typeName = typeObj ? typeObj.name : code; 
                window.addEditOrderItemRow(typeName, qty, color);
            } else {
                window.addEditOrderItemRow(itemStr.replace(/\[\vert{}\]/g, ''), 1, "");
            }
        });
    }

    document.getElementById('editOrderModal').style.display = 'flex'; 
}

window.closeEditModal = function() { document.getElementById('editOrderModal').style.display = 'none'; currentEditDocId = null; }

window.saveEditedOrder = async function() { 
    if(!currentEditDocId) return; 
    
    let arr = [], totQty = 0; 
    document.querySelectorAll('#editDynamicRowsWrapper .order-item-row').forEach(r => { 
        let s = r.querySelector('.orderTypeSelect'), ci = r.querySelector('.orderTypeCustomInput'), cv = r.querySelector('.orderColorInput').value.trim(); 
        let tv = (ci.style.display !== 'none') ? ci.value.trim() : s.value.trim(); 
        let qv = parseInt(r.querySelector('.orderQtyInput').value) || 1; 
        
        if (tv !== "") { 
            let ft = configuredOrderTypes.find(t => t.name === tv); 
            let cd = ft ? ft.code : tv; 
            let colorText = cv ? ` ${cv}` : "";
            arr.push(`[${cd} (${qv})${colorText}]`); 
            totQty += qv; 
        } 
    }); 
    
    const newData = { 
        constant: document.getElementById('editConstant').value, 
        name: document.getElementById('editName').value, 
        phone1: document.getElementById('editPhone1').value, 
        phone2: document.getElementById('editPhone2').value, 
        gov: document.getElementById('editGov').value, 
        area: document.getElementById('editArea').value, 
        type: arr.join(' + '), 
        qty: totQty, 
        amount: document.getElementById('editAmount').value 
    }; 
    
    if(window.updateOrderInFirebase) { 
        try { 
            await window.updateOrderInFirebase(currentEditDocId, newData); 
            let idx = allCloudOrders.findIndex(o => o.id_doc === currentEditDocId); 
            if(idx > -1) { allCloudOrders[idx] = { ...allCloudOrders[idx], ...newData }; } 
            window.filterCloudOrders(); 
            window.closeEditModal(); 
            window.showSuccessToast("تم التعديل بنجاح! ✏️"); 
        } catch(e) { alert("حدث خطأ أثناء التعديل."); } 
    } 
}

// =========================================
// التقارير، الإعدادات، والإضافة الأساسية
// =========================================
window.updateOrderTypeSelects = function() { document.querySelectorAll('.orderTypeSelect').forEach(s => { const v = s.value; s.innerHTML = '<option value="">-- اختر الطلب --</option>' + configuredOrderTypes.map(t => `<option value="${t.name}">${t.name} ➡️ (${t.code})</option>`).join(''); s.value = v; }); }

window.addToTable = async function() { const pg = document.getElementById('constantField').value; if (!pg) { alert("يجب اختيار البيج!"); return; } let arr = [], totQty = 0; document.querySelectorAll('#itemsContainer .order-item-row').forEach(r => { let s = r.querySelector('.orderTypeSelect'), ci = r.querySelector('.orderTypeCustomInput'), cv = r.querySelector('.orderColorInput').value.trim(); let tv = (ci.style.display !== 'none') ? ci.value.trim() : s.value.trim(); let qv = parseInt(r.querySelector('.orderQtyInput').value) || 1; if (tv !== "") { let ft = configuredOrderTypes.find(t => t.name === tv); let cd = ft ? ft.code : tv; let colorText = cv ? ` ${cv}` : ""; arr.push(`[${cd} (${qv})${colorText}]`); totQty += qv; } }); const data = { id: document.getElementById('custId').value, name: document.getElementById('custName').value, phone1: document.getElementById('phone1').value, phone2: document.getElementById('phone2').value, gov: document.getElementById('gov').value, area: document.getElementById('area').value, type: arr.join(' + '), qty: totQty, amount: document.getElementById('amount').value, constant: pg, note: document.getElementById('note').value, addedBy: loggedInUser || 'مجهول', status: 'جديد' }; if (!data.id && !data.name) return; if (window.saveDataToFirebase) { document.getElementById("mainSaveBtn").disabled = true; await window.saveDataToFirebase(data); document.getElementById("mainSaveBtn").disabled = false; } const row = document.createElement('tr'); row.innerHTML = `<td>${data.id}</td> <td style="color:var(--primary-blue); font-weight:bold;">${data.constant}</td> <td>${data.name}</td> <td dir="ltr">${data.phone1}</td> <td dir="ltr">${data.phone2}</td> <td>${data.gov}</td> <td>${data.area}</td> <td style="color:var(--primary-blue); font-weight:bold;">${data.type}</td> <td>${data.qty}</td> <td>${data.amount}</td> <td>${data.note}</td> <td><button class="btn-danger" style="padding: 5px 15px; border-radius: 10px; font-size: 13px;" onclick="this.closest('tr').remove(); updateOrdersCounter();">حذف</button></td>`; document.getElementById('tableBody').appendChild(row); window.updateOrdersCounter(); window.clearForm(); document.getElementById('pasteArea').value = ''; window.showSuccessToast("تمت إضافة الطلب بنجاح! 🎉"); }

window.openReports = async function() { 
    if (!loggedInUserCanReports) { alert("❌ ليس لديك صلاحية للوصول."); return; } 
    document.getElementById('reportsModal').style.display = 'flex'; 
    if (allCloudOrders.length === 0 && window.getCloudOrdersFromFirebase) { 
        document.getElementById('repPageTbody').innerHTML = '<tr><td colspan="3" style="text-align:center;">جاري التحميل...</td></tr>'; 
        allCloudOrders = await window.getCloudOrdersFromFirebase(); 
    } 
    
    let pagesHtml = '<option value="all">-- كل البيجات --</option>' + configuredPages.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    document.getElementById('repPageFilter').innerHTML = pagesHtml;
    document.getElementById('repFinPageFilter').innerHTML = pagesHtml;

    let typesHtml = '<option value="all">-- كل الطلبات --</option>' + configuredOrderTypes.map(t => `<option value="${t.code}">${t.name} (${t.code})</option>`).join('');
    document.getElementById('repTypeFilter').innerHTML = typesHtml;
    document.getElementById('repPageTypeFilter').innerHTML = typesHtml;

    window.generateReports(); 
}

window.closeReports = function() { document.getElementById('reportsModal').style.display = 'none'; }
window.switchReportTab = function(tabId, btn) { document.querySelectorAll('#reportsModal .tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('#reportsModal .tab-pane').forEach(p => p.classList.remove('active')); btn.classList.add('active'); document.getElementById(tabId).classList.add('active'); }

window.generateReports = function() { 
    if(allCloudOrders.length === 0) return; 
    const fromVal = document.getElementById('repDateFrom').value, toVal = document.getElementById('repDateTo').value; 
    let fromDate = fromVal ? new Date(fromVal) : null; if(fromDate) fromDate.setHours(0,0,0,0); 
    let toDate = toVal ? new Date(toVal) : null; if(toDate) toDate.setHours(23,59,59,999); 
    
    let targetOrders = allCloudOrders.filter(o => { 
        if(fromDate || toDate) { 
            if(!o.timestamp?.seconds) return false; 
            const orderDate = new Date(o.timestamp.seconds * 1000); 
            if(fromDate && orderDate < fromDate) return false; 
            if(toDate && orderDate > toDate) return false; 
        } return true; 
    }); 

    // تبويب البيجات والجدول
    const selPage = document.getElementById('repPageFilter').value;
    const selPageType = document.getElementById('repPageTypeFilter').value;
    
    let pageTargetOrders = targetOrders; 
    if(selPage !== "all") pageTargetOrders = pageTargetOrders.filter(o => o.constant === selPage); 
    if(selPageType !== "all") pageTargetOrders = pageTargetOrders.filter(o => o.type && o.type.includes(`[${selPageType}`));
    
    let totalPageQty = 0, totalPageAmt = 0, pageTbodyHtml = ""; 
    if (pageTargetOrders.length === 0) { 
        pageTbodyHtml = '<tr><td colspan="3" style="text-align:center;">لا توجد بيانات</td></tr>'; 
    } else { 
        pageTargetOrders.forEach(o => { 
            let amt = parseFloat((o.amount || "0").toString().replace(/[^0-9.-]+/g,"")) || 0, qty = parseInt(o.qty) || 1; 
            totalPageQty += qty; totalPageAmt += amt; 
            let safeType = (o.type || "غير محدد").split(' + ').map(item => `<span dir="ltr" style="display: inline-block; padding: 0 5px;">${item}</span>`).join(' <span style="font-weight:bold;">+</span> '); 
            pageTbodyHtml += `<tr><td style="color:var(--primary-blue); font-size: 13px; text-align: center;">${safeType}</td><td>${qty}</td><td>${amt.toLocaleString()}</td></tr>`; 
        }); 
    } 
    document.getElementById('repPageTbody').innerHTML = pageTbodyHtml; 
    document.getElementById('totalPageQty').innerText = totalPageQty; 
    document.getElementById('totalPageAmount').innerText = totalPageAmt.toLocaleString(); 

    // تبويب إحصائيات الأصناف
    const selType = document.getElementById('repTypeFilter').value; 
    let typeStats = {}; 
    targetOrders.forEach(o => { 
        if(o.type) { 
            o.type.split('+').forEach(item => { 
                let match = item.match(/\[(.*?)\s\((\d+)\)/); 
                if(match) { 
                    let code = match[1].trim(), qty = parseInt(match[2]) || 1; 
                    typeStats[code] = (typeStats[code] || 0) + qty; 
                } 
            }); 
        } 
    }); 
    
    let typeCardsHtml = "", filteredTypes = Object.entries(typeStats); 
    if(selType !== "all") filteredTypes = filteredTypes.filter(([tCode]) => tCode === selType); 
    
    if(filteredTypes.length === 0) { 
        typeCardsHtml = '<div style="width:100%; text-align:center; color:#ccc; padding:20px;">لا توجد بيانات</div>'; 
    } else { 
        filteredTypes.forEach(([tCode, tQty]) => { 
            let tNameObj = configuredOrderTypes.find(t => t.code === tCode);
            let tName = tNameObj ? tNameObj.name : tCode;
            typeCardsHtml += `<div class="report-card"><h4>${tName} (${tCode})</h4><div class="val">${tQty}</div></div>`; 
        }); 
    } 
    document.getElementById('repTypeCardsContainer').innerHTML = typeCardsHtml; 

    // تبويب المالي
    const selFinPage = document.getElementById('repFinPageFilter').value;
    let finTargetOrders = targetOrders;
    if(selFinPage !== "all") finTargetOrders = finTargetOrders.filter(o => o.constant === selFinPage);
    
    let finCount = finTargetOrders.length, finQty = 0, finGross = 0, finDelivery = 0; 
    finTargetOrders.forEach(o => { 
        let amt = parseFloat((o.amount || "0").toString().replace(/[^0-9.-]+/g,"")) || 0; 
        finQty += parseInt(o.qty) || 1; 
        finGross += amt; 
        finDelivery += (o.gov || "").includes("بغداد") ? feeBaghdad : feeOther; 
    }); 
    document.getElementById('finCount').innerText = finCount; 
    document.getElementById('finQty').innerText = finQty; 
    document.getElementById('finGross').innerText = finGross.toLocaleString(); 
    document.getElementById('finDelivery').innerText = finDelivery.toLocaleString(); 
    document.getElementById('finNet').innerText = (finGross - finDelivery).toLocaleString(); 
}

window.exportPageReportPDF = function() { 
    const pageName = document.getElementById('repPageFilter').value; 
    const typeName = document.getElementById('repPageTypeFilter').value; 
    const tempDiv = document.createElement('div'); 
    tempDiv.style.padding = '30px'; tempDiv.style.background = '#ffffff'; tempDiv.style.color = '#000000'; tempDiv.style.direction = 'rtl'; tempDiv.style.fontFamily = 'Arial, sans-serif'; 
    
    let titleStr = 'تقرير المبيعات - ';
    titleStr += (pageName === 'all' ? 'جميع البيجات' : pageName);
    if(typeName !== 'all') titleStr += ' | صنف: ' + typeName;

    const title = document.createElement('h2'); 
    title.innerText = titleStr; 
    title.style.textAlign = 'center'; title.style.marginBottom = '25px'; 
    tempDiv.appendChild(title); 
    
    const tableClone = document.getElementById('pageReportTable').cloneNode(true); 
    tableClone.style.width = '100%'; tableClone.style.borderCollapse = 'collapse'; 
    tableClone.querySelectorAll('th, td').forEach(cell => { cell.style.border = '1px solid #ccc'; cell.style.padding = '12px'; cell.style.textAlign = 'center'; cell.style.color = '#000'; cell.style.background = '#fff';}); 
    tempDiv.appendChild(tableClone); document.body.appendChild(tempDiv); 
    
    const opt = { margin: 10, filename: `تقرير_المبيعات.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }; 
    html2pdf().set(opt).from(tempDiv).save().then(() => { document.body.removeChild(tempDiv); }); 
}

window.deleteCloudOrder = function(docId) { window.showConfirmDialog("تأكيد الحذف النهائي؟", async function() { if(window.deleteOrderFromFirebase) { await window.deleteOrderFromFirebase(docId); allCloudOrders = allCloudOrders.filter(o => o.id_doc !== docId); window.filterCloudOrders(); window.showSuccessToast("تم حذف الطلب بنجاح!"); } }); }

window.exportCloudToExcel = function() { if(filteredCloudOrders.length === 0) return; let exportData = filteredCloudOrders.map((o, i) => { const amt = parseFloat((o.amount || "0").toString().replace(/[^0-9.-]+/g,"")) || 0, del = (o.gov || "").includes("بغداد") ? feeBaghdad : feeOther; return { "ت": i+1, "البيج": o.constant||"", "اسم الزبون": o.name||"", "رقم الهاتف": o.phone1, "العنوان": o.gov||"", "العدد": parseInt(o.qty)||1, "المبلغ الكلي": amt, "مبلغ التوصيل": del, "الصافي": amt-del }; }); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportData), "السحابة"); XLSX.writeFile(wb, "أرشيف_السحابة.xlsx"); }
window.openSettings = function() { document.getElementById('settingsModal').style.display = 'flex'; if (loggedInUserCanSettings) { document.getElementById('settingsAuthSection').style.display = 'none'; document.getElementById('settingsManagerSection').style.display = 'block'; window.renderPagesSettings(); window.renderOrderTypesSettings(); window.renderUsers(); } else { document.getElementById('settingsAuthSection').style.display = 'block'; document.getElementById('settingsManagerSection').style.display = 'none'; } }
window.closeSettings = function() { document.getElementById('settingsModal').style.display = 'none'; }
window.verifySettingsPass = function() { if (document.getElementById('settingsPass').value === ADMIN_PASS) { document.getElementById('settingsAuthSection').style.display = 'none'; document.getElementById('settingsManagerSection').style.display = 'block'; window.renderPagesSettings(); window.renderOrderTypesSettings(); window.renderUsers(); } else { document.getElementById('settings-error').style.display = 'block'; } }
window.switchTab = function(tabId, btn) { document.querySelectorAll('#settingsModal .tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('#settingsModal .tab-pane').forEach(p => p.classList.remove('active')); btn.classList.add('active'); document.getElementById(tabId).classList.add('active'); }
window.addPageType = async function() { const val = document.getElementById('newPageName').value.trim(); if(val && window.addSystemPageToFirebase) { const r = await window.addSystemPageToFirebase({name: val}); configuredPages.push({id: r.id, name: val}); window.renderPagesSettings(); window.updatePagesDropdown(); } }
window.deletePageType = async function(idx) { window.showConfirmDialog("حذف البيج؟", async function() { await window.deleteSystemPageFromFirebase(configuredPages[idx].id); configuredPages.splice(idx, 1); window.renderPagesSettings(); window.updatePagesDropdown(); }); }
window.renderPagesSettings = function() { document.getElementById("pagesListDisplay").innerHTML = configuredPages.map((p, i) => `<li class="settings-list-item"><span class="item-text">${p.name}</span><button class="btn-danger" onclick="deletePageType(${i})">حذف</button></li>`).join(''); }
window.updatePagesDropdown = function() { const s1 = document.getElementById('constantField'), s2 = document.getElementById('cloudPageFilter'); s1.innerHTML = '<option value="">-- اختر البيج --</option>' + configuredPages.map(p => `<option value="${p.name}">${p.name}</option>`).join(''); s2.innerHTML = '<option value="">-- كل البيجات --</option>' + configuredPages.map(p => `<option value="${p.name}">${p.name}</option>`).join(''); }
window.addOrderType = async function() { const n = document.getElementById('newOrderName').value.trim(), c = document.getElementById('newOrderCode').value.trim(); if(n && c && window.addOrderTypeToFirebase) { const r = await window.addOrderTypeToFirebase({name: n, code: c}); configuredOrderTypes.push({id: r.id, name: n, code: c}); window.renderOrderTypesSettings(); window.updateOrderTypeSelects(); } }
window.deleteOrderType = async function(idx) { window.showConfirmDialog("حذف نوع الطلب؟", async function() { await window.deleteOrderTypeFromFirebase(configuredOrderTypes[idx].id); configuredOrderTypes.splice(idx, 1); window.renderOrderTypesSettings(); window.updateOrderTypeSelects(); }); }
window.renderOrderTypesSettings = function() { document.getElementById("orderTypesListDisplay").innerHTML = configuredOrderTypes.map((t, i) => `<li class="settings-list-item"><span class="item-text">${t.name} <span style="color:var(--primary-blue); font-size: 13px;">(${t.code})</span></span><button class="btn-danger" onclick="deleteOrderType(${i})">حذف</button></li>`).join(''); }
window.addUser = async function() { const u = document.getElementById("new-user-name").value.trim(), p = document.getElementById("new-user-pass").value.trim(); if(u === "" || p === "" || u === ADMIN_USER) return; const data = { username: u, password: p, canDeleteCloud: document.getElementById("new-user-can-delete").checked, canEditCloud: document.getElementById("new-user-can-edit").checked, canAccessSettings: document.getElementById("new-user-can-settings").checked, canAccessReports: document.getElementById("new-user-can-reports").checked }; const r = await window.addSystemUserToFirebase(data); additionalUsers.push({id: r.id, ...data}); window.renderUsers(); }
window.deleteUser = function(idx) { window.showConfirmDialog("حذف المستخدم؟", async function() { await window.deleteSystemUserFromFirebase(additionalUsers[idx].id); additionalUsers.splice(idx, 1); window.renderUsers(); }); }
window.togglePermission = async function(idx, field) { const u = additionalUsers[idx]; u[field] = !u[field]; await window.updateSystemUserInFirebase(u.id, {[field]: u[field]}); window.renderUsers(); }
window.renderUsers = function() { document.getElementById("users-list").innerHTML = additionalUsers.map((u, i) => `<li class="settings-list-item user-list-item"><div class="user-header-row"><span class="item-text" style="color:var(--primary-blue);">${u.username} <span style="font-size:12px; color:var(--text-muted);">(${u.password})</span></span><button class="btn-danger" onclick="deleteUser(${i})">حذف</button></div><div class="user-permissions-row"><span class="status-badge ${u.canDeleteCloud ? 'active' : 'inactive'}" onclick="togglePermission(${i}, 'canDeleteCloud')">مسح</span><span class="status-badge ${u.canEditCloud ? 'active' : 'inactive'}" onclick="togglePermission(${i}, 'canEditCloud')">تعديل</span><span class="status-badge ${u.canAccessSettings ? 'active' : 'inactive'}" onclick="togglePermission(${i}, 'canAccessSettings')">إعدادات</span><span class="status-badge ${u.canAccessReports ? 'active' : 'inactive'}" onclick="togglePermission(${i}, 'canAccessReports')">تقارير</span></div></li>`).join(''); }

window.addOrderItemRow = function() { const wr = document.getElementById('dynamicRowsWrapper'), r = document.createElement('div'); r.className = 'order-item-row'; r.innerHTML = `<div style="display:flex; flex: 2; gap:5px;"><select class="orderTypeSelect" style="flex: 1;"></select><input type="text" class="orderTypeCustomInput" placeholder="يدوي..." style="display:none; flex: 1;"><button type="button" class="btn-outline toggle-custom-btn" onclick="toggleOrderInput(this)">✍️</button></div> <input type="text" class="orderColorInput" placeholder="اللون" style="flex: 1; min-width: 80px;"> <div class="qty-controls" style="flex: 1; min-width: 110px;"><button type="button" class="qty-btn" onclick="changeQty(this, 1)">+</button><input type="number" class="orderQtyInput" value="1" style="width: 40px; text-align: center; box-shadow:none; padding:5px;"><button type="button" class="qty-btn" onclick="changeQty(this, -1)">-</button><button type="button" class="btn-danger" style="padding: 5px; border-radius: 10px; width: 35px; height: 35px; min-width:unset;" onclick="this.closest('.order-item-row').remove()">❌</button></div>`; wr.appendChild(r); window.updateOrderTypeSelects(); }
window.resetItemsContainer = function() { document.getElementById('dynamicRowsWrapper').innerHTML = `<div class="order-item-row"><div style="display:flex; flex: 2; min-width: 140px; gap:5px;"><select class="orderTypeSelect" style="flex: 1;"></select><input type="text" class="orderTypeCustomInput" placeholder="اكتب نوع الطلب..." style="display:none; flex: 1;"><button type="button" class="btn-outline toggle-custom-btn" onclick="toggleOrderInput(this)" style="padding: 0 10px;" title="كتابة يدوية">✍️</button></div><input type="text" class="orderColorInput" placeholder="اللون (اختياري)" style="flex: 1; min-width: 100px;"><div class="qty-controls" style="flex: 1; min-width: 110px;"><button type="button" class="qty-btn" onclick="changeQty(this, 1)">+</button><input type="number" class="orderQtyInput" value="1" min-width="1" style="width: 40px; text-align: center; box-shadow:none; padding:5px;"><button type="button" class="qty-btn" onclick="changeQty(this, -1)">-</button></div></div>`; window.updateOrderTypeSelects(); }
window.changeQty = function(btn, d) { let i = btn.parentElement.querySelector('input[type="number"]'), v = parseInt(i.value)||1; v += d; if(v<1) v=1; i.value = v; }
window.extractValue = function(lines, keyword) { for (let i = 0; i < lines.length; i++) { if (lines[i].includes(keyword)) { let val = lines[i].split(':').pop().trim().replace(/🛑/g, '').trim(); if (val !== "" && val !== keyword.replace(/:/g, '').trim()) return val; if (i + 1 < lines.length) { let nVal = lines[i+1].replace(/🛑/g, '').trim(); if(nVal && !nVal.includes(':')) return nVal; } } } return ""; }
window.parseText = function() { const txt = document.getElementById('pasteArea').value.trim(); if (!txt) return; const lines = txt.split('\n').map(l => l.trim()).filter(l => l !== ''); document.getElementById('custId').value = window.extractValue(lines, 'تسلسل الزب'); document.getElementById('custName').value = window.extractValue(lines, 'اسم الزبون'); document.getElementById('phone1').value = window.extractValue(lines, 'رقم الهاتف الاول'); document.getElementById('phone2').value = window.extractValue(lines, 'رقم الهاتف الثاني'); document.getElementById('gov').value = window.extractValue(lines, 'المحافظة'); document.getElementById('area').value = window.extractValue(lines, 'المنطقة'); document.getElementById('amount').value = window.extractValue(lines, 'المبلغ الكلي'); window.formatAmount(document.getElementById('amount')); document.getElementById('note').value = window.extractValue(lines, 'ملاحظة مهمة'); let s = document.querySelector('.orderTypeSelect'), ci = document.querySelector('.orderTypeCustomInput'), tb = s.parentElement.querySelector('.toggle-custom-btn'); let extType = window.extractValue(lines, 'نوع الطلب'); if (extType && s) { if (Array.from(s.options).some(o => o.value === extType)) { if(s.style.display === 'none') window.toggleOrderInput(tb); s.value = extType; } else { if(s.style.display !== 'none') window.toggleOrderInput(tb); ci.value = extType; } } }
window.clearForm = function() { ['custId','custName','phone1','phone2','gov','area','amount','note'].forEach(id => document.getElementById(id).value = ''); window.resetItemsContainer(); }
window.clearAll = function() { document.getElementById('pasteArea').value = ''; document.getElementById('constantField').value = ''; window.clearForm(); }
window.updateOrdersCounter = function() { document.getElementById('ordersCounterBadge').innerText = `(${document.getElementById('tableBody').rows.length})`; }
