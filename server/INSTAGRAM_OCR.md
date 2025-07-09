# Instagram Recipe Extraction

This feature extracts recipes from Instagram food posts by processing Instagram URLs. It uses the Instagram Graph API as the primary method, with web scraping as a fallback option when enabled.

## Features

### 🎯 Instagram API Integration
- **Primary Method**: Uses Instagram Graph API for reliable data extraction
- **Access Token Support**: Configurable Instagram API access token
- **Structured Data**: Extracts captions and comments with metadata
- **High Confidence**: API data provides higher confidence scores

### 🔄 Fallback Scraping
- **Web Scraping**: Falls back to web scraping when API is unavailable
- **Configurable**: Enable/disable scraping fallback via environment variable
- **URL Validation**: Validates Instagram URLs and extracts content via web scraping
- **Pinned Comment Detection**: Prioritizes pinned comments (most likely to contain recipes)
- **Fallback Content**: Falls back to captions and general comments if no pinned content found

### 📊 Enhanced Analysis
- **Social Media Cleanup**: Removes emojis, hashtags, mentions, and social media phrases
- **Recipe Validation**: Calculates confidence scores for extracted recipe content
- **Metadata Analysis**: Provides insights about the content structure
- **Comment Type Classification**: 
  - `pinned` - Pinned comments (most likely to contain recipes)
  - `regular` - Regular comments
  - `caption` - Post captions
  - `unknown` - Unclassified content
- **Content Metadata**:
  - Emoji detection
  - Hashtag presence
  - Mention detection
  - Line and word counts

### 🔍 Recipe Extraction
- **Smart Filtering**: Removes non-recipe content while preserving ingredients and instructions
- **Pattern Recognition**: Identifies ingredient quantities, units, and cooking instructions
- **Confidence Scoring**: Provides confidence levels for recipe validity

## API Endpoints

### POST `/api/ocr/instagram-recipe`
Extract recipe from Instagram post URL.

**Request:**
- Method: `POST`
- Content-Type: `application/json`
- Body: 
```json
{
  "instagramUrl": "https://www.instagram.com/p/example/"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "originalText": "Raw extracted text...",
    "extractedRecipe": "Cleaned recipe text...",
    "confidence": 0.9,
    "recipeConfidence": 0.9,
    "processingTime": 1500,
    "isComment": true,
    "commentType": "caption",
    "metadata": {
      "hasEmojis": true,
      "hasHashtags": true,
      "hasMentions": false,
      "lineCount": 8,
      "wordCount": 45
    },
    "ingredients": [
      {
        "name": "flour",
        "quantity": 2,
        "unit": "cups",
        "category": "grains",
        "synonyms": ["all-purpose flour", "plain flour"]
      }
    ],
    "totalIngredients": 4,
    "instagramUrl": "https://www.instagram.com/p/example/",
    "source": "api"
  }
}
```

## How It Works

### 1. API-First Approach
The service prioritizes Instagram Graph API:
- **Authentication**: Uses Instagram API access token for authentication
- **Media ID Extraction**: Extracts media ID from Instagram URLs
- **API Request**: Fetches post data including captions and comments
- **Content Analysis**: Analyzes API response for recipe content

### 2. Fallback Scraping
When API is unavailable or fails:
- **Web Scraping**: Fetches Instagram post HTML content
- **Content Extraction**: Extracts text from comments and captions
- **Priority Order**: Pinned comments → Captions → General comments

### 3. Content Processing
Both methods follow the same content processing:
- **Text Analysis**: Identifies Instagram-specific patterns
- **Recipe Extraction**: Filters and cleans recipe content
- **Confidence Calculation**: Scores recipe validity
- **Ingredient Parsing**: Extracts structured ingredient data

### 4. Instagram API Processing
When using the Instagram API:
- **Caption Extraction**: Gets post captions with full text
- **Comment Analysis**: Filters comments for recipe content
- **Content Selection**: Chooses the most relevant content
- **Metadata Preservation**: Maintains original post structure

### 5. Web Scraping Processing
When using web scraping:
- **HTML Parsing**: Uses Cheerio to parse Instagram HTML
- **Pinned Detection**: Looks for pinned comment indicators (📌, "PINNED")
- **Fallback Strategy**: Captions → General comments → Recipe keywords
- **Content Filtering**: Removes non-recipe content

### 6. Recipe Extraction
Once content is identified, the service:
- **Social Media Cleanup**: Removes emojis, hashtags, and social media phrases
- **Recipe Filtering**: Keeps lines with recipe indicators:
  - Quantity patterns (numbers + units)
  - Ingredient keywords
  - Cooking instruction verbs
- **Content Preservation**: Maintains recipe structure and formatting

### 7. Confidence Calculation
The service calculates recipe confidence based on:
- **Ingredient Patterns** (30%): Presence of quantity + unit combinations
- **Common Ingredients** (30%): Recognition of typical recipe ingredients
- **Cooking Instructions** (20%): Presence of cooking verbs
- **Content Structure** (20%): Appropriate text length and line count

### 8. Ingredient Parsing
The extracted recipe text is then processed by the ingredient parser to:
- Extract individual ingredients with quantities and units
- Categorize ingredients
- Provide synonyms for better product matching

## Usage Examples

### Frontend Integration
```javascript
// Extract recipe from Instagram URL
const response = await fetch('/api/ocr/instagram-recipe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    instagramUrl: 'https://www.instagram.com/p/example/'
  })
});

const result = await response.json();

if (result.success) {
  const { ingredients, recipeConfidence, commentType, source } = result.data;
  
  console.log(`Recipe extracted using: ${source}`);
  
  if (recipeConfidence > 0.7) {
    // High confidence recipe found
    console.log(`Found recipe in ${commentType} comment`);
    console.log(`Ingredients: ${ingredients.length}`);
  }
}
```

### cURL Example
```bash
curl -X POST http://localhost:3001/api/ocr/instagram-recipe \
  -H "Content-Type: application/json" \
  -d '{
    "instagramUrl": "https://www.instagram.com/p/example/"
  }'
```

## Best Practices

1. **Instagram API Setup**: Configure Instagram API access token for best results
2. **URL Format**: Ensure Instagram URLs are in the correct format (https://www.instagram.com/p/...)
3. **Content Focus**: Target posts with clear captions or comments containing recipes
4. **Validation**: Check `recipeConfidence` score before processing
5. **Error Handling**: Handle cases where no recipe content is found
6. **Rate Limiting**: Respect Instagram's API rate limits and terms of service

## Configuration

### Environment Variables
- `INSTAGRAM_ACCESS_TOKEN`: Instagram Graph API access token
- `ENABLE_SCRAPING_FALLBACK`: Enable scraping fallback (true/false)
- `NODE_ENV`: Environment mode (development/production)

### Instagram API Setup
1. **Create Facebook App**: Set up a Facebook Developer account and create an app
2. **Configure Instagram Basic Display**: Add Instagram Basic Display to your app
3. **Generate Access Token**: Create a long-lived access token
4. **Set Environment Variable**: Add the token to your `.env` file

### Performance Considerations
- **API Priority**: Instagram API provides faster, more reliable results
- **Fallback Strategy**: Web scraping is slower but works without API access
- **Caching**: Consider caching results for repeated processing
- **Rate Limits**: Instagram API has rate limits; implement appropriate throttling

## Error Handling

The service provides detailed error messages for:
- **API Errors**: Invalid access token, rate limits, API failures
- **URL Issues**: Invalid Instagram URLs, unsupported formats
- **Content Issues**: No recipe content found, low confidence detection
- **Network Issues**: Connection failures, timeout errors
- **Parsing Errors**: Ingredient parsing failures

## Limitations

### Instagram API Limitations
- **Access Required**: Requires Instagram API access token
- **Content Scope**: Limited to public posts and authorized content
- **Rate Limits**: API has usage limits and quotas
- **Data Availability**: Some content may not be accessible via API

### Web Scraping Limitations
- **Terms of Service**: Web scraping may be subject to Instagram's terms
- **Rate Limits**: Instagram may rate limit scraping requests
- **Content Changes**: Instagram's HTML structure may change, requiring updates
- **Private Posts**: Cannot access private Instagram posts
- **Authentication**: Some content may require Instagram authentication

### General Limitations
- **Text-Only**: This service only processes text content from Instagram posts, not images
- **Language Support**: Currently optimized for English content
- **Recipe Recognition**: May miss complex or non-standard recipe formats

## Future Enhancements

- **Multi-language Support**: Support for recipes in different languages
- **Recipe Structure Recognition**: Better identification of ingredients vs instructions
- **Batch Processing**: Handle multiple Instagram posts simultaneously
- **Advanced Filtering**: More sophisticated recipe content detection
- **Image Analysis**: Future integration with image-based recipe extraction 
