export default function sitemap() {
    const baseUrl = 'https://mytrip2.pro';

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        // 나중에 페이지가 늘어나면 여기에 추가하면 됩니다.
    ];
}