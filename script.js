import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, serverTimestamp, getDocs, query, 
    deleteDoc, doc, updateDoc, onSnapshot, where, setDoc, getDoc, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

    // نظام تسجيل النشاطات في السحابة
    window.logActionToCloud = async function(actionType, detailsStr) {
        if(!loggedInUser) return;
        try { 
            await addDoc(collection(db, "action_logs"), { 
                username: loggedInUser, 
                action: actionType, 
                details: detailsStr, 
                timestamp: serverTimestamp() 
            }); 
        } catch(e) { console.error("Log error", e); }
    };

    window.saveDataToFirebase = async function(orderData) { 
        try { 
            orderData.timestamp = serverTimestamp(); 
            await addDoc(collection(db, "orders"), orderData); 
            window.logActionToCloud("إضافة طلب", `تم إضافة طلب للزبون: ${orderData.name}`); 
            return true; 
        } catch (e) { 
            console.error("Error saving data:", e); 
            window.showSuccessToast("حدث خطأ أثناء الحفظ"); 
            return false; 
        } 
    };
    
    window.deleteOrderFromFirebase = async function(docId) { 
        try { 
            await deleteDoc(doc(db, "orders", docId)); 
            window.logActionToCloud("حذف طلب", `تم مسح طلب نهائياً`); 
        } catch (e) { console.error("Error deleting order:", e); } 
    };
    
    window.updateOrderInFirebase = async function(docId, newData) { 
        try { 
            await updateDoc(doc(db, "orders", docId), newData); 
            let actType = newData.status ? "تغيير حالة" : "تعديل طلب"; 
            window.logActionToCloud(actType, `تعديل/تحديث بيانات طلب`); 
        } catch(e) { console.error("Error updating order:", e); } 
    };
    
    let cloudOrdersUnsubscribe = null;
    window.listenToCloudOrders = function() {
        if(cloudOrdersUnsubscribe) { cloudOrdersUnsubscribe(); cloudOrdersUnsubscribe = null; }
        allCloudOrders = [];
        const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
        const q = query(collection(db, "orders"), where("timestamp", ">=", startOfMonth));
        
        let isFirstLoad = true;
        cloudOrdersUnsubscribe = onSnapshot(q, (snapshot) => {
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
            if(document.getElementById('archive-section').style.display === 'flex') window.filterCloudOrders();
        }, (error) => { console.error("Listener error:", error); });
    };

    window.loadSystemDataFromFirebase = async function() {
        try { 
            let users = [], types = [], pages = []; 
            const [uSnap, tSnap, pSnap, delivSnap] = await Promise.all([ 
                getDocs(collection(db, "system_users")), 
                getDocs(collection(db, "order_types")), 
                getDocs(collection(db, "system_pages")), 
                getDoc(doc(db, "system_settings", "delivery")) 
            ]); 
            uSnap.forEach(d => users.push({ id: d.id, ...d.data() })); 
            tSnap.forEach(d => types.push({ id: d.id, ...d.data() })); 
            pSnap.forEach(d => pages.push({ id: d.id, ...d.data() })); 
            if(delivSnap.exists()) { feeBaghdad = delivSnap.data().feeBaghdad || 5000; feeOther = delivSnap.data().feeOther || 8000; }
            return { users, types, pages }; 
        } catch (e) { console.error("Load system data error:", e); return { users: [], types: [], pages: [] }; }
    };
    
    window.addSystemUserToFirebase = async function(data) { return await addDoc(collection(db, "system_users"), data); }; 
    window.deleteSystemUserFromFirebase = async function(docId) { await deleteDoc(doc(db, "system_users", docId)); }; 
    window.updateSystemUserInFirebase = async function(docId, data) { await updateDoc(doc(db, "system_users", docId), data); }; 
    window.addOrderTypeToFirebase = async function(data) { return await addDoc(collection(db, "order_types"), data); }; 
    window.deleteOrderTypeFromFirebase = async function(docId) { await deleteDoc(doc(db, "order_types", docId)); }; 
    window.updateOrderTypeInFirebase = async function(docId, data) { await updateDoc(doc(db, "order_types", docId), data); }; 
    window.addSystemPageToFirebase = async function(data) { return await addDoc(collection(db, "system_pages"), data); }; 
    window.deleteSystemPageFromFirebase = async function(docId) { await deleteDoc(doc(db, "system_pages", docId)); };
} catch(e) { console.warn("Firebase Init Error", e); }

// =========================================
// PWA & Utils
// =========================================
let deferredPrompt; 
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
window.showInstallInstructions = async function(os) { 
    if (deferredPrompt && os !== 'ios') { 
        deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; 
    } else { 
        if(os === 'ios') alert("🍏 لتثبيت التطبيق على الآيفون:\n\n1. اضغط على زر 'المشاركة' أسفل المتصفح.\n2. اختر 'إضافة إلى الصفحة الرئيسية'."); 
        else alert("📱 التطبيق جاهز للتثبيت! \n\nاضغط على النقاط الثلاث واختر 'إضافة إلى الشاشة الرئيسية'."); 
    } 
}
if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(err => console.log('SW error', err)); }); }

function safeGetStorage(key, def) { try { return localStorage.getItem(key) || def; } catch(e) { return def; } }
function safeSetStorage(key, val) { try { localStorage.setItem(key, val); } catch(e) {} }

let currentThemeMode = safeGetStorage('gl_theme_mode', 'auto');
window.applyThemeMode = function(mode) {
    currentThemeMode = mode;
    safeSetStorage('gl_theme_mode', mode);
    let isDark = false;
    if (mode === 'dark') { isDark = true; } else if (mode === 'light') { isDark = false; } else { const hour = new Date().getHours(); isDark = (hour >= 18 || hour < 6); }
    if (isDark) { document.body.classList.add('dark-mode'); } else { document.body.classList.remove('dark-mode'); }
    document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('theme-btn-' + mode);
    if(activeBtn) activeBtn.classList.add('active');
}
window.applyThemeMode(currentThemeMode);
setInterval(() => { if(currentThemeMode === 'auto') { window.applyThemeMode('auto'); } }, 60000);

setInterval(() => { 
    const timeEl = document.getElementById('globalTime'); 
    if(timeEl) { const now = new Date(); timeEl.innerText = `🕒 ${now.toLocaleTimeString('ar-IQ')} - 📅 ${now.toLocaleDateString('ar-IQ')}`; } 
}, 1000);

window.showSuccessToast = function(message) { 
    let toast = document.getElementById('success-toast-alert'); 
    if (!toast) { toast = document.createElement('div'); toast.id = 'success-toast-alert'; toast.className = 'success-toast'; document.body.appendChild(toast); } 
    toast.innerHTML = `✨ ${message}`; toast.classList.add('show'); 
    setTimeout(() => { toast.classList.remove('show'); }, 4000); 
};

const audioBeep = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18A"); 
window.playAudioNotification = function() { try { audioBeep.play(); } catch(e){} }

const ADMIN_USER = "Zain"; const ADMIN_PASS = "327798";
let additionalUsers = [], configuredOrderTypes = [], configuredPages = [];
let loggedInUser = "";
let loggedInUserCanDelete = false, loggedInUserCanEdit = false, loggedInUserCanSettings = false, loggedInUserCanReports = false; 
let loggedInUserCanChat = false, loggedInUserCanAdd = false, loggedInUserCanFetchOld = false, loggedInUserCanImportExport = false;

let feeBaghdad = 5000, feeOther = 8000; let currentSessionId = null;
let currentChatId = null; let allSystemUsersList = []; let allChatMessages = [];
let allCloudOrders = []; let currentConfirmAction = null; let currentEditDocId = null;
let financialChartInstance = null; let itemsPieChartInstance = null;

function getWaLink(phone) { 
    if(!phone) return '-'; let p = phone.replace(/\D/g,''); if(p.startsWith('07')) p = '964' + p.substring(1); 
    return `<a href="https://wa.me/${p}" target="_blank" style="color:#2ecc71; text-decoration:none; font-weight:bold;">🟢 واتساب</a>`; 
}

window.saveDeliveryFees = async function() { 
    feeBaghdad = parseInt(document.getElementById('feeBaghdadInput').value) || 0; 
    feeOther = parseInt(document.getElementById('feeOtherInput').value) || 0; 
    try { await setDoc(doc(db, "system_settings", "delivery"), { feeBaghdad, feeOther }); window.showSuccessToast("تم حفظ التوصيل سحابياً!"); } catch(e){ console.error(e); } 
}

window.showConfirmDialog = function(msg, callback) { 
    document.getElementById('confirmMessage').innerText = msg; currentConfirmAction = callback; document.getElementById('confirmModal').style.display = 'flex'; 
    document.getElementById('confirmYesBtn').onclick = function() { if(currentConfirmAction) currentConfirmAction(); window.closeConfirmModal(); }; 
}
window.closeConfirmModal = function() { document.getElementById('confirmModal').style.display = 'none'; currentConfirmAction = null; }
window.handleEnter = function(event) { if (event.key === "Enter") window.login(); }
window.formatAmount = function(input) { let val = input.value.trim(); if (!val) return; let num = parseFloat(val.replace(/[^0-9.-]+/g, "")); if (!isNaN(num) && num > 0 && num < 1000) input.value = (num * 1000).toString(); }
window.toggleOrderInput = function(btn) { let c = btn.parentElement, s = c.querySelector('.orderTypeSelect'), i = c.querySelector('.orderTypeCustomInput'); if(s.style.display !== 'none') { s.style.display = 'none'; i.style.display = 'block'; i.focus(); btn.innerHTML = '📋'; } else { i.style.display = 'none'; i.value = ''; s.style.display = 'block'; btn.innerHTML = '✍️'; } }

window.startSessionTracking = async function() { 
    try { const loginTimestamp = Date.now(); const docRef = await addDoc(collection(db, "user_sessions"), { username: loggedInUser, loginTime: loginTimestamp, lastActive: loginTimestamp, dateStr: new Date().toLocaleDateString('en-CA') }); currentSessionId = docRef.id; } catch(e) { console.error(e); } 
};
setInterval(async () => { if(currentSessionId) { try { await updateDoc(doc(db, "user_sessions", currentSessionId), { lastActive: Date.now() }); } catch(e){} } }, 60000);

// =========================================
// الدخول والتنقل
// =========================================
window.login = async function() {
    const user = document.getElementById("username").value.trim(), pass = document.getElementById("password").value.trim(), errorMsg = document.getElementById("login-error"), btn = document.getElementById("loginBtn");
    if(!user || !pass) return; let isManager = (user === ADMIN_USER && pass === ADMIN_PASS); btn.innerText = "جاري التحقق... ⏳"; btn.disabled = true;

    const completeLogin = () => {
        document.getElementById('globalUserBar').style.display = 'flex'; document.getElementById('globalUserName').innerText = '👤 ' + loggedInUser;
        window.listenToCloudOrders(); window.initGlobalChatListener(); window.startSessionTracking();
        window.showDashboard(); errorMsg.style.display = "none"; btn.innerText = "تسجيل الدخول"; btn.disabled = false;
        window.applyThemeMode(currentThemeMode);
    };

    try {
        if(window.loadSystemDataFromFirebase) {
            const cloudData = await window.loadSystemDataFromFirebase();
            additionalUsers = cloudData.users; configuredOrderTypes = cloudData.types; configuredPages = cloudData.pages;
            document.getElementById('feeBaghdadInput').value = feeBaghdad; document.getElementById('feeOtherInput').value = feeOther; window.updateOrderTypeSelects(); window.updatePagesDropdown();
        }
        if (isManager) { 
            loggedInUser = user; 
            loggedInUserCanDelete = true; loggedInUserCanEdit = true; loggedInUserCanSettings = true; loggedInUserCanReports = true;
            loggedInUserCanChat = true; loggedInUserCanAdd = true; loggedInUserCanFetchOld = true; loggedInUserCanImportExport = true;
            completeLogin(); return; 
        }
        const isNormalUser = additionalUsers.find(u => u.username === user && u.password === pass);
        if (isNormalUser) { 
            loggedInUser = user; 
            loggedInUserCanDelete = isNormalUser.canDeleteCloud || false; loggedInUserCanEdit = isNormalUser.canEditCloud || false; 
            loggedInUserCanSettings = isNormalUser.canAccessSettings || false; loggedInUserCanReports = isNormalUser.canAccessReports || false; 
            loggedInUserCanChat = isNormalUser.canAccessChat || false; loggedInUserCanAdd = isNormalUser.canAddOrders || false;
            loggedInUserCanFetchOld = isNormalUser.canFetchOld || false; loggedInUserCanImportExport = isNormalUser.canImportExport || false;
            completeLogin(); 
        } else { errorMsg.style.display = "block"; btn.innerText = "تسجيل الدخول"; btn.disabled = false; }
    } catch (err) { console.error(err); alert("خطأ بالاتصال"); btn.innerText = "تسجيل الدخول"; btn.disabled = false; }
}

window.showDashboard = function() { document.getElementById("login-section").style.display = "none"; document.getElementById("main-menu-section").style.display = "flex"; }
window.openDistribution = function() { 
    if(!loggedInUserCanAdd && loggedInUser !== ADMIN_USER) { alert("❌ ليس لديك صلاحية للدخول إلى إضافة الطلبات"); return; }
    document.getElementById("main-menu-section").style.display = "none"; 
    document.getElementById("dashboard-section").style.display = "block"; 
}

window.backToMainMenuFrom = function(sectionId) { document.getElementById(sectionId).style.display = "none"; document.getElementById("main-menu-section").style.display = "flex"; }
window.backToMainMenuFromChat = function() { currentChatId = null; window.backToMainMenuFrom('chat-section'); }

window.logout = function() { 
    window.showConfirmDialog("تأكيد تسجيل الخروج؟", function() { 
        currentSessionId = null; loggedInUser = ""; allCloudOrders = []; 
        loggedInUserCanDelete = false; loggedInUserCanEdit = false; loggedInUserCanSettings = false; loggedInUserCanReports = false;
        loggedInUserCanChat = false; loggedInUserCanAdd = false; loggedInUserCanFetchOld = false; loggedInUserCanImportExport = false;
        document.getElementById('globalUserBar').style.display = 'none'; document.getElementById("dashboard-section").style.display = "none"; 
        document.getElementById("archive-section").style.display = "none"; document.getElementById("reports-section").style.display = "none"; 
        document.getElementById("settings-section").style.display = "none"; document.getElementById("main-menu-section").style.display = "none"; 
        document.getElementById("chat-section").style.display = "none"; document.getElementById("login-section").style.display = "flex"; 
        window.clearForm(); 
    }); 
}

// =========================================
// بروفايل المستخدم
// =========================================
window.openProfile = function() {
    let currentUserData = additionalUsers.find(u => u.username === loggedInUser) || {};
    if(loggedInUser === ADMIN_USER) currentUserData = { username: ADMIN_USER, jobTitle: 'مدير عام', location: 'المقر الرئيسي', gender: 'ذكر', phone: '-' };

    document.getElementById('profileUsername').innerText = currentUserData.username || loggedInUser;
    document.getElementById('profileJob').innerText = currentUserData.jobTitle || 'موظف';
    document.getElementById('profileLocation').innerText = currentUserData.location || '-';
    document.getElementById('profileGender').innerText = currentUserData.gender || '-';
    document.getElementById('profilePhone').innerText = currentUserData.phone || '-';
    document.getElementById('profileAvatar').innerText = (currentUserData.gender === 'أنثى') ? '👩' : '👨';

    let permsHtml = [];
    if(loggedInUser === ADMIN_USER) { permsHtml.push('<span class="status-badge active" style="background:#eef2f9;">مدير نظام (كافة الصلاحيات)</span>'); } 
    else {
        if(loggedInUserCanDelete) permsHtml.push('<span class="status-badge active" style="background:#eef2f9;">مسح</span>');
        if(loggedInUserCanEdit) permsHtml.push('<span class="status-badge active" style="background:#eef2f9;">تعديل</span>');
        if(loggedInUserCanSettings) permsHtml.push('<span class="status-badge active" style="background:#eef2f9;">إعدادات</span>');
        if(loggedInUserCanReports) permsHtml.push('<span class="status-badge active" style="background:#eef2f9;">تقارير</span>');
        if(loggedInUserCanChat) permsHtml.push('<span class="status-badge active" style="background:#eef2f9;">الدردشة</span>');
        if(loggedInUserCanAdd) permsHtml.push('<span class="status-badge active" style="background:#eef2f9;">إضافة طلبات</span>');
        if(loggedInUserCanFetchOld) permsHtml.push('<span class="status-badge active" style="background:#eef2f9;">جلب الأرشيف</span>');
        if(loggedInUserCanImportExport) permsHtml.push('<span class="status-badge active" style="background:#eef2f9;">استيراد/تصدير</span>');
        if(permsHtml.length === 0) permsHtml.push('<span class="status-badge inactive" style="background:#eef2f9;">لا توجد صلاحيات إضافية</span>');
    }
    document.getElementById('profilePermissions').innerHTML = permsHtml.join('');
    document.getElementById('profileOrderCount').innerText = allCloudOrders.filter(o => o.addedBy === loggedInUser).length;
    document.getElementById('profileModal').style.display = 'flex';
}
window.closeProfile = function() { document.getElementById('profileModal').style.display = 'none'; }

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

window.extractValueSmart = function(txt, field) {
    const regexMap = { 'تسلسل': /(?:تسلسل الزبون|التسلسل|تسلسل)[\s:]*([^\n]+)/i, 'اسم': /(?:اسم الزبون|الاسم|اسم)[\s:]*([^\n]+)/i, 'هاتف1': /(?:رقم الهاتف الاول|هاتف 1|رقم الاول|رقم الموبايل)[\s:]*([0-9\s]+)/i, 'هاتف2': /(?:رقم الهاتف الثاني|هاتف 2|الرقم الثاني)[\s:]*([0-9\s]+)/i, 'محافظة': /(?:المحافظة|محافظة)[\s:]*([^\n]+)/i, 'منطقة': /(?:المنطقة|منطقة|العنوان|عنوان)[\s:]*([^\n]+)/i, 'مبلغ': /(?:المبلغ الكلي|المبلغ|السعر|الكلي)[\s:]*([^\n]+)/i, 'ملاحظة': /(?:ملاحظة مهمة|ملاحظات|ملاحظة)[\s:]*([^\n]+)/i, 'نوع': /(?:نوع الطلب|الطلب|الصنف)[\s:]*([^\n]+)/i, };
    let match = txt.match(regexMap[field]); return match ? match[1].replace(/🛑/g, '').trim() : "";
}

window.parseText = function() { 
    const txt = document.getElementById('pasteArea').value.trim(); if (!txt) return; 
    document.getElementById('custId').value = window.extractValueSmart(txt, 'تسلسل'); 
    document.getElementById('custName').value = window.extractValueSmart(txt, 'اسم'); 
    let p1 = window.extractValueSmart(txt, 'هاتف1'); document.getElementById('phone1').value = p1; 
    let p2 = window.extractValueSmart(txt, 'هاتف2'); document.getElementById('phone2').value = p2; 
    document.getElementById('gov').value = window.extractValueSmart(txt, 'محافظة'); 
    document.getElementById('area').value = window.extractValueSmart(txt, 'منطقة'); 
    document.getElementById('amount').value = window.extractValueSmart(txt, 'مبلغ'); 
    window.formatAmount(document.getElementById('amount')); 
    document.getElementById('note').value = window.extractValueSmart(txt, 'ملاحظة'); 
    window.checkCustomerHistory(p1, p2); 
    
    let extType = window.extractValueSmart(txt, 'نوع');
    let s = document.querySelector('.orderTypeSelect'), ci = document.querySelector('.orderTypeCustomInput'), tb = s.parentElement.querySelector('.toggle-custom-btn'); 
    if (extType && s) { 
        let matchedOpt = Array.from(s.options).find(o => o.value && (o.value.includes(extType) || extType.includes(o.value)));
        if (matchedOpt) { if(s.style.display === 'none') window.toggleOrderInput(tb); s.value = matchedOpt.value; } else { if(s.style.display !== 'none') window.toggleOrderInput(tb); ci.value = extType; } 
    } 
}

window.addOrderItemRow = function(tName = "", tQty = 1, tColor = "") { 
    const wr = document.getElementById('dynamicRowsWrapper'), r = document.createElement('div'); r.className = 'order-item-row'; 
    r.innerHTML = `<div style="display:flex; flex: 2; min-width: 140px; gap:5px;"><select class="orderTypeSelect" style="flex: 1;"></select><input type="text" class="orderTypeCustomInput" placeholder="يدوي..." style="display:none; flex: 1;"><button type="button" class="btn-outline toggle-custom-btn" onclick="window.toggleOrderInput(this)" style="padding: 0 10px;">✍️</button></div> <input type="text" class="orderColorInput" placeholder="اللون" style="flex: 1; min-width: 80px;" value="${tColor}"> <div class="qty-controls" style="flex: 1; min-width: 110px;"><button type="button" class="qty-btn" onclick="window.changeQty(this, 1)">+</button><input type="number" class="orderQtyInput" value="${tQty}" min="1" style="width: 40px; text-align: center; box-shadow:none; padding:5px;"><button type="button" class="qty-btn" onclick="window.changeQty(this, -1)">-</button><button type="button" class="btn-danger" style="padding: 5px; border-radius: 10px; width: 35px; height: 35px; min-width:unset;" onclick="this.closest('.order-item-row').remove()">❌</button></div>`; 
    wr.appendChild(r); window.updateOrderTypeSelects(); 
    let sel = r.querySelector('.orderTypeSelect'), ci = r.querySelector('.orderTypeCustomInput'), tb = r.querySelector('.toggle-custom-btn'); 
    if (tName) { if (Array.from(sel.options).some(o => o.value === tName)) { sel.value = tName; } else { window.toggleOrderInput(tb); ci.value = tName; } } 
}
window.changeQty = function(btn, d) { let i = btn.parentElement.querySelector('input[type="number"]'), v = parseInt(i.value)||1; v += d; if(v<1) v=1; i.value = v; }
window.clearForm = function() { ['custId','custName','phone1','phone2','gov','area','amount','note'].forEach(id => document.getElementById(id).value = ''); document.getElementById('dynamicRowsWrapper').innerHTML = ''; window.addOrderItemRow(); document.getElementById('customerHistoryAlert').className = 'hidden'; document.getElementById('customerHistoryAlert').style.display = 'none'; }
window.clearAll = function() { document.getElementById('pasteArea').value = ''; document.getElementById('constantField').value = ''; window.clearForm(); }

window.addToTable = async function() { 
    const pg = document.getElementById('constantField').value; if (!pg) { alert("يجب اختيار البيج!"); return; } 
    let arr = [], totQty = 0; 
    document.querySelectorAll('#itemsContainer .order-item-row').forEach(r => { 
        let s = r.querySelector('.orderTypeSelect'), ci = r.querySelector('.orderTypeCustomInput'), cv = r.querySelector('.orderColorInput').value.trim(); 
        let tv = (ci.style.display !== 'none') ? ci.value.trim() : s.value.trim(); let qv = parseInt(r.querySelector('.orderQtyInput').value) || 1; 
        if (tv !== "") { let ft = configuredOrderTypes.find(t => t.name === tv); let cd = ft ? ft.code : tv; let colorText = cv ? ` ${cv}` : ""; arr.push(`[${cd} (${qv})${colorText}]`); totQty += qv; } 
    }); 
    const data = { id: document.getElementById('custId').value, name: document.getElementById('custName').value, phone1: document.getElementById('phone1').value, phone2: document.getElementById('phone2').value, gov: document.getElementById('gov').value, area: document.getElementById('area').value, type: arr.join(' + '), qty: totQty, amount: document.getElementById('amount').value, constant: pg, note: document.getElementById('note').value, addedBy: loggedInUser, status: 'جديد' }; 
    if (!data.id && !data.name) return; 
    if (window.saveDataToFirebase) { document.getElementById("mainSaveBtn").disabled = true; await window.saveDataToFirebase(data); document.getElementById("mainSaveBtn").disabled = false; } 
    window.clearForm(); document.getElementById('pasteArea').value = ''; window.showSuccessToast("تمت إضافة الطلب! 🎉"); 
}

// =========================================
// الدردشة
// =========================================
let chatUnsubscribe = null;
window.initGlobalChatListener = function() {
    if(chatUnsubscribe) chatUnsubscribe();
    const q = query(collection(db, "chat_messages"), orderBy("timestamp", "desc"), limit(250));
    
    chatUnsubscribe = onSnapshot(q, (snapshot) => {
        let tempMsgs = []; snapshot.forEach(doc => tempMsgs.push({ id_doc: doc.id, ...doc.data() })); allChatMessages = tempMsgs.reverse();
        
        let unreadTotal = 0; let unreadPerChat = {};
        allChatMessages.forEach(msg => {
            if(msg.sender !== loggedInUser && (!msg.readBy || !msg.readBy.includes(loggedInUser))) {
                unreadTotal++; unreadPerChat[msg.chatId] = (unreadPerChat[msg.chatId] || 0) + 1;
            }
            if(msg.timestamp && ((Date.now() / 1000) - msg.timestamp.seconds) < 5) {
                if(msg.sender !== loggedInUser && (!msg.readBy || !msg.readBy.includes(loggedInUser))) { window.playAudioNotification(); window.showSuccessToast(`رسالة جديدة من ${msg.sender} 💬`); }
            }
        });
        const mainBadge = document.getElementById('chatBadge');
        if(unreadTotal > 0) { mainBadge.style.display = 'flex'; mainBadge.innerText = unreadTotal; } else { mainBadge.style.display = 'none'; }
        document.querySelectorAll('.chat-unread-badge').forEach(b => { let chatId = b.id.replace('badge_', ''); if(unreadPerChat[chatId]) { b.innerText = unreadPerChat[chatId]; b.style.display = 'inline-flex'; } else { b.style.display = 'none'; } });
        if(currentChatId) { window.renderCurrentChatMessages(); window.markChatAsRead(currentChatId); }
    }, (error) => console.error("Chat Listener Error:", error));
    if(loggedInUser === ADMIN_USER) { setTimeout(window.cleanupOldChats, 10000); }
}

window.cleanupOldChats = async function() {
    try { const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); const q = query(collection(db, "chat_messages"), where("timestamp", "<", sevenDaysAgo)); const snap = await getDocs(q); if(snap.size > 0) { snap.forEach(d => deleteDoc(doc(db, "chat_messages", d.id))); console.log(`تم تنظيف ${snap.size} رسالة قديمة من قاعدة البيانات.`); } } catch(e) { console.error("Error cleaning chats:", e); }
}

window.markChatAsRead = function(chatId) {
    let unreadMsgs = allChatMessages.filter(m => m.chatId === chatId && m.sender !== loggedInUser && (!m.readBy || !m.readBy.includes(loggedInUser)));
    unreadMsgs.forEach(async msg => { let newReadBy = msg.readBy || []; newReadBy.push(loggedInUser); try { await updateDoc(doc(db, "chat_messages", msg.id_doc), { readBy: newReadBy }); } catch(e){ console.error(e); } });
}

window.renderCurrentChatMessages = function() {
    const messagesArea = document.getElementById('chatMessages'); let msgs = allChatMessages.filter(m => m.chatId === currentChatId);
    messagesArea.innerHTML = '';
    if(msgs.length === 0) { messagesArea.innerHTML = '<div style="text-align:center; margin-top: 50px; color: var(--text-muted);">لا توجد رسائل بعد. ✍️</div>'; return; }
    msgs.forEach(data => {
        const isSent = (data.sender === loggedInUser);
        const timeStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleTimeString('ar-IQ', {hour: '2-digit', minute:'2-digit'}) : '';
        let readStatusHtml = '';
        if(isSent && data.readBy && data.readBy.length > 0) { let readers = data.readBy.filter(u => u !== loggedInUser); if(readers.length > 0) { readStatusHtml = `<div style="font-size: 10px; color: #2ecc71; margin-top: 2px;">👁️ قرئت بواسطة: ${readers.join('، ')}</div>`; } else { readStatusHtml = `<div style="font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 2px;">✓ تم الإرسال</div>`; } } else if (isSent) { readStatusHtml = `<div style="font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 2px;">✓ تم الإرسال</div>`; }
        const msgDiv = document.createElement('div'); msgDiv.className = `message ${isSent ? 'sent' : 'received'}`; msgDiv.innerHTML = `<div class="msg-sender">${isSent ? 'أنت' : data.sender}</div><div class="msg-bubble">${data.text}<span class="msg-time">${timeStr}</span>${readStatusHtml}</div>`; messagesArea.appendChild(msgDiv);
    });
    messagesArea.scrollTop = messagesArea.scrollHeight; 
}

window.openChatSection = async function() {
    if(!loggedInUserCanChat && loggedInUser !== ADMIN_USER) { alert("❌ ليس لديك صلاحية للدخول للدردشة"); return; }
    document.getElementById("main-menu-section").style.display = "none"; document.getElementById("chat-section").style.display = "flex";
    if(additionalUsers.length === 0 && window.loadSystemDataFromFirebase) { const cloudData = await window.loadSystemDataFromFirebase(); additionalUsers = cloudData.users || []; }
    allSystemUsersList = [ADMIN_USER, ...additionalUsers.map(u => u.username)];
    const privateUsers = allSystemUsersList.filter(u => u !== loggedInUser); 
    let unreadPerChat = {}; allChatMessages.forEach(msg => { if(msg.sender !== loggedInUser && (!msg.readBy || !msg.readBy.includes(loggedInUser))) { unreadPerChat[msg.chatId] = (unreadPerChat[msg.chatId] || 0) + 1; } });
    let privateHtml = ''; privateUsers.forEach(u => { const chatId = [loggedInUser, u].sort().join('_'); const unreadCount = unreadPerChat[chatId] || 0; const badgeStyle = unreadCount > 0 ? 'inline-flex' : 'none'; privateHtml += `<div class="chat-list-item" id="chatItem_${chatId}" onclick="window.openChat('${chatId}', '${u}')"><div class="chat-avatar">${u.charAt(0)}</div><div class="chat-info" style="width: 100%; display: flex; justify-content: space-between; align-items: center;"><h4>${u}</h4><span class="chat-unread-badge" id="badge_${chatId}" style="display:${badgeStyle};">${unreadCount}</span></div></div>`; });
    if(privateHtml === '') privateHtml = '<div style="text-align:center; padding: 20px; color: var(--text-muted); font-size:12px;">لا يوجد مستخدمين آخرين</div>'; document.getElementById('chatListPrivate').innerHTML = privateHtml;
    window.loadChatGroups(); window.switchChatTab('general'); window.openChat('general', 'الدردشة العامة');
}

window.switchChatTab = function(tab) { document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active')); document.getElementById('chatListGeneral').style.display = 'none'; document.getElementById('chatListPrivate').style.display = 'none'; document.getElementById('chatListGroups').style.display = 'none'; if(tab === 'general') { document.getElementById('tabGeneral').classList.add('active'); document.getElementById('chatListGeneral').style.display = 'block'; } else if(tab === 'private') { document.getElementById('tabPrivate').classList.add('active'); document.getElementById('chatListPrivate').style.display = 'block'; } else if(tab === 'groups') { document.getElementById('tabGroups').classList.add('active'); document.getElementById('chatListGroups').style.display = 'block'; } }
window.openChat = function(chatId, title) { currentChatId = chatId; document.getElementById('currentChatTitle').innerText = title; document.querySelectorAll('.chat-list-item').forEach(el => el.classList.remove('active')); const activeItem = document.getElementById(`chatItem_${chatId}`); if(activeItem) activeItem.classList.add('active'); if(window.innerWidth <= 768) { document.getElementById('chatSidebar').classList.add('hidden'); } window.renderCurrentChatMessages(); window.markChatAsRead(currentChatId); }
window.sendMessage = async function() { const input = document.getElementById('chatInput'); const text = input.value.trim(); if(text === '' || !currentChatId) return; input.value = ''; try { await addDoc(collection(db, "chat_messages"), { chatId: currentChatId, sender: loggedInUser, text: text, timestamp: serverTimestamp(), readBy: [] }); } catch(e) { console.error(e); window.showSuccessToast("فشل إرسال الرسالة."); } }
window.showChatSidebar = function() { document.getElementById('chatSidebar').classList.remove('hidden'); }
window.showCreateGroupModal = function() { document.getElementById('newGroupName').value = ''; const container = document.getElementById('groupMembersSelection'); container.innerHTML = ''; const otherUsers = allSystemUsersList.filter(u => u !== loggedInUser); otherUsers.forEach(u => { container.innerHTML += `<label class="permission-badge" style="justify-content: flex-start;"><input type="checkbox" class="group-member-cb" value="${u}"> ${u}</label>`; }); document.getElementById('createGroupModal').style.display = 'flex'; }
window.closeCreateGroupModal = function() { document.getElementById('createGroupModal').style.display = 'none'; }
window.createChatGroup = async function() { const groupName = document.getElementById('newGroupName').value.trim(); if(!groupName) { alert("يرجى إدخال اسم المجموعة"); return; } let members = [loggedInUser]; document.querySelectorAll('.group-member-cb:checked').forEach(cb => members.push(cb.value)); try { await addDoc(collection(db, "chat_groups"), { name: groupName, createdBy: loggedInUser, members: members, timestamp: serverTimestamp() }); window.showSuccessToast("تم إنشاء المجموعة!"); window.closeCreateGroupModal(); window.loadChatGroups(); } catch(e) { console.error(e); } }
window.loadChatGroups = async function() { try { const snap = await getDocs(query(collection(db, "chat_groups"))); let groupsHtml = ''; let unreadPerChat = {}; allChatMessages.forEach(msg => { if(msg.sender !== loggedInUser && (!msg.readBy || !msg.readBy.includes(loggedInUser))) { unreadPerChat[msg.chatId] = (unreadPerChat[msg.chatId] || 0) + 1; } }); snap.forEach(doc => { const data = doc.data(); if((data.members && data.members.includes(loggedInUser)) || loggedInUser === ADMIN_USER) { const chatId = 'group_' + doc.id; const unreadCount = unreadPerChat[chatId] || 0; const badgeStyle = unreadCount > 0 ? 'inline-flex' : 'none'; groupsHtml += `<div class="chat-list-item" id="chatItem_${chatId}" onclick="window.openChat('${chatId}', '${data.name}')"><div class="chat-avatar" style="background: linear-gradient(135deg, #00b09b, #96c93d);">👥</div><div class="chat-info" style="width: 100%; display: flex; justify-content: space-between; align-items: center;"><div><h4>${data.name}</h4><p>${data.members.length} أعضاء</p></div><span class="chat-unread-badge" id="badge_${chatId}" style="display:${badgeStyle};">${unreadCount}</span></div></div>`; } }); if(groupsHtml === '') groupsHtml = '<div style="text-align:center; padding: 20px; color: var(--text-muted); font-size:12px;">لا توجد مجموعات بعد</div>'; document.getElementById('groupsListContainer').innerHTML = groupsHtml; } catch(e) { console.error(e); } }

// =========================================
// الأرشيف والمتابعة
// =========================================
window.openCloudOrders = function() { 
    document.getElementById("main-menu-section").style.display = "none";
    document.getElementById("archive-section").style.display = "flex";
    document.getElementById('bulkDeleteBtn').style.display = loggedInUserCanDelete || loggedInUser === ADMIN_USER ? 'inline-flex' : 'none'; 
    document.getElementById('bulkEditBtn').style.display = loggedInUserCanEdit || loggedInUser === ADMIN_USER ? 'inline-flex' : 'none'; 
    document.getElementById('btn-fetch-old').style.display = loggedInUserCanFetchOld || loggedInUser === ADMIN_USER ? 'flex' : 'none';
    document.getElementById('btn-group-import-export').style.display = loggedInUserCanImportExport || loggedInUser === ADMIN_USER ? 'flex' : 'none';
    window.filterCloudOrders(); 
}

window.openArchiveFetchModal = function() { document.getElementById('archiveFetchModal').style.display = 'flex'; }
window.closeArchiveFetchModal = function() { document.getElementById('archiveFetchModal').style.display = 'none'; }
window.toggleAllOrders = function(source) { document.querySelectorAll('.order-cb').forEach(cb => cb.checked = source.checked); }

window.updateSingleOrderStatus = async function(docId, newStatus) {
    if(window.updateOrderInFirebase) { try { await window.updateOrderInFirebase(docId, { status: newStatus }); window.showSuccessToast(`تم تغيير الحالة إلى ${newStatus}`); } catch(e) { console.error(e); alert("حدث خطأ."); } }
}

window.fetchOldOrders = async function() {
    const f = document.getElementById('oldOrdersFrom').value;
    const t = document.getElementById('oldOrdersTo').value;
    if(!f || !t) { alert("الرجاء تحديد التاريخ من وإلى لجلب الأرشيف"); return; }
    
    if(cloudOrdersUnsubscribe) { cloudOrdersUnsubscribe(); cloudOrdersUnsubscribe = null; }
    
    const fromD = new Date(f); fromD.setHours(0,0,0,0);
    const toD = new Date(t); toD.setHours(23,59,59,999);
    
    document.body.style.cursor = 'wait';
    try {
        const q = query(collection(db, "orders"), where("timestamp", ">=", fromD), where("timestamp", "<=", toD));
        const snap = await getDocs(q);
        allCloudOrders = []; snap.forEach(doc => { allCloudOrders.push({ id_doc: doc.id, ...doc.data() }); });
        window.filterCloudOrders(); window.closeArchiveFetchModal(); window.showSuccessToast(`تم جلب ${snap.size} طلب من الأرشيف بنجاح!`);
    } catch(e) { console.error("Error fetching old orders:", e); alert("حدث خطأ في جلب البيانات، تأكد من الاتصال."); }
    document.body.style.cursor = 'default';
}

window.reloadCurrentMonth = function() { window.listenToCloudOrders(); window.closeArchiveFetchModal(); window.showSuccessToast("تم العودة لطلبات الشهر الحالي 📅"); }

window.filterCloudOrders = function() {
    const qt = document.getElementById('cloudSearchInput').value.toLowerCase(), pF = document.getElementById('cloudPageFilter').value, sF = document.getElementById('cloudStatusFilter').value;
    const fDate = document.getElementById('archiveFilterFrom').value;
    const tDate = document.getElementById('archiveFilterTo').value;

    let fromDate = fDate ? new Date(fDate) : null; if(fromDate) fromDate.setHours(0,0,0,0);
    let toDate = tDate ? new Date(tDate) : null; if(toDate) toDate.setHours(23,59,59,999);

    const tb = document.getElementById('cloudOrdersTbody'); 
    tb.innerHTML = ''; document.getElementById('selectAllCb').checked = false; 
    
    let sortedOrders = [...allCloudOrders].sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    
    let filtered = sortedOrders.filter(o => {
        let matchText = ((o.name||"").toLowerCase().includes(qt) || (o.phone1||"").includes(qt) || (o.id||"").includes(qt)) && (pF === "" || (o.constant||"") === pF) && (sF === "" || (o.status||"جديد") === sF);
        let matchDate = true;
        if(fromDate || toDate) {
            if(!o.timestamp?.seconds) { matchDate = false; } else {
                const d = new Date(o.timestamp.seconds * 1000);
                if(fromDate && d < fromDate) matchDate = false;
                if(toDate && d > toDate) matchDate = false;
            }
        }
        return matchText && matchDate;
    });
    
    filtered.forEach(o => {
        const tr = document.createElement('tr');
        const dateStr = o.timestamp ? new Date(o.timestamp.seconds * 1000).toLocaleDateString('ar-IQ') : '-';
        let st = o.status || 'جديد'; let statusColor = '#407bff';
        if(st === 'قيد التجهيز') statusColor = '#f39c12'; if(st === 'مسلم للمندوب') statusColor = '#8e44ad'; if(st === 'تم التوصيل') statusColor = '#2ecc71'; if(st === 'راجع') statusColor = '#e74c3c';

        let statusSelectHtml = `<select onchange="window.updateSingleOrderStatus('${o.id_doc}', this.value)" style="background:${statusColor}; color:white; border:none; padding: 5px; border-radius: 10px; font-size:11px; font-weight:bold; outline:none; appearance:auto; box-shadow:none; min-width:100px;">
            <option value="جديد" ${st==='جديد'?'selected':''}>جديد 🆕</option><option value="قيد التجهيز" ${st==='قيد التجهيز'?'selected':''}>قيد التجهيز ⏳</option><option value="مسلم للمندوب" ${st==='مسلم للمندوب'?'selected':''}>مسلم للمندوب 🛵</option><option value="تم التوصيل" ${st==='تم التوصيل'?'selected':''}>تم التوصيل ✅</option><option value="راجع" ${st==='راجع'?'selected':''}>راجع ⛔</option>
        </select>`;

        tr.innerHTML = `<td style="text-align: center;"><input type="checkbox" class="order-cb" value="${o.id_doc}" style="width: 18px; height: 18px; box-shadow:none; padding:0; cursor:pointer;"></td>
            <td>${o.id||'-'}</td><td>${statusSelectHtml}</td><td style="color:var(--primary-blue); font-weight:bold;">${o.constant||'-'}</td> 
            <td>${o.name||'-'}</td><td style="font-size:12px;">${getWaLink(o.phone1)}</td><td style="font-size:12px;">${o.gov||'-'}</td>
            <td style="color:var(--primary-blue); font-size:12px;">${o.type||'-'}</td><td>${o.amount||'-'}</td> 
            <td style="font-size:12px; font-weight:bold;">${o.addedBy||'-'}</td><td style="font-size:12px; color:var(--text-muted);">${dateStr}</td>`;
        tb.appendChild(tr);
    });
}

// تعديل الطلب المحدد من الأزرار العلوية
window.bulkEditOrder = function() {
    let selectedIds = Array.from(document.querySelectorAll('.order-cb:checked')).map(cb => cb.value);
    if(selectedIds.length === 0) { alert("يرجى تحديد طلب لتعديله!"); return; }
    if(selectedIds.length > 1) { alert("يرجى تحديد طلب واحد فقط للتعديل!"); return; }
    window.openEditModal(selectedIds[0]);
}

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

window.bulkDeleteOrders = function() {
    let selectedIds = Array.from(document.querySelectorAll('.order-cb:checked')).map(cb => cb.value);
    if(selectedIds.length === 0) { alert("يرجى تحديد طلبات لحذفها!"); return; }
    window.showConfirmDialog(`هل أنت متأكد من حذف ${selectedIds.length} طلب بشكل نهائي؟`, async function() {
        document.body.style.cursor = 'wait';
        for(let id of selectedIds) { if(window.deleteOrderFromFirebase) await window.deleteOrderFromFirebase(id); allCloudOrders = allCloudOrders.filter(o => o.id_doc !== id); }
        document.body.style.cursor = 'default'; window.filterCloudOrders(); window.showSuccessToast(`تم حذف ${selectedIds.length} طلب بنجاح! 🗑️`);
    });
}

window.showBulkStatusModal = function() { let selectedIds = Array.from(document.querySelectorAll('.order-cb:checked')).map(cb => cb.value); if(selectedIds.length === 0) { alert("يرجى تحديد طلبات لتغيير حالتها!"); return; } document.getElementById('bulkStatusModal').style.display = 'flex'; }
window.closeBulkStatusModal = function() { document.getElementById('bulkStatusModal').style.display = 'none'; }
window.saveBulkStatus = async function() {
    let selectedIds = Array.from(document.querySelectorAll('.order-cb:checked')).map(cb => cb.value); let newStatus = document.getElementById('bulkStatusSelect').value; document.body.style.cursor = 'wait';
    for(let id of selectedIds) { if(window.updateOrderInFirebase) await window.updateOrderInFirebase(id, { status: newStatus }); }
    document.body.style.cursor = 'default'; window.closeBulkStatusModal(); window.showSuccessToast(`تم تغيير حالة ${selectedIds.length} طلب إلى (${newStatus}) بنجاح!`);
}

window.downloadExcelTemplate = function() { const ws = XLSX.utils.aoa_to_sheet([["تسلسل الزبون", "البيج", "اسم الزبون", "رقم الهاتف الأول", "رقم الهاتف الثاني", "المحافظة", "المنطقة", "الطلب", "العدد", "المبلغ الكلي", "ملاحظات"]]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "النموذج"); XLSX.writeFile(wb, "نموذج_رفع_الطلبات.xlsx"); }
window.uploadExcelFile = function(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async function(e) { const workbook = XLSX.read(new Uint8Array(e.target.result), {type: 'array'}); const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]); if(json.length === 0) return; if(!confirm(`سيتم رفع ${json.length} طلب؟`)) return; let sc = 0; document.body.style.cursor = 'wait'; for(let row of json) { const data = { id: (row["تسلسل الزبون"]||'').toString(), constant: (row["البيج"]||'').toString(), name: (row["اسم الزبون"]||'').toString(), phone1: (row["رقم الهاتف الأول"]||'').toString(), phone2: (row["رقم الهاتف الثاني"]||'').toString(), gov: (row["المحافظة"]||'').toString(), area: (row["المنطقة"]||'').toString(), type: (row["الطلب"]||'').toString(), qty: parseInt(row["العدد"])||1, amount: (row["المبلغ الكلي"]||'').toString(), note: (row["ملاحظات"]||'').toString(), addedBy: loggedInUser, status: 'جديد' }; if(data.constant && data.name) { if(await window.saveDataToFirebase(data)) sc++; } } document.body.style.cursor = 'default'; event.target.value = ''; window.showSuccessToast(`تم الرفع! (${sc})`); }; reader.readAsArrayBuffer(file); }

// =========================================
// تعديل الطلبات
// =========================================
window.addEditOrderItemRow = function(tName = "", tQty = 1, tColor = "") { 
    const wr = document.getElementById('editDynamicRowsWrapper');
    const r = document.createElement('div'); r.className = 'order-item-row'; 
    r.innerHTML = `<div style="display:flex; flex: 2; min-width: 140px; gap:5px;"><select class="orderTypeSelect" style="flex: 1;"></select><input type="text" class="orderTypeCustomInput" placeholder="يدوي..." style="display:none; flex: 1;"><button type="button" class="btn-outline toggle-custom-btn" onclick="window.toggleOrderInput(this)" style="padding: 0 10px;">✍️</button></div> <input type="text" class="orderColorInput" placeholder="اللون" style="flex: 1; min-width: 80px;" value="${tColor}"> <div class="qty-controls" style="flex: 1; min-width: 110px;"><button type="button" class="qty-btn" onclick="window.changeQty(this, 1)">+</button><input type="number" class="orderQtyInput" value="${tQty}" min="1" style="width: 40px; text-align: center; box-shadow:none; padding:5px;"><button type="button" class="qty-btn" onclick="window.changeQty(this, -1)">-</button><button type="button" class="btn-danger" style="padding: 5px; border-radius: 10px; width: 35px; height: 35px; min-width:unset;" onclick="this.closest('.order-item-row').remove()">❌</button></div>`; 
    wr.appendChild(r); window.updateOrderTypeSelects(); 
    let sel = r.querySelector('.orderTypeSelect'), ci = r.querySelector('.orderTypeCustomInput'), tb = r.querySelector('.toggle-custom-btn'); 
    if (tName) { if (Array.from(sel.options).some(o => o.value === tName)) { sel.value = tName; } else { window.toggleOrderInput(tb); ci.value = tName; } } 
}

window.openEditModal = function(docId) { 
    let order = allCloudOrders.find(o => o.id_doc === docId); if(!order) return; 
    currentEditDocId = docId; 
    document.getElementById('editStatus').value = order.status || 'جديد'; 
    document.getElementById('editConstant').value = order.constant || ''; 
    document.getElementById('editName').value = order.name || ''; 
    document.getElementById('editPhone1').value = order.phone1 || ''; 
    document.getElementById('editPhone2').value = order.phone2 || ''; 
    document.getElementById('editGov').value = order.gov || ''; 
    document.getElementById('editArea').value = order.area || ''; 
    document.getElementById('editAmount').value = order.amount || ''; 
    document.getElementById('editDynamicRowsWrapper').innerHTML = ''; 
    let items = order.type ? order.type.split(' + ') : []; 
    if(items.length === 0) { window.addEditOrderItemRow(); } 
    else { items.forEach(itemStr => { let match = itemStr.match(/\[([^)]+)\s\((\d+)\)\s*([^\]]*)\]/); if(match) { let code = match[1].trim(), qty = parseInt(match[2]) || 1, color = match[3] ? match[3].trim() : ""; let typeObj = configuredOrderTypes.find(t => t.code === code); window.addEditOrderItemRow(typeObj ? typeObj.name : code, qty, color); } else { window.addEditOrderItemRow(itemStr.replace(/\[\vert{}\]/g, ''), 1, ""); } }); } 
    document.getElementById('editOrderModal').style.display = 'flex'; 
}

window.closeEditModal = function() { document.getElementById('editOrderModal').style.display = 'none'; currentEditDocId = null; }

window.saveEditedOrder = async function() { 
    if(!currentEditDocId) return; 
    let arr = [], totQty = 0; 
    document.querySelectorAll('#editDynamicRowsWrapper .order-item-row').forEach(r => { let s = r.querySelector('.orderTypeSelect'), ci = r.querySelector('.orderTypeCustomInput'), cv = r.querySelector('.orderColorInput').value.trim(); let tv = (ci.style.display !== 'none') ? ci.value.trim() : s.value.trim(); let qv = parseInt(r.querySelector('.orderQtyInput').value) || 1; if (tv !== "") { let ft = configuredOrderTypes.find(t => t.name === tv), cd = ft ? ft.code : tv, colorText = cv ? ` ${cv}` : ""; arr.push(`[${cd} (${qv})${colorText}]`); totQty += qv; } }); 
    const newData = { status: document.getElementById('editStatus').value, constant: document.getElementById('editConstant').value, name: document.getElementById('editName').value, phone1: document.getElementById('editPhone1').value, phone2: document.getElementById('editPhone2').value, gov: document.getElementById('editGov').value, area: document.getElementById('editArea').value, type: arr.join(' + '), qty: totQty, amount: document.getElementById('editAmount').value }; 
    if(window.updateOrderInFirebase) { try { await window.updateOrderInFirebase(currentEditDocId, newData); window.closeEditModal(); window.showSuccessToast("تم التحديث! ✏️"); } catch(e) { console.error(e); alert("خطأ."); } } 
}

// =========================================
// التقارير
// =========================================
window.openReports = async function() { 
    if (!loggedInUserCanReports && loggedInUser !== ADMIN_USER) { alert("❌ ليس لديك صلاحية."); return; } 
    document.getElementById("main-menu-section").style.display = "none";
    document.getElementById("reports-section").style.display = "flex";
    
    let pagesHtml = '<option value="all">-- كل البيجات --</option>' + configuredPages.map(p => `<option value="${p.name}">${p.name}</option>`).join(''); 
    document.getElementById('repPageFilter').innerHTML = pagesHtml; document.getElementById('repFinPageFilter').innerHTML = pagesHtml; document.getElementById('repChartsPageFilter').innerHTML = pagesHtml;
    let typesHtml = '<option value="all">-- كل الطلبات --</option>' + configuredOrderTypes.map(t => `<option value="${t.code}">${t.name} (${t.code})</option>`).join(''); 
    document.getElementById('repTypeFilter').innerHTML = typesHtml; document.getElementById('repPageTypeFilter').innerHTML = typesHtml; 
    
    let empHtml = '<option value="">-- اختر الموظف --</option>';
    let allEmpNames = [ADMIN_USER, ...additionalUsers.map(u => u.username)];
    allEmpNames.forEach(name => { empHtml += `<option value="${name}">${name}</option>`; });
    document.getElementById('repEmpSelect').innerHTML = empHtml;

    window.generateReports(); 
}

window.switchReportTab = function(tabId, btn) { 
    document.querySelectorAll('#reports-section .tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('#reports-section .tab-pane').forEach(p => p.classList.remove('active')); btn.classList.add('active'); document.getElementById(tabId).classList.add('active'); if (tabId === 'repChartsTab') { window.generateReports(); }
}

window.generateReports = function() { 
    if(allCloudOrders.length === 0) return; 
    const fromVal = document.getElementById('repDateFrom').value, toVal = document.getElementById('repDateTo').value; 
    let fromDate = fromVal ? new Date(fromVal) : null; if(fromDate) fromDate.setHours(0,0,0,0); 
    let toDate = toVal ? new Date(toVal) : null; if(toDate) toDate.setHours(23,59,59,999); 
    let targetOrders = allCloudOrders.filter(o => { if(fromDate || toDate) { if(!o.timestamp?.seconds) return false; const d = new Date(o.timestamp.seconds * 1000); if(fromDate && d < fromDate) return false; if(toDate && d > toDate) return false; } return true; }); 

    const selPage = document.getElementById('repPageFilter').value, selPageType = document.getElementById('repPageTypeFilter').value; let pageTargetOrders = targetOrders; if(selPage !== "all") pageTargetOrders = pageTargetOrders.filter(o => o.constant === selPage); if(selPageType !== "all") pageTargetOrders = pageTargetOrders.filter(o => o.type && o.type.includes(`[${selPageType}`)); let totalPageQty = 0, totalPageAmt = 0, pageTbodyHtml = ""; if (pageTargetOrders.length === 0) { pageTbodyHtml = '<tr><td colspan="3" style="text-align:center;">لا توجد بيانات</td></tr>'; } else { pageTargetOrders.forEach(o => { let amt = parseFloat((o.amount || "0").toString().replace(/[^0-9.-]+/g,"")) || 0, qty = parseInt(o.qty) || 1; totalPageQty += qty; totalPageAmt += amt; let safeType = (o.type || "").split(' + ').map(item => `<span dir="ltr" style="display: inline-block; padding: 0 5px;">${item}</span>`).join(' + '); pageTbodyHtml += `<tr><td style="font-size: 13px; text-align: center;">${safeType}</td><td>${qty}</td><td>${amt.toLocaleString()}</td></tr>`; }); } document.getElementById('repPageTbody').innerHTML = pageTbodyHtml; document.getElementById('totalPageQty').innerText = totalPageQty; document.getElementById('totalPageAmount').innerText = totalPageAmt.toLocaleString(); 

    const selType = document.getElementById('repTypeFilter').value; let typeStats = {}; targetOrders.forEach(o => { if(o.type && o.status === 'تم التوصيل') { o.type.split('+').forEach(item => { let match = item.match(/\[(.*?)\s\((\d+)\)/); if(match) { let code = match[1].trim(), qty = parseInt(match[2]) || 1; typeStats[code] = (typeStats[code] || 0) + qty; } }); } }); let typeCardsHtml = "", filteredTypes = Object.entries(typeStats); if(selType !== "all") filteredTypes = filteredTypes.filter(([tCode]) => tCode === selType); if(filteredTypes.length === 0) { typeCardsHtml = '<div style="width:100%; text-align:center; color:#ccc;">لا توجد طلبات مكتملة</div>'; } else { filteredTypes.forEach(([tCode, tQty]) => { let tNameObj = configuredOrderTypes.find(t => t.code === tCode); typeCardsHtml += `<div class="report-card"><h4>${tNameObj ? tNameObj.name : tCode} (${tCode})</h4><div class="val">${tQty}</div></div>`; }); } document.getElementById('repTypeCardsContainer').innerHTML = typeCardsHtml; 

    const selFinPage = document.getElementById('repFinPageFilter').value; let finTargetOrders = targetOrders.filter(o => o.status === 'تم التوصيل'); if(selFinPage !== "all") finTargetOrders = finTargetOrders.filter(o => o.constant === selFinPage); let finCount = finTargetOrders.length, finQty = 0, finGross = 0, finDelivery = 0; finTargetOrders.forEach(o => { let amt = parseFloat((o.amount || "0").toString().replace(/[^0-9.-]+/g,"")) || 0; finQty += parseInt(o.qty) || 1; finGross += amt; finDelivery += (o.gov || "").includes("بغداد") ? feeBaghdad : feeOther; }); document.getElementById('finCount').innerText = finCount; document.getElementById('finQty').innerText = finQty; document.getElementById('finGross').innerText = finGross.toLocaleString(); document.getElementById('finDelivery').innerText = finDelivery.toLocaleString(); document.getElementById('finNet').innerText = (finGross - finDelivery).toLocaleString(); 

    if(window.renderCharts) { let chartsSelPage = document.getElementById('repChartsPageFilter').value; let chartsTargetOrders = targetOrders; if(chartsSelPage && chartsSelPage !== "all") { chartsTargetOrders = chartsTargetOrders.filter(o => o.constant === chartsSelPage); } window.renderCharts(chartsTargetOrders); }
    
    if(document.getElementById('repEmpTab') && document.getElementById('repEmpTab').classList.contains('active')) {
        window.generateEmployeeReport();
    }
}

window.renderCharts = function(orders) {
    let completed = orders.filter(o => o.status === 'تم التوصيل'); let pageRevenues = {};
    completed.forEach(o => { let net = (parseFloat((o.amount||"0").toString().replace(/[^0-9.-]+/g,"")) || 0) - ((o.gov || "").includes("بغداد") ? feeBaghdad : feeOther); let pageName = o.constant ? o.constant : "غير محدد"; pageRevenues[pageName] = (pageRevenues[pageName] || 0) + net; });
    if(financialChartInstance) financialChartInstance.destroy(); let fcCanvas = document.getElementById('financialChart');
    if(fcCanvas) { financialChartInstance = new Chart(fcCanvas, { type: 'bar', data: { labels: Object.keys(pageRevenues), datasets: [{ label: 'الصافي (دينار)', data: Object.values(pageRevenues), backgroundColor: '#407bff', borderRadius: 5, maxBarThickness: 60 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }); }
    let itemStats = {}; completed.forEach(o => { if(o.type) { o.type.split('+').forEach(item => { let m = item.match(/\[(.*?)\s\((\d+)\)/); if(m) { itemStats[m[1].trim()] = (itemStats[m[1].trim()] || 0) + parseInt(m[2]); } }); } }); let topItems = Object.entries(itemStats).sort((a,b)=>b[1]-a[1]).slice(0,5);
    if(itemsPieChartInstance) itemsPieChartInstance.destroy(); let pcCanvas = document.getElementById('itemsPieChart');
    if(pcCanvas) { itemsPieChartInstance = new Chart(pcCanvas, { type: 'doughnut', data: { labels: topItems.map(i=>i[0]), datasets: [{ data: topItems.map(i=>i[1]), backgroundColor: ['#ffd700','#407bff','#2ecc71','#e74c3c','#9b59b6'] }] }, options: { responsive: true, maintainAspectRatio: false } }); }
}

window.exportPageReportPDF = function() { const pageName = document.getElementById('repPageFilter').value, typeName = document.getElementById('repPageTypeFilter').value, tempDiv = document.createElement('div'); tempDiv.style.padding = '30px'; tempDiv.style.background = '#ffffff'; tempDiv.style.color = '#000000'; tempDiv.style.direction = 'rtl'; tempDiv.style.fontFamily = 'Arial, sans-serif'; let titleStr = 'تقرير المبيعات - ' + (pageName === 'all' ? 'جميع البيجات' : pageName); if(typeName !== 'all') titleStr += ' | صنف: ' + typeName; const title = document.createElement('h2'); title.innerText = titleStr; title.style.textAlign = 'center'; title.style.marginBottom = '25px'; tempDiv.appendChild(title); const tableClone = document.getElementById('pageReportTable').cloneNode(true); tableClone.style.width = '100%'; tableClone.style.borderCollapse = 'collapse'; tableClone.querySelectorAll('th, td').forEach(cell => { cell.style.border = '1px solid #ccc'; cell.style.padding = '12px'; cell.style.textAlign = 'center'; cell.style.color = '#000'; cell.style.background = '#fff';}); tempDiv.appendChild(tableClone); document.body.appendChild(tempDiv); const opt = { margin: 10, filename: `تقرير_المبيعات.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }; html2pdf().set(opt).from(tempDiv).save().then(() => { document.body.removeChild(tempDiv); }); }

window.exportCloudToExcel = function() { const qt = document.getElementById('cloudSearchInput').value.toLowerCase(), pF = document.getElementById('cloudPageFilter').value, sF = document.getElementById('cloudStatusFilter').value; let f = allCloudOrders.filter(o => ((o.name||"").toLowerCase().includes(qt) || (o.phone1||"").includes(qt)) && (pF === "" || (o.constant||"") === pF) && (sF === "" || (o.status||"جديد") === sF)); if(f.length === 0) return; let exp = f.map((o, i) => { const amt = parseFloat((o.amount || "0").toString().replace(/[^0-9.-]+/g,"")) || 0, del = (o.gov || "").includes("بغداد") ? feeBaghdad : feeOther; return { "ت": i+1, "البيج": o.constant||"", "حالة الطلب": o.status||"جديد", "اسم الزبون": o.name||"", "الهاتف": o.phone1, "العنوان": o.gov||"", "العدد": parseInt(o.qty)||1, "الكلي": amt, "التوصيل": del, "الصافي": amt-del, "ملاحظات": o.note||"" }; }); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exp), "السحابة"); XLSX.writeFile(wb, "أرشيف_السحابة.xlsx"); }

// =========================================
// الإعدادات وإدارة النظام
// =========================================
window.openSettings = function() { 
    if (!loggedInUserCanSettings && loggedInUser !== ADMIN_USER) { alert("❌ ليس لديك صلاحية."); return; }
    document.getElementById("main-menu-section").style.display = "none";
    document.getElementById("settings-section").style.display = "flex";
    
    document.getElementById('settingsAuthSection').style.display = 'none'; 
    document.getElementById('settingsManagerSection').style.display = 'block'; 
    window.renderPagesSettings(); window.renderOrderTypesSettings(); window.renderUsers(); 
}

window.verifySettingsPass = function() { 
    if (document.getElementById('settingsPass').value === ADMIN_PASS) { 
        document.getElementById('settingsAuthSection').style.display = 'none'; 
        document.getElementById('settingsManagerSection').style.display = 'block'; 
        window.renderPagesSettings(); window.renderOrderTypesSettings(); window.renderUsers(); 
    } else { document.getElementById('settings-error').style.display = 'block'; } 
}
window.switchTab = function(tabId, btn) { document.querySelectorAll('#settings-section .tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('#settings-section .tab-pane').forEach(p => p.classList.remove('active')); btn.classList.add('active'); document.getElementById(tabId).classList.add('active'); }
window.addPageType = async function() { const val = document.getElementById('newPageName').value.trim(); if(val && window.addSystemPageToFirebase) { const r = await window.addSystemPageToFirebase({name: val}); configuredPages.push({id: r.id, name: val}); window.renderPagesSettings(); window.updatePagesDropdown(); } }
window.deletePageType = async function(idx) { window.showConfirmDialog("حذف البيج؟", async function() { await window.deleteSystemPageFromFirebase(configuredPages[idx].id); configuredPages.splice(idx, 1); window.renderPagesSettings(); window.updatePagesDropdown(); }); }
window.renderPagesSettings = function() { document.getElementById("pagesListDisplay").innerHTML = configuredPages.map((p, i) => `<li class="settings-list-item"><span class="item-text">${p.name}</span><button class="btn-danger" onclick="window.deletePageType(${i})">حذف</button></li>`).join(''); }
window.updatePagesDropdown = function() { const s1 = document.getElementById('constantField'), s2 = document.getElementById('cloudPageFilter'), s3 = document.getElementById('repPageFilter'), s4 = document.getElementById('repFinPageFilter'), s5 = document.getElementById('repChartsPageFilter'); let h1 = '<option value="">-- اختر البيج --</option>' + configuredPages.map(p => `<option value="${p.name}">${p.name}</option>`).join(''), h2 = '<option value="">-- كل البيجات --</option>' + configuredPages.map(p => `<option value="${p.name}">${p.name}</option>`).join(''); if(s1) s1.innerHTML = h1; if(s2) s2.innerHTML = h2; if(s3) s3.innerHTML = h2; if(s4) s4.innerHTML = h2; if(s5) s5.innerHTML = h2; }

// =========================================
// إدارة الطلبات (الديكورات)
// =========================================
window.toggleOrderTypeSection = function(sec) {
    document.getElementById('add-ordertype-sec').style.display = (sec === 'add') ? 'block' : 'none';
    document.getElementById('list-ordertype-sec').style.display = (sec === 'list') ? 'block' : 'none';
    
    document.getElementById('btn-sec-type-list').style.background = (sec === 'list') ? 'var(--button-gradient)' : 'transparent';
    document.getElementById('btn-sec-type-list').style.color = (sec === 'list') ? 'white' : 'var(--text-muted)';
    document.getElementById('btn-sec-type-list').style.boxShadow = (sec === 'list') ? '0 10px 20px rgba(64, 123, 255, 0.3)' : 'none';

    document.getElementById('btn-sec-type-add').style.background = (sec === 'add') ? 'var(--button-gradient)' : 'transparent';
    document.getElementById('btn-sec-type-add').style.color = (sec === 'add') ? 'white' : 'var(--text-muted)';
    document.getElementById('btn-sec-type-add').style.boxShadow = (sec === 'add') ? '0 10px 20px rgba(64, 123, 255, 0.3)' : 'none';

    if(sec === 'add' && !document.getElementById('type-edit-id').value) {
        document.getElementById('type-form-title').innerText = "إضافة ديكور جديد";
        document.getElementById('save-type-btn').innerText = "حفظ الديكور ➕";
    }
}

window.saveOrderType = async function() {
    const editId = document.getElementById("type-edit-id").value;
    const data = {
        name: document.getElementById("type-name").value.trim(),
        code: document.getElementById("type-code").value.trim(),
        price: document.getElementById("type-price").value.trim(),
        notes: document.getElementById("type-notes").value.trim()
    };

    if(data.name === "" || data.code === "") { alert("يرجى إدخال اسم الطلب والرمز"); return; }
    
    document.body.style.cursor = 'wait';
    if(editId) {
        if(window.updateOrderTypeInFirebase) await window.updateOrderTypeInFirebase(editId, data);
        const idx = configuredOrderTypes.findIndex(t => t.id === editId);
        if(idx > -1) configuredOrderTypes[idx] = { id: editId, ...data };
        window.showSuccessToast("تم تحديث الديكور بنجاح!");
    } else {
        if(window.addOrderTypeToFirebase) {
            const r = await window.addOrderTypeToFirebase(data);
            configuredOrderTypes.push({ id: r.id, ...data });
            window.showSuccessToast("تمت إضافة الديكور بنجاح!");
        }
    }
    
    document.body.style.cursor = 'default';
    ['type-name', 'type-code', 'type-price', 'type-notes', 'type-edit-id'].forEach(id => document.getElementById(id).value = '');
    
    window.renderOrderTypesSettings();
    window.updateOrderTypeSelects();
    window.toggleOrderTypeSection('list');
}

window.editOrderType = function(idx) {
    const t = configuredOrderTypes[idx];
    document.getElementById("type-edit-id").value = t.id;
    document.getElementById("type-name").value = t.name || '';
    document.getElementById("type-code").value = t.code || '';
    document.getElementById("type-price").value = t.price || '';
    document.getElementById("type-notes").value = t.notes || '';
    
    document.getElementById('type-form-title').innerText = "تحديث بيانات الديكور";
    document.getElementById('save-type-btn').innerText = "تحديث البيانات 💾";
    window.toggleOrderTypeSection('add');
}

window.deleteOrderType = async function(idx) { 
    window.showConfirmDialog("تأكيد حذف هذا الديكور بشكل نهائي؟", async function() { 
        await window.deleteOrderTypeFromFirebase(configuredOrderTypes[idx].id); 
        configuredOrderTypes.splice(idx, 1); 
        window.renderOrderTypesSettings(); 
        window.updateOrderTypeSelects();
        window.showSuccessToast("تم الحذف بنجاح");
    }); 
}

window.renderOrderTypesSettings = function() {
    let html = '';
    configuredOrderTypes.forEach((t, i) => {
        html += `
        <div class="settings-list-item" style="display:flex; justify-content:space-between; align-items:center; padding: 15px; margin-bottom:10px; background:var(--bg-color); border-radius:15px; box-shadow:var(--outer-shadow);">
            <div style="text-align:right; flex:1;">
                <div style="font-weight:bold; font-size:15px; color:var(--text-color);">${t.name} <span style="color:var(--primary-blue); font-size: 13px;">(${t.code})</span></div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:5px;">
                    ${t.price ? 'السعر: ' + Number(t.price).toLocaleString() + ' د.ع | ' : ''} 
                    ${t.notes ? 'ملاحظات: ' + t.notes : ''}
                </div>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn-outline" style="padding: 8px 12px; border-radius: 10px; font-size: 12px; min-width:unset; box-shadow:var(--outer-shadow);" onclick="window.editOrderType(${i})">✏️</button>
                <button class="btn-danger" style="padding: 8px 12px; border-radius: 10px; font-size: 12px; min-width:unset; box-shadow:var(--outer-shadow);" onclick="window.deleteOrderType(${i})">🗑️</button>
            </div>
        </div>`;
    });
    if(html === '') html = '<div style="text-align:center; padding: 30px; color:#ccc;">لا توجد ديكورات مضافة</div>';
    document.getElementById("orderTypesCardsContainer").innerHTML = html;
}

// =========================================
// الموظفين
// =========================================
window.toggleEmployeeSection = function(sec) {
    document.getElementById('add-employee-sec').style.display = (sec === 'add') ? 'block' : 'none'; document.getElementById('list-employee-sec').style.display = (sec === 'list') ? 'block' : 'none';
    document.getElementById('btn-sec-list').style.background = (sec === 'list') ? 'var(--button-gradient)' : 'transparent'; document.getElementById('btn-sec-list').style.color = (sec === 'list') ? 'white' : 'var(--text-muted)'; document.getElementById('btn-sec-list').style.boxShadow = (sec === 'list') ? '0 10px 20px rgba(64, 123, 255, 0.3)' : 'none';
    document.getElementById('btn-sec-add').style.background = (sec === 'add') ? 'var(--button-gradient)' : 'transparent'; document.getElementById('btn-sec-add').style.color = (sec === 'add') ? 'white' : 'var(--text-muted)'; document.getElementById('btn-sec-add').style.boxShadow = (sec === 'add') ? '0 10px 20px rgba(64, 123, 255, 0.3)' : 'none';
    if(sec === 'add' && !document.getElementById('emp-edit-id').value) { document.getElementById('emp-form-title').innerText = "إضافة موظف جديد"; document.getElementById('save-emp-btn').innerText = "حفظ الموظف ➕"; }
}

window.saveEmployee = async function() {
    const editId = document.getElementById("emp-edit-id").value;
    const data = {
        username: document.getElementById("emp-name").value.trim(), gender: document.getElementById("emp-gender").value, phone: document.getElementById("emp-phone").value.trim(),
        location: document.getElementById("emp-location").value.trim(), jobTitle: document.getElementById("emp-job").value.trim(), password: document.getElementById("emp-pass").value.trim(),
        canDeleteCloud: document.getElementById("emp-can-delete").checked, canEditCloud: document.getElementById("emp-can-edit").checked,
        canAccessSettings: document.getElementById("emp-can-settings").checked, canAccessReports: document.getElementById("emp-can-reports").checked,
        canAccessChat: document.getElementById("emp-can-chat").checked, canAddOrders: document.getElementById("emp-can-add").checked,
        canFetchOld: document.getElementById("emp-can-fetch-old").checked, canImportExport: document.getElementById("emp-can-import-export").checked
    };
    if(data.username === "" || data.password === "" || data.username === ADMIN_USER) { alert("يرجى إدخال الاسم وكلمة المرور"); return; }
    
    document.body.style.cursor = 'wait';
    if(editId) { await window.updateSystemUserInFirebase(editId, data); const idx = additionalUsers.findIndex(u => u.id === editId); if(idx > -1) additionalUsers[idx] = { id: editId, ...data }; window.showSuccessToast("تم تحديث بيانات الموظف بنجاح!"); } 
    else { const r = await window.addSystemUserToFirebase(data); additionalUsers.push({ id: r.id, ...data }); window.showSuccessToast("تمت إضافة الموظف بنجاح!"); }
    
    document.body.style.cursor = 'default';
    ['emp-name', 'emp-phone', 'emp-location', 'emp-job', 'emp-pass', 'emp-edit-id'].forEach(id => document.getElementById(id).value = '');
    ['emp-can-delete', 'emp-can-edit', 'emp-can-settings', 'emp-can-reports', 'emp-can-chat', 'emp-can-add', 'emp-can-fetch-old', 'emp-can-import-export'].forEach(id => document.getElementById(id).checked = false);
    
    window.renderUsers(); window.toggleEmployeeSection('list');
}

window.editEmployee = function(idx) {
    const u = additionalUsers[idx];
    document.getElementById("emp-edit-id").value = u.id; document.getElementById("emp-name").value = u.username || ''; document.getElementById("emp-gender").value = u.gender || 'ذكر';
    document.getElementById("emp-phone").value = u.phone || ''; document.getElementById("emp-location").value = u.location || ''; document.getElementById("emp-job").value = u.jobTitle || ''; document.getElementById("emp-pass").value = u.password || '';
    
    document.getElementById("emp-can-delete").checked = u.canDeleteCloud || false; document.getElementById("emp-can-edit").checked = u.canEditCloud || false;
    document.getElementById("emp-can-settings").checked = u.canAccessSettings || false; document.getElementById("emp-can-reports").checked = u.canAccessReports || false;
    document.getElementById("emp-can-chat").checked = u.canAccessChat || false; document.getElementById("emp-can-add").checked = u.canAddOrders || false;
    document.getElementById("emp-can-fetch-old").checked = u.canFetchOld || false; document.getElementById("emp-can-import-export").checked = u.canImportExport || false;

    document.getElementById('emp-form-title').innerText = "تحديث بيانات الموظف"; document.getElementById('save-emp-btn').innerText = "تحديث البيانات 💾"; window.toggleEmployeeSection('add');
}

window.deleteEmployee = function(idx) { window.showConfirmDialog("تأكيد حذف بروفايل الموظف بشكل نهائي؟", async function() { await window.deleteSystemUserFromFirebase(additionalUsers[idx].id); additionalUsers.splice(idx, 1); window.renderUsers(); window.showSuccessToast("تم الحذف بنجاح"); }); }
window.togglePasswordVisibility = function(inputId) { const input = document.getElementById(inputId); if(input.type === "password") { input.type = "text"; } else { input.type = "password"; } }

window.viewEmployeeProfile = function(idx) {
    const u = additionalUsers[idx];
    let avatarIcon = (u.gender === 'أنثى') ? '👩' : '👨';
    document.getElementById('view-emp-avatar').innerText = avatarIcon; document.getElementById('view-emp-name').innerText = u.username; document.getElementById('view-emp-job').innerText = u.jobTitle || 'موظف';
    document.getElementById('view-emp-location').innerText = u.location || '-'; document.getElementById('view-emp-gender').innerText = u.gender || '-'; document.getElementById('view-emp-phone').innerText = u.phone || '-';
    let waLinkBtn = u.phone ? `<a href="${getWaLink(u.phone).match(/href="([^"]*)/)[1]}" target="_blank" class="emp-wa-btn">مراسلة عبر واتساب 💬</a>` : `<button class="emp-wa-btn" style="background:#ccc; cursor:not-allowed;">لا يوجد رقم هاتف</button>`;
    document.getElementById('view-emp-wa').innerHTML = waLinkBtn;
    
    let perms = [];
    if(u.canDeleteCloud) perms.push('<span class="status-badge active" style="background:#eef2f9;">حذف</span>');
    if(u.canEditCloud) perms.push('<span class="status-badge active" style="background:#eef2f9;">تعديل</span>');
    if(u.canAccessSettings) perms.push('<span class="status-badge active" style="background:#eef2f9;">إعدادات</span>');
    if(u.canAccessReports) perms.push('<span class="status-badge active" style="background:#eef2f9;">تقارير</span>');
    if(u.canAccessChat) perms.push('<span class="status-badge active" style="background:#eef2f9;">الدردشة</span>');
    if(u.canAddOrders) perms.push('<span class="status-badge active" style="background:#eef2f9;">إضافة طلبات</span>');
    if(u.canFetchOld) perms.push('<span class="status-badge active" style="background:#eef2f9;">جلب الأرشيف</span>');
    if(u.canImportExport) perms.push('<span class="status-badge active" style="background:#eef2f9;">استيراد/تصدير</span>');
    if(perms.length === 0) perms.push('<span style="font-size:12px; color:#aaa;">لا يملك صلاحيات</span>');
    document.getElementById('view-emp-perms').innerHTML = perms.join('');
    
    document.getElementById('view-emp-pass').value = u.password; document.getElementById('view-emp-pass').type = "password";
    document.getElementById('view-emp-edit-btn').onclick = function() { window.closeEmployeeProfileModal(); window.editEmployee(idx); };
    document.getElementById('view-emp-del-btn').onclick = function() { window.closeEmployeeProfileModal(); window.deleteEmployee(idx); };
    document.getElementById('employeeProfileModal').style.display = 'flex';
}
window.closeEmployeeProfileModal = function() { document.getElementById('employeeProfileModal').style.display = 'none'; }
window.renderUsers = function() { 
    let html = '';
    additionalUsers.forEach((u, i) => {
        let avatarIcon = (u.gender === 'أنثى') ? '👩' : '👨';
        html += `<div class="settings-list-item" style="cursor:pointer; padding: 10px 20px; transition: transform 0.2s ease;" onclick="window.viewEmployeeProfile(${i})" onmouseover="this.style.transform='scale(0.98)'" onmouseout="this.style.transform='none'"><div style="display:flex; align-items:center; gap:15px; flex:1;"><div style="font-size:22px; background:var(--bg-color); border-radius:50%; width:40px; height:40px; display:flex; justify-content:center; align-items:center; box-shadow:var(--inner-shadow);">${avatarIcon}</div><div style="text-align:right;"><div style="font-weight:bold; font-size:15px; color:var(--text-color);">${u.username}</div><div style="font-size:11px; color:var(--text-muted);">${u.jobTitle || 'موظف'}</div></div></div><div style="color:var(--primary-blue); font-size:13px; font-weight:bold; display:flex; align-items:center; gap:5px;">عرض <span style="font-size:18px;">👁️</span></div></div>`;
    });
    if(html === '') html = '<div style="text-align:center; padding: 30px; color:#ccc;">لا يوجد موظفين حالياً</div>';
    document.getElementById("employee-cards-container").innerHTML = html; 
}
window.updateOrderTypeSelects = function() { document.querySelectorAll('.orderTypeSelect').forEach(s => { const v = s.value; s.innerHTML = '<option value="">-- اختر الطلب --</option>' + configuredOrderTypes.map(t => `<option value="${t.name}">${t.name} ➡️ (${t.code})</option>`).join(''); s.value = v; }); }

// =========================================
// تقرير الموظفين
// =========================================
window.generateEmployeeReport = async function() {
    const selEmp = document.getElementById('repEmpSelect').value;
    const noDataDiv = document.getElementById('empRepNoData');
    const contentDiv = document.getElementById('employeeReportContent');

    if(!selEmp) { contentDiv.style.display = 'none'; noDataDiv.style.display = 'block'; return; }
    contentDiv.style.display = 'block'; noDataDiv.style.display = 'none';

    const fromVal = document.getElementById('repDateFrom').value;
    const toVal = document.getElementById('repDateTo').value;
    let fromDate = fromVal ? new Date(fromVal) : null; if(fromDate) fromDate.setHours(0,0,0,0); 
    let toDate = toVal ? new Date(toVal) : null; if(toDate) toDate.setHours(23,59,59,999); 

    document.body.style.cursor = 'wait';

    try {
        // 1. حساب ساعات العمل
        let sessionsQuery = query(collection(db, "user_sessions"), where("username", "==", selEmp));
        const sessionsSnap = await getDocs(sessionsQuery);
        let totalMilliseconds = 0;
        sessionsSnap.forEach(doc => {
            let d = doc.data();
            if(d.loginTime && d.lastActive) {
                let sTime = new Date(d.loginTime);
                if(fromDate && sTime < fromDate) return;
                if(toDate && sTime > toDate) return;
                let diff = d.lastActive - d.loginTime;
                if(diff > 0) totalMilliseconds += diff;
            }
        });
        let totalHours = (totalMilliseconds / (1000 * 60 * 60)).toFixed(2);
        document.getElementById('empRepHours').innerText = totalHours;

        // 2. حساب الطلبات المضافة
        let addedOrders = allCloudOrders.filter(o => o.addedBy === selEmp);
        if(fromDate || toDate) {
            addedOrders = addedOrders.filter(o => {
                if(!o.timestamp?.seconds) return false;
                const d = new Date(o.timestamp.seconds * 1000);
                return (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
            });
        }
        document.getElementById('empRepAdded').innerText = addedOrders.length;

        let addedTbody = '';
        addedOrders.forEach(o => {
            let amt = parseFloat((o.amount || "0").toString().replace(/[^0-9.-]+/g,"")) || 0;
            addedTbody += `<tr><td>${o.id||'-'}</td><td>${o.name||'-'}</td><td>${o.constant||'-'}</td><td>${amt.toLocaleString()}</td><td>${o.status||'جديد'}</td></tr>`;
        });
        if(!addedTbody) addedTbody = '<tr><td colspan="5" style="text-align:center;">لا توجد طلبات مسجلة للموظف</td></tr>';
        document.getElementById('empAddedOrdersTbody').innerHTML = addedTbody;

        // 3. جلب سجل النشاطات (الحذف والتعديل)
        let logsQuery = query(collection(db, "action_logs"), where("username", "==", selEmp));
        const logsSnap = await getDocs(logsQuery);
        let logs = [];
        logsSnap.forEach(doc => logs.push(doc.data()));
        
        logs = logs.filter(l => {
            if(!l.timestamp?.seconds) return false;
            const d = new Date(l.timestamp.seconds * 1000);
            return (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
        }).sort((a,b) => b.timestamp.seconds - a.timestamp.seconds); 

        let editCount = 0, delCount = 0, logsTbody = '';
        logs.forEach(l => {
            if(l.action.includes('تعديل') || l.action.includes('تغيير')) editCount++;
            if(l.action.includes('حذف')) delCount++;
            
            let timeStr = new Date(l.timestamp.seconds * 1000).toLocaleString('ar-IQ');
            logsTbody += `<tr><td style="font-size:12px;" dir="ltr">${timeStr}</td><td>${l.action}</td><td>${l.details}</td></tr>`;
        });
        
        if(!logsTbody) logsTbody = '<tr><td colspan="3" style="text-align:center;">لا توجد نشاطات مسجلة</td></tr>';
        document.getElementById('empActionTbody').innerHTML = logsTbody;
        document.getElementById('empRepEdits').innerText = editCount;
        document.getElementById('empRepDeletes').innerText = delCount;

    } catch(e) { console.error("Error generating employee report:", e); window.showSuccessToast("حدث خطأ أثناء جلب التقرير!"); }

    document.body.style.cursor = 'default';
};

window.exportEmployeeReportPDF = function() {
    const selEmp = document.getElementById('repEmpSelect').value;
    if(!selEmp) { alert("الرجاء اختيار الموظف أولاً!"); return; }
    
    const tempDiv = document.createElement('div'); 
    tempDiv.style.padding = '30px'; tempDiv.style.background = '#ffffff'; 
    tempDiv.style.color = '#000000'; tempDiv.style.direction = 'rtl'; tempDiv.style.fontFamily = 'Arial, sans-serif'; 
    
    const title = document.createElement('h2'); 
    title.innerText = 'تقرير الموظف المفصل: ' + selEmp; 
    title.style.textAlign = 'center'; title.style.marginBottom = '25px'; 
    tempDiv.appendChild(title); 

    const statsRow = document.createElement('div');
    statsRow.style.display = 'flex'; statsRow.style.justifyContent = 'space-around';
    statsRow.style.marginBottom = '30px'; statsRow.style.borderBottom = '1px solid #ccc'; statsRow.style.paddingBottom = '15px';
    statsRow.innerHTML = `
        <div style="text-align:center;"><strong>ساعات العمل</strong><br>${document.getElementById('empRepHours').innerText}</div>
        <div style="text-align:center;"><strong>الطلبات المضافة</strong><br>${document.getElementById('empRepAdded').innerText}</div>
        <div style="text-align:center;"><strong>التعديلات</strong><br>${document.getElementById('empRepEdits').innerText}</div>
        <div style="text-align:center;"><strong>إجراءات الحذف</strong><br>${document.getElementById('empRepDeletes').innerText}</div>
    `;
    tempDiv.appendChild(statsRow);

    const addedTitle = document.createElement('h3'); addedTitle.innerText = "سجل الطلبات المضافة"; tempDiv.appendChild(addedTitle);
    const addedTableClone = document.getElementById('empAddedOrdersTable').cloneNode(true); 
    addedTableClone.style.width = '100%'; addedTableClone.style.borderCollapse = 'collapse'; addedTableClone.style.marginBottom = '30px';
    addedTableClone.querySelectorAll('th, td').forEach(c => { c.style.border = '1px solid #ccc'; c.style.padding = '8px'; c.style.textAlign = 'center'; c.style.color = '#000'; c.style.background = '#fff'; c.style.fontSize = '12px';}); 
    tempDiv.appendChild(addedTableClone); 

    const actionTitle = document.createElement('h3'); actionTitle.innerText = "سجل النشاطات المفصل"; tempDiv.appendChild(actionTitle);
    const actionTableClone = document.getElementById('empActionTable').cloneNode(true); 
    actionTableClone.style.width = '100%'; actionTableClone.style.borderCollapse = 'collapse'; 
    actionTableClone.querySelectorAll('th, td').forEach(c => { c.style.border = '1px solid #ccc'; c.style.padding = '8px'; c.style.textAlign = 'center'; c.style.color = '#000'; c.style.background = '#fff'; c.style.fontSize = '12px';}); 
    tempDiv.appendChild(actionTableClone); 

    document.body.appendChild(tempDiv); 
    
    const opt = { margin: 10, filename: `تقرير_الموظف_${selEmp}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }; 
    html2pdf().set(opt).from(tempDiv).save().then(() => { document.body.removeChild(tempDiv); }); 
};
