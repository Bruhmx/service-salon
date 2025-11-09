import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, Grid3x3, LayoutGrid, List, Minus, Plus, Eye, ShoppingCart, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import logo from "@/assets/gb_logo.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  image_url: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("name");
  const [filterStock, setFilterStock] = useState("all");
  const [viewType, setViewType] = useState<"grid" | "list">("grid");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const navigate = useNavigate();
  const { addItem, items, removeItem, updateQuantity: updateCartQuantity, totalItems, totalPrice } = useCart();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const getQuantity = (productId: string) => quantities[productId] || 1;

  const updateQuantity = (productId: string, delta: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const currentQty = getQuantity(productId);
    const newQty = Math.max(1, Math.min(currentQty + delta, product.stock_quantity));
    setQuantities(prev => ({ ...prev, [productId]: newQty }));
  };

  const filteredAndSortedProducts = products
    .filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStock = filterStock === "all" || 
                          (filterStock === "in-stock" && product.stock_quantity > 0) ||
                          (filterStock === "out-of-stock" && product.stock_quantity === 0);
      return matchesSearch && matchesStock;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const handleAddToCart = async (product: Product) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    const quantity = getQuantity(product.id);
    
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        stock_quantity: product.stock_quantity,
      });
    }
    
    toast.success(`${quantity}x ${product.name} added to cart!`);
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
  };

  const ProductSkeleton = () => (
    <Card className="overflow-hidden">
      <Skeleton className="h-40 w-full" />
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>
      <CardContent className="pb-3">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-6 w-20 mb-1" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
      <CardFooter className="pt-0">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 pb-24">
      {/* Floating Cart Button */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-8 left-8 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
          >
            <ShoppingCart className="w-6 h-6" />
            {totalItems > 0 && (
              <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 rounded-full">
                {totalItems}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Shopping Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-200px)] mt-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
                <p className="text-sm text-muted-foreground">Add some products to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                          <span className="text-xl font-bold text-primary">{item.name[0]}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{item.name}</h4>
                      <p className="text-sm text-primary font-semibold mt-1">₱{item.price.toFixed(2)}</p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center border rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-r-none"
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="px-2 text-sm font-medium min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-l-none"
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock_quantity}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            removeItem(item.id);
                            toast.success("Item removed from cart");
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold">₱{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          {items.length > 0 && (
            <SheetFooter className="absolute bottom-0 left-0 right-0 p-6 border-t bg-background">
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">₱{totalPrice.toFixed(2)}</span>
                </div>
                <Separator />
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    setCartOpen(false);
                    navigate("/cart");
                  }}
                >
                  View Full Cart & Checkout
                </Button>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <img src={logo} alt="GB Beauty" className="w-16 h-16" />
          <div>
            <h1 className="text-3xl font-bold">Beauty Products</h1>
            <p className="text-muted-foreground">Shop premium beauty products</p>
          </div>
        </div>

        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStock} onValueChange={setFilterStock}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex border rounded-md">
                <Button
                  variant={viewType === "grid" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewType("grid")}
                  className="rounded-r-none"
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewType === "list" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewType("list")}
                  className="rounded-l-none"
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{filteredAndSortedProducts.length} products found</span>
          </div>
        </div>

        {loading ? (
          <div className={viewType === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : filteredAndSortedProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        ) : viewType === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{filteredAndSortedProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-[var(--shadow-elegant)] transition-all duration-300 group animate-fade-in hover:-translate-y-1">
                <div className="h-40 overflow-hidden bg-muted relative group">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                      <span className="text-3xl font-bold text-primary">{product.name[0]}</span>
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {product.stock_quantity === 0 && (
                    <Badge className="absolute top-2 left-2" variant="destructive">Out of Stock</Badge>
                  )}
                  {product.stock_quantity > 0 && product.stock_quantity <= 5 && (
                    <Badge className="absolute top-2 left-2" variant="secondary">Low Stock</Badge>
                  )}
                </div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base line-clamp-1">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="pb-3 space-y-3">
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {product.description}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-primary">₱{product.price.toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {product.stock_quantity > 0 ? `${product.stock_quantity} available` : "Out of stock"}
                  </p>
                  
                  {product.stock_quantity > 0 && (
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-sm text-muted-foreground">Qty:</span>
                      <div className="flex items-center border rounded-md">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-r-none"
                          onClick={() => updateQuantity(product.id, -1)}
                          disabled={getQuantity(product.id) <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="px-3 text-sm font-medium min-w-[2rem] text-center">
                          {getQuantity(product.id)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-l-none"
                          onClick={() => updateQuantity(product.id, 1)}
                          disabled={getQuantity(product.id) >= product.stock_quantity}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    className="w-full"
                    disabled={product.stock_quantity === 0}
                    onClick={() => handleAddToCart(product)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {product.stock_quantity > 0 ? "Add to Cart" : "Out of Stock"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 animate-fade-in">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-48 h-48 overflow-hidden bg-muted relative group">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                        <span className="text-4xl font-bold text-primary">{product.name[0]}</span>
                      </div>
                    )}
                    {product.stock_quantity === 0 && (
                      <Badge className="absolute top-2 left-2" variant="destructive">Out of Stock</Badge>
                    )}
                    {product.stock_quantity > 0 && product.stock_quantity <= 5 && (
                      <Badge className="absolute top-2 left-2" variant="secondary">Low Stock</Badge>
                    )}
                  </div>
                  
                  <div className="flex-1 p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <h3 className="text-xl font-bold">{product.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                        <div className="flex items-center gap-4">
                          <p className="text-2xl font-bold text-primary">₱{product.price.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.stock_quantity > 0 ? `${product.stock_quantity} available` : "Out of stock"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-3 md:items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        
                        {product.stock_quantity > 0 && (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Qty:</span>
                              <div className="flex items-center border rounded-md">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-r-none"
                                  onClick={() => updateQuantity(product.id, -1)}
                                  disabled={getQuantity(product.id) <= 1}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="px-3 text-sm font-medium min-w-[2rem] text-center">
                                  {getQuantity(product.id)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-l-none"
                                  onClick={() => updateQuantity(product.id, 1)}
                                  disabled={getQuantity(product.id) >= product.stock_quantity}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <Button 
                              className="w-full md:w-auto min-w-[160px]"
                              onClick={() => handleAddToCart(product)}
                            >
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Add to Cart
                            </Button>
                          </>
                        )}
                        {product.stock_quantity === 0 && (
                          <Button className="w-full md:w-auto min-w-[160px]" disabled>
                            Out of Stock
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedProduct?.name}</DialogTitle>
              <DialogDescription>Product Details</DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                  {selectedProduct.image_url ? (
                    <img
                      src={selectedProduct.image_url}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                      <span className="text-6xl font-bold text-primary">{selectedProduct.name[0]}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-primary mb-2">
                      ₱{selectedProduct.price.toFixed(2)}
                    </h3>
                    <Badge variant={selectedProduct.stock_quantity > 0 ? "default" : "destructive"}>
                      {selectedProduct.stock_quantity > 0 
                        ? `${selectedProduct.stock_quantity} in stock` 
                        : "Out of stock"}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedProduct.description || "No description available"}
                    </p>
                  </div>
                  
                  {selectedProduct.stock_quantity > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">Quantity:</span>
                        <div className="flex items-center border rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateQuantity(selectedProduct.id, -1)}
                            disabled={getQuantity(selectedProduct.id) <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="px-4 text-base font-medium min-w-[3rem] text-center">
                            {getQuantity(selectedProduct.id)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateQuantity(selectedProduct.id, 1)}
                            disabled={getQuantity(selectedProduct.id) >= selectedProduct.stock_quantity}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={() => {
                          handleAddToCart(selectedProduct);
                          setSelectedProduct(null);
                        }}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Add {getQuantity(selectedProduct.id)} to Cart
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
