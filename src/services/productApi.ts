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

export class ProductApiError extends Error {
  constructor(public kind: "client" | "server" | "network" | "unknown", message: string, public status?: number) {
    super(message);
    this.name = "ProductApiError";
  }
}

export async function fetchApiProducts(signal?: AbortSignal, endpoint = "https://dummyjson.com/products?limit=6"): Promise<ApiProduct[]> {
  let response: Response;
  try {
    response = await fetch(endpoint, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ProductApiError("network", "Tidak ada koneksi atau request gagal. Periksa internet lalu coba lagi.");
  }
  if (!response.ok) {
    if (response.status >= 400 && response.status < 500) {
      throw new ProductApiError("client", `Permintaan tidak dapat diproses (HTTP ${response.status}).`, response.status);
    }
    if (response.status >= 500) {
      throw new ProductApiError("server", `Server sedang bermasalah (HTTP ${response.status}). Silakan coba lagi.`, response.status);
    }
    throw new ProductApiError("unknown", `Request gagal (HTTP ${response.status}).`, response.status);
  }
  try {
    const data: ProductsResponse = await response.json();
    if (!Array.isArray(data.products)) throw new Error("Invalid response");
    return data.products;
  } catch {
    throw new ProductApiError("unknown", "Format data dari server tidak sesuai.");
  }
}
