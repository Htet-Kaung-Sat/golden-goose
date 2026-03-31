import * as yup from "yup";
import { maxLengthMsg, requiredMsg } from "../messages/ValidationMessages";

export const NickNameSchema = yup.object({
  name: yup.string().trim().required(requiredMsg()).max(255, maxLengthMsg(255)),
});
