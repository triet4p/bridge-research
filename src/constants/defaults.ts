
export const ARXIV_CATEGORIES = [
    { id: 'cs.AI', label: 'Artificial Intelligence', desc: 'Trí tuệ nhân tạo tổng quát' },
    { id: 'cs.LG', label: 'Machine Learning', desc: 'Học máy, Deep Learning' },
    { id: 'cs.CV', label: 'Computer Vision', desc: 'Thị giác máy tính, xử lý ảnh' },
    { id: 'cs.CL', label: 'Computation & Language', desc: 'NLP, Xử lý ngôn ngữ tự nhiên' },
    { id: 'cs.RO', label: 'Robotics', desc: 'Robot học' },
    { id: 'cs.CR', label: 'Cryptography & Security', desc: 'Bảo mật và mã hóa' },
    { id: 'cs.SE', label: 'Software Engineering', desc: 'Công nghệ phần mềm' },
    { id: 'cs.HC', label: 'Human-Computer Interaction', desc: 'Tương tác người-máy' },
    { id: 'cs.MA', label: 'Multiagent Systems', desc: 'Hệ thống đa tác tử' },
    { id: 'stat.ML', label: 'Statistics Machine Learning', desc: 'Học máy thống kê' }
];

export const DEFAULT_PAGE_SIZE = 20;

export const DEFAULT_DATE_RANGE = {
    getStartDate: () => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    },
    getEndDate: () => new Date().toISOString().split('T')[0]
};

// Helper để lấy tên đầy đủ từ mã
export const getCategoryLabel = (id: string) => {
    const cat = ARXIV_CATEGORIES.find(c => c.id === id);
    return cat ? cat.label : id;
};

export const getCategoryDesc = (id: string) => {
    const cat = ARXIV_CATEGORIES.find(c => c.id === id);
    return cat ? cat.desc : "";
};