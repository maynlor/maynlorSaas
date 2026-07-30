export interface RegisterInputDTO {
  business: {
    name: string;
    email: string;
    slug: string;
  };
  user: {
    email: string;
    password: string;
  };
}
