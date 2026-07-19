const fs = require('fs');

const pages = [
  { file: 'public/index.html', cat: '' },
  { file: 'public/bracelets.html', cat: 'Bracelets' },
  { file: 'public/cuffs.html', cat: 'Cuff Bracelets' },
  { file: 'public/earrings.html', cat: 'Earrings' },
  { file: 'public/necklaces.html', cat: 'Necklaces' },
  { file: 'public/rings.html', cat: 'Rings' }
];

pages.forEach(p => {
  let content = fs.readFileSync(p.file, 'utf8');
  
  // Find the start of the product grid
  const gridStart = content.indexOf('<div class="product-grid">');
  if (gridStart !== -1) {
    const nextTagStart = Math.min(
      content.indexOf('<a href="#" class="view-all-btn">', gridStart) !== -1 ? content.indexOf('<a href="#" class="view-all-btn">', gridStart) : Infinity,
      content.indexOf('</section>', gridStart)
    );
    const gridBlock = content.substring(gridStart, nextTagStart);
    content = content.replace(gridBlock, '<div class="product-grid" id="product-grid-container">\n      <!-- Products will load here dynamically -->\n    </div>\n\n    ');
  }

  // Replace the script tag at the bottom
  const scriptStart = content.indexOf('<script>');
  const scriptEnd = content.indexOf('</script>', scriptStart) + 9;
  
  if (scriptStart !== -1) {
    const scriptBlock = content.substring(scriptStart, scriptEnd);
    const newScript = `<script src="js/main.js"></script>\n  <script>\n    loadCategoryProducts('${p.cat}');\n  </script>`;
    content = content.replace(scriptBlock, newScript);
  }

  fs.writeFileSync(p.file, content);
  console.log('Updated ' + p.file);
});
