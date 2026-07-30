export interface CreateProductInputDTO {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  stock?: number;
  isActive?: boolean;
}

export interface UpdateProductInputDTO {
  name?: string;
  description?: string | null;
  price?: number;
  currency?: string;
  stock?: number | null;
  isActive?: boolean;
}

export interface ProductOutputDTO {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  stock: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListProductsOutputDTO {
  items: ProductOutputDTO[];
  total: number;
  page: number;
  pageSize: number;
}
