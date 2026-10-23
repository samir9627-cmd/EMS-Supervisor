// ═══════════════════════════════════════════════════════════
// shared/auth.js - وحدة المصادقة الموحدة لنظام الإسعاف الذكي
// ═══════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC3m9o6Qx7m6r1b08DZIkyttArIihZL8n8",
  authDomain: "ems-supervisor.firebaseapp.com",
  projectId: "ems-supervisor",
  storageBucket: "ems-supervisor.firebasestorage.app",
  messagingSenderId: "230655268524",
  appId: "1:230655268524:web:5043a458af3d79989ff109"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// مفتاح سري داخلي (لن يراه المشرف، يُستخدم لإنشاء الحسابات الوهمية)
const INTERNAL_SECRET = "EMS_SECRET_PASSWORD_2026!";

/**
 * دالة تحويل الكود إلى بريد إلكتروني وهمي
 * مثال: SUP-1234 -> sup-1234@ems-system.local
 */
function codeToEmail(code) {
    // إزالة أي مسافات وتحويل الحروف لصغيرة
    const cleanCode = code.trim().toLowerCase().replace(/\s+/g, '');
    return `${cleanCode}@ems-system.local`;
}

/**
 * تسجيل دخول المشرف باستخدام الكود
 */
export async function loginWithCode(code) {
    const email = codeToEmail(code);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, INTERNAL_SECRET);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("Login Error:", error);
        let msg = "كود الدخول غير صحيح أو غير مفعل.";
        if (error.code === 'auth/network-request-failed') msg = "خطأ في الاتصال بالإنترنت.";
        return { success: false, message: msg };
    }
}

/**
 * تسجيل خروج
 */
export async function logoutUser() {
    try {
        await signOut(auth);
        return true;
    } catch (error) {
        console.error("Logout Error:", error);
        return false;
    }
}

/**
 * إنشاء حساب جديد (تُستخدم من قبل Admin فقط)
 */
export async function createUserWithCode(code) {
    const email = codeToEmail(code);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, INTERNAL_SECRET);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("Create User Error:", error);
        if (error.code === 'auth/email-already-in-use') {
            return { success: false, message: "هذا الكود مستخدم بالفعل." };
        }
        return { success: false, message: "فشل إنشاء الحساب: " + error.message };
    }
}

/**
 * مراقبة حالة الدخول (للتأكد من أن المستخدم مسجل)
 */
export function checkAuthState(callback) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // استخراج الكود من البريد (إزالة @ems-system.local)
            const code = user.email.split('@')[0].toUpperCase();
            callback(code, user);
        } else {
            callback(null, null);
        }
    });
}
