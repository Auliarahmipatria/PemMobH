// Modul 3: GET API eksternal dan klasifikasi error HTTP.
export interface ApiProduct {
  id: number;
  title: string;
  price: number;
  thumbnail: string;
  category: string;
}

interface ProductsResponse {
  products: ApiProduct[];
  total: number;
}

export interface PriceReference {
  matches: number;
  averagePriceUsd: number;
  sampleNames: string[];
}

export class ProductApiError extends Error {
  constructor(public kind: "client" | "server" | "network" | "unknown", message: string, public status?: number) {
    super(message);
    this.name = "ProductApiError";
  }
}

function getHttpError(response: Response) {
  if (response.status >= 400 && response.status < 500) {
    return new ProductApiError(
      "client",
      `Permintaan tidak dapat diproses (HTTP ${response.status}).`,
      response.status
    );
  }
  if (response.status >= 500) {
    return new ProductApiError(
      "server",
      `Server sedang bermasalah (HTTP ${response.status}). Silakan coba lagi.`,
      response.status
    );
  }
  return new ProductApiError("unknown", `Request gagal (HTTP ${response.status}).`, response.status);
}

async function requestProductMutation(
  endpoint: string,
  method: "POST" | "PATCH",
  body: object,
  signal?: AbortSignal
): Promise<ApiProduct> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ProductApiError(
      "network",
      "Tidak ada koneksi atau request gagal. Periksa internet lalu coba lagi."
    );
  }

  if (!response.ok) throw getHttpError(response);

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ProductApiError("unknown", "Format respons perubahan produk tidak sesuai.");
  }

  if (
    !data ||
    typeof data !== "object" ||
    typeof (data as Record<string, unknown>).id !== "number" ||
    typeof (data as Record<string, unknown>).title !== "string"
  ) {
    throw new ProductApiError("unknown", "Format respons perubahan produk tidak sesuai.");
  }

  const product = data as Record<string, unknown>;
  return {
    id: product.id as number,
    title: product.title as string,
    price: typeof product.price === "number" ? product.price : 0,
    thumbnail: typeof product.thumbnail === "string" ? product.thumbnail : "",
    category: typeof product.category === "string" ? product.category : "",
  };
}

// DummyJSON mengembalikan respons simulasi; perubahan POST/PATCH tidak disimpan permanen.
export function createApiProduct(
  product: { title: string; price: number; category: string },
  signal?: AbortSignal
) {
  return requestProductMutation("https://dummyjson.com/products/add", "POST", product, signal);
}

export function updateApiProduct(
  productId: number,
  updates: Record<string, unknown>,
  signal?: AbortSignal
) {
  return requestProductMutation(
    `https://dummyjson.com/products/${productId}`,
    "PATCH",
    updates,
    signal
  );
}

export async function fetchApiProducts(signal?: AbortSignal, endpoint = "https://dummyjson.com/products?limit=6"): Promise<ApiProduct[]> {
  let response: Response;
  try {
    response = await fetch(endpoint, { signal });
  } catch (error) {
    if (signal?.aborted) return Promise.reject(error);
    return Promise.reject(
      new ProductApiError("network", "Tidak ada koneksi atau request gagal. Periksa internet lalu coba lagi.")
    );
  }
  if (!response.ok) {
    if (response.status >= 400 && response.status < 500) {
      return Promise.reject(
        new ProductApiError("client", `Permintaan tidak dapat diproses (HTTP ${response.status}).`, response.status)
      );
    }
    if (response.status >= 500) {
      return Promise.reject(
        new ProductApiError("server", `Server sedang bermasalah (HTTP ${response.status}). Silakan coba lagi.`, response.status)
      );
    }
    return Promise.reject(
      new ProductApiError("unknown", `Request gagal (HTTP ${response.status}).`, response.status)
    );
  }

  let data: ProductsResponse;
  try {
    data = await response.json();
  } catch {
    return Promise.reject(
      new ProductApiError("unknown", "Format data dari server tidak sesuai.")
    );
  }

  if (!Array.isArray(data.products)) {
    return Promise.reject(
      new ProductApiError("unknown", "Format data dari server tidak sesuai.")
    );
  }

  // Resolve mengembalikan daftar produk ketika response API valid.
  return Promise.resolve(data.products);
}

// Cari produk serupa untuk membantu penjual menentukan harga awal lelang.
export function fetchPriceReference(
  productName: string,
  signal?: AbortSignal
): Promise<PriceReference> {
  const query = productName.trim();
  if (query.length < 2) {
    return Promise.reject(
      new ProductApiError("client", "Masukkan nama barang minimal 2 karakter.")
    );
  }

  const endpoint = `https://dummyjson.com/products/search?q=${encodeURIComponent(query)}&limit=10`;

  return fetchApiProducts(signal, endpoint)
    .then((products) => {
      if (products.length === 0) {
        return Promise.reject(
          new ProductApiError("unknown", "Belum ada barang serupa di katalog API. Coba kata kunci lain.")
        );
      }

      const averagePriceUsd =
        products.reduce((total, product) => total + product.price, 0) / products.length;

      return Promise.resolve({
        matches: products.length,
        averagePriceUsd,
        sampleNames: products.slice(0, 3).map((product) => product.title),
      });
    })
    .catch((error: unknown) => Promise.reject(error));
}
