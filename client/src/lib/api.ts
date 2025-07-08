import axios from "axios";

// Create axios instance with default config
export const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem("authToken");
      window.location.href = "/login";
    }

    if (error.response?.status === 500) {
      console.error("Server error:", error.response.data);
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // Recipes
  parseRecipe: "/recipes/parse",
  createRecipe: "/recipes",
  getRecipes: "/recipes",
  getRecipe: (id: string) => `/recipes/${id}`,
  updateRecipe: (id: string) => `/recipes/${id}`,
  deleteRecipe: (id: string) => `/recipes/${id}`,
  createShoppingList: (id: string) => `/recipes/${id}/shopping-list`,

  // OCR
  extractText: "/ocr/extract",
  extractTextFromUrl: "/ocr/extract-url",
  parseRecipeImage: "/ocr/parse-recipe",
  parseRecipeFromUrl: "/ocr/parse-recipe-url",
  ocrStatus: "/ocr/status",

  // Ingredients
  searchProducts: "/ingredients/search-products",
  getIngredientProducts: (id: string) => `/ingredients/${id}/products`,
  getIngredients: "/ingredients",

  // Stores
  getStores: "/stores",
  getStore: (id: string) => `/stores/${id}`,
  getStorePreferences: "/stores/preferences",
  createStorePreference: "/stores/preferences",
  deleteStorePreference: (storeId: string) => `/stores/preferences/${storeId}`,

  // Shopping Lists
  getShoppingLists: "/shopping-lists",
  getShoppingList: (id: string) => `/shopping-lists/${id}`,
  createShoppingList: "/shopping-lists",
  updateShoppingList: (id: string) => `/shopping-lists/${id}`,
  deleteShoppingList: (id: string) => `/shopping-lists/${id}`,
  exportShoppingList: (id: string) => `/shopping-lists/${id}/export`,
  getCartLinks: (id: string) => `/shopping-lists/${id}/cart-links`,

  // Users
  register: "/users/register",
  login: "/users/login",
  getProfile: "/users/profile",
  updateProfile: "/users/profile",
};

// API functions
export const apiService = {
  // Recipe parsing
  parseRecipe: async (recipeText: string) => {
    const response = await api.post(endpoints.parseRecipe, { recipeText });
    return response.data;
  },

  // OCR
  parseRecipeImage: async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await api.post(endpoints.parseRecipeImage, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  parseRecipeFromUrl: async (imageUrl: string) => {
    const response = await api.post(endpoints.parseRecipeFromUrl, { imageUrl });
    return response.data;
  },

  // Product search
  searchProducts: async (
    ingredientName: string,
    quantity: number,
    unit?: string,
    options?: any
  ) => {
    const response = await api.post(endpoints.searchProducts, {
      ingredientName,
      quantity,
      unit,
      options,
    });
    return response.data;
  },

  // Shopping lists
  createShoppingList: async (data: any) => {
    const response = await api.post(endpoints.createShoppingList, data);
    return response.data;
  },

  getShoppingLists: async (params?: any) => {
    const response = await api.get(endpoints.getShoppingLists, { params });
    return response.data;
  },

  exportShoppingList: async (id: string, format: string) => {
    const response = await api.post(endpoints.exportShoppingList(id), {
      format,
    });
    return response.data;
  },

  // Stores
  getStores: async () => {
    const response = await api.get(endpoints.getStores);
    return response.data;
  },

  // Auth
  login: async (email: string, password: string) => {
    const response = await api.post(endpoints.login, { email, password });
    return response.data;
  },

  register: async (email: string, name: string, password: string) => {
    const response = await api.post(endpoints.register, {
      email,
      name,
      password,
    });
    return response.data;
  },
};
