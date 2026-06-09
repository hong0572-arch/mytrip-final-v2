export const dynamic = "force-static";

export default function sitemap() {
    const baseUrl = 'https://tripmaker.tips';

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1.0,
            alternates: {
                languages: {
                    ko: baseUrl,
                    en: `${baseUrl}/?lang=en`,
                },
            },
        },
        {
            url: `${baseUrl}/guide`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
            alternates: {
                languages: {
                    ko: `${baseUrl}/guide`,
                    en: `${baseUrl}/guide?lang=en`,
                },
            },
        },
        {
            url: `${baseUrl}/rectrips`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
            alternates: {
                languages: {
                    ko: `${baseUrl}/rectrips`,
                    en: `${baseUrl}/rectrips?lang=en`,
                },
            },
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.3,
            alternates: {
                languages: {
                    ko: `${baseUrl}/privacy`,
                    en: `${baseUrl}/privacy?lang=en`,
                },
            },
        },
        {
            url: `${baseUrl}/trip`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.7,
            alternates: {
                languages: {
                    ko: `${baseUrl}/trip`,
                    en: `${baseUrl}/trip?lang=en`,
                },
            },
        },
    ];
}