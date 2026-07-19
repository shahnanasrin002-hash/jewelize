// Initialize cart from localStorage or create empty array
window.cart = JSON.parse(localStorage.getItem('jewelize_cart')) || [];
// Initialize wishlist from localStorage!
window.wishlist = JSON.parse(localStorage.getItem('jewelize_wishlist')) || [];

window.syncUserData = async function() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const headers = { 'Authorization': `Bearer ${token}` };
    const cartRes = await fetch('/api/user/cart', { headers });
    if (cartRes.ok) {
      const data = await cartRes.json();
      window.cart = data.cart || [];
      localStorage.setItem('jewelize_cart', JSON.stringify(window.cart));
      updateCartCounter();
      if (typeof renderCart === 'function') renderCart();
    }
    const wishRes = await fetch('/api/user/wishlist', { headers });
    if (wishRes.ok) {
      const data = await wishRes.json();
      window.wishlist = data.wishlist || [];
      localStorage.setItem('jewelize_wishlist', JSON.stringify(window.wishlist));
      if (typeof renderWishlist === 'function') renderWishlist();
    }
  } catch (e) {
    console.error("Error syncing user data:", e);
  }
}
window.syncUserData();

window.saveCartToBackend = async function() {
  const token = localStorage.getItem('token');
  if (token) {
    await fetch('/api/user/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ cart: window.cart })
    });
  }
}

window.saveWishlistToBackend = async function() {
  const token = localStorage.getItem('token');
  if (token) {
    await fetch('/api/user/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ wishlist: window.wishlist })
    });
  }
}

// Function to update the cart counter UI
function updateCartCounter() {
  const counter = document.getElementById('cart-count');
  if (!counter) return;
  const totalItems = window.cart.reduce((sum, item) => sum + item.quantity, 0);
  if (totalItems > 0) {
    counter.textContent = totalItems;
    counter.style.display = 'inline-block';
  } else {
    counter.style.display = 'none';
  }
}

// Function to add item to cart
window.addToCart = function(name, price, image) {
  const existingItem = window.cart.find(item => item.name === name);
  
  if (existingItem) {
    existingItem.quantity += 1;
    // Tell the user they added another one!
    alert(`${name} quantity increased in your cart! 🛍️`);
  } else {
    window.cart.push({ name, price, image, quantity: 1 });
    // Tell the user it's brand new!
    alert(`${name} added to your cart!`);
  }
  
  localStorage.setItem('jewelize_cart', JSON.stringify(window.cart));
  window.saveCartToBackend();
  updateCartCounter();
}

// Call update on page load
updateCartCounter();

// Dynamic Product Loader
window.loadCategoryProducts = async function(categoryName, containerId = 'product-grid-container', limit = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<p style="text-align:center; width:100%;">Loading collections...</p>';
  
  try {
    const url = categoryName ? `/api/products?category=${encodeURIComponent(categoryName)}` : '/api/products';
    const res = await fetch(url);
    let products = await res.json();
    
    // Apply limit if requested (e.g. for Best Sellers)
    if (limit && limit > 0) {
      products = products.slice(0, limit);
    }
    
    if (products.length === 0) {
      container.innerHTML = '<p style="text-align:center; width:100%;">More styles coming soon!</p>';
      return;
    }
    
    container.innerHTML = '';
    
    products.forEach(p => {
      // Create HTML for product card
      const card = document.createElement('div');
      card.className = 'product-card';
      
      let imagePath = p.imageUrl.startsWith('images/') ? p.imageUrl : `images/${p.imageUrl}`;
      if (!imagePath.startsWith('/')) {
        imagePath = '/' + imagePath;
      }
      
      card.innerHTML = `
        <div class="product-image-container">
          <img src="${imagePath}" alt="${p.name}" onerror="this.src='https://placehold.co/250x300?text=${encodeURIComponent(p.name)}'">
        </div>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-price">Rs. ${p.price.toFixed(2)}</p>
                <div style="display: flex; gap: 15px; justify-content: center; align-items: center; margin-top: 10px;">
          <button class="add-to-cart-btn" onclick="addToCart('${p.name.replace(/'/g, "\\'")}', ${p.price}, '${imagePath}')">Add to Cart</button>
          
          <!-- This checks if the product is already in the wishlist to decide if it should be Solid or Regular! -->
          <i class="${window.wishlist.some(item => item.name === p.name) ? 'fa-solid' : 'fa-regular'} fa-heart" 
             id="heart-${p.name.replace(/\s+/g, '-')}"
             onclick="addToWishlist('${p.name.replace(/'/g, "\\'")}', ${p.price}, '${imagePath}')" 
             style="font-size: 22px; cursor: pointer; color: #d1b4c3; transition: all 0.2s;" 
             onmouseover="this.className='fa-solid fa-heart'" 
             onmouseout="this.className=window.wishlist.some(item => item.name === '${p.name.replace(/'/g, "\\'")}') ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    container.innerHTML = '<p style="text-align:center; width:100%; color:red;">Failed to load products.</p>';
  }
}

// Real Wishlist Functionality!
window.addToWishlist = function(name, price, image) {
  // Check if it's already in the wishlist
  if (window.wishlist.some(item => item.name === name)) {
    alert(`${name} is already in your Wishlist!`);
    return; // Stop running
  }
  
  // If not, add the full object!
  window.wishlist.push({ name, price, image });
  localStorage.setItem('jewelize_wishlist', JSON.stringify(window.wishlist));
  window.saveWishlistToBackend();
  
  // Instantly fill the heart icon without refreshing the page!
  const heartIcon = document.getElementById(`heart-${name.replace(/\s+/g, '-')}`);
  if (heartIcon) {
    heartIcon.className = 'fa-solid fa-heart';
  }
  
  alert(`${name} added to your Wishlist! ❤️`);
}

// Search Toggle Functionality
window.toggleSearch = function() {
  const searchBar = document.getElementById('search-bar-container');
  if (searchBar) {
    // Toggle the visibility
    if (searchBar.style.display === 'none' || searchBar.style.display === '') {
      searchBar.style.display = 'flex';
      
      // Inject dropdown and listener if not exists
      if (!document.getElementById('search-dropdown')) {
        const dropdown = document.createElement('div');
        dropdown.id = 'search-dropdown';
        // Style it to appear right below the search bar
        dropdown.style = "position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ddd; border-radius: 4px; max-height: 250px; overflow-y: auto; display: none; flex-direction: column; z-index: 101; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-top: 5px;";
        searchBar.appendChild(dropdown);
        
        const input = document.getElementById('search-input');
        input.addEventListener('input', handleSearchInput);
      }
      
      document.getElementById('search-input').focus();
    } else {
      searchBar.style.display = 'none';
      if(document.getElementById('search-dropdown')) {
        document.getElementById('search-dropdown').style.display = 'none';
      }
    }
  }
}

window.handleSearchInput = async function(e) {
  const query = e.target.value.trim();
  const dropdown = document.getElementById('search-dropdown');
  
  if (query.length === 0) {
    dropdown.style.display = 'none';
    return;
  }
  
  try {
    const res = await fetch(`/api/products?search=${encodeURIComponent(query)}`);
    const products = await res.json();
    
    dropdown.innerHTML = '';
    
    if (products.length === 0) {
      dropdown.innerHTML = '<div style="padding: 10px; color: #777; font-size: 0.9em; text-align: center;">No products found</div>';
    } else {
      products.forEach(p => {
        const item = document.createElement('div');
        item.style = "padding: 10px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: background 0.2s;";
        item.onmouseover = () => item.style.backgroundColor = '#f9f9f9';
        item.onmouseout = () => item.style.backgroundColor = 'white';
        
        let imagePath = p.imageUrl.startsWith('images/') ? p.imageUrl : `images/${p.imageUrl}`;
        if (!imagePath.startsWith('/')) imagePath = '/' + imagePath;
        
        item.innerHTML = `
          <img src="${imagePath}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
          <div>
            <div style="font-weight: 600; font-size: 0.9em;">${p.name}</div>
            <div style="color: #d1b4c3; font-size: 0.85em;">Rs. ${p.price.toFixed(2)}</div>
          </div>
        `;
        
        // When clicking a search result, navigate to a viewProduct page or show the product (for now just viewProduct with no category, or actually we don't have a single product page yet)
        // If we don't have a single product page, we can navigate to viewProduct.html and maybe filter locally? 
        // Or we can just add to cart immediately? Let's just alert for now or implement single product view.
        // I will add a click event to add to cart to make it super quick shopping!
        item.onclick = () => {
          addToCart(p.name, p.price, imagePath);
          dropdown.style.display = 'none';
          document.getElementById('search-input').value = '';
          toggleSearch();
        };
        
        dropdown.appendChild(item);
      });
    }
    
    dropdown.style.display = 'flex';
  } catch (err) {
    console.error("Search error:", err);
  }
}

window.performSearch = function() {
  const query = document.getElementById('search-input').value;
  if(query) {
    // We already have the live search, so the Go button can just trigger the input event manually
    handleSearchInput({ target: { value: query } });
  }
}
