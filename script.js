import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, serverTimestamp, getDocs, query, 
    deleteDoc, doc, updateDoc, onSnapshot, where, setDoc, getDoc, orderBy, limit, writeBatch, runTransaction, arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// =========================================
// دوال مساعدة عامة
// =========================================
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
window.esc = esc;

// تحويل المبلغ (نص) إلى رقم: يدعم الأرقام العربية والفواصل ونقطة الآلاف (25.000)
function parseAmount(v) {
    let s = String(v ?? '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g, '.').replace(/[٬,\s]/g, '');
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = parseFloat(s.replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
}

// تحليل نص الطلب المخزّن بصيغة: [CODE (2) لون] + [CODE2 (1)]
function parseTypeItems(typeStr) {
    const items = [];
    if (!typeStr) return items;
    const re = /\[(.*?)\s\((\d+)\)(?:\s([^\]]*))?\]/g;
    let m;
    while ((m = re.exec(typeStr)) !== null) items.push({ code: m[1].trim(), qty: parseInt(m[2]) || 1, color: (m[3] || '').trim() });
    return items;
}

function colVal(row, ar) { return row[ar] ?? row[window.trEn(ar)]; }

const firebaseConfig = {
    apiKey: "AIzaSyA-2N_HZoej2Vv3vQa0P5hu0gvmwVs0R3o",
    authDomain: "gold-land2021.firebaseapp.com",
    projectId: "gold-land2021",
    storageBucket: "gold-land2021.firebasestorage.app",
    messagingSenderId: "580003463235",
    appId: "1:580003463235:web:4ebb43e8f3db552b3294f6"
};

let db;
let cloudOrdersUnsubscribe = null, stockUnsubscribe = null, transactionsUnsubscribe = null;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    // =========================================
    // نظام تسجيل النشاطات في السحابة
    // =========================================
    window.logActionToCloud = async function(actionType, detailsStr) {
        if(!loggedInUser) return;
        try { 
            await addDoc(collection(db, "action_logs"), { username: loggedInUser, action: actionType, details: detailsStr, timestamp: serverTimestamp() }); 
        } catch(e) { console.error(e); }
    };

    // =========================================
    // الطلبات الأساسية
    // =========================================
    window.saveDataToFirebase = async function(orderData) { 
        try { orderData.timestamp = serverTimestamp(); await addDoc(collection(db, "orders"), orderData); window.logActionToCloud("إضافة طلب", `تم إضافة طلب للزبون: ${orderData.name}`); return true; 
        } catch (e) { window.showSuccessToast("حدث خطأ أثناء الحفظ"); return false; } 
    };
    window.deleteOrderFromFirebase = async function(docId) { try { await deleteDoc(doc(db, "orders", docId)); window.logActionToCloud("حذف طلب", `تم مسح طلب نهائياً`); } catch (e) { console.error(e); } };
    window.updateOrderInFirebase = async function(docId, newData) { try { await updateDoc(doc(db, "orders", docId), newData); const _li = allCloudOrders.findIndex(o => o.id_doc === docId); if(_li > -1) Object.assign(allCloudOrders[_li], newData); if(document.getElementById('archive-section').style.display === 'flex') window.filterCloudOrders(); let actType = newData.status ? "تغيير حالة" : "تعديل طلب"; window.logActionToCloud(actType, `تعديل/تحديث بيانات طلب`); } catch(e) { console.error(e); throw e; } };
    
    // مراقب الطلبات السحابية
    window.listenToCloudOrders = function() {
        if(cloudOrdersUnsubscribe) { cloudOrdersUnsubscribe(); cloudOrdersUnsubscribe = null; }
        allCloudOrders = []; const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
        const q = query(collection(db, "orders"), where("timestamp", ">=", startOfMonth));
        let isFirstLoad = true;
        cloudOrdersUnsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = { id_doc: change.doc.id, ...change.doc.data() };
                if (change.type === "added") { allCloudOrders.push(data); if(!isFirstLoad && data.addedBy !== loggedInUser) { window.playAudioNotification(); window.showSuccessToast(`طلب جديد أضيف بواسطة ${data.addedBy}`); } }
                if (change.type === "modified") { const idx = allCloudOrders.findIndex(o => o.id_doc === change.doc.id); if(idx > -1) allCloudOrders[idx] = data; }
                if (change.type === "removed") { allCloudOrders = allCloudOrders.filter(o => o.id_doc !== change.doc.id); }
            });
            isFirstLoad = false; if(document.getElementById('archive-section').style.display === 'flex') window.filterCloudOrders();
        });
    };

    // =========================================
    // مراقبات المخزن (Inventory)
    // =========================================
    window.listenToInventory = function() {
        if(stockUnsubscribe) stockUnsubscribe(); if(transactionsUnsubscribe) transactionsUnsubscribe();
        inventoryStock = []; inventoryTransactions = [];
        stockUnsubscribe = onSnapshot(collection(db, "inventory_stock"), (snapshot) => {
            inventoryStock = []; snapshot.forEach(doc => { inventoryStock.push({ id_doc: doc.id, ...doc.data() }); });
            if(document.getElementById('warehouse-section').style.display === 'flex') { window.renderWarehouseStock(); window.updateConsumeSelect(); window.checkLowStockAlerts(); }
            window.generateWarehouseReports();
        });
        const qT = query(collection(db, "inventory_transactions"), orderBy("timestamp", "desc"), limit(300));
        transactionsUnsubscribe = onSnapshot(qT, (snapshot) => {
            inventoryTransactions = []; snapshot.forEach(doc => { inventoryTransactions.push({ id_doc: doc.id, ...doc.data() }); });
            if(document.getElementById('warehouse-section').style.display === 'flex') { window.renderWarehouseLogs(); }
            window.generateWarehouseReports();
        });
    };

    window.loadSystemDataFromFirebase = async function() {
        try { 
            let users = [], types = [], pages = []; inventoryCatalog = [];
            const [uSnap, tSnap, pSnap, catSnap, delivSnap] = await Promise.all([ 
                getDocs(collection(db, "system_users")), getDocs(collection(db, "order_types")), getDocs(collection(db, "system_pages")), getDocs(collection(db, "inventory_catalog")), getDoc(doc(db, "system_settings", "delivery")) 
            ]); 
            uSnap.forEach(d => users.push({ id: d.id, ...d.data() })); tSnap.forEach(d => types.push({ id: d.id, ...d.data() })); pSnap.forEach(d => pages.push({ id: d.id, ...d.data() })); catSnap.forEach(d => inventoryCatalog.push({ id: d.id, ...d.data() }));
            if(delivSnap.exists()) { feeBaghdad = delivSnap.data().feeBaghdad || 5000; feeOther = delivSnap.data().feeOther || 8000; }
            return { ok: true, users, types, pages }; 
        } catch (e) { console.error(e); return { ok: false, users: [], types: [], pages: [] }; }
    };
    
    // دوال الإعدادات والمخزن الأساسية
    window.addSystemUserToFirebase = async function(data) { return await addDoc(collection(db, "system_users"), data); }; 
    window.deleteSystemUserFromFirebase = async function(docId) { await deleteDoc(doc(db, "system_users", docId)); }; 
    window.updateSystemUserInFirebase = async function(docId, data) { await updateDoc(doc(db, "system_users", docId), data); }; 
    window.addOrderTypeToFirebase = async function(data) { return await addDoc(collection(db, "order_types"), data); }; 
    window.deleteOrderTypeFromFirebase = async function(docId) { await deleteDoc(doc(db, "order_types", docId)); }; 
    window.updateOrderTypeInFirebase = async function(docId, data) { await updateDoc(doc(db, "order_types", docId), data); }; 
    window.addSystemPageToFirebase = async function(data) { return await addDoc(collection(db, "system_pages"), data); }; 
    window.deleteSystemPageFromFirebase = async function(docId) { await deleteDoc(doc(db, "system_pages", docId)); };
    
    window.addWhCatalogItemToFirebase = async function(data) { return await addDoc(collection(db, "inventory_catalog"), data); };
    window.updateWhCatalogItemInFirebase = async function(docId, data) { await updateDoc(doc(db, "inventory_catalog", docId), data); };
    window.deleteWhCatalogItemFromFirebase = async function(docId) { await deleteDoc(doc(db, "inventory_catalog", docId)); };
} catch(e) { console.warn("Firebase Init Error", e); }

// =========================================
// PWA & Utils
// =========================================
let deferredPrompt; 
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
window.showInstallInstructions = async function(os) { if (deferredPrompt && os !== 'ios') { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; } else { if(os === 'ios') alert("🍏 لتثبيت التطبيق على الآيفون:\n\n1. اضغط على زر 'المشاركة' أسفل المتصفح.\n2. اختر 'إضافة إلى الصفحة الرئيسية'."); else alert("📱 التطبيق جاهز للتثبيت! \n\nاضغط على النقاط الثلاث واختر 'إضافة إلى الشاشة الرئيسية'."); } }

function safeGetStorage(key, def) { try { return localStorage.getItem(key) || def; } catch(e) { return def; } }
function safeSetStorage(key, val) { try { localStorage.setItem(key, val); } catch(e) {} }

let currentThemeMode = safeGetStorage('gl_theme_mode', 'auto');
window.applyThemeMode = function(mode) {
    currentThemeMode = mode; safeSetStorage('gl_theme_mode', mode); let isDark = false; if (mode === 'dark') { isDark = true; } else if (mode === 'light') { isDark = false; } else { const hour = new Date().getHours(); isDark = (hour >= 18 || hour < 6); }
    if (isDark) { document.body.classList.add('dark-mode'); } else { document.body.classList.remove('dark-mode'); }
    document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active')); const activeBtn = document.getElementById('theme-btn-' + mode); if(activeBtn) activeBtn.classList.add('active');
}
window.applyThemeMode(currentThemeMode); setInterval(() => { if(currentThemeMode === 'auto') window.applyThemeMode('auto'); }, 60000);
setInterval(() => { const timeEl = document.getElementById('globalTime'); if(timeEl) { const now = new Date(); timeEl.innerText = `🕒 ${now.toLocaleTimeString(window.getLocale())} - 📅 ${now.toLocaleDateString(window.getLocale())}`; } }, 1000);

window.showSuccessToast = function(message) { let toast = document.getElementById('success-toast-alert'); if (!toast) { toast = document.createElement('div'); toast.id = 'success-toast-alert'; toast.className = 'success-toast'; document.body.appendChild(toast); } toast.textContent = '✨ ' + window.tr(message); toast.classList.add('show'); setTimeout(() => { toast.classList.remove('show'); }, 4000); };
let audioCtx = null;
const unlockAudio = () => { try { const AC = window.AudioContext || window.webkitAudioContext; if (!audioCtx && AC) audioCtx = new AC(); if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) {} };
document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('touchstart', unlockAudio, { once: true });
window.playAudioNotification = function() {
    try {
        unlockAudio(); if (!audioCtx) return;
        const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine'; o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.4);
    } catch (e) {}
}

const ADMIN_USER = "Zain"; const ADMIN_PASS = "327798";
let additionalUsers = [], configuredOrderTypes = [], configuredPages = [], inventoryCatalog = [];
let loggedInUser = "";

// متغيرات الصلاحيات
let loggedInUserCanDelete = false, loggedInUserCanEdit = false, loggedInUserCanSettings = false, loggedInUserCanReports = false; 
let loggedInUserCanChat = false, loggedInUserCanAdd = false, loggedInUserCanFetchOld = false, loggedInUserCanImportExport = false;
let loggedInUserCanEditType = false, loggedInUserCanPurchase = false, loggedInUserCanConsume = false;

let feeBaghdad = 5000, feeOther = 8000; let currentSessionId = null;
let currentChatId = null; let allSystemUsersList = []; let allChatMessages = [];
let allCloudOrders = []; let currentConfirmAction = null; let currentEditDocId = null;
let financialChartInstance = null; let itemsPieChartInstance = null; let whStockPieChartInstance = null;
let inventoryStock = []; let inventoryTransactions = [];

function waUrl(phone) { let p = String(phone || '').replace(/\D/g, ''); if (p.startsWith('00')) p = p.substring(2); if (p.startsWith('07')) p = '964' + p.substring(1); else if (p.length === 10 && p.startsWith('7')) p = '964' + p; return 'https://wa.me/' + p; }
function getWaLink(phone) { if (!phone) return '-'; return `<a href="${waUrl(phone)}" target="_blank" rel="noopener" style="color:#2ecc71; text-decoration:none; font-weight:bold;">🟢 واتساب</a>`; }
window.saveDeliveryFees = async function() { feeBaghdad = parseInt(document.getElementById('feeBaghdadInput').value) || 0; feeOther = parseInt(document.getElementById('feeOtherInput').value) || 0; try { await setDoc(doc(db, "system_settings", "delivery"), { feeBaghdad, feeOther }); window.showSuccessToast("تم حفظ التوصيل سحابياً!"); } catch(e){} }
window.showConfirmDialog = function(msg, callback) { document.getElementById('confirmMessage').innerText = msg; currentConfirmAction = callback; document.getElementById('confirmModal').style.display = 'flex'; document.getElementById('confirmYesBtn').onclick = function() { const cb = currentConfirmAction; window.closeConfirmModal(); if(cb) cb(); }; }
window.closeConfirmModal = function() { document.getElementById('confirmModal').style.display = 'none'; currentConfirmAction = null; }
window.handleEnter = function(event) { if (event.key === "Enter") window.login(); }
window.formatAmount = function(input) { let val = input.value.trim(); if (!val) return; let num = parseAmount(val); if (num > 0 && num < 1000) input.value = (num * 1000).toString(); }
window.toggleOrderInput = function(btn) { let c = btn.parentElement, s = c.querySelector('.orderTypeSelect'), i = c.querySelector('.orderTypeCustomInput'); if(s.style.display !== 'none') { s.style.display = 'none'; i.style.display = 'block'; i.focus(); btn.innerHTML = '📋'; } else { i.style.display = 'none'; i.value = ''; s.style.display = 'block'; btn.innerHTML = '✍️'; } }
window.startSessionTracking = async function() { try { const loginTimestamp = Date.now(); const docRef = await addDoc(collection(db, "user_sessions"), { username: loggedInUser, loginTime: loginTimestamp, lastActive: loginTimestamp, dateStr: new Date().toLocaleDateString('en-CA') }); currentSessionId = docRef.id; } catch(e) {} };
let lastUserActivity = Date.now();
['click', 'keydown', 'touchstart', 'mousemove'].forEach(ev => document.addEventListener(ev, () => { lastUserActivity = Date.now(); }, { passive: true }));
setInterval(async () => { if(currentSessionId && document.visibilityState === 'visible' && (Date.now() - lastUserActivity) < 120000) { try { await updateDoc(doc(db, "user_sessions", currentSessionId), { lastActive: Date.now() }); } catch(e){} } }, 60000);

// =========================================
// الدخول والتنقل
// =========================================
window.login = async function() {
    const user = document.getElementById("username").value.trim(), pass = document.getElementById("password").value.trim(), errorMsg = document.getElementById("login-error"), btn = document.getElementById("loginBtn");
    if(!user || !pass) return; let isManager = (user === ADMIN_USER && pass === ADMIN_PASS); btn.innerText = "جاري التحقق... ⏳"; btn.disabled = true;

    const completeLogin = () => {
        document.getElementById('globalUserBar').style.display = 'flex'; document.getElementById('globalUserName').innerText = '👤 ' + loggedInUser;
        window.listenToCloudOrders(); window.initGlobalChatListener(); window.listenToInventory(); window.startSessionTracking();
        window.showDashboard(); errorMsg.style.display = "none"; btn.innerText = "تسجيل الدخول"; btn.disabled = false; window.applyThemeMode(currentThemeMode);
    };

    try {
        if(window.loadSystemDataFromFirebase) {
            const cloudData = await window.loadSystemDataFromFirebase();
            if(!cloudData.ok && !isManager) { errorMsg.innerText = "تعذر الاتصال بالسحابة، تحقق من الإنترنت"; errorMsg.style.display = "block"; btn.innerText = "تسجيل الدخول"; btn.disabled = false; return; }
            additionalUsers = cloudData.users; configuredOrderTypes = cloudData.types; configuredPages = cloudData.pages;
            document.getElementById('feeBaghdadInput').value = feeBaghdad; document.getElementById('feeOtherInput').value = feeOther; window.updateOrderTypeSelects(); window.updatePagesDropdown();
            window.renderWhCatalogSettings(); 
        }
        if (isManager) { 
            loggedInUser = user; loggedInUserCanDelete = true; loggedInUserCanEdit = true; loggedInUserCanSettings = true; loggedInUserCanReports = true; loggedInUserCanChat = true; loggedInUserCanAdd = true; loggedInUserCanFetchOld = true; loggedInUserCanImportExport = true; loggedInUserCanEditType = true; loggedInUserCanPurchase = true; loggedInUserCanConsume = true; 
            completeLogin(); return; 
        }
        const isNormalUser = additionalUsers.find(u => u.username === user && u.password === pass);
        if (isNormalUser) { 
            loggedInUser = user; loggedInUserCanDelete = isNormalUser.canDeleteCloud || false; loggedInUserCanEdit = isNormalUser.canEditCloud || false; loggedInUserCanSettings = isNormalUser.canAccessSettings || false; loggedInUserCanReports = isNormalUser.canAccessReports || false; loggedInUserCanChat = isNormalUser.canAccessChat || false; loggedInUserCanAdd = isNormalUser.canAddOrders || false; loggedInUserCanFetchOld = isNormalUser.canFetchOld || false; loggedInUserCanImportExport = isNormalUser.canImportExport || false; loggedInUserCanEditType = isNormalUser.canEditOrderType || false; loggedInUserCanPurchase = isNormalUser.canPurchase || false; loggedInUserCanConsume = isNormalUser.canConsume || false;
            completeLogin(); 
        } else { errorMsg.innerText = "بيانات الدخول غير صحيحة!"; errorMsg.style.display = "block"; btn.innerText = "تسجيل الدخول"; btn.disabled = false; }
    } catch (err) { alert("خطأ بالاتصال"); btn.innerText = "تسجيل الدخول"; btn.disabled = false; }
}

window.showDashboard = function() { document.getElementById("login-section").style.display = "none"; document.getElementById("main-menu-section").style.display = "flex"; }
window.openDistribution = function() { if(!loggedInUserCanAdd && loggedInUser !== ADMIN_USER) { alert("❌ ليس لديك صلاحية للدخول إلى إضافة الطلبات"); return; } document.getElementById("main-menu-section").style.display = "none"; document.getElementById("dashboard-section").style.display = "block"; }
window.backToMainMenuFrom = function(sectionId) { document.getElementById(sectionId).style.display = "none"; document.getElementById("main-menu-section").style.display = "flex"; }
window.backToMainMenuFromChat = function() { currentChatId = null; window.backToMainMenuFrom('chat-section'); }
window.logout = function() { window.showConfirmDialog("تأكيد تسجيل الخروج؟", function() { currentSessionId = null; loggedInUser = ""; allCloudOrders = []; inventoryStock = []; inventoryTransactions = []; loggedInUserCanDelete = false; loggedInUserCanEdit = false; loggedInUserCanSettings = false; loggedInUserCanReports = false; loggedInUserCanChat = false; loggedInUserCanAdd = false; loggedInUserCanFetchOld = false; loggedInUserCanImportExport = false; loggedInUserCanEditType = false; loggedInUserCanPurchase = false; loggedInUserCanConsume = false; if(stockUnsubscribe) { stockUnsubscribe(); stockUnsubscribe = null; } if(transactionsUnsubscribe) { transactionsUnsubscribe(); transactionsUnsubscribe = null; } if(cloudOrdersUnsubscribe) { cloudOrdersUnsubscribe(); cloudOrdersUnsubscribe = null; } if(chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; } currentChatId = null; allChatMessages = []; myGroupIds = new Set(); lastLowKey = ''; document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); const _cb = document.getElementById('chatBadge'); if(_cb) _cb.style.display = 'none'; document.getElementById('username').value = ''; document.getElementById('password').value = ''; document.getElementById('globalUserBar').style.display = 'none'; document.getElementById("dashboard-section").style.display = "none"; document.getElementById("archive-section").style.display = "none"; document.getElementById("reports-section").style.display = "none"; document.getElementById("settings-section").style.display = "none"; document.getElementById("main-menu-section").style.display = "none"; document.getElementById("chat-section").style.display = "none"; document.getElementById("warehouse-section").style.display = "none"; document.getElementById("login-section").style.display = "flex"; window.clearForm(); }); }

window.openProfile = function() {
    let currentUserData = additionalUsers.find(u => u.username === loggedInUser) || {};
    if(loggedInUser === ADMIN_USER) currentUserData = { username: ADMIN_USER, jobTitle: 'مدير عام', location: 'المقر الرئيسي', gender: 'ذكر', phone: '-' };
    document.getElementById('profileUsername').innerText = currentUserData.username || loggedInUser; document.getElementById('profileJob').innerText = currentUserData.jobTitle || 'موظف'; document.getElementById('profileLocation').innerText = currentUserData.location || '-'; document.getElementById('profileGender').innerText = currentUserData.gender || '-'; document.getElementById('profilePhone').innerText = currentUserData.phone || '-'; document.getElementById('profileAvatar').innerText = (currentUserData.gender === 'أنثى') ? '👩' : '👨';
    let permsHtml = [];
    if(loggedInUser === ADMIN_USER) { permsHtml.push('<span class="status-badge active">مدير نظام (كافة الصلاحيات)</span>'); } 
    else {
        if(loggedInUserCanDelete) permsHtml.push('<span class="status-badge active">مسح</span>'); if(loggedInUserCanEdit) permsHtml.push('<span class="status-badge active">تعديل شامل</span>'); if(loggedInUserCanEditType) permsHtml.push('<span class="status-badge active">تعديل الطلب</span>'); if(loggedInUserCanSettings) permsHtml.push('<span class="status-badge active">إعدادات</span>'); if(loggedInUserCanReports) permsHtml.push('<span class="status-badge active">تقارير</span>'); if(loggedInUserCanChat) permsHtml.push('<span class="status-badge active">الدردشة</span>'); if(loggedInUserCanAdd) permsHtml.push('<span class="status-badge active">إضافة طلبات</span>'); if(loggedInUserCanPurchase) permsHtml.push('<span class="status-badge active" style="color:var(--primary-blue);">إدخال مخزن</span>'); if(loggedInUserCanConsume) permsHtml.push('<span class="status-badge active" style="color:#e74c3c;">سحب مخزن</span>');
        if(permsHtml.length === 0) permsHtml.push('<span class="status-badge inactive">لا توجد صلاحيات إضافية</span>');
    }
    document.getElementById('profilePermissions').innerHTML = permsHtml.join('');
    document.getElementById('profileOrderCount').innerText = allCloudOrders.filter(o => o.addedBy === loggedInUser).length;
    document.getElementById('profileModal').style.display = 'flex';
}
window.closeProfile = function() { document.getElementById('profileModal').style.display = 'none'; }

// =========================================
// التوزيع الذكي
// =========================================
window.checkCustomerHistory = function(phone1, phone2) { let alertBox = document.getElementById('customerHistoryAlert'); if(!phone1 && !phone2) { alertBox.className = 'hidden'; return; } let history = allCloudOrders.filter(o => o.phone1 === phone1 || (phone2 && o.phone2 === phone2)); let total = history.length; if(total > 0) { let returned = history.filter(o => o.status === 'راجع' || o.status === 'راجع مخزن').length; let delivered = history.filter(o => o.status === 'تم التوصيل').length; if(returned > 0) { alertBox.innerHTML = `⛔ تنبيه: هذا الزبون لديه (${returned}) طلب راجع سابقاً!`; alertBox.className = 'error-msg show'; alertBox.style.display = 'block'; alertBox.style.background = 'rgba(255, 71, 87, 0.1)'; } else if(delivered >= 2) { alertBox.innerHTML = `⭐ زبون VIP دائم (طلبات مكتملة: ${delivered})`; alertBox.className = 'success-msg show'; alertBox.style.display = 'block'; alertBox.style.color = '#b8860b'; alertBox.style.background = 'rgba(255, 215, 0, 0.1)'; } else { alertBox.innerHTML = `ℹ️ زبون سابق (إجمالي طلباته: ${total})`; alertBox.className = 'info-msg show'; alertBox.style.display = 'block'; alertBox.style.color = 'var(--primary-blue)'; alertBox.style.background = 'rgba(64, 123, 255, 0.1)'; } } else { alertBox.className = 'hidden'; alertBox.style.display = 'none'; } }
window.extractValueSmart = function(txt, field) { const regexMap = { 'تسلسل': /(?:تسلسل الزبون|التسلسل|تسلسل)[\s:]*([^\n]+)/i, 'اسم': /(?:اسم الزبون|الاسم|اسم)[\s:]*([^\n]+)/i, 'هاتف1': /(?:رقم الهاتف الاول|هاتف 1|رقم الاول|رقم الموبايل)[\s:]*([0-9\s]+)/i, 'هاتف2': /(?:رقم الهاتف الثاني|هاتف 2|الرقم الثاني)[\s:]*([0-9\s]+)/i, 'محافظة': /(?:المحافظة|محافظة)[\s:]*([^\n]+)/i, 'منطقة': /(?:المنطقة|منطقة|العنوان|عنوان)[\s:]*([^\n]+)/i, 'مبلغ': /(?:المبلغ الكلي|المبلغ|السعر|الكلي)[\s:]*([^\n]+)/i, 'ملاحظة': /(?:ملاحظة مهمة|ملاحظات|ملاحظة)[\s:]*([^\n]+)/i, 'نوع': /(?:نوع الطلب|الطلب|الصنف)[\s:]*([^\n]+)/i, }; let match = txt.match(regexMap[field]); return match ? match[1].replace(/🛑/g, '').trim() : ""; }
window.parseText = function() { const txt = document.getElementById('pasteArea').value.trim(); if (!txt) return; document.getElementById('custId').value = window.extractValueSmart(txt, 'تسلسل'); document.getElementById('custName').value = window.extractValueSmart(txt, 'اسم'); let p1 = window.extractValueSmart(txt, 'هاتف1'); document.getElementById('phone1').value = p1; let p2 = window.extractValueSmart(txt, 'هاتف2'); document.getElementById('phone2').value = p2; document.getElementById('gov').value = window.extractValueSmart(txt, 'محافظة'); document.getElementById('area').value = window.extractValueSmart(txt, 'منطقة'); document.getElementById('amount').value = window.extractValueSmart(txt, 'مبلغ'); window.formatAmount(document.getElementById('amount')); document.getElementById('note').value = window.extractValueSmart(txt, 'ملاحظة'); window.checkCustomerHistory(p1, p2); let extType = window.extractValueSmart(txt, 'نوع'); if(!document.querySelector('#dynamicRowsWrapper .order-item-row')) window.addOrderItemRow(); let s = document.querySelector('#dynamicRowsWrapper .orderTypeSelect'), ci = document.querySelector('#dynamicRowsWrapper .orderTypeCustomInput'), tb = s.parentElement.querySelector('.toggle-custom-btn'); if (extType && s) { let matchedOpt = Array.from(s.options).find(o => o.value && (o.value.includes(extType) || extType.includes(o.value))); if (matchedOpt) { if(s.style.display === 'none') window.toggleOrderInput(tb); s.value = matchedOpt.value; } else { if(s.style.display !== 'none') window.toggleOrderInput(tb); ci.value = extType; } } }
window.buildOrderItemRow = function(wrapperId, tName = "", tQty = 1, tColor = "") {
    const wr = document.getElementById(wrapperId); if (!wr) return;
    const r = document.createElement('div'); r.className = 'order-item-row';
    r.innerHTML = `<div style="display:flex; flex: 2; min-width: 140px; gap:5px;"><select class="orderTypeSelect" style="flex: 1;"></select><input type="text" class="orderTypeCustomInput" placeholder="يدوي..." style="display:none; flex: 1;"><button type="button" class="btn-outline toggle-custom-btn" onclick="window.toggleOrderInput(this)" style="padding: 0 10px;">✍️</button></div> <input type="text" class="orderColorInput" placeholder="اللون" style="flex: 1; min-width: 80px;" value="${esc(tColor)}"> <div class="qty-controls" style="flex: 1; min-width: 110px;"><button type="button" class="qty-btn" onclick="window.changeQty(this, 1)">+</button><input type="number" class="orderQtyInput" value="${parseInt(tQty) || 1}" min="1" style="width: 40px; text-align: center; box-shadow:none; padding:5px;"><button type="button" class="qty-btn" onclick="window.changeQty(this, -1)">-</button><button type="button" class="btn-danger" style="padding: 5px; border-radius: 10px; width: 35px; height: 35px; min-width:unset;" onclick="this.closest('.order-item-row').remove()">❌</button></div>`;
    wr.appendChild(r); window.updateOrderTypeSelects();
    const sel = r.querySelector('.orderTypeSelect'), ci = r.querySelector('.orderTypeCustomInput'), tb = r.querySelector('.toggle-custom-btn');
    if (tName) { if (Array.from(sel.options).some(o => o.value === tName)) { sel.value = tName; } else { window.toggleOrderInput(tb); ci.value = tName; } }
};
window.addOrderItemRow = function(n, q, c) { window.buildOrderItemRow('dynamicRowsWrapper', n, q, c); };
window.addQuickTypeOrderItemRow = function(n, q, c) { window.buildOrderItemRow('quickTypeDynamicRowsWrapper', n, q, c); };
window.addEditOrderItemRow = function(n, q, c) { window.buildOrderItemRow('editDynamicRowsWrapper', n, q, c); };
window.fillOrderRows = function(typeStr, addFn) {
    const items = parseTypeItems(typeStr);
    if (items.length === 0) { window[addFn](typeStr ? String(typeStr).replace(/[\[\]]/g, '') : ""); return; }
    items.forEach(it => { const typeObj = configuredOrderTypes.find(t => t.code === it.code); window[addFn](typeObj ? typeObj.name : it.code, it.qty, it.color); });
};
window.changeQty = function(btn, d) { let i = btn.parentElement.querySelector('input[type="number"]'), v = parseInt(i.value)||1; v += d; if(v<1) v=1; i.value = v; }
window.clearForm = function() { ['custId','custName','phone1','phone2','gov','area','amount','note'].forEach(id => document.getElementById(id).value = ''); document.getElementById('dynamicRowsWrapper').innerHTML = ''; window.addOrderItemRow(); document.getElementById('customerHistoryAlert').className = 'hidden'; document.getElementById('customerHistoryAlert').style.display = 'none'; }
window.clearAll = function() { document.getElementById('pasteArea').value = ''; document.getElementById('constantField').value = ''; window.clearForm(); }
window.addToTable = async function() {
    const pg = document.getElementById('constantField').value;
    if (!pg) { alert("يجب اختيار البيج!"); return; }
    let arr = [], totQty = 0;
    document.querySelectorAll('#itemsContainer .order-item-row').forEach(r => {
        const s = r.querySelector('.orderTypeSelect'), ci = r.querySelector('.orderTypeCustomInput');
        const cv = r.querySelector('.orderColorInput').value.trim().replace(/[\[\]]/g, '');
        const tv = (ci.style.display !== 'none') ? ci.value.trim() : s.value.trim();
        const qv = parseInt(r.querySelector('.orderQtyInput').value) || 1;
        if (tv !== "") { const ft = configuredOrderTypes.find(t => t.name === tv); const cd = (ft ? ft.code : tv).replace(/[\[\]]/g, ''); arr.push(`[${cd} (${qv})${cv ? ' ' + cv : ''}]`); totQty += qv; }
    });
    const data = { id: document.getElementById('custId').value.trim(), name: document.getElementById('custName').value.trim(), phone1: document.getElementById('phone1').value.trim(), phone2: document.getElementById('phone2').value.trim(), gov: document.getElementById('gov').value.trim(), area: document.getElementById('area').value.trim(), type: arr.join(' + '), qty: totQty, amount: document.getElementById('amount').value.trim(), constant: pg, note: document.getElementById('note').value.trim(), addedBy: loggedInUser, status: 'جديد' };
    if (!data.id && !data.name) { alert("يرجى إدخال تسلسل الزبون أو اسمه على الأقل"); return; }
    if (arr.length === 0) { alert("يرجى إضافة صنف واحد على الأقل"); return; }
    if (!window.saveDataToFirebase) { alert("الاتصال بالسحابة غير جاهز"); return; }
    const btn = document.getElementById("mainSaveBtn"); btn.disabled = true;
    try {
        const ok = await window.saveDataToFirebase(data);
        if (!ok) return;
        window.clearForm(); document.getElementById('pasteArea').value = ''; window.showSuccessToast("تمت إضافة الطلب! 🎉");
    } finally { btn.disabled = false; }
}

// =========================================
// المخزن وإدارة المواد
// =========================================
window.openWarehouse = function() {
    if(!loggedInUserCanPurchase && !loggedInUserCanConsume && loggedInUser !== ADMIN_USER) { alert("❌ ليس لديك صلاحية للدخول إلى المخزن"); return; }
    document.getElementById("main-menu-section").style.display = "none";
    document.getElementById("warehouse-section").style.display = "flex";
    
    document.getElementById('btn-wh-purchase').style.display = (loggedInUserCanPurchase || loggedInUser === ADMIN_USER) ? 'inline-block' : 'none';
    document.getElementById('btn-wh-consume').style.display = (loggedInUserCanConsume || loggedInUser === ADMIN_USER) ? 'inline-block' : 'none';
    
    window.renderWarehouseStock(); window.updateConsumeSelect(); window.renderWarehouseLogs(); window.checkLowStockAlerts(true);
    if(document.getElementById('whPurchaseItemsContainer').innerHTML.trim() === '') window.addWhPurchaseRow();
}

window.switchWarehouseTab = function(tabId, btn) {
    document.querySelectorAll('#warehouse-section .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#warehouse-section .tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active'); document.getElementById(tabId).classList.add('active');
}

let lastLowKey = '';
window.renderWarehouseStock = function() {
    const qt = (document.getElementById('whSearchInput').value || '').toLowerCase();
    const tb = document.getElementById('whStockTbody');
    const typed = {};
    tb.querySelectorAll('input[id^="thr_"]').forEach(inp => { if (inp.value !== inp.dataset.orig) typed[inp.id] = inp.value; });
    tb.innerHTML = '';
    let filtered = inventoryStock.filter(i => ((i.name || '').toLowerCase().includes(qt) || (i.code || '').toLowerCase().includes(qt)));
    if (filtered.length === 0) { tb.innerHTML = '<tr><td colspan="8" style="text-align:center;">لا توجد مواد مطابقة</td></tr>'; return; }
    filtered.forEach(i => {
        let isLow = (parseFloat(i.qty) || 0) <= (parseFloat(i.threshold) || 0);
        let thrVal = typed['thr_' + i.id_doc] !== undefined ? typed['thr_' + i.id_doc] : (i.threshold || 0);
        let tr = document.createElement('tr'); if (isLow) tr.className = 'row-alert';
        tr.innerHTML = `<td style="font-weight:bold;">${esc(i.name)}</td><td dir="ltr">${esc(i.code || '-')}</td><td>${esc(i.category || '-')}</td><td>${esc(i.unitMeasure || '-')}</td><td>${Number(i.unitCost || 0).toLocaleString()}</td><td style="font-size:16px; font-weight:900;">${esc(i.qty)}</td><td><input type="number" step="any" id="thr_${esc(i.id_doc)}" data-orig="${esc(i.threshold || 0)}" value="${esc(thrVal)}" style="width:60px; padding:5px; text-align:center;"></td><td><button class="btn-outline" onclick="window.updateItemThreshold('${esc(i.id_doc)}')" style="padding: 5px 10px; font-size:12px;">حفظ التنبيه</button></td>`;
        tb.appendChild(tr);
    });
}
window.updateItemThreshold = async function(docId) { const newVal = parseFloat(document.getElementById(`thr_${docId}`).value) || 0; try { await updateDoc(doc(db, "inventory_stock", docId), { threshold: newVal }); window.showSuccessToast("تم تحديث حد التنبيه بنجاح"); } catch(e) { console.error(e); alert("تعذر حفظ حد التنبيه"); } }
window.checkLowStockAlerts = function(force) {
    const low = inventoryStock.filter(i => (parseFloat(i.qty) || 0) <= (parseFloat(i.threshold) || 0));
    const key = low.map(i => i.id_doc).sort().join(',');
    if (low.length > 0 && (force === true || key !== lastLowKey)) window.showSuccessToast(`⚠️ تنبيه: لديك (${low.length}) مواد وصلت لحد النقص!`);
    lastLowKey = key;
}

window.addWhPurchaseRow = function() {
    const container = document.getElementById('whPurchaseItemsContainer');
    const row = document.createElement('div'); row.className = 'wh-purchase-row';
    let options = '<option value="">-- اختر المادة --</option>';
    inventoryCatalog.forEach(cat => { options += `<option value="${esc(cat.id)}">${esc(cat.name)} (${esc(cat.code || '-')})</option>`; });
    row.innerHTML = `
        <select class="wh-p-sel" onchange="window.updateWhRowDetails(this)" style="flex:2; font-weight:bold;">${options}</select>
        <div class="info-box">الرمز: <span class="row-code">-</span></div>
        <div class="info-box">الوحدة: <span class="row-unit">-</span></div>
        <div class="info-box">السعر: <span class="row-price">-</span> د.ع</div>
        <input type="number" class="wh-p-qty" placeholder="العدد" min="1" style="flex:1;">
        <button class="action-icon-btn btn-danger" onclick="this.parentElement.remove()" style="flex-shrink:0;">❌</button>
    `;
    container.appendChild(row);
}

window.updateWhRowDetails = function(selectEl) {
    let row = selectEl.parentElement; let catId = selectEl.value;
    let codeEl = row.querySelector('.row-code'), unitEl = row.querySelector('.row-unit'), priceEl = row.querySelector('.row-price');
    if(!catId) { codeEl.innerText = '-'; unitEl.innerText = '-'; priceEl.innerText = '-'; return; }
    let item = inventoryCatalog.find(c => c.id === catId);
    if(item) { codeEl.innerText = item.code || '-'; unitEl.innerText = item.unitMeasure || '-'; priceEl.innerText = Number(item.unitCost || 0).toLocaleString(); }
}

window.submitWarehousePurchase = async function() {
    const rows = document.querySelectorAll('.wh-purchase-row');
    const merged = {};
    for (const r of rows) {
        const catId = r.querySelector('.wh-p-sel').value;
        const qty = parseFloat(r.querySelector('.wh-p-qty').value) || 0;
        if (!catId || qty <= 0) continue;
        const cat = inventoryCatalog.find(c => c.id === catId);
        if (!cat) continue;
        if (merged[catId]) merged[catId].qty += qty;
        else merged[catId] = { catalogId: catId, name: cat.name, code: cat.code || '', category: cat.category || '', unitMeasure: cat.unitMeasure || '', qty: qty, unitCost: parseFloat(cat.unitCost) || 0 };
    }
    let totalItemsCost = 0;
    const purchasedItems = Object.values(merged).map(it => { it.itemTotal = it.qty * it.unitCost; totalItemsCost += it.itemTotal; return it; });
    if (purchasedItems.length === 0) { alert("الرجاء إضافة مواد صحيحة وتحديد العدد!"); return; }

    let deliveryFee = parseFloat(document.getElementById('wh-p-delivery').value) || 0; if (deliveryFee < 0) deliveryFee = 0;
    const finalTotal = totalItemsCost + deliveryFee;
    const transData = { transType: 'purchase', items: purchasedItems, deliveryFee: deliveryFee, totalCost: finalTotal, user: loggedInUser, timestamp: serverTimestamp() };

    document.body.style.cursor = 'wait';
    try {
        await runTransaction(db, async (tx) => {
            const plans = [];
            for (const item of purchasedItems) {
                const existing = inventoryStock.find(i => i.catalogId === item.catalogId || (item.code && !i.catalogId && i.code === item.code));
                if (existing) { const ref = doc(db, "inventory_stock", existing.id_doc); plans.push({ item, ref, snap: await tx.get(ref) }); }
                else plans.push({ item, ref: doc(collection(db, "inventory_stock")), snap: null });
            }
            for (const p of plans) {
                if (p.snap && p.snap.exists()) {
                    const s = p.snap.data(); const oldQty = parseFloat(s.qty) || 0, oldCost = parseFloat(s.unitCost) || 0;
                    const newQty = Math.round((oldQty + p.item.qty) * 1000) / 1000;
                    const avg = newQty > 0 ? ((oldQty * oldCost) + (p.item.qty * p.item.unitCost)) / newQty : p.item.unitCost;
                    tx.update(p.ref, { qty: newQty, unitCost: Math.round(avg * 100) / 100, category: p.item.category, unitMeasure: p.item.unitMeasure });
                } else {
                    tx.set(p.ref, { catalogId: p.item.catalogId, name: p.item.name, code: p.item.code, category: p.item.category, unitMeasure: p.item.unitMeasure, unitCost: p.item.unitCost, qty: p.item.qty, threshold: 0 });
                }
            }
            tx.set(doc(collection(db, "inventory_transactions")), transData);
        });
        window.logActionToCloud("مشتريات مخزن", `فاتورة شراء لعدد ${purchasedItems.length} مواد.`);
        window.showSuccessToast("تم تسجيل الشراء وإضافته للرصيد! 📥");
        document.getElementById('whPurchaseItemsContainer').innerHTML = ''; window.addWhPurchaseRow(); document.getElementById('wh-p-delivery').value = '0';
    } catch (e) { console.error(e); alert("حدث خطأ أثناء حفظ المشتريات"); }
    document.body.style.cursor = 'default';
}

window.updateConsumeSelect = function() { const s = document.getElementById('wh-c-select'); if(!s) return; const prev = s.value; let html = '<option value="">-- اختر المادة --</option>'; inventoryStock.forEach(i => { if((parseFloat(i.qty) || 0) > 0) html += `<option value="${esc(i.id_doc)}">${esc(i.name)} - متوفر: ${esc(i.qty)}</option>`; }); s.innerHTML = html; if(prev && inventoryStock.some(i => i.id_doc === prev && (parseFloat(i.qty) || 0) > 0)) s.value = prev; window.updateConsumeMaxQty(); }
window.updateConsumeMaxQty = function() { const id = document.getElementById('wh-c-select').value; const availInp = document.getElementById('wh-c-available'); const qtyInp = document.getElementById('wh-c-qty'); if(!id) { availInp.value = ''; qtyInp.max = ''; return; } let item = inventoryStock.find(i => i.id_doc === id); if(item) { availInp.value = item.qty; qtyInp.max = item.qty; } }
window.submitWarehouseConsumption = async function() {
    const docId = document.getElementById('wh-c-select').value; const cQty = parseFloat(document.getElementById('wh-c-qty').value) || 0; const notes = document.getElementById('wh-c-notes').value.trim();
    if (!docId || cQty <= 0) { alert("الرجاء اختيار مادة وكمية صحيحة"); return; }
    const localItem = inventoryStock.find(i => i.id_doc === docId); if (!localItem) { alert("المادة غير موجودة بالرصيد"); return; }
    document.body.style.cursor = 'wait';
    try {
        await runTransaction(db, async (tx) => {
            const ref = doc(db, "inventory_stock", docId);
            const snap = await tx.get(ref);
            if (!snap.exists()) throw new Error('NOT_FOUND');
            const s = snap.data(); const cur = parseFloat(s.qty) || 0;
            if (cur < cQty) throw new Error('INSUFFICIENT');
            const unitCost = parseFloat(s.unitCost) || 0;
            tx.update(ref, { qty: Math.round((cur - cQty) * 1000) / 1000 });
            tx.set(doc(collection(db, "inventory_transactions")), { name: s.name, code: s.code || '', category: s.category || '', unitMeasure: s.unitMeasure || '', unitCost: unitCost, qty: cQty, totalCost: unitCost * cQty, notes: notes, transType: 'consume', user: loggedInUser, timestamp: serverTimestamp() });
        });
        window.logActionToCloud("استهلاك مخزن", `سحب ${cQty} من ${localItem.name}`); window.showSuccessToast("تم السحب وخصم الكمية من الرصيد! 📤");
        document.getElementById('wh-c-qty').value = ''; document.getElementById('wh-c-notes').value = ''; document.getElementById('wh-c-select').value = ''; window.updateConsumeMaxQty();
    } catch (e) {
        if (e.message === 'INSUFFICIENT') alert("الكمية المطلوبة أكبر من الرصيد المتوفر!");
        else if (e.message === 'NOT_FOUND') alert("المادة غير موجودة بالرصيد");
        else { console.error(e); alert("حدث خطأ أثناء السحب"); }
    }
    document.body.style.cursor = 'default';
}

window.renderWarehouseLogs = function() {
    const pTb = document.getElementById('whPurchaseLogTbody'); const cTb = document.getElementById('whConsumeLogTbody'); if(!pTb || !cTb) return; pTb.innerHTML = ''; cTb.innerHTML = '';
    let purchases = inventoryTransactions.filter(t => t.transType === 'purchase').slice(0, 50); let consumptions = inventoryTransactions.filter(t => t.transType === 'consume').slice(0, 50);
    purchases.forEach(p => { let dStr = p.timestamp ? new Date(p.timestamp.seconds * 1000).toLocaleDateString(window.getLocale()) : '-'; pTb.innerHTML += `<tr><td>${dStr}</td><td>${p.items ? p.items.length : 0} مواد</td><td>${Number(p.totalCost||0).toLocaleString()}</td><td>${esc(p.user||'-')}</td></tr>`; });
    consumptions.forEach(c => { let dStr = c.timestamp ? new Date(c.timestamp.seconds * 1000).toLocaleDateString(window.getLocale()) : '-'; cTb.innerHTML += `<tr><td>${dStr}</td><td>${esc(c.name)}</td><td>${esc(c.qty)}</td><td>${esc(c.notes||'-')}</td><td>${esc(c.user||'-')}</td></tr>`; });
}

// =========================================
// الدردشة (Chat)
// =========================================
let chatUnsubscribe = null; let chatFirstLoad = true; let myGroupIds = new Set(); const markingRead = new Set(); let lastRenderedChatId = null;
window.isChatRelevant = function(chatId) {
    if (!chatId) return false;
    if (chatId === 'general') return true;
    if (chatId.startsWith('group_')) return loggedInUser === ADMIN_USER || myGroupIds.has(chatId);
    return chatId.split('_').includes(loggedInUser);
};
window.refreshMyGroups = async function() {
    try { const snap = await getDocs(collection(db, "chat_groups")); const s = new Set(); snap.forEach(d => { const m = d.data().members; if (m && m.includes(loggedInUser)) s.add('group_' + d.id); }); myGroupIds = s; } catch (e) { console.error(e); }
};
window.updateChatBadges = function() {
    let unreadTotal = 0; const unreadPerChat = {};
    allChatMessages.forEach(msg => {
        if (msg.sender === loggedInUser || !window.isChatRelevant(msg.chatId)) return;
        if (msg.readBy && msg.readBy.includes(loggedInUser)) return;
        unreadTotal++; unreadPerChat[msg.chatId] = (unreadPerChat[msg.chatId] || 0) + 1;
    });
    const mainBadge = document.getElementById('chatBadge');
    if (mainBadge) { if (unreadTotal > 0) { mainBadge.style.display = 'flex'; mainBadge.innerText = unreadTotal; } else { mainBadge.style.display = 'none'; } }
    document.querySelectorAll('.chat-unread-badge').forEach(b => { const chatId = b.id.replace('badge_', ''); if (unreadPerChat[chatId]) { b.innerText = unreadPerChat[chatId]; b.style.display = 'inline-flex'; } else { b.style.display = 'none'; } });
};
window.initGlobalChatListener = function() {
    if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }
    chatFirstLoad = true; allChatMessages = [];
    window.refreshMyGroups().then(() => window.updateChatBadges());
    const q = query(collection(db, "chat_messages"), orderBy("timestamp", "desc"), limit(250));
    chatUnsubscribe = onSnapshot(q, (snapshot) => {
        allChatMessages = snapshot.docs.map(d => ({ id_doc: d.id, ...d.data() })).reverse();
        if (!chatFirstLoad) {
            snapshot.docChanges().forEach(ch => {
                if (ch.type !== 'added' || ch.doc.metadata.hasPendingWrites) return;
                const m = ch.doc.data();
                if (m.sender !== loggedInUser && window.isChatRelevant(m.chatId) && m.chatId !== currentChatId && !(m.readBy || []).includes(loggedInUser)) { window.playAudioNotification(); window.showSuccessToast(`رسالة جديدة من ${m.sender} 💬`); }
            });
        }
        chatFirstLoad = false;
        window.updateChatBadges();
        if (currentChatId) { window.renderCurrentChatMessages(); window.markChatAsRead(currentChatId); }
    }, (error) => console.error(error));
    if (loggedInUser === ADMIN_USER) { setTimeout(window.cleanupOldChats, 10000); }
}
window.cleanupOldChats = async function() { try { const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); const q = query(collection(db, "chat_messages"), where("timestamp", "<", sevenDaysAgo)); const snap = await getDocs(q); if(snap.size > 0) { snap.forEach(d => deleteDoc(doc(db, "chat_messages", d.id))); } } catch(e) {} }
window.markChatAsRead = function(chatId) {
    allChatMessages.filter(m => m.chatId === chatId && m.sender !== loggedInUser && !(m.readBy || []).includes(loggedInUser) && !markingRead.has(m.id_doc)).forEach(async msg => {
        markingRead.add(msg.id_doc);
        try { await updateDoc(doc(db, "chat_messages", msg.id_doc), { readBy: arrayUnion(loggedInUser) }); } catch (e) { console.error(e); }
        markingRead.delete(msg.id_doc);
    });
}
window.renderCurrentChatMessages = function() {
    const area = document.getElementById('chatMessages'); if (!area) return;
    const msgs = allChatMessages.filter(m => m.chatId === currentChatId);
    const stick = lastRenderedChatId !== currentChatId || (area.scrollHeight - area.scrollTop - area.clientHeight < 80);
    const prevTop = area.scrollTop; lastRenderedChatId = currentChatId;
    if (msgs.length === 0) { area.innerHTML = '<div style="text-align:center; margin-top: 50px; color: var(--text-muted);">لا توجد رسائل بعد. ✍️</div>'; return; }
    let html = '';
    msgs.forEach(data => {
        const isSent = (data.sender === loggedInUser);
        const timeStr = (data.timestamp && data.timestamp.seconds) ? new Date(data.timestamp.seconds * 1000).toLocaleTimeString(window.getLocale(), { hour: '2-digit', minute: '2-digit' }) : '';
        let readStatusHtml = '';
        if (isSent) {
            const readers = (data.readBy || []).filter(u => u !== loggedInUser);
            readStatusHtml = readers.length > 0 ? `<div style="font-size: 10px; color: #2ecc71; margin-top: 2px;">👁️ قرئت بواسطة: ${esc(readers.join('، '))}</div>` : `<div style="font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 2px;">✓ تم الإرسال</div>`;
        }
        html += `<div class="message ${isSent ? 'sent' : 'received'}"><div class="msg-sender">${isSent ? 'أنت' : esc(data.sender)}</div><div class="msg-bubble">${esc(data.text)}<span class="msg-time">${timeStr}</span>${readStatusHtml}</div></div>`;
    });
    area.innerHTML = html;
    area.scrollTop = stick ? area.scrollHeight : prevTop;
}
window.openChatSection = async function() { if(!loggedInUserCanChat && loggedInUser !== ADMIN_USER) { alert("❌ ليس لديك صلاحية للدخول للدردشة"); return; } document.getElementById("main-menu-section").style.display = "none"; document.getElementById("chat-section").style.display = "flex"; if(additionalUsers.length === 0 && window.loadSystemDataFromFirebase) { const cloudData = await window.loadSystemDataFromFirebase(); additionalUsers = cloudData.users || []; } allSystemUsersList = [ADMIN_USER, ...additionalUsers.map(u => u.username)]; const privateUsers = allSystemUsersList.filter(u => u !== loggedInUser); let unreadPerChat = {}; allChatMessages.forEach(msg => { if(msg.sender !== loggedInUser && (!msg.readBy || !msg.readBy.includes(loggedInUser))) { unreadPerChat[msg.chatId] = (unreadPerChat[msg.chatId] || 0) + 1; } }); let privateHtml = ''; privateUsers.forEach(u => { const chatId = [loggedInUser, u].sort().join('_'); const unreadCount = unreadPerChat[chatId] || 0; const badgeStyle = unreadCount > 0 ? 'inline-flex' : 'none'; privateHtml += `<div class="chat-list-item" id="chatItem_${esc(chatId)}" data-chat-id="${esc(chatId)}" data-title="${esc(u)}" onclick="window.openChat(this.dataset.chatId, this.dataset.title)"><div class="chat-avatar">${esc(u.charAt(0))}</div><div class="chat-info" style="width: 100%; display: flex; justify-content: space-between; align-items: center;"><h4>${esc(u)}</h4><span class="chat-unread-badge" id="badge_${esc(chatId)}" style="display:${badgeStyle};">${unreadCount}</span></div></div>`; }); if(privateHtml === '') privateHtml = '<div style="text-align:center; padding: 20px; color: var(--text-muted); font-size:12px;">لا يوجد مستخدمين آخرين</div>'; document.getElementById('chatListPrivate').innerHTML = privateHtml; window.loadChatGroups(); window.switchChatTab('general'); window.openChat('general', 'الدردشة العامة'); }
window.switchChatTab = function(tab) { document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active')); document.getElementById('chatListGeneral').style.display = 'none'; document.getElementById('chatListPrivate').style.display = 'none'; document.getElementById('chatListGroups').style.display = 'none'; if(tab === 'general') { document.getElementById('tabGeneral').classList.add('active'); document.getElementById('chatListGeneral').style.display = 'block'; } else if(tab === 'private') { document.getElementById('tabPrivate').classList.add('active'); document.getElementById('chatListPrivate').style.display = 'block'; } else if(tab === 'groups') { document.getElementById('tabGroups').classList.add('active'); window.loadChatGroups(); document.getElementById('chatListGroups').style.display = 'block'; } }
window.openChat = function(chatId, title) { currentChatId = chatId; lastRenderedChatId = null; document.getElementById('currentChatTitle').innerText = title; document.querySelectorAll('.chat-list-item').forEach(el => el.classList.remove('active')); const activeItem = document.getElementById(`chatItem_${chatId}`); if(activeItem) activeItem.classList.add('active'); if(window.innerWidth <= 768) { document.getElementById('chatSidebar').classList.add('hidden'); } window.renderCurrentChatMessages(); window.markChatAsRead(currentChatId); }
window.sendMessage = async function() { const input = document.getElementById('chatInput'); const text = input.value.trim(); if(text === '' || !currentChatId) return; input.value = ''; try { await addDoc(collection(db, "chat_messages"), { chatId: currentChatId, sender: loggedInUser, text: text, timestamp: serverTimestamp(), readBy: [] }); } catch(e) { console.error(e); window.showSuccessToast("فشل إرسال الرسالة."); } }
window.showChatSidebar = function() { document.getElementById('chatSidebar').classList.remove('hidden'); }
window.showCreateGroupModal = function() { document.getElementById('newGroupName').value = ''; const container = document.getElementById('groupMembersSelection'); container.innerHTML = ''; const otherUsers = allSystemUsersList.filter(u => u !== loggedInUser); otherUsers.forEach(u => { container.innerHTML += `<label class="permission-badge" style="justify-content: flex-start;"><input type="checkbox" class="group-member-cb" value="${esc(u)}"> ${esc(u)}</label>`; }); document.getElementById('createGroupModal').style.display = 'flex'; }
window.closeCreateGroupModal = function() { document.getElementById('createGroupModal').style.display = 'none'; }
window.createChatGroup = async function() { const groupName = document.getElementById('newGroupName').value.trim(); if(!groupName) { alert("يرجى إدخال اسم المجموعة"); return; } let members = [loggedInUser]; document.querySelectorAll('.group-member-cb:checked').forEach(cb => members.push(cb.value)); try { await addDoc(collection(db, "chat_groups"), { name: groupName, createdBy: loggedInUser, members: members, timestamp: serverTimestamp() }); window.showSuccessToast("تم إنشاء المجموعة!"); window.closeCreateGroupModal(); window.loadChatGroups(); } catch(e) { console.error(e); } }
window.loadChatGroups = async function() { try { const snap = await getDocs(query(collection(db, "chat_groups"))); let groupsHtml = ''; let unreadPerChat = {}; allChatMessages.forEach(msg => { if(msg.sender !== loggedInUser && (!msg.readBy || !msg.readBy.includes(loggedInUser))) { unreadPerChat[msg.chatId] = (unreadPerChat[msg.chatId] || 0) + 1; } }); snap.forEach(doc => { const data = doc.data(); if((data.members && data.members.includes(loggedInUser)) || loggedInUser === ADMIN_USER) { const chatId = 'group_' + doc.id; if(data.members && data.members.includes(loggedInUser)) myGroupIds.add(chatId); const unreadCount = unreadPerChat[chatId] || 0; const badgeStyle = unreadCount > 0 ? 'inline-flex' : 'none'; groupsHtml += `<div class="chat-list-item" id="chatItem_${esc(chatId)}" data-chat-id="${esc(chatId)}" data-title="${esc(data.name)}" onclick="window.openChat(this.dataset.chatId, this.dataset.title)"><div class="chat-avatar" style="background: linear-gradient(135deg, #00b09b, #96c93d);">👥</div><div class="chat-info" style="width: 100%; display: flex; justify-content: space-between; align-items: center;"><div><h4>${esc(data.name)}</h4><p>${data.members.length} أعضاء</p></div><span class="chat-unread-badge" id="badge_${esc(chatId)}" style="display:${badgeStyle};">${unreadCount}</span></div></div>`; } }); if(groupsHtml === '') groupsHtml = '<div style="text-align:center; padding: 20px; color: var(--text-muted); font-size:12px;">لا توجد مجموعات بعد</div>'; document.getElementById('groupsListContainer').innerHTML = groupsHtml; } catch(e) { console.error(e); } }

// =========================================
// الأرشيف والمتابعة
// =========================================
window.openCloudOrders = function() { 
    document.getElementById("main-menu-section").style.display = "none"; document.getElementById("archive-section").style.display = "flex";
    document.getElementById('bulkDeleteBtn').style.display = loggedInUserCanDelete || loggedInUser === ADMIN_USER ? 'inline-flex' : 'none'; 
    document.getElementById('bulkEditBtn').style.display = loggedInUserCanEdit || loggedInUser === ADMIN_USER ? 'inline-flex' : 'none'; 
    document.getElementById('btn-fetch-old').style.display = loggedInUserCanFetchOld || loggedInUser === ADMIN_USER ? 'flex' : 'none';
    document.getElementById('btn-group-import-export').style.display = loggedInUserCanImportExport || loggedInUser === ADMIN_USER ? 'flex' : 'none';
    window.filterCloudOrders(); 
}
window.openArchiveFetchModal = function() { document.getElementById('archiveFetchModal').style.display = 'flex'; }
window.closeArchiveFetchModal = function() { document.getElementById('archiveFetchModal').style.display = 'none'; }
window.toggleAllOrders = function(source) { document.querySelectorAll('.order-cb').forEach(cb => cb.checked = source.checked); }
window.updateSingleOrderStatus = async function(docId, newStatus) { if(window.updateOrderInFirebase) { try { await window.updateOrderInFirebase(docId, { status: newStatus }); window.showSuccessToast(`تم تغيير الحالة إلى ${newStatus}`); } catch(e) { alert("حدث خطأ."); window.filterCloudOrders(); } } }
window.fetchOldOrders = async function() { const f = document.getElementById('oldOrdersFrom').value, t = document.getElementById('oldOrdersTo').value; if(!f || !t) { alert("الرجاء تحديد التاريخ"); return; } if(cloudOrdersUnsubscribe) { cloudOrdersUnsubscribe(); cloudOrdersUnsubscribe = null; } const fromD = new Date(f); fromD.setHours(0,0,0,0); const toD = new Date(t); toD.setHours(23,59,59,999); document.body.style.cursor = 'wait'; try { const q = query(collection(db, "orders"), where("timestamp", ">=", fromD), where("timestamp", "<=", toD)); const snap = await getDocs(q); allCloudOrders = []; snap.forEach(doc => { allCloudOrders.push({ id_doc: doc.id, ...doc.data() }); }); window.filterCloudOrders(); window.closeArchiveFetchModal(); window.showSuccessToast(`تم جلب ${snap.size} طلب!`); } catch(e) { console.error(e); } document.body.style.cursor = 'default'; }
window.reloadCurrentMonth = function() { window.listenToCloudOrders(); window.closeArchiveFetchModal(); window.showSuccessToast("تم العودة لطلبات الشهر الحالي 📅"); }
window.filterCloudOrders = function() {
    const qt = document.getElementById('cloudSearchInput').value.toLowerCase(), pF = document.getElementById('cloudPageFilter').value, sF = document.getElementById('cloudStatusFilter').value;
    const tb = document.getElementById('cloudOrdersTbody'); tb.innerHTML = ''; document.getElementById('selectAllCb').checked = false; 
    let sortedOrders = [...allCloudOrders].sort((a, b) => { let idA = parseInt(a.id) || 0; let idB = parseInt(b.id) || 0; return idA - idB; });
    let filtered = sortedOrders.filter(o => { return ((o.name||"").toLowerCase().includes(qt) || (o.phone1||"").includes(qt) || String(o.id||"").includes(qt)) && (pF === "" || (o.constant||"") === pF) && (sF === "" || (o.status||"جديد") === sF); });
    filtered.forEach(o => {
        const tr = document.createElement('tr'); const dateStr = o.timestamp ? new Date(o.timestamp.seconds * 1000).toLocaleDateString(window.getLocale()) : '-';
        let st = o.status || 'جديد'; let statusColor = '#407bff'; if(st === 'قيد التجهيز') statusColor = '#f39c12'; if(st === 'مسلم للمندوب') statusColor = '#8e44ad'; if(st === 'تم التوصيل') statusColor = '#2ecc71'; if(st === 'راجع') statusColor = '#e74c3c'; if(st === 'راجع مخزن') statusColor = '#1d0c01';
        let statusSelectHtml = `<select onchange="window.updateSingleOrderStatus('${esc(o.id_doc)}', this.value)" style="background:${statusColor}; color:white; border:none; padding: 5px; border-radius: 10px; font-size:11px; font-weight:bold; outline:none; appearance:auto; box-shadow:none; min-width:100px;"><option value="جديد" ${st==='جديد'?'selected':''}>جديد</option><option value="قيد التجهيز" ${st==='قيد التجهيز'?'selected':''}>قيد التجهيز</option><option value="مسلم للمندوب" ${st==='مسلم للمندوب'?'selected':''}>مسلم للمندوب</option><option value="تم التوصيل" ${st==='تم التوصيل'?'selected':''}>تم التوصيل</option><option value="راجع" ${st==='راجع'?'selected':''}>راجع</option><option value="راجع مخزن" ${st==='راجع مخزن'?'selected':''}>راجع مخزن</option></select>`;
        tr.innerHTML = `<td style="text-align: center;"><input type="checkbox" class="order-cb" value="${esc(o.id_doc)}" style="width: 18px; height: 18px; box-shadow:none; padding:0; cursor:pointer;"></td><td><span style="color:var(--primary-blue); font-weight:bold; cursor:pointer; text-decoration:underline;" onclick="window.openOrderDetailsModal('${esc(o.id_doc)}')">${esc(o.id||'-')}</span></td><td>${statusSelectHtml}</td><td style="color:var(--primary-blue); font-weight:bold;">${esc(o.constant||'-')}</td><td>${esc(o.name||'-')}</td><td style="font-size:12px;">${getWaLink(o.phone1)}</td><td style="font-size:12px;">${esc(o.gov||'-')}</td><td style="color:var(--primary-blue); font-size:12px;">${esc(o.type||'-')}</td><td>${esc(o.amount||'-')}</td><td style="font-size:12px; font-weight:bold;">${esc(o.addedBy||'-')}</td><td style="font-size:12px; color:var(--text-muted);">${dateStr}</td>`;
        tb.appendChild(tr);
    });
}
window.openOrderDetailsModal = function(docId) { let order = allCloudOrders.find(o => o.id_doc === docId); if(!order) return; const dateStr = order.timestamp ? new Date(order.timestamp.seconds * 1000).toLocaleString(window.getLocale()) : '-'; let contentHtml = `<div><strong>التسلسل:</strong> ${esc(order.id || '-')}</div><div><strong>حالة الطلب:</strong> ${esc(order.status || 'جديد')}</div><div><strong>البيج:</strong> ${esc(order.constant || '-')}</div><div><strong>اسم الزبون:</strong> ${esc(order.name || '-')}</div><div><strong>الهاتف الأول:</strong> <span dir="ltr">${esc(order.phone1 || '-')}</span></div><div><strong>الهاتف الثاني:</strong> <span dir="ltr">${esc(order.phone2 || '-')}</span></div><div><strong>المحافظة:</strong> ${esc(order.gov || '-')}</div><div><strong>المنطقة:</strong> ${esc(order.area || '-')}</div><div><strong>تفاصيل الطلب:</strong> <span dir="ltr">${esc(order.type || '-')}</span></div><div><strong>الكمية الكلية:</strong> ${esc(order.qty || 1)}</div><div><strong>المبلغ الكلي:</strong> ${esc(order.amount || '-')}</div><div><strong>ملاحظات:</strong> ${esc(order.note || 'لا يوجد')}</div><div><strong>المستخدم المضيف:</strong> ${esc(order.addedBy || '-')}</div><div><strong>التاريخ:</strong> ${dateStr}</div>`; document.getElementById('orderDetailsContent').innerHTML = contentHtml; document.getElementById('orderDetailsModal').style.display = 'flex'; };
window.closeOrderDetailsModal = function() { document.getElementById('orderDetailsModal').style.display = 'none'; };


window.openQuickTypeEditModal = function(docId) { if(!loggedInUserCanEditType && loggedInUser !== ADMIN_USER) { alert("❌ ليس لديك صلاحية لتعديل نوع الطلب."); return; } let order = allCloudOrders.find(o => o.id_doc === docId); if(!order) return; currentEditDocId = docId; document.getElementById('quickTypeDynamicRowsWrapper').innerHTML = ''; window.fillOrderRows(order.type, 'addQuickTypeOrderItemRow'); document.getElementById('quickTypeEditModal').style.display = 'flex'; }
window.closeQuickTypeEditModal = function() { document.getElementById('quickTypeEditModal').style.display = 'none'; currentEditDocId = null; }
window.saveQuickTypeEdit = async function() { if(!currentEditDocId) return; let arr = [], totQty = 0; document.querySelectorAll('#quickTypeDynamicRowsWrapper .order-item-row').forEach(r => { let s = r.querySelector('.orderTypeSelect'), ci = r.querySelector('.orderTypeCustomInput'), cv = r.querySelector('.orderColorInput').value.trim(); let tv = (ci.style.display !== 'none') ? ci.value.trim() : s.value.trim(); let qv = parseInt(r.querySelector('.orderQtyInput').value) || 1; if (tv !== "") { let ft = configuredOrderTypes.find(t => t.name === tv), cd = ft ? ft.code : tv, colorText = cv ? ` ${cv}` : ""; arr.push(`[${cd} (${qv})${colorText}]`); totQty += qv; } }); const newData = { type: arr.join(' + '), qty: totQty }; document.body.style.cursor = 'wait'; if(window.updateOrderInFirebase) { try { await window.updateOrderInFirebase(currentEditDocId, newData); window.closeQuickTypeEditModal(); window.showSuccessToast("تم تحديث الطلب بنجاح! ✏️"); } catch(e) { alert("خطأ."); } } document.body.style.cursor = 'default'; }

window.openEditModal = function(docId) { let order = allCloudOrders.find(o => o.id_doc === docId); if(!order) return; currentEditDocId = docId; document.getElementById('editStatus').value = order.status || 'جديد'; document.getElementById('editConstant').value = order.constant || ''; document.getElementById('editName').value = order.name || ''; document.getElementById('editPhone1').value = order.phone1 || ''; document.getElementById('editPhone2').value = order.phone2 || ''; document.getElementById('editGov').value = order.gov || ''; document.getElementById('editArea').value = order.area || ''; document.getElementById('editAmount').value = order.amount || ''; document.getElementById('editDynamicRowsWrapper').innerHTML = ''; window.fillOrderRows(order.type, 'addEditOrderItemRow'); document.getElementById('editOrderModal').style.display = 'flex'; }
window.closeEditModal = function() { document.getElementById('editOrderModal').style.display = 'none'; currentEditDocId = null; }
window.saveEditedOrder = async function() { if(!currentEditDocId) return; let arr = [], totQty = 0; document.querySelectorAll('#editDynamicRowsWrapper .order-item-row').forEach(r => { let s = r.querySelector('.orderTypeSelect'), ci = r.querySelector('.orderTypeCustomInput'), cv = r.querySelector('.orderColorInput').value.trim(); let tv = (ci.style.display !== 'none') ? ci.value.trim() : s.value.trim(); let qv = parseInt(r.querySelector('.orderQtyInput').value) || 1; if (tv !== "") { let ft = configuredOrderTypes.find(t => t.name === tv), cd = ft ? ft.code : tv, colorText = cv ? ` ${cv}` : ""; arr.push(`[${cd} (${qv})${colorText}]`); totQty += qv; } }); const newData = { status: document.getElementById('editStatus').value, constant: document.getElementById('editConstant').value, name: document.getElementById('editName').value, phone1: document.getElementById('editPhone1').value, phone2: document.getElementById('editPhone2').value, gov: document.getElementById('editGov').value, area: document.getElementById('editArea').value, type: arr.join(' + '), qty: totQty, amount: document.getElementById('editAmount').value }; if(window.updateOrderInFirebase) { try { await window.updateOrderInFirebase(currentEditDocId, newData); window.closeEditModal(); window.showSuccessToast("تم التحديث! ✏️"); } catch(e) { alert("خطأ."); } } }

// وظائف الدفعة (Bulk Operations)
window.bulkEditOrder = function() { let selectedIds = Array.from(document.querySelectorAll('.order-cb:checked')).map(cb => cb.value); if(selectedIds.length === 0) { alert("يرجى تحديد طلب لتعديله!"); return; } if(selectedIds.length > 1) { alert("يرجى تحديد طلب واحد فقط للتعديل!"); return; } window.openEditModal(selectedIds[0]); };
window.bulkPrintOrders = function() { let selectedIds = Array.from(document.querySelectorAll('.order-cb:checked')).map(cb => cb.value); if(selectedIds.length === 0) { alert("يرجى تحديد طلبات لطباعتها!"); return; } let printContainer = document.getElementById('printReceipt'); printContainer.innerHTML = ''; selectedIds.forEach((id, index) => { let order = allCloudOrders.find(o => o.id_doc === id); if(order) { let amt = parseAmount(order.amount); let receiptHtml = `<div class="receipt-page" style="${index > 0 ? 'page-break-before: always;' : ''}"><h2 style="text-align: center; margin: 0; font-size: 24px;">Gold Land</h2><p style="text-align: center; margin: 5px 0 15px 0; font-size: 12px; border-bottom: 1px dashed #000; padding-bottom: 10px;">للتميز عنوان</p><div style="margin-bottom: 10px;"><strong>الزبون:</strong> ${esc(order.name || '-')}</div><div style="margin-bottom: 10px;"><strong>الهاتف:</strong> <span dir="ltr">${esc(order.phone1 || '-')}</span></div><div style="margin-bottom: 10px;"><strong>العنوان:</strong> ${esc((order.gov || '') + ' - ' + (order.area || ''))}</div><div style="margin-bottom: 10px;"><strong>الطلب:</strong> <span dir="ltr">${esc(order.type || '-')}</span></div><div style="margin-bottom: 15px;"><strong>الملاحظات:</strong> ${esc(order.note || 'لا يوجد')}</div><h3 style="text-align: center; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 15px 0;">المبلغ الكلي: ${amt.toLocaleString()} دينار</h3><div style="text-align: center; margin-top: 15px;"><svg id="barcode_${id}"></svg></div><p style="text-align: center; font-size: 10px; margin-top: 10px;">تاريخ الطباعة: ${new Date().toLocaleString(window.getLocale())}</p></div>`; printContainer.innerHTML += receiptHtml; } }); selectedIds.forEach(id => { let order = allCloudOrders.find(o => o.id_doc === id); let bCode = order.id ? order.id.toString() : "0000"; JsBarcode("#barcode_" + id, bCode, { format: "CODE128", width: 1.5, height: 40, displayValue: true, fontSize: 14 }); }); window.print(); }
window.bulkExportPDF = function() { let selectedIds = Array.from(document.querySelectorAll('.order-cb:checked')).map(cb => cb.value); if(selectedIds.length === 0) { alert("يرجى تحديد طلبات لتصديرها كـ PDF!"); return; } let printContainer = document.createElement('div'); printContainer.setAttribute('data-no-i18n', ''); printContainer.style.background = '#fff'; printContainer.style.color = '#000'; printContainer.style.width = '148mm'; selectedIds.forEach((id, index) => { let order = allCloudOrders.find(o => o.id_doc === id); if(order) { let amt = parseAmount(order.amount); let receiptHtml = `<div style="width: 148mm; height: 195mm; padding: 20px; box-sizing: border-box; font-family: Arial; direction: rtl; text-align: right; margin: 0 auto; ${index > 0 ? 'page-break-before: always;' : ''}"><h2 style="text-align: center; font-size: 24px; margin:0;">Gold Land</h2><p style="text-align: center; font-size: 12px; border-bottom: 1px dashed #000; padding-bottom: 10px;">للتميز عنوان</p><div style="margin-bottom: 10px;"><strong>الزبون:</strong> ${esc(order.name || '-')}</div><div style="margin-bottom: 10px;"><strong>الهاتف:</strong> <span dir="ltr">${esc(order.phone1 || '-')}</span></div><div style="margin-bottom: 10px;"><strong>العنوان:</strong> ${esc((order.gov || '') + ' - ' + (order.area || ''))}</div><div style="margin-bottom: 10px;"><strong>الطلب:</strong> <span dir="ltr">${esc(order.type || '-')}</span></div><div style="margin-bottom: 15px;"><strong>الملاحظات:</strong> ${esc(order.note || 'لا يوجد')}</div><h3 style="text-align: center; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 15px 0;">المبلغ الكلي: ${amt.toLocaleString()} دينار</h3><div style="text-align: center; margin-top: 15px;"><svg id="pdf_barcode_${id}"></svg></div><p style="text-align: center; font-size: 10px; margin-top: 10px;">تاريخ الطباعة: ${new Date().toLocaleString(window.getLocale())}</p></div>`; printContainer.innerHTML += receiptHtml; } }); document.body.appendChild(printContainer); selectedIds.forEach(id => { let order = allCloudOrders.find(o => o.id_doc === id); let bCode = order.id ? order.id.toString() : "0000"; JsBarcode("#pdf_barcode_" + id, bCode, { format: "CODE128", width: 1.5, height: 40, displayValue: true, fontSize: 14 }); }); const opt = { margin: 0, filename: window.tr(`وصولات_${new Date().toLocaleDateString(window.getLocale())}.pdf`), image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' } }; html2pdf().set(opt).from(printContainer).save().then(() => { document.body.removeChild(printContainer); }); }
window.bulkDeleteOrders = function() { let selectedIds = Array.from(document.querySelectorAll('.order-cb:checked')).map(cb => cb.value); if(selectedIds.length === 0) { alert("يرجى تحديد طلبات لحذفها!"); return; } window.showConfirmDialog(`هل أنت متأكد من حذف ${selectedIds.length} طلب بشكل نهائي؟`, async function() { document.body.style.cursor = 'wait'; try { for(let i = 0; i < selectedIds.length; i += 400) { const batch = writeBatch(db); selectedIds.slice(i, i + 400).forEach(id => batch.delete(doc(db, "orders", id))); await batch.commit(); } allCloudOrders = allCloudOrders.filter(o => !selectedIds.includes(o.id_doc)); window.logActionToCloud("حذف طلبات", `تم مسح ${selectedIds.length} طلب نهائياً`); window.filterCloudOrders(); window.showSuccessToast(`تم حذف ${selectedIds.length} طلب بنجاح! 🗑️`); } catch(e) { console.error(e); alert("حدث خطأ أثناء الحذف"); } document.body.style.cursor = 'default'; }); }
window.showBulkStatusModal = function() { let selectedIds = Array.from(document.querySelectorAll('.order-cb:checked')).map(cb => cb.value); if(selectedIds.length === 0) { alert("يرجى تحديد طلبات لتغيير حالتها!"); return; } document.getElementById('bulkStatusModal').style.display = 'flex'; }
window.closeBulkStatusModal = function() { document.getElementById('bulkStatusModal').style.display = 'none'; }
window.saveBulkStatus = async function() { let selectedIds = Array.from(document.querySelectorAll('.order-cb:checked')).map(cb => cb.value); if(selectedIds.length === 0) { window.closeBulkStatusModal(); return; } let newStatus = document.getElementById('bulkStatusSelect').value; document.body.style.cursor = 'wait'; try { for(let i = 0; i < selectedIds.length; i += 400) { const batch = writeBatch(db); selectedIds.slice(i, i + 400).forEach(id => batch.update(doc(db, "orders", id), { status: newStatus })); await batch.commit(); } allCloudOrders.forEach(o => { if(selectedIds.includes(o.id_doc)) o.status = newStatus; }); window.logActionToCloud("تغيير حالة", `تغيير حالة ${selectedIds.length} طلب إلى ${newStatus}`); window.filterCloudOrders(); window.closeBulkStatusModal(); window.showSuccessToast(`تم تغيير حالة ${selectedIds.length} طلب إلى (${newStatus}) بنجاح!`); } catch(e) { console.error(e); alert("حدث خطأ أثناء تغيير الحالة"); } document.body.style.cursor = 'default'; }

window.downloadExcelTemplate = function() { const ws = XLSX.utils.aoa_to_sheet([["تسلسل الزبون", "البيج", "اسم الزبون", "رقم الهاتف الأول", "رقم الهاتف الثاني", "المحافظة", "المنطقة", "الطلب", "العدد", "المبلغ الكلي", "ملاحظات"].map(h => window.tr(h))]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, window.tr("النموذج")); XLSX.writeFile(wb, window.tr("نموذج_رفع_الطلبات.xlsx")); }
window.uploadExcelFile = function(event) {
    const file = event.target.files[0]; if (!file) return;
    const input = event.target; const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            if (json.length === 0) { alert("الملف فارغ!"); return; }
            const valid = []; let skipped = 0;
            for (const row of json) {
                const data = { id: (colVal(row, "تسلسل الزبون") || '').toString(), constant: (colVal(row, "البيج") || '').toString(), name: (colVal(row, "اسم الزبون") || '').toString(), phone1: (colVal(row, "رقم الهاتف الأول") || '').toString(), phone2: (colVal(row, "رقم الهاتف الثاني") || '').toString(), gov: (colVal(row, "المحافظة") || '').toString(), area: (colVal(row, "المنطقة") || '').toString(), type: (colVal(row, "الطلب") || '').toString(), qty: parseInt(colVal(row, "العدد")) || 1, amount: (colVal(row, "المبلغ الكلي") || '').toString(), note: (colVal(row, "ملاحظات") || '').toString(), addedBy: loggedInUser, status: 'جديد' };
                if (data.constant && data.name) valid.push(data); else skipped++;
            }
            if (valid.length === 0) { alert("لا توجد صفوف صالحة (البيج واسم الزبون مطلوبان)"); return; }
            if (!confirm(`سيتم رفع ${valid.length} طلب${skipped ? ` (تم تجاهل ${skipped} صف ناقص)` : ''}؟`)) return;
            document.body.style.cursor = 'wait';
            for (let i = 0; i < valid.length; i += 400) {
                const batch = writeBatch(db);
                valid.slice(i, i + 400).forEach(d => batch.set(doc(collection(db, "orders")), { ...d, timestamp: serverTimestamp() }));
                await batch.commit();
            }
            window.logActionToCloud("رفع Excel", `تم رفع ${valid.length} طلب من ملف Excel`);
            window.showSuccessToast(`تم الرفع! (${valid.length})`);
        } catch (err) { console.error(err); alert("حدث خطأ أثناء رفع الملف"); }
        finally { document.body.style.cursor = 'default'; input.value = ''; }
    };
    reader.readAsArrayBuffer(file);
}
window.exportCloudToExcel = function() { const qt = document.getElementById('cloudSearchInput').value.toLowerCase(), pF = document.getElementById('cloudPageFilter').value, sF = document.getElementById('cloudStatusFilter').value; let f = allCloudOrders.filter(o => ((o.name||"").toLowerCase().includes(qt) || (o.phone1||"").includes(qt)) && (pF === "" || (o.constant||"") === pF) && (sF === "" || (o.status||"جديد") === sF)); if(f.length === 0) return; let exp = f.map((o, i) => { const amt = parseAmount(o.amount), del = (o.gov || "").includes("بغداد") ? feeBaghdad : feeOther; return { [window.tr("ت")]: i+1, [window.tr("البيج")]: o.constant||"", [window.tr("حالة الطلب")]: window.tr(o.status||"جديد"), [window.tr("اسم الزبون")]: o.name||"", [window.tr("الهاتف")]: o.phone1, [window.tr("العنوان")]: o.gov||"", [window.tr("الطلب")]: o.type||"", [window.tr("العدد")]: parseInt(o.qty)||1, [window.tr("الكلي")]: amt, [window.tr("التوصيل")]: del, [window.tr("الصافي")]: amt-del, [window.tr("ملاحظات")]: o.note||"" }; }); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exp), window.tr("السحابة")); XLSX.writeFile(wb, window.tr("أرشيف_السحابة.xlsx")); }
window.openAdvancedExportModal = function() { document.getElementById('advancedExportModal').style.display = 'flex'; }
window.closeAdvancedExportModal = function() { document.getElementById('advancedExportModal').style.display = 'none'; }
window.executeAdvancedExport = function() { const sF = document.getElementById('exportStatusFilter').value; const fDate = document.getElementById('exportDateFrom').value; const tDate = document.getElementById('exportDateTo').value; const format = document.getElementById('exportFormat').value; let fromDate = fDate ? new Date(fDate) : null; if(fromDate) fromDate.setHours(0,0,0,0); let toDate = tDate ? new Date(tDate) : null; if(toDate) toDate.setHours(23,59,59,999); let filtered = allCloudOrders.filter(o => { let matchStatus = (sF === "all" || (o.status || "جديد") === sF); let matchDate = true; if(fromDate || toDate) { if(!o.timestamp?.seconds) { matchDate = false; } else { const d = new Date(o.timestamp.seconds * 1000); if(fromDate && d < fromDate) matchDate = false; if(toDate && d > toDate) matchDate = false; } } return matchStatus && matchDate; }); if (filtered.length === 0) { alert("⚠️ لا توجد طلبات مطابقة للبيانات المحددة!"); return; } document.body.style.cursor = 'wait'; if (format === 'excel') { let exp = filtered.map((o, i) => { const amt = parseAmount(o.amount); const del = (o.gov || "").includes("بغداد") ? feeBaghdad : feeOther; const dateStr = o.timestamp ? new Date(o.timestamp.seconds * 1000).toLocaleDateString(window.getLocale()) : '-'; return { [window.tr("ت")]: i+1, [window.tr("البيج")]: o.constant||"", [window.tr("حالة الطلب")]: window.tr(o.status||"جديد"), [window.tr("اسم الزبون")]: o.name||"", [window.tr("الهاتف")]: o.phone1, [window.tr("العنوان")]: o.gov||"", [window.tr("الطلب")]: o.type||"", [window.tr("العدد")]: parseInt(o.qty)||1, [window.tr("الكلي")]: amt, [window.tr("التوصيل")]: del, [window.tr("الصافي")]: amt-del, [window.tr("ملاحظات")]: o.note||"", [window.tr("التاريخ")]: dateStr }; }); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exp), window.tr("الطلبات")); XLSX.writeFile(wb, window.tr(`تصدير_مخصص_${new Date().toLocaleDateString(window.getLocale())}.xlsx`)); document.body.style.cursor = 'default'; window.closeAdvancedExportModal(); window.showSuccessToast(`تم تصدير ${filtered.length} طلب كملف Excel 🎉`); } else if (format === 'pdf') { const tempDiv = document.createElement('div'); tempDiv.style.padding = '20px'; tempDiv.style.background = '#ffffff'; tempDiv.style.color = '#000000'; tempDiv.style.direction = 'rtl'; tempDiv.style.fontFamily = 'Arial, sans-serif'; const title = document.createElement('h2'); title.innerText = 'تقرير الطلبات المخصص'; title.style.textAlign = 'center'; title.style.marginBottom = '20px'; tempDiv.appendChild(title); let tableHtml = '<table style="width:100%; border-collapse: collapse; font-size: 11px;" border="1"><thead style="background:#f2f2f2;"><tr><th style="padding:8px;">ت</th><th style="padding:8px;">البيج</th><th style="padding:8px;">الزبون</th><th style="padding:8px;">الهاتف</th><th style="padding:8px;">العنوان</th><th style="padding:8px;">الطلب</th><th style="padding:8px;">المبلغ</th><th style="padding:8px;">الحالة</th><th style="padding:8px;">التاريخ</th></tr></thead><tbody>'; filtered.forEach((o, i) => { const dateStr = o.timestamp ? new Date(o.timestamp.seconds * 1000).toLocaleDateString(window.getLocale()) : '-'; tableHtml += `<tr><td style="padding:6px; text-align:center;">${i+1}</td><td style="padding:6px; text-align:center;">${esc(o.constant||'-')}</td><td style="padding:6px; text-align:center;">${esc(o.name||'-')}</td><td style="padding:6px; text-align:center;" dir="ltr">${esc(o.phone1||'-')}</td><td style="padding:6px; text-align:center;">${esc(o.gov||'-')}</td><td style="padding:6px; text-align:center;">${esc(o.type||'-')}</td><td style="padding:6px; text-align:center;">${esc(o.amount||'-')}</td><td style="padding:6px; text-align:center;">${esc(o.status||'جديد')}</td><td style="padding:6px; text-align:center;">${dateStr}</td></tr>`; }); tableHtml += '</tbody></table>'; tempDiv.innerHTML += tableHtml; document.body.appendChild(tempDiv); const opt = { margin: 10, filename: window.tr(`تقرير_مخصص_${new Date().toLocaleDateString(window.getLocale())}.pdf`), image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } }; html2pdf().set(opt).from(tempDiv).save().then(() => { document.body.removeChild(tempDiv); document.body.style.cursor = 'default'; window.closeAdvancedExportModal(); window.showSuccessToast(`تم تصدير ${filtered.length} طلب كملف PDF 📄`); }).catch(err => { console.error(err); document.body.style.cursor = 'default'; alert("حدث خطأ أثناء تصدير الـ PDF"); }); } }

// =========================================
// التقارير العامة ومالية المخزن
// =========================================
window.openReports = async function() { if (!loggedInUserCanReports && loggedInUser !== ADMIN_USER) { alert("❌ ليس لديك صلاحية."); return; } document.getElementById("main-menu-section").style.display = "none"; document.getElementById("reports-section").style.display = "flex"; let pagesHtml = '<option value="all">-- كل البيجات --</option>' + configuredPages.map(p => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join(''); document.getElementById('repPageFilter').innerHTML = pagesHtml; document.getElementById('repFinPageFilter').innerHTML = pagesHtml; document.getElementById('repChartsPageFilter').innerHTML = pagesHtml; let typesHtml = '<option value="all">-- كل الطلبات --</option>' + configuredOrderTypes.map(t => `<option value="${esc(t.code)}">${esc(t.name)} (${esc(t.code)})</option>`).join('') + '<option value="أخرى">أخرى (غير مسجلة)</option>'; document.getElementById('repTypeFilter').innerHTML = typesHtml; document.getElementById('repPageTypeFilter').innerHTML = typesHtml; let empHtml = '<option value="">-- اختر الموظف --</option>'; let allEmpNames = [ADMIN_USER, ...additionalUsers.map(u => u.username)]; allEmpNames.forEach(name => { empHtml += `<option value="${esc(name)}">${esc(name)}</option>`; }); document.getElementById('repEmpSelect').innerHTML = empHtml; window.generateReports(); }
window.switchReportTab = function(tabId, btn) { document.querySelectorAll('#reports-section .tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('#reports-section .tab-pane').forEach(p => p.classList.remove('active')); btn.classList.add('active'); document.getElementById(tabId).classList.add('active'); if(tabId === 'repWhTab') window.generateWarehouseReports(); else window.generateReports(); }

window.generateReports = function() { 
    const fromVal = document.getElementById('repDateFrom').value, toVal = document.getElementById('repDateTo').value; 
    let fromDate = fromVal ? new Date(fromVal) : null; if(fromDate) fromDate.setHours(0,0,0,0); 
    let toDate = toVal ? new Date(toVal) : null; if(toDate) toDate.setHours(23,59,59,999); 
    let targetOrders = allCloudOrders.filter(o => { if(fromDate || toDate) { if(!o.timestamp?.seconds) return false; const d = new Date(o.timestamp.seconds * 1000); if(fromDate && d < fromDate) return false; if(toDate && d > toDate) return false; } return true; }); 
    
    const selPage = document.getElementById('repPageFilter').value, selPageType = document.getElementById('repPageTypeFilter').value; let pageTargetOrders = targetOrders; if(selPage !== "all") pageTargetOrders = pageTargetOrders.filter(o => o.constant === selPage); if(selPageType !== "all") pageTargetOrders = pageTargetOrders.filter(o => { const its = parseTypeItems(o.type); return selPageType === 'أخرى' ? its.some(it => !configuredOrderTypes.some(t => t.code === it.code)) : its.some(it => it.code === selPageType); }); let totalPageQty = 0, totalPageAmt = 0, pageTbodyHtml = ""; if (pageTargetOrders.length === 0) { pageTbodyHtml = '<tr><td colspan="3" style="text-align:center;">لا توجد بيانات</td></tr>'; } else { pageTargetOrders.forEach(o => { let amt = parseAmount(o.amount), qty = parseInt(o.qty) || 1; totalPageQty += qty; totalPageAmt += amt; let safeType = (o.type || "").split(' + ').map(item => `<span dir="ltr" style="display: inline-block; padding: 0 5px;">${esc(item)}</span>`).join(' + '); pageTbodyHtml += `<tr><td style="font-size: 13px; text-align: center;">${safeType}</td><td>${qty}</td><td>${amt.toLocaleString()}</td></tr>`; }); } document.getElementById('repPageTbody').innerHTML = pageTbodyHtml; document.getElementById('totalPageQty').innerText = totalPageQty; document.getElementById('totalPageAmount').innerText = totalPageAmt.toLocaleString(); 
    
    const selType = document.getElementById('repTypeFilter').value; let typeStats = {}; targetOrders.forEach(o => { if(o.type && o.status === 'تم التوصيل') { parseTypeItems(o.type).forEach(it => { { let code = it.code, qty = it.qty; let isConfigured = configuredOrderTypes.some(t => t.code === code); if (isConfigured) { typeStats[code] = (typeStats[code] || 0) + qty; } else { typeStats['أخرى'] = (typeStats['أخرى'] || 0) + qty; } } }); } }); let typeCardsHtml = "", filteredTypes = Object.entries(typeStats); if(selType !== "all") filteredTypes = filteredTypes.filter(([tCode]) => tCode === selType); if(filteredTypes.length === 0) { typeCardsHtml = '<div style="width:100%; text-align:center; color:#ccc;">لا توجد طلبات مكتملة</div>'; } else { filteredTypes.forEach(([tCode, tQty]) => { if(tCode === 'أخرى') { typeCardsHtml += `<div class="report-card"><h4>أخرى (غير مسجلة)</h4><div class="val">${tQty}</div></div>`; } else { let tNameObj = configuredOrderTypes.find(t => t.code === tCode); typeCardsHtml += `<div class="report-card"><h4>${esc(tNameObj ? tNameObj.name : tCode)} (${esc(tCode)})</h4><div class="val">${tQty}</div></div>`; } }); } document.getElementById('repTypeCardsContainer').innerHTML = typeCardsHtml; 
    
    const selFinPage = document.getElementById('repFinPageFilter').value; let finTargetOrders = targetOrders.filter(o => o.status === 'تم التوصيل'); if(selFinPage !== "all") finTargetOrders = finTargetOrders.filter(o => o.constant === selFinPage); let finCount = finTargetOrders.length, finQty = 0, finGross = 0, finDelivery = 0; finTargetOrders.forEach(o => { let amt = parseAmount(o.amount); finQty += parseInt(o.qty) || 1; finGross += amt; finDelivery += (o.gov || "").includes("بغداد") ? feeBaghdad : feeOther; }); document.getElementById('finCount').innerText = finCount; document.getElementById('finQty').innerText = finQty; document.getElementById('finGross').innerText = finGross.toLocaleString(); document.getElementById('finDelivery').innerText = finDelivery.toLocaleString(); document.getElementById('finNet').innerText = (finGross - finDelivery).toLocaleString(); 
    
    if(document.getElementById('repChartsTab').classList.contains('active')) {
        let chartsSelPage = document.getElementById('repChartsPageFilter').value; let chartsTargetOrders = targetOrders; if(chartsSelPage && chartsSelPage !== "all") { chartsTargetOrders = chartsTargetOrders.filter(o => o.constant === chartsSelPage); } 
        let completed = chartsTargetOrders.filter(o => o.status === 'تم التوصيل'); let pageRevenues = {}; completed.forEach(o => { let net = (parseAmount(o.amount)) - ((o.gov || "").includes("بغداد") ? feeBaghdad : feeOther); let pageName = o.constant ? o.constant : "غير محدد"; pageRevenues[pageName] = (pageRevenues[pageName] || 0) + net; }); if(financialChartInstance) financialChartInstance.destroy(); let fcCanvas = document.getElementById('financialChart'); if(fcCanvas) { financialChartInstance = new Chart(fcCanvas, { type: 'bar', data: { labels: Object.keys(pageRevenues), datasets: [{ label: window.tr('الصافي (دينار)'), data: Object.values(pageRevenues), backgroundColor: '#407bff', borderRadius: 5, maxBarThickness: 60 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }); } 
        let itemStats = {}; completed.forEach(o => { if(o.type) { parseTypeItems(o.type).forEach(it => { { let code = it.code; let qty = it.qty; let isConfigured = configuredOrderTypes.some(t => t.code === code); if(isConfigured) { itemStats[code] = (itemStats[code] || 0) + qty; } else { itemStats['أخرى'] = (itemStats['أخرى'] || 0) + qty; } } }); } }); let topItems = Object.entries(itemStats).sort((a,b)=>b[1]-a[1]).slice(0,5); let chartLabels = topItems.map(i => { if(i[0] === 'أخرى') return 'أخرى'; let t = configuredOrderTypes.find(x => x.code === i[0]); return t ? t.name : i[0]; }); if(itemsPieChartInstance) itemsPieChartInstance.destroy(); let pcCanvas = document.getElementById('itemsPieChart'); if(pcCanvas) { itemsPieChartInstance = new Chart(pcCanvas, { type: 'doughnut', data: { labels: chartLabels, datasets: [{ data: topItems.map(i=>i[1]), backgroundColor: ['#ffd700','#407bff','#2ecc71','#e74c3c','#9b59b6'] }] }, options: { responsive: true, maintainAspectRatio: false } }); }
    }
    
    if(document.getElementById('repEmpTab').classList.contains('active')) { window.generateEmployeeReport(); }
}

window.generateWarehouseReports = function() {
    if(!document.getElementById('repWhTab').classList.contains('active')) return;
    
    let totalStockVal = 0;
    inventoryStock.forEach(i => { totalStockVal += (parseFloat(i.unitCost) || 0) * (parseFloat(i.qty) || 0); });
    document.getElementById('whRepStockValue').innerText = totalStockVal.toLocaleString();

    const fromVal = document.getElementById('repDateFrom').value; const toVal = document.getElementById('repDateTo').value;
    let fromDate = fromVal ? new Date(fromVal) : null; if(fromDate) fromDate.setHours(0,0,0,0);
    let toDate = toVal ? new Date(toVal) : null; if(toDate) toDate.setHours(23,59,59,999);

    let totalSpent = 0; let totalConsumedVal = 0;
    inventoryTransactions.forEach(t => {
        let matchDate = true;
        if(fromDate || toDate) { if(!t.timestamp?.seconds) matchDate = false; else { let d = new Date(t.timestamp.seconds * 1000); if(fromDate && d < fromDate) matchDate = false; if(toDate && d > toDate) matchDate = false; } }
        if(matchDate) {
            if(t.transType === 'purchase') totalSpent += (parseFloat(t.totalCost) || 0);
            if(t.transType === 'consume') totalConsumedVal += (parseFloat(t.totalCost) || 0);
        }
    });

    document.getElementById('whRepTotalSpent').innerText = totalSpent.toLocaleString();
    document.getElementById('whRepTotalConsumed').innerText = totalConsumedVal.toLocaleString();
}

window.exportPageReportPDF = function() { const pageName = document.getElementById('repPageFilter').value, typeName = document.getElementById('repPageTypeFilter').value, tempDiv = document.createElement('div'); tempDiv.style.padding = '30px'; tempDiv.style.background = '#ffffff'; tempDiv.style.color = '#000000'; tempDiv.style.direction = 'rtl'; tempDiv.style.fontFamily = 'Arial, sans-serif'; let titleStr = window.tr('تقرير المبيعات -') + ' ' + (pageName === 'all' ? window.tr('جميع البيجات') : pageName); if(typeName !== 'all') titleStr += ' ' + window.tr('| صنف:') + ' ' + typeName; const title = document.createElement('h2'); title.innerText = titleStr; title.style.textAlign = 'center'; title.style.marginBottom = '25px'; tempDiv.appendChild(title); const tableClone = document.getElementById('pageReportTable').cloneNode(true); tableClone.style.width = '100%'; tableClone.style.borderCollapse = 'collapse'; tableClone.querySelectorAll('th, td').forEach(cell => { cell.style.border = '1px solid #ccc'; cell.style.padding = '12px'; cell.style.textAlign = 'center'; cell.style.color = '#000'; cell.style.background = '#fff';}); tempDiv.appendChild(tableClone); document.body.appendChild(tempDiv); const opt = { margin: 10, filename: window.tr(`تقرير_المبيعات.pdf`), image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }; html2pdf().set(opt).from(tempDiv).save().then(() => { document.body.removeChild(tempDiv); }); }
window.generateEmployeeReport = async function() { const selEmp = document.getElementById('repEmpSelect').value; const noDataDiv = document.getElementById('empRepNoData'); const contentDiv = document.getElementById('employeeReportContent'); if(!selEmp) { contentDiv.style.display = 'none'; noDataDiv.style.display = 'block'; return; } contentDiv.style.display = 'block'; noDataDiv.style.display = 'none'; const fromVal = document.getElementById('repDateFrom').value; const toVal = document.getElementById('repDateTo').value; let fromDate = fromVal ? new Date(fromVal) : null; if(fromDate) fromDate.setHours(0,0,0,0); let toDate = toVal ? new Date(toVal) : null; if(toDate) toDate.setHours(23,59,59,999); document.body.style.cursor = 'wait'; try { let sessionsQuery = query(collection(db, "user_sessions"), where("username", "==", selEmp)); const sessionsSnap = await getDocs(sessionsQuery); let totalMilliseconds = 0; sessionsSnap.forEach(doc => { let d = doc.data(); if(d.loginTime && d.lastActive) { let sTime = new Date(d.loginTime); if(fromDate && sTime < fromDate) return; if(toDate && sTime > toDate) return; let diff = d.lastActive - d.loginTime; if(diff > 0) totalMilliseconds += diff; } }); let totalHours = (totalMilliseconds / (1000 * 60 * 60)).toFixed(2); document.getElementById('empRepHours').innerText = totalHours; let addedOrders = allCloudOrders.filter(o => o.addedBy === selEmp); if(fromDate || toDate) { addedOrders = addedOrders.filter(o => { if(!o.timestamp?.seconds) return false; const d = new Date(o.timestamp.seconds * 1000); return (!fromDate || d >= fromDate) && (!toDate || d <= toDate); }); } document.getElementById('empRepAdded').innerText = addedOrders.length; let addedTbody = ''; addedOrders.forEach(o => { let amt = parseAmount(o.amount); addedTbody += `<tr><td>${esc(o.id||'-')}</td><td>${esc(o.name||'-')}</td><td>${esc(o.constant||'-')}</td><td>${amt.toLocaleString()}</td><td>${esc(o.status||'جديد')}</td></tr>`; }); if(!addedTbody) addedTbody = '<tr><td colspan="5" style="text-align:center;">لا توجد طلبات مسجلة للموظف</td></tr>'; document.getElementById('empAddedOrdersTbody').innerHTML = addedTbody; } catch(e) { console.error(e); } document.body.style.cursor = 'default'; };
window.exportEmployeeReportPDF = function() { const selEmp = document.getElementById('repEmpSelect').value; if(!selEmp) { alert("الرجاء اختيار الموظف أولاً!"); return; } const tempDiv = document.createElement('div'); tempDiv.style.padding = '30px'; tempDiv.style.background = '#ffffff'; tempDiv.style.color = '#000000'; tempDiv.style.direction = 'rtl'; tempDiv.style.fontFamily = 'Arial, sans-serif'; const title = document.createElement('h2'); title.innerText = window.tr('تقرير الموظف المفصل:') + ' ' + selEmp; title.style.textAlign = 'center'; title.style.marginBottom = '25px'; tempDiv.appendChild(title); const statsRow = document.createElement('div'); statsRow.style.display = 'flex'; statsRow.style.justifyContent = 'space-around'; statsRow.style.marginBottom = '30px'; statsRow.style.borderBottom = '1px solid #ccc'; statsRow.style.paddingBottom = '15px'; statsRow.innerHTML = `<div style="text-align:center;"><strong>ساعات العمل</strong><br>${document.getElementById('empRepHours').innerText}</div><div style="text-align:center;"><strong>الطلبات المضافة</strong><br>${document.getElementById('empRepAdded').innerText}</div>`; tempDiv.appendChild(statsRow); const addedTitle = document.createElement('h3'); addedTitle.innerText = "سجل الطلبات المضافة"; tempDiv.appendChild(addedTitle); const addedTableClone = document.getElementById('empAddedOrdersTable').cloneNode(true); addedTableClone.style.width = '100%'; addedTableClone.style.borderCollapse = 'collapse'; addedTableClone.style.marginBottom = '30px'; addedTableClone.querySelectorAll('th, td').forEach(c => { c.style.border = '1px solid #ccc'; c.style.padding = '8px'; c.style.textAlign = 'center'; c.style.color = '#000'; c.style.background = '#fff'; c.style.fontSize = '12px';}); tempDiv.appendChild(addedTableClone); document.body.appendChild(tempDiv); const opt = { margin: 10, filename: window.tr(`تقرير_الموظف_${selEmp}.pdf`), image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }; html2pdf().set(opt).from(tempDiv).save().then(() => { document.body.removeChild(tempDiv); }); };

// =========================================
// الإعدادات (Settings)
// =========================================
window.openSettings = function() { 
    if (!loggedInUserCanSettings && loggedInUser !== ADMIN_USER) { alert("❌ ليس لديك صلاحية."); return; }
    document.getElementById("main-menu-section").style.display = "none"; document.getElementById("settings-section").style.display = "flex";
    document.getElementById('settingsAuthSection').style.display = 'none'; document.getElementById('settingsManagerSection').style.display = 'block'; 
    window.renderPagesSettings(); window.renderOrderTypesSettings(); window.renderUsers(); window.renderWhCatalogSettings(); 
}

window.verifySettingsPass = function() { if (document.getElementById('settingsPass').value === ADMIN_PASS) { document.getElementById('settingsAuthSection').style.display = 'none'; document.getElementById('settingsManagerSection').style.display = 'block'; window.renderPagesSettings(); window.renderOrderTypesSettings(); window.renderUsers(); window.renderWhCatalogSettings(); } else { document.getElementById('settings-error').style.display = 'block'; } }
window.switchTab = function(tabId, btn) { document.querySelectorAll('#settings-section .tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('#settings-section .tab-pane').forEach(p => p.classList.remove('active')); btn.classList.add('active'); document.getElementById(tabId).classList.add('active'); }
window.addPageType = async function() { const val = document.getElementById('newPageName').value.trim(); if(val && window.addSystemPageToFirebase) { const r = await window.addSystemPageToFirebase({name: val}); configuredPages.push({id: r.id, name: val}); window.renderPagesSettings(); window.updatePagesDropdown(); } }
window.deletePageType = async function(idx) { window.showConfirmDialog("حذف البيج؟", async function() { await window.deleteSystemPageFromFirebase(configuredPages[idx].id); configuredPages.splice(idx, 1); window.renderPagesSettings(); window.updatePagesDropdown(); }); }
window.renderPagesSettings = function() { document.getElementById("pagesListDisplay").innerHTML = configuredPages.map((p, i) => `<li class="settings-list-item"><span class="item-text">${esc(p.name)}</span><button class="btn-danger" onclick="window.deletePageType(${i})">حذف</button></li>`).join(''); }
window.updatePagesDropdown = function() { const s1 = document.getElementById('constantField'), s2 = document.getElementById('cloudPageFilter'), s3 = document.getElementById('repPageFilter'), s4 = document.getElementById('repFinPageFilter'), s5 = document.getElementById('repChartsPageFilter'); let h1 = '<option value="">-- اختر البيج --</option>' + configuredPages.map(p => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join(''), h2 = '<option value="">-- كل البيجات --</option>' + configuredPages.map(p => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join(''); if(s1) s1.innerHTML = h1; if(s2) s2.innerHTML = h2; if(s3) s3.innerHTML = h2; if(s4) s4.innerHTML = h2; if(s5) s5.innerHTML = h2; }

window.toggleOrderTypeSection = function(sec) { document.getElementById('add-ordertype-sec').style.display = (sec === 'add') ? 'block' : 'none'; document.getElementById('list-ordertype-sec').style.display = (sec === 'list') ? 'block' : 'none'; document.getElementById('btn-sec-type-list').style.background = (sec === 'list') ? 'var(--button-gradient)' : 'transparent'; document.getElementById('btn-sec-type-list').style.color = (sec === 'list') ? 'white' : 'var(--text-muted)'; document.getElementById('btn-sec-type-add').style.background = (sec === 'add') ? 'var(--button-gradient)' : 'transparent'; document.getElementById('btn-sec-type-add').style.color = (sec === 'add') ? 'white' : 'var(--text-muted)'; if(sec === 'add' && !document.getElementById('type-edit-id').value) { document.getElementById('type-form-title').innerText = "إضافة ديكور جديد"; document.getElementById('save-type-btn').innerText = "حفظ الديكور ➕"; } }
window.saveOrderType = async function() { const editId = document.getElementById("type-edit-id").value; const data = { name: document.getElementById("type-name").value.trim(), code: document.getElementById("type-code").value.trim(), price: document.getElementById("type-price").value.trim(), notes: document.getElementById("type-notes").value.trim() }; if(data.name === "" || data.code === "") { alert("يرجى إدخال اسم الطلب والرمز"); return; } if(configuredOrderTypes.some(t => t.code === data.code && t.id !== editId)) { alert("هذا الرمز مستخدم لطلب آخر، اختر رمزاً مختلفاً"); return; } document.body.style.cursor = 'wait'; if(editId) { if(window.updateOrderTypeInFirebase) await window.updateOrderTypeInFirebase(editId, data); const idx = configuredOrderTypes.findIndex(t => t.id === editId); if(idx > -1) configuredOrderTypes[idx] = { id: editId, ...data }; window.showSuccessToast("تم تحديث الديكور بنجاح!"); } else { if(window.addOrderTypeToFirebase) { const r = await window.addOrderTypeToFirebase(data); configuredOrderTypes.push({ id: r.id, ...data }); window.showSuccessToast("تمت إضافة الديكور بنجاح!"); } } document.body.style.cursor = 'default'; ['type-name', 'type-code', 'type-price', 'type-notes', 'type-edit-id'].forEach(id => document.getElementById(id).value = ''); window.renderOrderTypesSettings(); window.updateOrderTypeSelects(); window.toggleOrderTypeSection('list'); }
window.editOrderType = function(idx) { const t = configuredOrderTypes[idx]; document.getElementById("type-edit-id").value = t.id; document.getElementById("type-name").value = t.name || ''; document.getElementById("type-code").value = t.code || ''; document.getElementById("type-price").value = t.price || ''; document.getElementById("type-notes").value = t.notes || ''; document.getElementById('type-form-title').innerText = "تحديث بيانات الديكور"; document.getElementById('save-type-btn').innerText = "تحديث البيانات 💾"; window.toggleOrderTypeSection('add'); }
window.deleteOrderType = async function(idx) { window.showConfirmDialog("تأكيد حذف هذا الديكور بشكل نهائي؟", async function() { await window.deleteOrderTypeFromFirebase(configuredOrderTypes[idx].id); configuredOrderTypes.splice(idx, 1); window.renderOrderTypesSettings(); window.updateOrderTypeSelects(); window.showSuccessToast("تم الحذف بنجاح"); }); }
window.renderOrderTypesSettings = function() { let html = ''; configuredOrderTypes.forEach((t, i) => { html += `<div class="settings-list-item" style="display:flex; justify-content:space-between; align-items:center; padding: 15px; margin-bottom:10px; background:var(--bg-color); border-radius:15px; box-shadow:var(--outer-shadow);"><div style="text-align:start; flex:1;"><div style="font-weight:bold; font-size:15px; color:var(--text-color);">${esc(t.name)} <span style="color:var(--primary-blue); font-size: 13px;">(${esc(t.code)})</span></div><div style="font-size:12px; color:var(--text-muted); margin-top:5px;">${t.price ? window.tr('السعر:') + ' ' + Number(t.price).toLocaleString() + ' ' + window.tr('د.ع') + ' | ' : ''} ${t.notes ? window.tr('ملاحظات:') + ' ' + esc(t.notes) : ''}</div></div><div style="display:flex; gap:10px;"><button class="btn-outline" style="padding: 8px 12px; border-radius: 10px; font-size: 12px; min-width:unset; box-shadow:var(--outer-shadow);" onclick="window.editOrderType(${i})">✏️</button><button class="btn-danger" style="padding: 8px 12px; border-radius: 10px; font-size: 12px; min-width:unset; box-shadow:var(--outer-shadow);" onclick="window.deleteOrderType(${i})">🗑️</button></div></div>`; }); if(html === '') html = '<div style="text-align:center; padding: 30px; color:#ccc;">لا توجد ديكورات مضافة</div>'; document.getElementById("orderTypesCardsContainer").innerHTML = html; }
window.updateOrderTypeSelects = function() { document.querySelectorAll('.orderTypeSelect').forEach(s => { const v = s.value; s.innerHTML = '<option value="">-- اختر الطلب --</option>' + configuredOrderTypes.map(t => `<option value="${esc(t.name)}">${esc(t.name)} ➡️ (${esc(t.code)})</option>`).join(''); s.value = v; }); }

window.toggleWhItemSection = function(sec) { document.getElementById('add-whitem-sec').style.display = (sec === 'add') ? 'block' : 'none'; document.getElementById('list-whitem-sec').style.display = (sec === 'list') ? 'block' : 'none'; document.getElementById('btn-sec-wh-list').style.background = (sec === 'list') ? 'var(--button-gradient)' : 'transparent'; document.getElementById('btn-sec-wh-list').style.color = (sec === 'list') ? 'white' : 'var(--text-muted)'; document.getElementById('btn-sec-wh-add').style.background = (sec === 'add') ? 'var(--button-gradient)' : 'transparent'; document.getElementById('btn-sec-wh-add').style.color = (sec === 'add') ? 'white' : 'var(--text-muted)'; if(sec === 'add' && !document.getElementById('whcat-edit-id').value) { document.getElementById('whcat-form-title').innerText = "تعريف مادة جديدة"; document.getElementById('save-whcat-btn').innerText = "حفظ المادة 💾"; } }
window.saveWhCatalogItem = async function() {
    const editId = document.getElementById("whcat-edit-id").value;
    const data = {
        name: document.getElementById("whcat-name").value.trim(), code: document.getElementById("whcat-code").value.trim(),
        category: document.getElementById("whcat-category").value.trim(), unitMeasure: document.getElementById("whcat-unit").value,
        unitCost: parseFloat(document.getElementById("whcat-cost").value) || 0, notes: document.getElementById("whcat-notes").value.trim()
    };
    if(data.name === "") { alert("يرجى إدخال اسم المادة"); return; } if(data.code && inventoryCatalog.some(t => t.code === data.code && t.id !== editId)) { alert("هذا الرمز مستخدم لمادة أخرى، اختر رمزاً مختلفاً"); return; }
    document.body.style.cursor = 'wait';
    if(editId) {
        await window.updateWhCatalogItemInFirebase(editId, data);
        const idx = inventoryCatalog.findIndex(t => t.id === editId);
        if(idx > -1) inventoryCatalog[idx] = { id: editId, ...data };
        window.showSuccessToast("تم تحديث المادة بنجاح!");
    } else {
        const r = await window.addWhCatalogItemToFirebase(data);
        inventoryCatalog.push({ id: r.id, ...data });
        window.showSuccessToast("تمت إضافة المادة بنجاح!");
    }
    document.body.style.cursor = 'default';
    ['whcat-name', 'whcat-code', 'whcat-category', 'whcat-cost', 'whcat-notes', 'whcat-edit-id'].forEach(id => document.getElementById(id).value = '');
    window.renderWhCatalogSettings(); window.toggleWhItemSection('list');
}
window.editWhCatalogItem = function(idx) {
    const t = inventoryCatalog[idx];
    document.getElementById("whcat-edit-id").value = t.id; document.getElementById("whcat-name").value = t.name || '';
    document.getElementById("whcat-code").value = t.code || ''; document.getElementById("whcat-category").value = t.category || '';
    document.getElementById("whcat-unit").value = t.unitMeasure || 'قطعة'; document.getElementById("whcat-cost").value = t.unitCost || '';
    document.getElementById("whcat-notes").value = t.notes || '';
    document.getElementById('whcat-form-title').innerText = "تحديث بيانات المادة"; document.getElementById('save-whcat-btn').innerText = "تحديث البيانات 💾";
    window.toggleWhItemSection('add');
}
window.deleteWhCatalogItem = async function(idx) { window.showConfirmDialog("تأكيد حذف هذه المادة من التعريفات؟", async function() { await window.deleteWhCatalogItemFromFirebase(inventoryCatalog[idx].id); inventoryCatalog.splice(idx, 1); window.renderWhCatalogSettings(); window.showSuccessToast("تم الحذف بنجاح"); }); }
window.renderWhCatalogSettings = function() {
    let html = '';
    inventoryCatalog.forEach((t, i) => { html += `<div class="settings-list-item" style="display:flex; justify-content:space-between; align-items:center; padding: 15px; margin-bottom:10px; background:var(--bg-color); border-radius:15px; box-shadow:var(--outer-shadow);"><div style="text-align:start; flex:1;"><div style="font-weight:bold; font-size:15px; color:var(--text-color);">${esc(t.name)} <span style="color:var(--primary-blue); font-size: 13px;">(${esc(t.code||'-')})</span></div><div style="font-size:12px; color:var(--text-muted); margin-top:5px;">التصنيف: ${esc(t.category||'-')} | الوحدة: ${esc(t.unitMeasure)} | السعر: ${Number(t.unitCost||0).toLocaleString()} د.ع</div></div><div style="display:flex; gap:10px;"><button class="btn-outline" style="padding: 8px 12px; border-radius: 10px; font-size: 12px; min-width:unset; box-shadow:var(--outer-shadow);" onclick="window.editWhCatalogItem(${i})">✏️</button><button class="btn-danger" style="padding: 8px 12px; border-radius: 10px; font-size: 12px; min-width:unset; box-shadow:var(--outer-shadow);" onclick="window.deleteWhCatalogItem(${i})">🗑️</button></div></div>`; });
    if(html === '') html = '<div style="text-align:center; padding: 30px; color:#ccc;">لا توجد مواد مضافة</div>';
    document.getElementById("whCatalogCardsContainer").innerHTML = html;
}

window.toggleEmployeeSection = function(sec) { document.getElementById('add-employee-sec').style.display = (sec === 'add') ? 'block' : 'none'; document.getElementById('list-employee-sec').style.display = (sec === 'list') ? 'block' : 'none'; document.getElementById('btn-sec-list').style.background = (sec === 'list') ? 'var(--button-gradient)' : 'transparent'; document.getElementById('btn-sec-list').style.color = (sec === 'list') ? 'white' : 'var(--text-muted)'; document.getElementById('btn-sec-add').style.background = (sec === 'add') ? 'var(--button-gradient)' : 'transparent'; document.getElementById('btn-sec-add').style.color = (sec === 'add') ? 'white' : 'var(--text-muted)'; if(sec === 'add' && !document.getElementById('emp-edit-id').value) { document.getElementById('emp-form-title').innerText = "إضافة موظف جديد"; document.getElementById('save-emp-btn').innerText = "حفظ الموظف ➕"; } }
window.saveEmployee = async function() {
    const editId = document.getElementById("emp-edit-id").value;
    const data = {
        username: document.getElementById("emp-name").value.trim(), gender: document.getElementById("emp-gender").value, phone: document.getElementById("emp-phone").value.trim(),
        location: document.getElementById("emp-location").value.trim(), jobTitle: document.getElementById("emp-job").value.trim(), password: document.getElementById("emp-pass").value.trim(),
        canDeleteCloud: document.getElementById("emp-can-delete").checked, canEditCloud: document.getElementById("emp-can-edit").checked,
        canEditOrderType: document.getElementById("emp-can-edit-type").checked, canAccessSettings: document.getElementById("emp-can-settings").checked,
        canAccessReports: document.getElementById("emp-can-reports").checked, canAccessChat: document.getElementById("emp-can-chat").checked,
        canAddOrders: document.getElementById("emp-can-add").checked, canFetchOld: document.getElementById("emp-can-fetch-old").checked,
        canImportExport: document.getElementById("emp-can-import-export").checked,
        canPurchase: document.getElementById("emp-can-purchase").checked, canConsume: document.getElementById("emp-can-consume").checked
    };
    if (data.username === "" || data.password === "") { alert("يرجى إدخال الاسم وكلمة المرور"); return; }
    if (data.username === ADMIN_USER) { alert("هذا الاسم محجوز للمدير، اختر اسماً آخر"); return; }
    if (additionalUsers.some(u => u.username === data.username && u.id !== editId)) { alert("يوجد موظف بنفس الاسم، اختر اسماً آخر"); return; }
    document.body.style.cursor = 'wait';
    try {
        if (editId) { await window.updateSystemUserInFirebase(editId, data); const idx = additionalUsers.findIndex(u => u.id === editId); if (idx > -1) additionalUsers[idx] = { id: editId, ...data }; window.showSuccessToast("تم تحديث بيانات الموظف بنجاح!"); }
        else { const r = await window.addSystemUserToFirebase(data); additionalUsers.push({ id: r.id, ...data }); window.showSuccessToast("تمت إضافة الموظف بنجاح!"); }
    } catch (e) { console.error(e); alert("حدث خطأ أثناء حفظ الموظف"); return; }
    finally { document.body.style.cursor = 'default'; }
    ['emp-name', 'emp-phone', 'emp-location', 'emp-job', 'emp-pass', 'emp-edit-id'].forEach(id => document.getElementById(id).value = '');
    ['emp-can-delete', 'emp-can-edit', 'emp-can-edit-type', 'emp-can-settings', 'emp-can-reports', 'emp-can-chat', 'emp-can-add', 'emp-can-fetch-old', 'emp-can-import-export', 'emp-can-purchase', 'emp-can-consume'].forEach(id => document.getElementById(id).checked = false);
    window.renderUsers(); window.toggleEmployeeSection('list');
}
window.editEmployee = function(idx) {
    const u = additionalUsers[idx];
    document.getElementById("emp-edit-id").value = u.id; document.getElementById("emp-name").value = u.username || ''; document.getElementById("emp-gender").value = u.gender || 'ذكر';
    document.getElementById("emp-phone").value = u.phone || ''; document.getElementById("emp-location").value = u.location || ''; document.getElementById("emp-job").value = u.jobTitle || ''; document.getElementById("emp-pass").value = u.password || '';
    document.getElementById("emp-can-delete").checked = u.canDeleteCloud || false; document.getElementById("emp-can-edit").checked = u.canEditCloud || false; document.getElementById("emp-can-edit-type").checked = u.canEditOrderType || false; document.getElementById("emp-can-settings").checked = u.canAccessSettings || false; document.getElementById("emp-can-reports").checked = u.canAccessReports || false; document.getElementById("emp-can-chat").checked = u.canAccessChat || false; document.getElementById("emp-can-add").checked = u.canAddOrders || false; document.getElementById("emp-can-fetch-old").checked = u.canFetchOld || false; document.getElementById("emp-can-import-export").checked = u.canImportExport || false;
    document.getElementById("emp-can-purchase").checked = u.canPurchase || false; document.getElementById("emp-can-consume").checked = u.canConsume || false;
    document.getElementById('emp-form-title').innerText = "تحديث بيانات الموظف"; document.getElementById('save-emp-btn').innerText = "تحديث البيانات 💾"; window.toggleEmployeeSection('add');
}
window.deleteEmployee = function(idx) { window.showConfirmDialog("تأكيد حذف بروفايل الموظف بشكل نهائي؟", async function() { await window.deleteSystemUserFromFirebase(additionalUsers[idx].id); additionalUsers.splice(idx, 1); window.renderUsers(); window.showSuccessToast("تم الحذف بنجاح"); }); }
window.renderUsers = function() { 
    let html = ''; additionalUsers.forEach((u, i) => { let avatarIcon = (u.gender === 'أنثى') ? '👩' : '👨'; html += `<div class="settings-list-item" style="cursor:pointer; padding: 10px 20px; transition: transform 0.2s ease;" onclick="window.viewEmployeeProfile(${i})" onmouseover="this.style.transform='scale(0.98)'" onmouseout="this.style.transform='none'"><div style="display:flex; align-items:center; gap:15px; flex:1;"><div style="font-size:22px; background:var(--bg-color); border-radius:50%; width:40px; height:40px; display:flex; justify-content:center; align-items:center; box-shadow:var(--inner-shadow);">${avatarIcon}</div><div style="text-align:start;"><div style="font-weight:bold; font-size:15px; color:var(--text-color);">${esc(u.username)}</div><div style="font-size:11px; color:var(--text-muted);">${esc(u.jobTitle || 'موظف')}</div></div></div><div style="color:var(--primary-blue); font-size:13px; font-weight:bold; display:flex; align-items:center; gap:5px;">عرض <span style="font-size:18px;">👁️</span></div></div>`; });
    if(html === '') html = '<div style="text-align:center; padding: 30px; color:#ccc;">لا يوجد موظفين حالياً</div>'; document.getElementById("employee-cards-container").innerHTML = html; 
}
window.togglePasswordVisibility = function(inputId) { const input = document.getElementById(inputId); if(input.type === "password") { input.type = "text"; } else { input.type = "password"; } }
window.viewEmployeeProfile = function(idx) {
    const u = additionalUsers[idx]; let avatarIcon = (u.gender === 'أنثى') ? '👩' : '👨';
    document.getElementById('view-emp-avatar').innerText = avatarIcon; document.getElementById('view-emp-name').innerText = u.username; document.getElementById('view-emp-job').innerText = u.jobTitle || 'موظف';
    document.getElementById('view-emp-location').innerText = u.location || '-'; document.getElementById('view-emp-gender').innerText = u.gender || '-'; document.getElementById('view-emp-phone').innerText = u.phone || '-';
    let waLinkBtn = u.phone ? `<a href="${waUrl(u.phone)}" target="_blank" class="emp-wa-btn">مراسلة عبر واتساب 💬</a>` : `<button class="emp-wa-btn" style="background:#ccc; cursor:not-allowed;">لا يوجد رقم هاتف</button>`;
    document.getElementById('view-emp-wa').innerHTML = waLinkBtn;
    let perms = [];
    if(u.canDeleteCloud) perms.push('<span class="status-badge active">حذف</span>'); if(u.canEditCloud) perms.push('<span class="status-badge active">تعديل</span>'); if(u.canEditOrderType) perms.push('<span class="status-badge active">تعديل الطلب</span>'); if(u.canAccessSettings) perms.push('<span class="status-badge active">إعدادات</span>'); if(u.canAccessReports) perms.push('<span class="status-badge active">تقارير</span>'); if(u.canAccessChat) perms.push('<span class="status-badge active">دردشة</span>'); if(u.canAddOrders) perms.push('<span class="status-badge active">إضافة</span>'); if(u.canFetchOld) perms.push('<span class="status-badge active">أرشيف</span>'); if(u.canImportExport) perms.push('<span class="status-badge active">تصدير</span>'); if(u.canPurchase) perms.push('<span class="status-badge active">إدخال مخزن</span>'); if(u.canConsume) perms.push('<span class="status-badge active">سحب مخزن</span>');
    if(perms.length === 0) perms.push('<span style="font-size:12px; color:#aaa;">لا يملك صلاحيات</span>');
    document.getElementById('view-emp-perms').innerHTML = perms.join('');
    document.getElementById('view-emp-pass').value = u.password; document.getElementById('view-emp-pass').type = "password";
    document.getElementById('view-emp-edit-btn').onclick = function() { window.closeEmployeeProfileModal(); window.editEmployee(idx); }; document.getElementById('view-emp-del-btn').onclick = function() { window.closeEmployeeProfileModal(); window.deleteEmployee(idx); };
    document.getElementById('employeeProfileModal').style.display = 'flex';
}
window.closeEmployeeProfileModal = function() { document.getElementById('employeeProfileModal').style.display = 'none'; }

// =========================================
// تشغيل أولي: صف الأصناف الأول + تسجيل الـ Service Worker
// =========================================
window.addOrderItemRow();
if ('serviceWorker' in navigator) {
    const registerSW = () => navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW registration failed', err));
    if (document.readyState === 'complete') registerSW(); else window.addEventListener('load', registerSW);
}

// =========================================
// تغيير اللغة: نعيد رسم الأجزاء المفتوحة حالياً (التواريخ/المخططات)
// =========================================
document.addEventListener('gl-language-changed', () => {
    try {
        const shown = id => { const e = document.getElementById(id); return e && e.style.display !== 'none' && e.style.display !== ''; };
        if (shown('archive-section') && window.filterCloudOrders) window.filterCloudOrders();
        if (shown('reports-section') && window.generateReports) window.generateReports();
        if (typeof currentChatId !== 'undefined' && currentChatId && window.renderCurrentChatMessages) window.renderCurrentChatMessages();
        if (typeof loggedInUser !== 'undefined' && loggedInUser) {
            if (window.renderUsers) window.renderUsers();
            if (window.renderWarehouseStock) window.renderWarehouseStock();
        }
    } catch (e) { console.warn(e); }
});
