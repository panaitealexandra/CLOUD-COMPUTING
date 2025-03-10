const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

//database
const DB_PATH = path.join(__dirname, 'database.json');

if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ products: [] }));
}

const readDatabase = () => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { products: [] };
  }
};

const writeDatabase = (data) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to database:', error);
    return false;
  }
};


const generateId = (products) => {
  if (products.length === 0) return 1;
  return Math.max(...products.map(p => p.id)) + 1;
};

const parseBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {};
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', (error) => {
      reject(error);
    });
  });
};

const sendResponse = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

const handlers = {
  //GET 
  getProducts: (req, res) => {
    const db = readDatabase();
    sendResponse(res, 200, db.products);
  },

  getProduct: (req, res, id) => {
    const db = readDatabase();
    const product = db.products.find(p => p.id === parseInt(id));
    
    if (product) {
      sendResponse(res, 200, product);
    } else {
      sendResponse(res, 404, { error: 'Product not found' });
    }
  },

  //POST
  createProduct: async (req, res) => {
    try {
      const body = await parseBody(req);
      
      if (!body.name || !body.price) {
        return sendResponse(res, 400, { error: 'Name and price are required' });
      }

      const db = readDatabase();
      const newProduct = {
        id: generateId(db.products),
        name: body.name,
        price: body.price,
        description: body.description || '',
        createdAt: new Date().toISOString()
      };
      
      db.products.push(newProduct);
      
      if (writeDatabase(db)) {
        sendResponse(res, 201, newProduct);
      } else {
        sendResponse(res, 500, { error: 'Failed to save product' });
      }
    } catch (error) {
      console.error('Error creating product:', error);
      sendResponse(res, 400, { error: 'Invalid request data' });
    }
  },

  createBulkProducts: async (req, res) => {
    try {
      const body = await parseBody(req);
      
      if (!Array.isArray(body.products)) {
        return sendResponse(res, 400, { error: 'Products array is required' });
      }

      const db = readDatabase();
      const newProducts = [];
      
      for (const product of body.products) {
        if (!product.name || !product.price) {
          return sendResponse(res, 400, { error: 'Name and price are required for all products' });
        }
        
        const newProduct = {
          id: generateId([...db.products, ...newProducts]),
          name: product.name,
          price: product.price,
          description: product.description || '',
          createdAt: new Date().toISOString()
        };
        
        newProducts.push(newProduct);
      }
      
      db.products = [...db.products, ...newProducts];
      
      if (writeDatabase(db)) {
        sendResponse(res, 201, { products: newProducts });
      } else {
        sendResponse(res, 500, { error: 'Failed to save products' });
      }
    } catch (error) {
      console.error('Error creating products:', error);
      sendResponse(res, 400, { error: 'Invalid request data' });
    }
  },

  //PUT 
  updateProduct: async (req, res, id) => {
    try {
      const body = await parseBody(req);
      const db = readDatabase();
      const productIndex = db.products.findIndex(p => p.id === parseInt(id));
      
      if (productIndex === -1) {
        return sendResponse(res, 404, { error: 'Product not found' });
      }
      
      if (!body.name || !body.price) {
        return sendResponse(res, 400, { error: 'Name and price are required' });
      }
      
      const updatedProduct = {
        ...db.products[productIndex],
        name: body.name,
        price: body.price,
        description: body.description || db.products[productIndex].description,
        updatedAt: new Date().toISOString()
      };
      
      db.products[productIndex] = updatedProduct;
      
      if (writeDatabase(db)) {
        sendResponse(res, 200, updatedProduct);
      } else {
        sendResponse(res, 500, { error: 'Failed to update product' });
      }
    } catch (error) {
      console.error('Error updating product:', error);
      sendResponse(res, 400, { error: 'Invalid request data' });
    }
  },

  updateProducts: async (req, res) => {
    try {
      const body = await parseBody(req);
      
      if (!Array.isArray(body.products)) {
        return sendResponse(res, 400, { error: 'Products array is required' });
      }
      
      const db = readDatabase();
      const updatedProducts = [];
      
      for (const product of body.products) {
        if (!product.id || !product.name || !product.price) {
          return sendResponse(res, 400, { error: 'Id, name, and price are required for all products' });
        }
        
        const productIndex = db.products.findIndex(p => p.id === parseInt(product.id));
        
        if (productIndex === -1) {
          return sendResponse(res, 404, { error: `Product with id ${product.id} not found` });
        }
        
        const updatedProduct = {
          ...db.products[productIndex],
          name: product.name,
          price: product.price,
          description: product.description || db.products[productIndex].description,
          updatedAt: new Date().toISOString()
        };
        
        db.products[productIndex] = updatedProduct;
        updatedProducts.push(updatedProduct);
      }
      
      if (writeDatabase(db)) {
        sendResponse(res, 200, { products: updatedProducts });
      } else {
        sendResponse(res, 500, { error: 'Failed to update products' });
      }
    } catch (error) {
      console.error('Error updating products:', error);
      sendResponse(res, 400, { error: 'Invalid request data' });
    }
  },

  //DELETE 
  deleteProduct: (req, res, id) => {
    const db = readDatabase();
    const productIndex = db.products.findIndex(p => p.id === parseInt(id));
    
    if (productIndex === -1) {
      return sendResponse(res, 404, { error: 'Product not found' });
    }
    
    db.products.splice(productIndex, 1);
    
    if (writeDatabase(db)) {
      sendResponse(res, 204, null);
    } else {
      sendResponse(res, 500, { error: 'Failed to delete product' });
    }
  },

  deleteProducts: async (req, res) => {
    try {
      const body = await parseBody(req);
      const db = readDatabase();
      //by id
      if (body.ids && Array.isArray(body.ids)) {
        const initialCount = db.products.length;
        db.products = db.products.filter(p => !body.ids.includes(p.id));
        
        if (db.products.length === initialCount) {
          return sendResponse(res, 404, { error: 'No matching products found' });
        }
      } else {
        //delete all
        db.products = [];
      }
      
      if (writeDatabase(db)) {
        sendResponse(res, 204, null);
      } else {
        sendResponse(res, 500, { error: 'Failed to delete products' });
      }
    } catch (error) {
      console.error('Error deleting products:', error);
      sendResponse(res, 400, { error: 'Invalid request data' });
    }
  },

  notFound: (req, res) => {
    sendResponse(res, 404, { error: 'Endpoint not found' });
  }
};

//create server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');
  
  const method = req.method.toUpperCase();
  
  console.log(`Request: ${method} ${trimmedPath}`);
  
  if (trimmedPath === 'products' && method === 'GET') {
    handlers.getProducts(req, res);
  } else if (/^products\/(\d+)$/.test(trimmedPath) && method === 'GET') {
    const id = trimmedPath.split('/')[1];
    handlers.getProduct(req, res, id);
  } else if (trimmedPath === 'products' && method === 'POST') {
    handlers.createProduct(req, res);
  } else if (trimmedPath === 'products/bulk' && method === 'POST') {
    handlers.createBulkProducts(req, res);
  } else if (/^products\/(\d+)$/.test(trimmedPath) && method === 'PUT') {
    const id = trimmedPath.split('/')[1];
    handlers.updateProduct(req, res, id);
  } else if (trimmedPath === 'products' && method === 'PUT') {
    handlers.updateProducts(req, res);
  } else if (/^products\/(\d+)$/.test(trimmedPath) && method === 'DELETE') {
    const id = trimmedPath.split('/')[1];
    handlers.deleteProduct(req, res, id);
  } else if (trimmedPath === 'products' && method === 'DELETE') {
    handlers.deleteProducts(req, res);
  } else {
    handlers.notFound(req, res);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});