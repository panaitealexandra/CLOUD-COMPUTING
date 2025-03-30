import React, { useState, useEffect } from 'react'; 
import axios from 'axios';
import './App.css';

const ProductManagementApp = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [reviewForm, setReviewForm] = useState({
    productId: null,
    nickname: '',
    rating: 5,
    comment: ''
  });
  
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsResponse, cartResponse] = await Promise.all([
          axios.get('http://localhost:5000/api/products'),
          axios.get('http://localhost:5000/api/cart')
        ]);

        setProducts(productsResponse.data);
        setCart(cartResponse.data);
        setLoading(false);
      } catch (err) {
        setError('failed to fetch data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const addToCart = async (product) => {
    try {
      const response = await axios.post('http://localhost:5000/api/cart', { product });
      setCart(response.data);
    } catch (err) {
      setError('failed to add product to cart');
    }
  };

  const removeFromCart = async (productId) => {
    try {
      const response = await axios.delete(`http://localhost:5000/api/cart/${productId}`);
      setCart(response.data);
    } catch (err) {
      setError('failed to remove product from cart');
    }
  };
  
  const startReview = (productId) => {
    setReviewForm({ ...reviewForm, productId });
    setShowReviewForm(true);
  };
  
  const handleReviewChange = (e) => {
    const { name, value } = e.target;
    setReviewForm({ ...reviewForm, [name]: value });
  };
  
  const submitReview = async (e) => {
    e.preventDefault();
    
    try {
        const reviewData = {
            ...reviewForm,
            rating: parseInt(reviewForm.rating)
        };
        
        console.log('about to submit to URL:', `http://localhost:5000/api/products/${reviewForm.productId}/reviews`);
        console.log('with data:', reviewData);
        console.log('product id:', reviewForm.productId);
        const response = await axios.post(
            `http://localhost:5000/api/products/${reviewForm.productId}/reviews`, 
            reviewData
        );
        
        console.log('review submitted:', response.data);
        
        const productsResponse = await axios.get('http://localhost:5000/api/products');
        setProducts(productsResponse.data);
        setReviewForm({ productId: null, nickname: '', rating: 5, comment: '' });
        setShowReviewForm(false);
    } catch (err) {
        console.error('full error object:', err);
        console.error('error status:', err.response?.status);
        console.error('error data:', err.response?.data);
        setError('failed to submit review');
    }
};
  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="container">
      <h1>Product Management App</h1>
      
      {showReviewForm && (
        <div className="review-form-container">
          <div className="review-form">
            <h3>Add Your Review</h3>
            <form onSubmit={submitReview}>
              <div className="form-group">
                <label>Nickname (optional):</label>
                <input 
                  type="text" 
                  name="nickname" 
                  value={reviewForm.nickname} 
                  onChange={handleReviewChange} 
                  placeholder="Anonymous"
                />
              </div>
              
              <div className="form-group">
                <label>Rating:</label>
                <select name="rating" value={reviewForm.rating} onChange={handleReviewChange}>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Comment:</label>
                <textarea 
                  name="comment" 
                  value={reviewForm.comment} 
                  onChange={handleReviewChange}
                  placeholder="Share your thoughts about this product"
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn">Submit Review</button>
                <button 
                  type="button" 
                  className="btn cancel" 
                  onClick={() => setShowReviewForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <div className="products-section">
        <h2>Available Products</h2>
        <div className="product-grid">
          {products.map(product => (
            <div key={product.id} className="product-card">
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <p>Price: ${product.price} (€{product.euroPrice})</p>
              <button className="btn" onClick={() => addToCart(product)}>Add to Cart</button>
              
              <div className="reviews">
                <h4>Reviews</h4>
                {product.reviews && product.reviews.length > 0 ? (
                  <>
                    {product.reviews.map(review => (
                      <div key={review.id} className="review">
                        <div className="review-header">
                          <span className="reviewer">{review.nickname}</span>
                          <span className="rating">
                            {Array(review.rating).fill('★').join('')}
                            {Array(5 - review.rating).fill('☆').join('')}
                          </span>
                        </div>
                        <p className="review-date">
                          {new Date(review.date).toLocaleDateString()}
                        </p>
                        <p className="review-comment">{review.comment}</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <p>No reviews yet. Be the first to review!</p>
                )}
                <button 
                  className="btn review-btn" 
                  onClick={() => startReview(product.id)}
                >
                  Write a Review
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="cart-section">
        <h2>Shopping Cart</h2>
        {cart.length === 0 ? (
          <p>Your cart is empty</p>
        ) : (
          <>
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <span>{item.name}</span>
                <span>Quantity: {item.quantity}</span>
                <button className="btn remove" onClick={() => removeFromCart(item.id)}>Remove</button>
              </div>
            ))}
            <p className="total-items">Total Items: {cart.reduce((sum, item) => sum + item.quantity, 0)}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductManagementApp;