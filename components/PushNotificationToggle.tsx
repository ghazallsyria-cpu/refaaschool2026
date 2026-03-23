‘use client’;

import { Bell, BellOff } from ‘lucide-react’;
import { usePushNotifications } from ‘@/hooks/usePushNotifications’;
import { useEffect, useState } from ‘react’;

export function PushNotificationToggle() {
const { permission, subscribed, loading, subscribe, unsubscribe } = usePushNotifications();
const [supported, setSupported] = useState(true);

useEffect(() => {
// نتحقق من الدعم بعد التحميل فقط
if (typeof window !== ‘undefined’) {
setSupported(‘PushManager’ in window && ‘serviceWorker’ in navigator);
}
}, []);

if (!supported) {
return (
<div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 text-slate-400 text-xs font-bold">
<BellOff className="h-4 w-4" />
<span>الإشعارات غير مدعومة</span>
</div>
);
}

if (permission === ‘denied’) {
return (
<div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-bold">
<BellOff className="h-4 w-4" />
<span>الإشعارات محجوبة</span>
</div>
);
}

if (subscribed) {
return (
<button
onClick={unsubscribe}
disabled={loading}
className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all text-xs font-bold"
>
<Bell className="h-4 w-4" />
<span>الإشعارات مفعّلة</span>
</button>
);
}

return (
<button
onClick={subscribe}
disabled={loading}
className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all text-xs font-bold"
>
{loading ? (
<div className="h-4 w-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
) : (
<Bell className="h-4 w-4" />
)}
<span>{loading ? ‘جاري التفعيل…’ : ‘تفعيل الإشعارات’}</span>
</button>
);
}
