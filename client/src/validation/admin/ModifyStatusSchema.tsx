import * as yup from "yup";
import { noCapitalLetterMsg, requiredMsg } from "../messages/ValidationMessages";

export const ModifyStatusSchema = yup.object({
  account: yup
    .string()
    .trim()
    .required(requiredMsg())
    .matches(/^[^A-Z]*$/, noCapitalLetterMsg()),
  state: yup.string().trim().required(requiredMsg()),
  locking: yup.string().trim().required(requiredMsg()),
});
