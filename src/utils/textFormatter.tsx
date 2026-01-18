import { openExternal } from './openLink';

export const formatAbstract = (text: string) => {
    if (!text) return null;

    // GIẢI THÍCH REGEX:
    // https?:\/\/      -> Bắt đầu bằng http:// hoặc https://
    // [^\s]+           -> Lấy tất cả ký tự không phải khoảng trắng (greedy)
    // [^.,;)\s]        -> Ký tự CUỐI CÙNG bắt buộc KHÔNG ĐƯỢC là dấu chấm, phẩy, chấm phẩy, đóng ngoặc hoặc khoảng trắng.
    // Điều này giúp loại bỏ dấu chấm câu ở cuối URL.
    const urlRegex = /(https?:\/\/[^\s]+[^.,;)\s])/g;

    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            let className = "font-medium hover:underline cursor-pointer transition-colors ";
            if (part.includes("github.com")) {
                className += "text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 px-1 rounded";
            } else if (part.includes("huggingface.co")) {
                className += "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded";
            } else {
                className += "text-blue-600 dark:text-blue-400";
            }

            return (
                <span 
                    key={index} 
                    onClick={(e) => {
                        e.stopPropagation();
                        openExternal(part);
                    }}
                    className={className}
                    title={`Open: ${part}`}
                >
                    {part}
                </span>
            );
        }
        return <span key={index}>{part}</span>;
    });
};