const RSS2JSON_ENDPOINT = 'https://api.rss2json.com/v1/api.json?rss_url=';

const FEEDS = {
    'General': 'https://www.tagesschau.de/xml/rss2',
    'World': 'https://rss.dw.com/xml/rss-de-all',
    'Science': 'https://www.spektrum.de/alias/rss/spektrum-de/996406',
    'Culture': 'https://rss.dw.com/xml/rss-de-kultur',
    'Technology': 'https://www.heise.de/rss/heise-atom.xml'
};

export const getCategories = () => Object.keys(FEEDS);

export const fetchNewsByCategory = async (category) => {
    const feedUrl = FEEDS[category];
    if (!feedUrl) throw new Error('Invalid category');

    try {
        const response = await fetch(`${RSS2JSON_ENDPOINT}${encodeURIComponent(feedUrl)}`);
        const data = await response.json();

        if (data.status !== 'ok') throw new Error('Failed to fetch RSS feed');

        return data.items.map(item => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            content: item.description || item.content,
            source: data.feed.title
        }));
    } catch (error) {
        console.error('Error fetching news:', error);
        throw error;
    }
};
