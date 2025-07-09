# Instagram Recipe Extraction

This feature extracts recipes from Instagram food posts by processing Instagram URLs and focusing on pinned comments where recipes are commonly shared.

## Features

### 🎯 Instagram URL Processing
- **URL Validation**: Validates Instagram URLs and extracts content
- **Pinned Comment Detection**: Prioritizes pinned comments (most likely to contain recipes)
- **Fallback Content**: Falls back to captions and general comments if no pinned content found
- **Social Media Cleanup**: Removes emojis, hashtags, mentions, and social media phrases
- **Recipe Validation**: Calculates confidence scores for extracted recipe content
- **Metadata Analysis**: Provides insights about the content structure

### 📊 Enhanced Analysis
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
    "confidence": 0.8,
    "recipeConfidence": 0.9,
    "processingTime": 1500,
    "isComment": true,
    "commentType": "pinned",
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
    "instagramUrl": "https://www.instagram.com/p/example/"
  }
}
```

## How It Works

### 1. URL Processing
The service processes Instagram URLs by:
- Fetching the Instagram post HTML content
- Using web scraping to extract text from comments and captions
- Prioritizing pinned comments for recipe content

### 2. Content Extraction
The service extracts content in this priority order:
1. **Pinned Comments**: Looks for comments with 📌 emoji or "PINNED" text
2. **Captions**: Extracts post captions if no pinned comments found
3. **General Comments**: Searches for recipe-related content in all comments

### 3. Text Analysis
The service analyzes the extracted text to identify Instagram-specific patterns:
- Looks for pinned comment indicators (📌, "PINNED")
- Detects social media elements (emojis, hashtags, mentions)
- Classifies content type based on patterns

### 4. Recipe Extraction
Once Instagram content is identified, the service:
- Removes emojis, hashtags, and social media phrases
- Filters lines based on recipe indicators:
  - Quantity patterns (numbers + units)
  - Ingredient keywords
  - Cooking instruction verbs
- Preserves only recipe-relevant content

### 5. Confidence Calculation
The service calculates recipe confidence based on:
- **Ingredient Patterns** (30%): Presence of quantity + unit combinations
- **Common Ingredients** (30%): Recognition of typical recipe ingredients
- **Cooking Instructions** (20%): Presence of cooking verbs
- **Content Structure** (20%): Appropriate text length and line count

### 6. Ingredient Parsing
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
  const { ingredients, recipeConfidence, commentType } = result.data;
  
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

1. **URL Format**: Ensure Instagram URLs are in the correct format (https://www.instagram.com/p/...)
2. **Content Focus**: Target posts with pinned comments where recipes are most commonly shared
3. **Validation**: Check `recipeConfidence` score before processing
4. **Error Handling**: Handle cases where no recipe content is found
5. **Rate Limiting**: Respect Instagram's rate limits when making requests

## Configuration

### Environment Variables
- `TESSERACT_LANG`: Language for text processing (default: "eng")
- `NODE_ENV`: Environment mode (development/production)

### Performance Considerations
- Web scraping processing time varies with Instagram page complexity
- Instagram posts with clear text yield better results
- Consider caching results for repeated processing
- Be mindful of Instagram's terms of service and rate limits

## Error Handling

The service provides detailed error messages for:
- Invalid Instagram URLs
- Network request failures
- No recipe content found
- Low confidence recipe detection
- Ingredient parsing errors

## Limitations

- **Instagram Terms**: Web scraping may be subject to Instagram's terms of service
- **Rate Limits**: Instagram may rate limit requests
- **Content Changes**: Instagram's HTML structure may change, requiring updates
- **Private Posts**: Cannot access private Instagram posts
- **Authentication**: Some content may require Instagram authentication

## Future Enhancements

- **Instagram API Integration**: Use official Instagram API when available
- **Multi-language Support**: Support for recipes in different languages
- **Recipe Structure Recognition**: Better identification of ingredients vs instructions
- **Image Analysis**: Fallback to image analysis when text extraction fails
- **Batch Processing**: Handle multiple Instagram posts simultaneously 
