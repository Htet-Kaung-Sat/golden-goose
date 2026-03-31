import * as yup from "yup";
import { requiredMsg, maxLengthMsg } from "../messages/ValidationMessages";

export const UserAnnouncementSchema = yup.object({
  title: yup
    .string()
    .trim()
    .required(requiredMsg())
    .max(255, maxLengthMsg(255)),
  content: yup
    .string()
    .trim()
    .required(requiredMsg())
    .max(5000, maxLengthMsg(5000)),
});
