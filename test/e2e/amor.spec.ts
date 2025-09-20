// amor.spec.ts
import { test, expect } from "@playwright/test";
import { HomePage } from "../../pages/home.page";
import { CategoriaPage } from '../../pages/categoria.page';
import { ProductoPage } from '../../pages/producto.page';
import { CarritoPage } from '../../pages/caro.page';
import { testData, expectedElements } from '../fixtures/test-data';

test.describe('Escenario 1 - Categoría Amor E2E', () => {
  let homePage: HomePage;
  let categoriaPage: CategoriaPage;
  let productoPage: ProductoPage;
  let carritoPage: CarritoPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    categoriaPage = new CategoriaPage(page);
    productoPage = new ProductoPage(page);
    carritoPage = new CarritoPage(page);

    await homePage.abrir();
  });

  test('Debe navegar a categoría Amor y validar contenido', async ({ page }) => {
    // 1. Navegar al home y entrar en la categoría Amor
    await homePage.navegarAArmor();
    
    // 2. Validar que estamos en la página de Amor
    await categoriaPage.validarTituloCategoria(testData.categorias[0]); // 'Amor'
    await categoriaPage.validarProductosDisponibles();
    
    // Screenshot de la categoría cargada
    await test.info().attach('categoria-amor-cargada', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png'
    });
  });

  test('Debe seleccionar y agregar primer producto de Amor al carrito con validación de red', async ({ page }) => {
    // Configurar interceptación de red para requests de add-to-cart
    const networkRequests: any[] = [];
    
    page.on('response', async (response) => {
      if (response.url().includes('add-to-cart') || 
          response.url().includes('wc-ajax=add_to_cart') || 
          response.url().includes('admin-ajax.php')) {
        
        const requestData = {
          url: response.url(),
          status: response.status(),
          body: await response.text().catch(() => 'No body'),
          timestamp: new Date().toISOString()
        };
        networkRequests.push(requestData);
        console.log(`Network request intercepted: ${requestData.url} - Status: ${requestData.status}`);
      }
    });

    // 1. Navegar a categoría Amor
    await homePage.navegarAArmor();
    await categoriaPage.validarTituloCategoria(testData.categorias[0]);
    
    // 2. Seleccionar primer producto
    const producto1 = await categoriaPage.selectSingleProduct(0);
    console.log(`Producto 1: ${producto1.nombre} - ${producto1.precio}`);
    
    // 3. Abrir detalle del producto
    await categoriaPage.clickProductByIndex(0);
    await productoPage.waitForProductLoad();
    
    // 4. Validar datos del producto antes de agregar
    const detallesProducto1 = await productoPage.getProductDetails();
    expect(detallesProducto1.nombre).toContain(producto1.nombre);
    
    // 5. Agregar al carrito
    await productoPage.addToCart();
    await productoPage.validateProductAdded();
    
    // 6. Validar interceptación de red
    expect(networkRequests.length).toBeGreaterThanOrEqual(1);
    
    networkRequests.forEach((request, index) => {
      console.log(`Validating request ${index + 1}: ${request.url}`);
      expect(request.status).toBeGreaterThanOrEqual(200);
      expect(request.status).toBeLessThan(300);
      expect(request.body).toBeTruthy();
      
      // Verificar que la respuesta contiene información del producto
      if (request.body !== 'No body') {
        expect(request.body.length).toBeGreaterThan(0);
      }
    });

    // Screenshot del producto agregado
    await test.info().attach('primer-producto-agregado', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png'
    });
  });

  test('Debe seleccionar y agregar segundo producto de Amor al carrito', async ({ page }) => {
    // 1. Navegar a categoría Amor
    await homePage.navegarAArmor();
    await categoriaPage.validarTituloCategoria(testData.categorias[0]);
    
    // 2. Seleccionar segundo producto
    const producto2 = await categoriaPage.selectSingleProduct(1);
    console.log(`Producto 2: ${producto2.nombre} - ${producto2.precio}`);
    
    // 3. Abrir detalle del producto
    await categoriaPage.clickProductByIndex(1);
    await productoPage.waitForProductLoad();
    
    // 4. Validar datos del producto antes de agregar
    const detallesProducto2 = await productoPage.getProductDetails();
    expect(detallesProducto2.nombre).toContain(producto2.nombre);
    
    // 5. Agregar al carrito
    await productoPage.addToCart();
    await productoPage.validateProductAdded();

    // Screenshot del segundo producto agregado
    await test.info().attach('segundo-producto-agregado', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png'
    });
  });

  test('Debe validar carrito con exactamente 2 productos de Amor y subtotal correcto', async ({ page }) => {
    // Setup: Agregar dos productos al carrito
    await homePage.navegarAArmor();
    await categoriaPage.validarTituloCategoria(testData.categorias[0]);
    
    // Obtener información de ambos productos
    const { producto1, producto2 } = await categoriaPage.selectTwoDistinctProducts();
    
    // Agregar primer producto
    await categoriaPage.clickProductByIndex(0);
    await productoPage.waitForProductLoad();
    await productoPage.addToCart();
    await productoPage.validateProductAdded();
    
    // Volver y agregar segundo producto
    await page.goBack();
    await categoriaPage.waitForCategoryLoad();
    await categoriaPage.clickProductByIndex(1);
    await productoPage.waitForProductLoad();
    await productoPage.addToCart();
    await productoPage.validateProductAdded();
    
    // 1. Ir al carrito y validar
    await carritoPage.irAlCarrito();
    
    // 2. Validar que hay exactamente 2 ítems
    const itemCount = await carritoPage.getCartItemCount();
    expect(itemCount).toBe(2);
    
    // 3. Validar que los productos están en el carrito con nombres y precios correctos
    await carritoPage.validateCartItem(producto1.nombre, producto1.precio);
    await carritoPage.validateCartItem(producto2.nombre, producto2.precio);
    
    // 4. Validar subtotal = suma de precios (con tolerancia para separadores de miles)
    const subtotalActual = await carritoPage.getSubtotal();
    const subtotalEsperado = await carritoPage.calcularSubtotalEsperado([producto1.precio, producto2.precio]);
    
    // Comparar subtotales (con tolerancia para separadores de miles)
    const cleanSubtotalActual = subtotalActual.replace(/[^\d]/g, '');
    const cleanSubtotalEsperado = subtotalEsperado.replace(/[^\d]/g, '');
    expect(cleanSubtotalActual).toBe(cleanSubtotalEsperado);
    
    // 5. Screenshot final del carrito con ambos productos
    await test.info().attach('carrito-final-amor-dos-productos', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png'
    });
    
    // Log final con resumen
    console.log(`Test completado exitosamente:`);
    console.log(`- Items en carrito: ${itemCount}`);
    console.log(`- Subtotal validado: ${subtotalActual}`);
    console.log(`- Producto 1: ${producto1.nombre} - ${producto1.precio}`);
    console.log(`- Producto 2: ${producto2.nombre} - ${producto2.precio}`);
  });
});