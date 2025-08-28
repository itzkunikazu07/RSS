const fs = require('fs');
const path = require('path');
const xmlbuilder = require('xmlbuilder');
const { instagramGetUrl } = require("instagram-url-direct");

// File paths
const linksFilePath = path.join(__dirname, 'Files/reels_links.txt');
const historyFilePath = path.join(__dirname, 'history.json');
const rssFilePath = path.join(__dirname, 'rss_feed.xml');

// Load existing history
let history = [];
if (fs.existsSync(historyFilePath)) {
    history = JSON.parse(fs.readFileSync(historyFilePath, 'utf-8'));
}

// Load links from the file
let links = [];
if (fs.existsSync(linksFilePath)) {
    links = fs.readFileSync(linksFilePath, 'utf-8').split('\n').filter(Boolean);
}

// Filter out duplicates
const newLinks = links.filter(link => !history.includes(link));

// Take the latest 20 links
const latestLinks = newLinks.slice(0, 25);

async function buildRSS() {
    const rss = xmlbuilder.create('rss', { version: '1.0', encoding: 'UTF-8' })
        .att('version', '2.0')
        .ele('channel')
        .ele('title', 'Instagram Reels Feed')
        .up()
        .ele('link', 'https://instagram.com')
        .up()
        .ele('description', 'Latest Instagram Reels')
        .up();

    for (const link of latestLinks) {
        try {
            const data = await instagramGetUrl(link);

            let caption = '';
            if (data && data.post_info && data.post_info.caption) {
                caption = data.post_info.caption;
            }

            let videoUrl = '';
            let thumbnail = '';
            if (data && data.media_details && data.media_details.length > 0) {
                videoUrl = data.media_details[0].url || '';
                thumbnail = data.media_details[0].thumbnail || '';
            }

            const item = rss.ele('item')
                .ele('title', caption || 'Instagram Reel')
                .up()
                .ele('link', link)
                .up()
                .ele('description', `${caption || 'Watch the Instagram Reel'}${videoUrl ? `<br><a href="${videoUrl}">Direct Video</a>` : ''}`)
                .up()
                .ele('guid', link)
                .up()
                .ele('pubDate', new Date().toUTCString())
                .up();

            if (thumbnail) {
                item.ele('media:thumbnail', { url: thumbnail }).up();
            }
            item.up();
        } catch (err) {
            // Skip on error, no extra logging
            continue;
        }
    }

    fs.writeFileSync(rssFilePath, rss.end({ pretty: true }));
    history = [...history, ...latestLinks];
    fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2));
}

buildRSS();
