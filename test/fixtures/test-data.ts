export const testData = {
  categorias: ['Amor', 'Cumpleaños'],
  baseUrl: 'https://www.floristeriamundoflor.com/',
  timeouts: {
    navigation: 30000,
    element: 15000,
    network: 20000
  },
  retries: {
    cumpleanos: 2,
    amor: 1
  },
  // URLs directas de categorías basadas en el HTML real
  categoryUrls: {
    amor: '/product-category/amor/',
    cumpleanos: '/product-category/cumpleanos/'
  }
};

export const expectedElements = {
  home: {
    logo: '.site-logo img, .logo img',
    menuNavigation: 'nav ul, #primary-menu',
    cartIcon: '.mini-cart, .cart-icon, .woocommerce-mini-cart',
    // Navegación de categorías desde el sidebar
    categoryMenu: '#menu-category-menu',
    amorLink: 'a[href*="/product-category/amor/"]',
    cumpleanosLink: 'a[href*="/product-category/cumpleanos/"]'
  },
  categoria: {
    // Múltiples selectores para mayor robustez
    title: 'h1.page-title, h1.woocommerce-products-header__title, h1',
    productGrid: '.products, ul.products, .woocommerce-products-wrapper',
    productItems: '.product, li.product, .type-product, .grid.product.type-product',
    productName: 'h2.woocommerce-loop-product__title, h3.name a, .product-title',
    productPrice: '.price .woocommerce-Price-amount, .woocommerce-Price-amount, .price',
    productLink: '.woocommerce-loop-product__link, .product-image a, a[href*="/product/"]',
    sidebar: '.sidebar-left, .sidebar',
    categoryLinks: '#menu-category-menu .menu-item a'
  },
  producto: {
    title: 'h1.product_title, .product-title h1',
    price: '.price .woocommerce-Price-amount, .summary .price',
    addButton: '.single_add_to_cart_button, button[name="add-to-cart"]',
    quantity: '.quantity input[type="number"]',
    productSummary: '.product .summary',
    productImage: '.woocommerce-product-gallery img'
  },
  carrito: {
    table: '.shop_table.cart, .woocommerce-cart-form__contents',
    items: 'tr.cart_item, .woocommerce-cart-form__cart-item',
    emptyMessage: '.woocommerce-info, .cart-empty, .wc-empty-cart-message',
    removeButton: '.remove, a[data-product_id]',
    itemName: '.product-name, td.product-name a',
    itemPrice: '.product-price, td[data-title="Precio"]',
    subtotal: '.cart-subtotal .woocommerce-Price-amount, .order-total',
    cartLink: '.cart-icon a, .mini-cart a, a[href*="/cart/"]'
  },
  // Network patterns para interceptar requests
  network: {
    addToCartPatterns: [
      'add-to-cart',
      'wc-ajax=add_to_cart',
      'admin-ajax.php',
      '?add-to-cart='
    ]
  }
};