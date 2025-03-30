const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PRODUCT_SERVICE = 'http://localhost:3000/products';
const REVIEWS_DB_PATH = path.join(__dirname, 'reviews.json');
const CURRENCY_CONVERSION_SERVICE = 'https://api.exchangerate-api.com/v4/latest/USD';

const CART_DB_PATH = path.join(__dirname, 'cart.json');
const readDatabase = (filePath, defaultData) => {
  console.log('reading from:', filePath);
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`error reading database ${filePath}:`, error);
        return defaultData;
    }
};

const writeDatabase = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`error writing to database ${filePath}:`, error);
        return false;
    }
};

app.get('/api/products', async (req, res) => {
    try {
        const productsResponse = await axios.get(PRODUCT_SERVICE);
        const currencyResponse = await axios.get(CURRENCY_CONVERSION_SERVICE);
        const reviewsData = readDatabase(REVIEWS_DB_PATH, { reviews: [] });
        
        const exchangeRates = currencyResponse.data.rates;
        const products = productsResponse.data.map(product => {
            const productReviews = reviewsData.reviews
                .filter(review => review.productId === product.id)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            
            return {
                ...product,
                euroPrice: (product.price * exchangeRates.EUR).toFixed(2),
                reviews: productReviews
            };
        });
        
        res.status(200).json(products);
    } catch (error) {
        console.error('error fetching products:', error);
        res.status(500).json({ error: 'unable to fetch products', details: error.message });
    }
});

app.get('/api/cart', (req, res) => {
    res.status(200).json(readDatabase(CART_DB_PATH, { items: [] }).items);
});

app.post('/api/cart', (req, res) => {
    const { product } = req.body;
    if (!product) return res.status(400).json({ error: 'product is required' });

    const cart = readDatabase(CART_DB_PATH, { items: [] });
    const existingItem = cart.items.find(item => item.id === product.id);
    existingItem ? existingItem.quantity++ : cart.items.push({ ...product, quantity: 1 });
    
    writeDatabase(CART_DB_PATH, cart) ? res.status(201).json(cart.items) : res.status(500).json({ error: 'failed to update cart' });
});

app.delete('/api/cart/:productId', (req, res) => {
    const productId = parseInt(req.params.productId);
    const cart = readDatabase(CART_DB_PATH, { items: [] });
    cart.items = cart.items.filter(item => item.id !== productId);
    
    writeDatabase(CART_DB_PATH, cart) ? res.status(200).json(cart.items) : res.status(500).json({ error: 'failed to update cart' });
});

app.post('/api/products/:productId/reviews', (req, res) => {
  console.log('review POST received:', req.params, req.body);
  
  try {
      const { nickname, rating, comment } = req.body;
      const productId = parseInt(req.params.productId);
      
      if (!productId) {
          console.log('invalid product id:', req.params.productId);
          return res.status(400).json({ error: 'valid product id is required' });
      }
      
      const numRating = parseInt(rating);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
          console.log('invalid rating:', rating);
          return res.status(400).json({ error: 'rating must be between 1 and 5' });
      }
      
      const reviewsData = readDatabase(REVIEWS_DB_PATH, { reviews: [] });
      const newReview = {
          id: Date.now(),
          productId,
          nickname: nickname || 'Anonymous',
          rating: numRating,
          comment: comment || '',
          date: new Date().toISOString()
      };
      
      console.log('saving review:', newReview);
      reviewsData.reviews.push(newReview);
      
      if (writeDatabase(REVIEWS_DB_PATH, reviewsData)) {
          console.log('review saved');
          return res.status(201).json(newReview);
      } else {
          console.log('failed to save review');
          return res.status(500).json({ error: 'failed to save review' });
      }
  } catch (error) {
      console.error('error in review endpoint:', error);
      return res.status(500).json({ error: 'server error processing review' });
  }
});

app.get('/api/products/:productId/reviews', (req, res) => {
  console.log("received request for product reviews:", req.params.productId);
  const productId = parseInt(req.params.productId);
  const reviewsData = readDatabase(REVIEWS_DB_PATH, { reviews: [] });
  res.status(200).json(reviewsData.reviews.filter(review => review.productId === productId));
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`server running on port ${PORT}`));
