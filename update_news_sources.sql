-- Clear existing news sources and insert curated list
DELETE FROM news_sources;

-- Canadian Left-leaning sources
INSERT INTO news_sources (name, rss_feed_url, bias_rating) VALUES
('CBC News', 'https://www.cbc.ca/cmlink/rss-topstories', 'Left'),
('Toronto Star', 'https://www.thestar.com/search/?f=rss&t=article&l=100&s=start_time&sd=desc', 'Left');

-- Canadian Center sources
INSERT INTO news_sources (name, rss_feed_url, bias_rating) VALUES
('Global News', 'https://globalnews.ca/feed/', 'Center'),
('CTV News', 'https://www.ctvnews.ca/rss/ctvnews-ca-top-stories-public-rss-1.822009', 'Center'),
('The Globe and Mail', 'https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/canada/', 'Center'),
('CP24', 'https://www.cp24.com/toronto?format=rss', 'Center');

-- Canadian Right-leaning sources
INSERT INTO news_sources (name, rss_feed_url, bias_rating) VALUES
('National Post', 'https://nationalpost.com/feed/', 'Right'),
('Toronto Sun', 'https://torontosun.com/category/news/feed', 'Right');
