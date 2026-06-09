export const dynamic = "force-static";

export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin', '/api/', '/join/', '/share/live_safemode'],
        },
        sitemap: 'https://tripmaker.tips/sitemap.xml',
    }
}