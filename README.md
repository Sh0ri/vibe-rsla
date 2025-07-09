# 🛒 Recipe Shopping List App

Transform any recipe into a smart shopping list with direct links to purchase ingredients from your favorite online stores.

## ✨ Features

- **Recipe Input**: Text or URL input (including Instagram posts)
- **Instagram Recipe Extraction**: Extract recipes from Instagram food posts via URL
- **Smart Ingredient Parsing**: NLP-powered extraction of ingredients, quantities, and units
- **Store Integration**: Connect with Amazon, Carrefour, Monoprix, and local grocery stores
- **Product Matching**: Automatic product suggestions with price comparison
- **Shopping List Management**: Group ingredients, remove pantry items, export lists
- **Cart Integration**: Deep links to pre-filled shopping carts

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL (optional, SQLite for development)

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository>
cd Fun-ai-project-1
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. **Start the development servers**
```bash
# Start backend
npm run dev:server

# Start frontend (in new terminal)
npm run dev:client
```

4. **Open your browser**
Navigate to `http://localhost:3000`

## 🏗️ Architecture

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API calls and external services
│   │   └── utils/         # Utility functions
├── server/                # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── services/      # Business logic
│   │   ├── models/        # Data models
│   │   └── middleware/    # Express middleware
└── shared/                # Shared types and utilities
```

## 🔧 Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (production), SQLite (development)
- **ORM**: Drizzle ORM
- **NLP**: OpenAI API, spaCy for ingredient parsing
- **E-commerce**: Amazon Product API, Open Food Facts API
- **Instagram Scraping**: Web scraping for Instagram recipe extraction

## 📱 Usage

1. **Input Recipe**: Paste text or provide URL (including Instagram posts)
2. **Extract from Instagram**: Automatically extract recipes from Instagram food posts
3. **Parse Ingredients**: AI extracts ingredients with quantities
4. **Select Store**: Choose your preferred online grocery store
5. **Review Products**: Browse suggested products with prices
6. **Generate List**: Create shopping list with direct purchase links
7. **Export**: Download list or add items to cart

## 🔐 Environment Variables

```env
# OpenAI API for ingredient parsing
OPENAI_API_KEY=your_openai_key

# Amazon Product Advertising API
AMAZON_ACCESS_KEY=your_amazon_key
AMAZON_SECRET_KEY=your_amazon_secret
AMAZON_ASSOCIATE_TAG=your_associate_tag

# Database
DATABASE_URL=postgresql://user:pass@localhost/dbname

# Server
PORT=3001
NODE_ENV=development
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
