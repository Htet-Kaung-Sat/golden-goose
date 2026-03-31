export type Announce = {
  id?: number;
  user_id?: number;
  title: string;
  content: string;
  type?: number;
  createdAt?: Date;
  updatedAt?: Date;
  user?: {
    name?: string;
  };
  new_flg?: boolean;
  edit_flg?: boolean;
};
