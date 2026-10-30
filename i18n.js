/* =========================================================
   Gold Land - i18n (العربية / English)
   - القاموس: النص العربي الأصلي  ->  الترجمة الإنكليزية
   - الترجمة تتم عند "نقطة العرض" (DOM + alert/confirm)، فالمنطق الداخلي
     والبيانات المخزنة (الحالات، أسماء البيجات...) تبقى عربية كما هي.
   - عناصر عليها data-no-i18n (مثل الوصولات المطبوعة) لا تُترجم أبداً.
   ========================================================= */
(function () {
    'use strict';

    var EN = {

 // --- المظهر وإعداد المدير (v2) ---
 "🎨 المظهر": "🎨 Appearance",
 "🎨 المظهر والعرض": "🎨 Appearance & display",
 "هذه الإعدادات تُحفظ على هذا الجهاز فقط.": "These settings are saved on this device only.",
 "اللغة": "Language",
 "الوضع": "Mode",
 "تلقائي 🕐": "Auto 🕐",
 "نهاري ☀️": "Light ☀️",
 "ليلي 🌙": "Dark 🌙",
 "شكل العرض": "Layout",
 "تلقائي": "Auto",
 "جوال 📱": "Mobile 📱",
 "كمبيوتر 🖥️": "Desktop 🖥️",
 "اختيار \"كمبيوتر\" يوسّع الواجهة ويحوّل القائمة إلى شبكة مناسبة للشاشات الكبيرة. \"تلقائي\" يختار حسب حجم الشاشة.": "\"Desktop\" widens the interface and turns the menu into a grid suited to large screens. \"Auto\" picks based on screen size.",
 "الوضع الليلي": "Dark mode",
 "تغيير شكل العرض": "Change layout",
 "🔐 إعداد حساب المدير": "🔐 Create the manager account",
 "لم يتم إنشاء حساب مدير بعد. أنشئه الآن — لا يمكن لأحد إنشاء حساب مدير آخر لاحقاً.": "No manager account exists yet. Create it now — nobody can create another manager account later.",
 "اسم المدير": "Manager name",
 "كلمة مرور المدير": "Manager password",
 "تأكيد كلمة المرور": "Confirm password",
 "إنشاء الحساب ✅": "Create account ✅",
 "تعذر إنشاء الحساب": "Could not create the account",
 "أدخل اسم المدير": "Enter the manager name",
 "كلمة المرور يجب أن تكون 6 أحرف على الأقل": "Password must be at least 6 characters",
 "كلمتا المرور غير متطابقتين": "Passwords do not match",
 "يوجد حساب مدير مسبقاً، سجّل الدخول به": "A manager account already exists, sign in with it",
 "تم إنشاء حساب المدير، سجّل الدخول الآن": "Manager account created, sign in now",
 "تعذر الحفظ في السحابة:": "Could not save to the cloud:",
 "يرجى إدخال اسم الموظف": "Please enter the employee name",
 "يرجى إدخال كلمة المرور": "Please enter the password",
 "كلمة المرور يجب أن تكون 4 أحرف على الأقل": "Password must be at least 4 characters",
 "🔒 مشفّرة — لا يمكن عرضها": "🔒 Encrypted — cannot be shown",
 "خطأ بالاتصال، حاول مرة أخرى": "Connection error, please try again",
 "تعذر الاتصال بالسحابة، تحقق من الإنترنت": "Cannot reach the cloud, check your connection",
 "-- اختر البيج --": "-- Select page --",
 "-- اختر الطلب --": "-- Select order --",
 "-- اختر المادة --": "-- Select item --",
 "-- اختر الموظف --": "-- Select employee --",
 "-- كل البيجات --": "-- All pages --",
 "-- كل الحالات --": "-- All statuses --",
 "كل الحالات": "All statuses",
 "-- كل الطلبات --": "-- All orders --",
 "1. اضغط على زر 'المشاركة' أسفل المتصفح.": "1. Tap the 'Share' button at the bottom of the browser.",
 "2. اختر 'إضافة إلى الصفحة الرئيسية'.": "2. Choose 'Add to Home Screen'.",
 "{0} - متوفر: {1}": "{0} - Available: {1}",
 "{0} أعضاء": "{0} members",
 "{0} مواد": "{0} items",
 "| صنف:": "| Item:",
 "أجور التوصيل (د.ع)": "Delivery fees (IQD)",
 "أجور المندوب": "Courier fees",
 "أخرى": "Other",
 "أخرى (غير مسجلة)": "Other (unregistered)",
 "أداء الأصناف": "Item performance",
 "أرشيف": "Archive",
 "أرشيف_السحابة.xlsx": "Cloud_Archive.xlsx",
 "أكثر الأصناف مبيعاً (القطع)": "Top selling items (pieces)",
 "توزيع الطلبات حسب الحالة": "Orders distribution by status",
 "قيمة الطلبات حسب الحالة (دينار)": "Order value by status (IQD)",
 "لا توجد طلبات مطابقة": "No matching orders",
 "طلب": "order",
 "دينار": "IQD",
 "أنثى": "Female",
 "إجمالي الطلبات المُدخلة (هذا الشهر)": "Total orders entered (this month)",
 "إدخال مخزن": "Warehouse entry",
 "إرسال ✈️": "Send ✈️",
 "إضافة": "Add",
 "إضافة الطلبات": "Add orders",
 "إضافة ديكور": "Add decor",
 "إضافة ديكور جديد": "Add new decor",
 "إضافة طلب": "Add order",
 "إضافة طلبات": "Add orders",
 "إضافة للسحابة ☁️": "Add to cloud ☁️",
 "إضافة مادة ➕": "Add item ➕",
 "إضافة موظف": "Add employee",
 "إضافة موظف جديد": "Add new employee",
 "إعدادات": "Settings",
 "إغلاق": "Close",
 "إلغاء": "Cancel",
 "إلى تاريخ:": "To date:",
 "إلى:": "To:",
 "إنشاء المجموعة ➕": "Create group ➕",
 "اختر الأعضاء": "Select members",
 "اختر المادة المراد سحبها:": "Select the item to withdraw:",
 "استهلاك المخزن": "Warehouse consumption",
 "استهلاك مخزن": "Warehouse consumption",
 "استيراد/تصدير": "Import/Export",
 "اسم": "Name",
 "اسم البيج": "Page name",
 "اسم الزبون": "Customer name",
 "اسم الزبون:": "Customer name:",
 "اسم الطلب": "Order name",
 "اسم المادة": "Item name",
 "اسم المجموعة": "Group name",
 "اسم المستخدم": "Username",
 "اضغط على النقاط الثلاث واختر 'إضافة إلى الشاشة الرئيسية'.": "Tap the three dots and choose 'Add to Home screen'.",
 "اكتب التصنيف هنا (مثال: مواد خام)...": "Type the category here (e.g. raw materials)...",
 "اكتب رسالتك هنا...": "Type your message here...",
 "الأرشيف القديم": "Old archive",
 "الأرشيف والمتابعة": "Archive & follow-up",
 "الإجمالي": "Total",
 "الإعدادات": "Settings",
 "الاتصال بالسحابة غير جاهز": "Cloud connection is not ready",
 "الاستهلاك (سحب)": "Consumption (withdrawal)",
 "الاسم": "Name",
 "البيج": "Page",
 "البيج:": "Page:",
 "البيجات": "Pages",
 "التاريخ": "Date",
 "التاريخ:": "Date:",
 "التسلسل": "Serial",
 "التسلسل:": "Serial:",
 "التصنيف: {0} | الوحدة: {1} | السعر: {2} د.ع": "Category: {0} | Unit: {1} | Price: {2} IQD",
 "التقارير والإحصائيات": "Reports & statistics",
 "التكلفة (المواد+التوصيل)": "Cost (materials + delivery)",
 "التكلفة للوحدة": "Unit cost",
 "التوزيع الذكي": "Smart distribution",
 "التوصيل": "Delivery",
 "الجنس": "Gender",
 "الجنس:": "Gender:",
 "الحالة": "Status",
 "الدردشة": "Chat",
 "الدردشة العامة": "General chat",
 "الرجاء إضافة مواد صحيحة وتحديد العدد!": "Please add valid items and set the quantity!",
 "الرجاء اختيار اسم الموظف.": "Please select the employee name.",
 "الرجاء اختيار الموظف أولاً!": "Please select the employee first!",
 "الرجاء اختيار مادة وكمية صحيحة": "Please select an item and a valid quantity",
 "الرجاء تحديد التاريخ": "Please select the date",
 "الرسوم البيانية 📈": "Charts 📈",
 "الرصيد الحالي": "Current balance",
 "الرصيد المتاح": "Available balance",
 "الرصيد المتوفر حالياً": "Currently available balance",
 "الرقم السري غير صحيح!": "Incorrect passcode!",
 "الرقم السري للمدير": "Admin passcode",
 "الرمز": "Code",
 "الرمز:": "Code:",
 "الزبون": "Customer",
 "الزبون:": "Customer:",
 "السحابة": "Cloud",
 "السعر (اختياري)": "Price (optional)",
 "السعر:": "Price:",
 "الصافي": "Net",
 "الصافي (دينار)": "Net (IQD)",
 "الصق رسالة الطلب هنا...": "Paste the order message here...",
 "الصلاحيات الأساسية:": "Basic permissions:",
 "الصلاحيات الممنوحة:": "Granted permissions:",
 "الطلب": "Order",
 "الطلب:": "Order:",
 "الطلبات": "Orders",
 "الطلبات المضافة": "Added orders",
 "الطلبات المضافة ➕": "Added orders ➕",
 "الطلبات المكتملة": "Completed orders",
 "العدد": "Quantity",
 "العنوان": "Address",
 "العنوان:": "Address:",
 "العودة لطلبات الشهر": "Back to this month's orders",
 "القطع المباعة": "Pieces sold",
 "الكلي": "Total",
 "الكمية الكلية:": "Total quantity:",
 "الكمية المسحوبة": "Quantity withdrawn",
 "الكمية المطلوبة أكبر من الرصيد المتوفر!": "The requested quantity exceeds the available balance!",
 "المادة": "Item",
 "المادة غير موجودة بالرصيد": "Item not found in stock",
 "المالي": "Financial",
 "المبلغ": "Amount",
 "المبلغ الكلي": "Total amount",
 "المبلغ الكلي:": "Total amount:",
 "المبلغ الكلي: {0} دينار": "Total amount: {0} IQD",
 "المبيعات (المالية)": "Sales (financial)",
 "المجموع الكلي": "Grand total",
 "المحافظة": "Governorate",
 "المحافظة:": "Governorate:",
 "المخزن وإدارة المواد": "Warehouse & item management",
 "المستخدم": "User",
 "المستخدم المضيف:": "Host user:",
 "المستخدمين": "Users",
 "المشتريات (إضافة)": "Purchases (add)",
 "المصروفات (المواد + التوصيل)": "Expenses (materials + delivery)",
 "المقر الرئيسي": "Head office",
 "الملاحظات": "Notes",
 "الملاحظات:": "Notes:",
 "الملف الشخصي": "Profile",
 "الملف فارغ!": "The file is empty!",
 "المنطقة": "Area",
 "المنطقة:": "Area:",
 "الموظفين 👥": "Employees 👥",
 "النموذج": "Template",
 "النوع": "Type",
 "الهاتف": "Phone",
 "الهاتف الأول:": "First phone:",
 "الهاتف الثاني:": "Second phone:",
 "الهاتف:": "Phone:",
 "الواتساب": "WhatsApp",
 "الوحدة": "Unit",
 "الوحدة:": "Unit:",
 "الوظيفة": "Job title",
 "بحث باسم المادة، الرمز...": "Search by item name, code...",
 "بحث بالاسم، الهاتف، التسلسل...": "Search by name, phone, serial...",
 "بواسطة": "By",
 "بيانات الدخول غير صحيحة!": "Invalid login details!",
 "أدخل اسم المستخدم وكلمة المرور": "Enter username and password",
 "ت": "#",
 "تأكيد السحب والخصم من الرصيد 📤": "Confirm withdrawal and deduct from stock 📤",
 "تأكيد تسجيل الخروج؟": "Confirm logout?",
 "تأكيد حذف بروفايل الموظف بشكل نهائي؟": "Permanently delete this employee profile?",
 "تأكيد حذف هذا الديكور بشكل نهائي؟": "Permanently delete this decor?",
 "تأكيد حذف هذه المادة من التعريفات؟": "Delete this item from definitions?",
 "تاريخ الطباعة: {0}": "Print date: {0}",
 "تحديث البيانات 💾": "Update data 💾",
 "تحديث التنبيه": "Update alert",
 "تحديث بيانات الديكور": "Update decor data",
 "تحديث بيانات المادة": "Update item data",
 "تحديث بيانات الموظف": "Update employee data",
 "تحديد الحالة:": "Select status:",
 "تسجيل الدخول": "Log in",
 "تسجيل خروج": "Log out",
 "تسلسل": "Serial",
 "تسلسل الزبون": "Customer serial",
 "تصدير": "Export",
 "تصدير الآن 🚀": "Export now 🚀",
 "تصدير_مخصص_{0}.xlsx": "Custom_Export_{0}.xlsx",
 "تصنيف المادة": "Item category",
 "تطبيق على الكل 💾": "Apply to all 💾",
 "تعديل": "Edit",
 "تعديل الطلب": "Edit order",
 "تعديل شامل": "Full edit",
 "تعديل طلب": "Edit order",
 "تعديل نوع الطلب": "Edit order type",
 "تعديل/تحديث بيانات طلب": "Order data edit/update",
 "تعذر الاتصال بالسحابة، تحقق من الإنترنت": "Couldn't reach the cloud, check your internet",
 "تعذر حفظ حد التنبيه": "Couldn't save the alert threshold",
 "تعريف مادة جديدة": "Define a new item",
 "تغيير حالة": "Status change",
 "تغيير حالة {0} طلب إلى {1}": "Changed status of {0} orders to {1}",
 "تغيير حالة الطلبات المحددة": "Change status of selected orders",
 "تفاصيل الطلب:": "Order details:",
 "تقارير": "Reports",
 "تقرير الطلبات المخصص": "Custom orders report",
 "تقرير المبيعات -": "Sales report -",
 "تقرير الموظف المفصل:": "Detailed employee report:",
 "تقرير_المبيعات.pdf": "Sales_Report.pdf",
 "تقرير_الموظف_{0}.pdf": "Employee_Report_{0}.pdf",
 "تقرير_مخصص_{0}.pdf": "Custom_Report_{0}.pdf",
 "تكلفة المواد المستهلكة": "Cost of consumed materials",
 "تم إضافة طلب للزبون: {0}": "Order added for customer: {0}",
 "تم إنشاء المجموعة!": "Group created!",
 "تم التحديث! ✏️": "Updated! ✏️",
 "تم التوصيل": "Delivered",
 "تم الحذف بنجاح": "Deleted successfully",
 "تم الرفع! ({0})": "Uploaded! ({0})",
 "تم السحب وخصم الكمية من الرصيد! 📤": "Withdrawn and deducted from stock! 📤",
 "تم العودة لطلبات الشهر الحالي 📅": "Back to the current month's orders 📅",
 "تم تحديث الديكور بنجاح!": "Decor updated successfully!",
 "تم تحديث الطلب بنجاح! ✏️": "Order updated successfully! ✏️",
 "تم تحديث المادة بنجاح!": "Item updated successfully!",
 "تم تحديث بيانات الموظف بنجاح!": "Employee data updated successfully!",
 "تم تحديث حد التنبيه بنجاح": "Alert threshold updated successfully",
 "تم تسجيل الشراء وإضافته للرصيد! 📥": "Purchase recorded and added to stock! 📥",
 "تم تصدير {0} طلب كملف Excel 🎉": "Exported {0} orders as an Excel file 🎉",
 "تم تصدير {0} طلب كملف PDF 📄": "Exported {0} orders as a PDF file 📄",
 "تم تغيير الحالة إلى {0}": "Status changed to {0}",
 "تم تغيير حالة {0} طلب إلى ({1}) بنجاح!": "Changed status of {0} orders to ({1}) successfully!",
 "تم جلب {0} طلب!": "Fetched {0} orders!",
 "تم حذف {0} طلب بنجاح! 🗑️": "{0} orders deleted successfully! 🗑️",
 "تم حفظ التوصيل سحابياً!": "Delivery saved to the cloud!",
 "تم رفع {0} طلب من ملف Excel": "Uploaded {0} orders from an Excel file",
 "تم مسح {0} طلب نهائياً": "{0} orders permanently deleted",
 "تم مسح طلب نهائياً": "Order permanently deleted",
 "تمت إضافة الديكور بنجاح!": "Decor added successfully!",
 "تمت إضافة الطلب! 🎉": "Order added! 🎉",
 "تمت إضافة المادة بنجاح!": "Item added successfully!",
 "تمت إضافة الموظف بنجاح!": "Employee added successfully!",
 "توزيع البيانات 🔄": "Data distribution 🔄",
 "توصيل المحافظات": "Governorates delivery",
 "توصيل بغداد": "Baghdad delivery",
 "توليد 🔄": "Generate 🔄",
 "جاري التحقق... ⏳": "Verifying... ⏳",
 "جدول المبيعات": "Sales table",
 "جديد": "New",
 "جلب": "Fetch",
 "جميع البيجات": "All pages",
 "حالة الطلب": "Order status",
 "حالة الطلب:": "Order status:",
 "حد التنبيه": "Alert threshold",
 "حدث خطأ أثناء الحذف": "An error occurred while deleting",
 "حدث خطأ أثناء الحفظ": "An error occurred while saving",
 "حدث خطأ أثناء السحب": "An error occurred while withdrawing",
 "حدث خطأ أثناء تصدير الـ PDF": "An error occurred while exporting the PDF",
 "حدث خطأ أثناء تغيير الحالة": "An error occurred while changing the status",
 "حدث خطأ أثناء حفظ المشتريات": "An error occurred while saving the purchases",
 "حدث خطأ أثناء حفظ الموظف": "An error occurred while saving the employee",
 "حدث خطأ أثناء رفع الملف": "An error occurred while uploading the file",
 "حدث خطأ.": "An error occurred.",
 "حذف": "Delete",
 "حذف البيج؟": "Delete the page?",
 "حذف طلب": "Delete order",
 "حذف طلبات": "Delete orders",
 "حفظ": "Save",
 "حفظ التحديثات 💾": "Save changes 💾",
 "حفظ التعديلات 💾": "Save changes 💾",
 "حفظ التنبيه": "Save alert",
 "حفظ الديكور ➕": "Save decor ➕",
 "حفظ الطلب ➕": "Save order ➕",
 "حفظ المادة 💾": "Save item 💾",
 "حفظ المشتريات 📥": "Save purchases 📥",
 "حفظ الموظف ➕": "Save employee ➕",
 "حفظ الموظف 💾": "Save employee 💾",
 "حفظ 💾": "Save 💾",
 "خاص": "Private",
 "خطأ بالاتصال": "Connection error",
 "خطأ.": "Error.",
 "د.ع": "IQD",
 "دخول 🔑": "Log in 🔑",
 "دردشة": "Chat",
 "ذكر": "Male",
 "راجع": "Returned",
 "راجع مخزن": "Returned to warehouse",
 "رسالة جديدة من {0} 💬": "New message from {0} 💬",
 "رفع Excel": "Excel upload",
 "رقم الهاتف": "Phone number",
 "رقم الهاتف الأول": "First phone number",
 "رقم الهاتف الثاني": "Second phone number",
 "رقم الهاتف:": "Phone number:",
 "رولة": "Roll",
 "ساعات العمل": "Working hours",
 "ساعات العمل ⏱️": "Working hours ⏱️",
 "سبب السحب / ملاحظات": "Withdrawal reason / notes",
 "سجل الاستهلاك الأخير": "Recent consumption log",
 "سجل الطلبات المضافة": "Added orders log",
 "سجل المشتريات الأخير": "Recent purchases log",
 "سحب {0} من {1}": "Withdrew {0} of {1}",
 "سحب مخزن": "Warehouse withdrawal",
 "سعر الوحدة (د.ع)": "Unit price (IQD)",
 "سيتم رفع {0} طلب{1}": "About to upload {0} orders{1}",
 "صلاحيات المخزن:": "Warehouse permissions:",
 "صيغة التصدير:": "Export format:",
 "طلب جديد أضيف بواسطة {0}": "New order added by {0}",
 "عام": "General",
 "عرض": "View",
 "غير محدد": "Unspecified",
 "فاتورة شراء لعدد {0} مواد.": "Purchase invoice for {0} items.",
 "فشل إرسال الرسالة.": "Failed to send the message.",
 "قائمة الطلبات": "Orders list",
 "قائمة المواد المشتراة": "Purchased items list",
 "قائمة المواد 📋": "Items list 📋",
 "قائمة الموظفين": "Employees list",
 "قطعة": "Piece",
 "قم بلصق النص هنا لاستخراج البيانات بذكاء:": "Paste the text here to extract the data smartly:",
 "قيد التجهيز": "In preparation",
 "قيمة المخزون الحالي (رأس المال)": "Current stock value (capital)",
 "كرتون": "Carton",
 "كلمة المرور": "Password",
 "كلمة المرور:": "Password:",
 "كيلو": "Kilo",
 "لا توجد بيانات": "No data",
 "لا توجد ديكورات مضافة": "No decors added",
 "لا توجد رسائل بعد. ✍️": "No messages yet. ✍️",
 "لا توجد صفوف صالحة (البيج واسم الزبون مطلوبان)": "No valid rows (page and customer name are required)",
 "لا توجد صلاحيات إضافية": "No additional permissions",
 "لا توجد طلبات مسجلة للموظف": "No orders recorded for the employee",
 "لا توجد طلبات مكتملة": "No completed orders",
 "لا توجد مجموعات بعد": "No groups yet",
 "لا توجد مواد مضافة": "No items added",
 "لا توجد مواد مطابقة": "No matching items",
 "لا يملك صلاحيات": "Has no permissions",
 "لا يوجد رقم هاتف": "No phone number",
 "لا يوجد مستخدمين آخرين": "No other users",
 "لا يوجد موظفين حالياً": "No employees at the moment",
 "لتر/علبة": "Liter/Box",
 "للتميز عنوان": "For distinction, an address",
 "مالية المخزن 📦": "Warehouse finance 📦",
 "مبلغ": "Amount",
 "متر": "Meter",
 "مثال: 5000": "Example: 5000",
 "مثال: M1": "Example: M1",
 "مثال: خشب MDF": "Example: MDF wood",
 "مثال: طلبية رقم 100...": "Example: order no. 100...",
 "مثال: فريق المبيعات": "Example: sales team",
 "مجموعات": "Groups",
 "محافظة": "Gov.",
 "مدير عام": "General manager",
 "مدير نظام (كافة الصلاحيات)": "System admin (all permissions)",
 "مراسلة عبر واتساب 💬": "Message via WhatsApp 💬",
 "مساحة للجميع": "A space for everyone",
 "مسح": "Clear",
 "مسح الكل 🗑️": "Clear all 🗑️",
 "مسلم للمندوب": "Handed to courier",
 "مشتريات المخزن": "Warehouse purchases",
 "مشتريات مخزن": "Warehouse purchases",
 "مكان العمل": "Workplace",
 "مكان العمل:": "Workplace:",
 "ملاحظات": "Notes",
 "ملاحظات (اختياري)": "Notes (optional)",
 "ملاحظات...": "Notes...",
 "ملاحظات:": "Notes:",
 "ملاحظة": "Note",
 "ملاحظة مهمة": "Important note",
 "ملف Excel 📊": "Excel file 📊",
 "ملف PDF 📄": "PDF file 📄",
 "من تاريخ:": "From date:",
 "من:": "From:",
 "منطقة": "Area",
 "مواد المخزن": "Warehouse items",
 "موظف": "Employee",
 "نعم": "Yes",
 "نموذج_رفع_الطلبات.xlsx": "Orders_Upload_Template.xlsx",
 "نوع": "Type",
 "نوع الطلب": "Order type",
 "هاتف1": "Phone 1",
 "هاتف2": "Phone 2",
 "هذا الاسم محجوز للمدير، اختر اسماً آخر": "This name is reserved for the admin, choose another name",
 "هذا الرمز مستخدم لطلب آخر، اختر رمزاً مختلفاً": "This code is used by another order type, choose a different code",
 "هذا الرمز مستخدم لمادة أخرى، اختر رمزاً مختلفاً": "This code is used by another item, choose a different code",
 "هل أنت متأكد من حذف {0} طلب بشكل نهائي؟": "Are you sure you want to permanently delete {0} orders?",
 "وحدة القياس": "Unit of measure",
 "وصولات_{0}.pdf": "Receipts_{0}.pdf",
 "يجب اختيار البيج!": "You must select the page!",
 "يرجى إدخال اسم الطلب والرمز": "Please enter the order name and code",
 "يرجى إدخال اسم المادة": "Please enter the item name",
 "يرجى إدخال اسم المجموعة": "Please enter the group name",
 "يرجى إدخال الاسم وكلمة المرور": "Please enter the name and password",
 "يرجى إدخال تسلسل الزبون أو اسمه على الأقل": "Please enter the customer serial or at least the name",
 "يرجى إضافة صنف واحد على الأقل": "Please add at least one item",
 "يرجى تحديد طلب لتعديله!": "Please select an order to edit!",
 "يرجى تحديد طلب واحد فقط للتعديل!": "Please select only one order to edit!",
 "يرجى تحديد طلبات لتصديرها كـ PDF!": "Please select orders to export as PDF!",
 "يرجى تحديد طلبات لتغيير حالتها!": "Please select orders to change their status!",
 "يرجى تحديد طلبات لحذفها!": "Please select orders to delete!",
 "يرجى تحديد طلبات لطباعتها!": "Please select orders to print!",
 "يوجد موظف بنفس الاسم، اختر اسماً آخر": "An employee with the same name already exists, choose another name",
 "ℹ️ زبون سابق (إجمالي طلباته: {0})": "ℹ️ Returning customer (total orders: {0})",
 "☰ خيارات": "☰ Options",
 "⚙️ الإعدادات": "⚙️ Settings",
 "⚠️ تنبيه: لديك ({0}) مواد وصلت لحد النقص!": "⚠️ Alert: you have ({0}) items that reached the shortage limit!",
 "⚠️ لا توجد طلبات مطابقة للبيانات المحددة!": "⚠️ No orders match the selected criteria!",
 "⛔ تنبيه: هذا الزبون لديه ({0}) طلب راجع سابقاً!": "⛔ Warning: this customer previously had ({0}) returned orders!",
 "✏️ تحديث الطلب": "✏️ Update order",
 "✏️ تعديل": "✏️ Edit",
 "✏️ تعديل الطلب واللون والعدد": "✏️ Edit order, color and quantity",
 "✓ تم الإرسال": "✓ Sent",
 "❌ ليس لديك صلاحية لتعديل نوع الطلب.": "❌ You don't have permission to edit the order type.",
 "❌ ليس لديك صلاحية للدخول إلى إضافة الطلبات": "❌ You don't have permission to access Add Orders",
 "❌ ليس لديك صلاحية للدخول إلى المخزن": "❌ You don't have permission to access the warehouse",
 "❌ ليس لديك صلاحية للدخول للدردشة": "❌ You don't have permission to access chat",
 "❌ ليس لديك صلاحية.": "❌ You don't have permission.",
 "➕ إضافة مادة للقائمة": "➕ Add item to the list",
 "➕ إنشاء مجموعة": "➕ Create group",
 "➕ صنف آخر": "➕ Another item",
 "⭐ زبون VIP دائم (طلبات مكتملة: {0})": "⭐ Permanent VIP customer (completed orders: {0})",
 "🍏 آيفون": "🍏 iPhone",
 "🍏 لتثبيت التطبيق على الآيفون:": "🍏 To install the app on iPhone:",
 "👁️ قرئت بواسطة: {0}": "👁️ Read by: {0}",
 "👤 المستخدم": "👤 User",
 "👥 مجموعة جديدة": "👥 New group",
 "📊 التقارير والإحصائيات": "📊 Reports & statistics",
 "📋 تفاصيل الطلب الكاملة": "📋 Full order details",
 "📌 اختر البيج (إلزامي):": "📌 Select the page (required):",
 "📤 تسجيل استهلاك / سحب من المخزن": "📤 Record consumption / withdraw from the warehouse",
 "📤 تصدير البيانات المتقدم": "📤 Advanced data export",
 "📦 الطلبات والعدد": "📦 Orders and quantity",
 "📦 المخزن وإدارة المواد": "📦 Warehouse & item management",
 "📱 التطبيق جاهز للتثبيت!": "📱 The app is ready to install!",
 "📱 تثبيت التطبيق": "📱 Install the app",
 "🔒 إعدادات النظام (للمدير)": "🔒 System settings (admin)",
 "🔙 القائمة": "🔙 Menu",
 "🕰️ جلب الطلبات القديمة": "🕰️ Fetch old orders",
 "🗑️ حذف": "🗑️ Delete",
 "🛒 تسجيل مشتريات (إضافة للمخزن)": "🛒 Record purchases (add to warehouse)",
 "🟢 واتساب": "🟢 WhatsApp",
 "🌐 اللغة": "🌐 Language",
 "🌐 لغة البرنامج": "🌐 Application language",
 "اختر لغة واجهة البرنامج. يتم حفظ الاختيار على هذا الجهاز.": "Choose the application's interface language. The choice is saved on this device.",
 "ملاحظة: الوصولات المطبوعة تبقى بالعربية دائماً.": "Note: printed receipts always stay in Arabic.",
 "يدوي...": "Custom...",
 "اللون": "Color"
};

    var STORAGE_KEY = 'gl_lang';
    var AR_RE = /[\u0600-\u06FF]/;
    var lang = 'ar';
    try { if (localStorage.getItem(STORAGE_KEY) === 'en') lang = 'en'; } catch (e) {}

    function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }
    function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    // ---------- بناء جداول البحث ----------
    var exact = new Map();
    var patterns = [];
    Object.keys(EN).forEach(function (k) {
        var nk = norm(k);
        if (/\{\d+\}/.test(nk)) {
            var parts = nk.split(/(\{\d+\})/), re = '^', litLen = 0;
            parts.forEach(function (p, i) {
                if (/^\{\d+\}$/.test(p)) { re += '(.*?)'; return; }
                if (!p) return;
                var lead = i > 0 && p.charAt(0) === ' ';
                var trail = i < parts.length - 1 && p.charAt(p.length - 1) === ' ';
                var core = p.trim();
                litLen += core.length;
                re += (lead ? '\\s*' : '') + escRe(core).replace(/ /g, '\\s+') + (trail ? '\\s*' : '');
            });
            patterns.push({ re: new RegExp(re + '$'), en: EN[k], len: litLen });
        } else {
            exact.set(nk, EN[k]);
        }
    });
    patterns.sort(function (a, b) { return b.len - a.len; });

    var NUM = '[0-9\\u0660-\\u0669][0-9\\u0660-\\u0669.,\\u066B\\u066C]*';
    var NUM_PRE = new RegExp('^(' + NUM + ')\\s+(.+)$');
    var NUM_SUF = new RegExp('^(.+?)\\s+(' + NUM + ')$');

    function tCore(core) {
        if (!core) return core;
        var v = exact.get(core);
        if (v !== undefined) return v;
        for (var i = 0; i < patterns.length; i++) {
            var p = patterns[i], m = p.re.exec(core);
            if (m) {
                return p.en.replace(/\{(\d+)\}/g, function (_, n) {
                    var g = m[+n + 1];
                    return g === undefined ? '' : tCore(norm(g));
                });
            }
        }
        var a = NUM_PRE.exec(core);
        if (a) { var r1 = exact.get(a[2]); if (r1 !== undefined) return a[1] + ' ' + r1; }
        var b = NUM_SUF.exec(core);
        if (b) { var r2 = exact.get(b[1]); if (r2 !== undefined) return r2 + ' ' + b[2]; }
        return core;
    }

    // يحافظ على المسافات الأولى والأخيرة للنص
    function trStr(s) {
        if (lang !== 'en' || !s) return s;
        var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
        var core = norm(m[2]);
        if (!AR_RE.test(core)) return s;
        var t = tCore(core);
        return t === core ? s : m[1] + t + m[3];
    }
    function trMulti(s) {
        if (lang !== 'en') return s;
        return String(s).split('\n').map(trStr).join('\n');
    }

    // ---------- ترجمة الـ DOM ----------
    var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
    var origText = new WeakMap();
    var origAttr = new WeakMap();

    function translateTextNode(n) {
        var v = n.nodeValue;
        if (!v || !AR_RE.test(v)) return;
        var rec = origText.get(n);
        if (rec && rec.tr === v) return;
        var t = trStr(v);
        if (t !== v) { origText.set(n, { orig: v, tr: t }); n.nodeValue = t; }
    }
    function translateAttrs(el) {
        for (var i = 0; i < ATTRS.length; i++) {
            var a = ATTRS[i];
            if (!el.hasAttribute(a)) continue;
            var v = el.getAttribute(a);
            if (!v || !AR_RE.test(v)) continue;
            var rec = origAttr.get(el) || {};
            if (rec[a] && rec[a].tr === v) continue;
            var t = trStr(v);
            if (t !== v) { rec[a] = { orig: v, tr: t }; origAttr.set(el, rec); el.setAttribute(a, t); }
        }
    }
    function isSkipped(el) {
        return !!(el && el.closest && el.closest('[data-no-i18n]'));
    }
    function translateTree(root) {
        if (lang !== 'en' || !root) return;
        if (root.nodeType === 3) { if (!isSkipped(root.parentElement)) translateTextNode(root); return; }
        if (root.nodeType === 1) {
            if (isSkipped(root) || /^(SCRIPT|STYLE)$/.test(root.tagName)) return;
            translateAttrs(root);
            if (root.tagName === 'TEXTAREA') return;
        } else if (root.nodeType !== 11 && root.nodeType !== 9) {
            return;
        }
        var walker = document.createTreeWalker(root, 5, {
            acceptNode: function (node) {
                if (node.nodeType === 1) {
                    if (node.hasAttribute('data-no-i18n') || /^(SCRIPT|STYLE)$/.test(node.tagName)) return 2; // REJECT
                    translateAttrs(node);
                    return node.tagName === 'TEXTAREA' ? 2 : 3; // نترجم placeholder ولا ندخل محتوى الـ textarea
                }
                return 1; // ACCEPT (نص)
            }
        });
        var n;
        while ((n = walker.nextNode())) translateTextNode(n);
    }
    function restoreAll() {
        var w = document.createTreeWalker(document.documentElement, 5);
        var n;
        while ((n = w.nextNode())) {
            if (n.nodeType === 3) {
                var r = origText.get(n);
                if (r && n.nodeValue === r.tr) n.nodeValue = r.orig;
            } else {
                var ra = origAttr.get(n);
                if (ra) { for (var a in ra) { if (n.getAttribute(a) === ra[a].tr) n.setAttribute(a, ra[a].orig); } }
            }
        }
    }

    // ---------- ترجمة فورية عند أي إدخال HTML/نص (بشكل متزامن) ----------
    function patchSetter(proto, prop) {
        var d = Object.getOwnPropertyDescriptor(proto, prop);
        if (!d || !d.set) return;
        Object.defineProperty(proto, prop, {
            configurable: true, enumerable: d.enumerable, get: d.get,
            set: function (v) { d.set.call(this, v); if (lang === 'en') translateTree(this); }
        });
    }
    patchSetter(Element.prototype, 'innerHTML');
    patchSetter(HTMLElement.prototype, 'innerText');
    patchSetter(Node.prototype, 'textContent');

    var _iah = Element.prototype.insertAdjacentHTML;
    Element.prototype.insertAdjacentHTML = function (pos, html) {
        _iah.call(this, pos, html);
        if (lang === 'en') translateTree((pos === 'beforebegin' || pos === 'afterend') && this.parentElement ? this.parentElement : this);
    };

    // رسائل alert / confirm
    var _alert = window.alert.bind(window);
    var _confirm = window.confirm.bind(window);
    window.alert = function (m) { return _alert(trMulti(m)); };
    window.confirm = function (m) { return _confirm(trMulti(m)); };

    // ---------- اللغة والاتجاه ----------
    function updateControls() {
        var btns = document.querySelectorAll('.lang-toggle-btn');
        for (var i = 0; i < btns.length; i++) btns[i].textContent = lang === 'en' ? 'عربي' : 'EN';
        var sel = document.getElementById('appLangSelect');
        if (sel && sel.value !== lang) sel.value = lang;
    }
    function applyAttrs() {
        var h = document.documentElement;
        h.lang = lang;
        h.dir = lang === 'en' ? 'ltr' : 'rtl';
        if (document.body) document.body.classList.toggle('lang-en', lang === 'en');
        updateControls();
    }
    function setLang(l) {
        l = l === 'en' ? 'en' : 'ar';
        if (l === lang) { applyAttrs(); return; }
        if (l === 'ar') { lang = 'ar'; restoreAll(); }
        else { lang = 'en'; }
        try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
        applyAttrs();
        if (lang === 'en') translateTree(document.body);
        document.dispatchEvent(new CustomEvent('gl-language-changed', { detail: { lang: lang } }));
    }

    window.getLang = function () { return lang; };
    window.setLang = setLang;
    window.setAppLanguage = setLang;
    window.toggleLanguage = function () { setLang(lang === 'en' ? 'ar' : 'en'); };
    window.tr = function (s) { return trMulti(s); };                        // ترجمة نص (حسب اللغة الحالية)
    window.trEn = function (s) { var v = exact.get(norm(s)); return v !== undefined ? v : s; }; // الإنكليزي دائماً
    window.getLocale = function () { return lang === 'en' ? 'en-GB' : 'ar-IQ'; };
    window.translateTree = translateTree;

    // ---------- تشغيل ----------
    applyAttrs();
    if (lang === 'en') translateTree(document.body);

    // شبكة أمان: أي عقد تُضاف بطرق ثانية (appendChild, option.text ...)
    new MutationObserver(function (muts) {
        if (lang !== 'en') return;
        for (var i = 0; i < muts.length; i++) {
            var m = muts[i];
            if (m.type === 'childList') {
                for (var j = 0; j < m.addedNodes.length; j++) translateTree(m.addedNodes[j]);
            } else if (m.type === 'characterData') {
                if (!isSkipped(m.target.parentElement)) translateTextNode(m.target);
            } else if (m.type === 'attributes') {
                if (!isSkipped(m.target)) translateAttrs(m.target);
            }
        }
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
})();
