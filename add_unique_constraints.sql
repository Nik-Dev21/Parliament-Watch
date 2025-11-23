-- Add unique constraints to prevent duplicates

-- For news_topics: topic name should be unique
ALTER TABLE news_topics ADD CONSTRAINT news_topics_topic_key UNIQUE (topic);

-- For news_articles: combination of topic + url should be unique
ALTER TABLE news_articles ADD CONSTRAINT news_articles_topic_url_key UNIQUE (topic, url);
