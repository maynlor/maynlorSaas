import type { UserOutputDTO } from "../../../users/application/dtos/UserResponseDTO.js";
import type { BusinessOutputDTO } from "../../../businesses/application/dtos/BusinessResponseDTO.js";

export interface AuthResponseDTO {
  token: string;
  user: UserOutputDTO;
  business: BusinessOutputDTO;
}

export interface LoginResponseDTO {
  token: string;
  user: UserOutputDTO;
}
