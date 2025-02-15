# Email to RSS Worker

A Cloudflare Worker service that converts email newsletters into RSS feeds. It receives emails, processes them using AI to extract articles, and provides an RSS feed of the content.

## Features

- Converts email newsletters into RSS feeds
- Handles newsletter signup confirmation emails
- Stores processed articles in Cloudflare KV storage
- Provides RSS and JSON endpoints for accessing articles

## Prerequisites

- Node.js installed
- Cloudflare account
- OpenAI API key for AI processing

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and add your OpenAI API key:

```sh
OPENAI_API_KEY=your_key_here
```

## API Endpoints

```
GET /rss?email=user@example.com - Get RSS feed for a specific email
GET /items?email=user@example.com - Get JSON list of articles
POST /debug/process-html - Debug endpoint for processing HTML content
POST /debug/process-email - Debug endpoint for processing raw emails
```

## Email Processing

The service automatically processes incoming emails through Cloudflare Email Workers. It:

- Determines if the email is a signup confirmation
- Extracts articles from newsletter content
- Stores processed articles in KV storage
- Makes content available via RSS feed
