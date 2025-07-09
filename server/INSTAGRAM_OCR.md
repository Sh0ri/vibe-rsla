# Instagram OCR Recipe Extraction

This feature enhances the OCR service to specifically extract recipes from Instagram food posts, with a focus on pinned comments where recipes are commonly shared.

## Features

### 🎯 Instagram-Specific Processing
- **Comment Detection**: Identifies pinned comments, regular comments, captions, and other Instagram content
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
Extract recipe from Instagram food post image.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `image` file

**Response:**
```json
{
  "success": true,
  "data": {
    "originalText": "Raw OCR text...",
    "extractedRecipe": "Cleaned recipe text...",
    "confidence": 0.85,
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
    "fileInfo": {
      "originalName": "instagram_post.jpg",
      "size": 1024000,
      "mimetype": "image/jpeg"
    }
  }
}
```

## How It Works

### 1. Text Analysis
The service analyzes the OCR-extracted text to identify Instagram-specific patterns:
- Looks for pinned comment indicators (📌, "PINNED")
- Detects social media elements (emojis, hashtags, mentions)
- Classifies content type based on patterns

### 2. Recipe Extraction
Once Instagram content is identified, the service:
- Removes emojis, hashtags, and social media phrases
- Filters lines based on recipe indicators:
  - Quantity patterns (numbers + units)
  - Ingredient keywords
  - Cooking instruction verbs
- Preserves only recipe-relevant content

### 3. Confidence Calculation
The service calculates recipe confidence based on:
- **Ingredient Patterns** (30%): Presence of quantity + unit combinations
- **Common Ingredients** (30%): Recognition of typical recipe ingredients
- **Cooking Instructions** (20%): Presence of cooking verbs
- **Content Structure** (20%): Appropriate text length and line count

### 4. Ingredient Parsing
The extracted recipe text is then processed by the ingredient parser to:
- Extract individual ingredients with quantities and units
- Categorize ingredients
- Provide synonyms for better product matching

## Usage Examples

### Frontend Integration
```javascript
// Upload Instagram post image
const formData = new FormData();
formData.append('image', imageFile);

const response = await fetch('/api/ocr/instagram-recipe', {
  method: 'POST',
  body: formData
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

### Best Practices
1. **Image Quality**: Ensure clear, high-resolution images for better OCR accuracy
2. **Content Focus**: Target pinned comments where recipes are most commonly shared
3. **Validation**: Check `recipeConfidence` score before processing
4. **Fallback**: Use regular OCR endpoints for non-Instagram content

## Configuration

### Environment Variables
- `TESSERACT_LANG`: Language for OCR processing (default: "eng")
- `UPLOAD_PATH`: File upload directory (default: "./uploads")
- `MAX_FILE_SIZE`: Maximum file size in bytes (default: 10MB)

### Performance Considerations
- OCR processing time varies with image complexity
- Instagram posts with clear text yield better results
- Consider caching results for repeated processing

## Error Handling

The service provides detailed error messages for:
- Invalid image files
- OCR processing failures
- Low confidence recipe detection
- Ingredient parsing errors

## Future Enhancements

- **Multi-language Support**: Support for recipes in different languages
- **Recipe Structure Recognition**: Better identification of ingredients vs instructions
- **Image Preprocessing**: Automatic image enhancement for better OCR
- **Batch Processing**: Handle multiple Instagram posts simultaneously 
