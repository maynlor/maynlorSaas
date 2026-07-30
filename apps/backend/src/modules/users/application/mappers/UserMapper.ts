import type { User } from "../../domain/User.js";
import type { UserOutputDTO } from "../dtos/UserResponseDTO.js";

export class UserMapper {
  static toDTO(user: User): UserOutputDTO {
    return {
      id: user.id,
      businessId: user.businessId,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
