export type OperationLogs = {
  id?: number;
  operator_user_id: number;
  action: string;
  action_display?: string;
  operated_user_id: number;
  description?: string;
  operation_id?: number;
  ip_location: string;
  remark?: string;
  createdAt?: Date;
  updatedAt?: Date;
  operator?: {
    account: string;
  };
  operatedUser?: {
    account: string;
  };
};
