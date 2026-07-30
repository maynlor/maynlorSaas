import type { Product } from "../../domain/Product.js";
import type { ProductOutputDTO } from "../dtos/ProductDTO.js";

export class ProductMapper {
  static toDTO(product: Product): ProductOutputDTO {
    return {
      id: product.id,
      businessId: product.businessId,
      name: product.name,
      description: product.description,
      price: product.price,
      currency: product.currency,
      stock: product.stock,
      isActive: product.isActive,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }
}
