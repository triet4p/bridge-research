// src/utils/openLink.ts
import { openUrl } from '@tauri-apps/plugin-opener';

export const openExternal = async (url: string) => {
    if (!url) return;
    
    console.log("Opening URL:", url); // Debug log

    try {
        // Thử dùng Tauri Opener (Mở trình duyệt mặc định của OS)
        await openUrl(url);
    } catch (error) {
        console.warn("Tauri opener failed, falling back to window.open:", error);
        // Fallback: Mở tab mới (hoạt động tốt trên web browser thường)
        window.open(url, '_blank', 'noopener,noreferrer');
    }
};