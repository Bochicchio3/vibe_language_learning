"""
News fetching and parsing service
Better than RSS2JSON - extracts full article content
"""

import feedparser
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
from datetime import datetime
import time

from config import config


class NewsParser:
    """Fetch and parse news from RSS feeds"""
    
    # German news feeds
    FEEDS = {
        "General": "https://www.tagesschau.de/xml/rss2",
        "World": "https://rss.dw.com/xml/rss-de-all",
        "Science": "https://www.spektrum.de/alias/rss/spektrum-de/996406",
        "Culture": "https://rss.dw.com/xml/rss-de-kultur",
        "Technology": "https://www.heise.de/rss/heise-atom.xml"
    }
    
    # Simple cache
    _cache = {}
    _cache_timestamps = {}
    
    @staticmethod
    def get_categories() -> List[str]:
        """Get available news categories"""
        return list(NewsParser.FEEDS.keys())
    
    @staticmethod
    def fetch_news(category: str, limit: int = 10) -> List[Dict]:
        """
        Fetch news articles for a category
        
        Args:
            category: News category
            limit: Maximum number of articles
            
        Returns:
            List of article dicts
        """
        # Check cache
        cache_key = f"{category}_{limit}"
        if cache_key in NewsParser._cache:
            cache_time = NewsParser._cache_timestamps.get(cache_key, 0)
            if time.time() - cache_time < config.NEWS_CACHE_TTL:
                return NewsParser._cache[cache_key]
        
        feed_url = NewsParser.FEEDS.get(category)
        if not feed_url:
            raise ValueError(f"Invalid category: {category}")
        
        try:
            # Parse RSS feed
            feed = feedparser.parse(feed_url)
            
            articles = []
            for entry in feed.entries[:limit]:
                article = {
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "published": entry.get("published", ""),
                    "summary": entry.get("summary", entry.get("description", "")),
                    "source": feed.feed.get("title", category)
                }
                
                # Try to extract full content
                if article["link"]:
                    try:
                        full_content = NewsParser._extract_article_content(article["link"])
                        if full_content:
                            article["content"] = full_content
                        else:
                            article["content"] = article["summary"]
                    except:
                        article["content"] = article["summary"]
                else:
                    article["content"] = article["summary"]
                
                articles.append(article)
            
            # Cache results
            NewsParser._cache[cache_key] = articles
            NewsParser._cache_timestamps[cache_key] = time.time()
            
            return articles
            
        except Exception as e:
            raise Exception(f"Failed to fetch news: {str(e)}")
    
    @staticmethod
    def _extract_article_content(url: str) -> Optional[str]:
        """
        Extract full article text from URL
        
        Args:
            url: Article URL
            
        Returns:
            Extracted text or None
        """
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "header", "footer", "aside"]):
                script.decompose()
            
            # Try common article selectors
            article_selectors = [
                "article",
                ".article-content",
                ".article-body",
                ".post-content",
                ".entry-content",
                "main",
                ".content"
            ]
            
            for selector in article_selectors:
                article_elem = soup.select_one(selector)
                if article_elem:
                    # Get text from paragraphs
                    paragraphs = article_elem.find_all('p')
                    if paragraphs:
                        text = '\n\n'.join([p.get_text().strip() for p in paragraphs if p.get_text().strip()])
                        if len(text) > 200:  # Minimum length check
                            return text
            
            # Fallback: get all paragraphs
            paragraphs = soup.find_all('p')
            if paragraphs:
                text = '\n\n'.join([p.get_text().strip() for p in paragraphs if p.get_text().strip()])
                if len(text) > 200:
                    return text
            
            return None
            
        except Exception as e:
            print(f"Failed to extract article content: {str(e)}")
            return None
    
    @staticmethod
    def clear_cache():
        """Clear the news cache"""
        NewsParser._cache.clear()
        NewsParser._cache_timestamps.clear()
