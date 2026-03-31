import * as yup from "yup";
import {
  integerMsg,
  maxValueMsg,
  minValueMsg,
  requiredMsg,
} from "../messages/ValidationMessages";

export const TOP_UP_AMOUNT_MAX = 999_999_999_999;

export const TopUpSchema = yup.object({
  amount: yup
    .number()
    .required(requiredMsg())
    .typeError(integerMsg())
    .moreThan(0, minValueMsg(1))
    .max(TOP_UP_AMOUNT_MAX, maxValueMsg(TOP_UP_AMOUNT_MAX)),
  status: yup.string().trim().required(requiredMsg()),
  remark: yup.string().notRequired().default(""),
});
