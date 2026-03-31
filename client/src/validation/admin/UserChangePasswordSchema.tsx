import * as yup from "yup";
import {
  minLengthMsg,
  noCapitalLetterMsg,
  passwordMatchMsg,
  requiredMsg,
} from "../messages/ValidationMessages";

export const UserChangePasswordSchema = yup.object({
  account: yup
    .string()
    .trim()
    .required(requiredMsg())
    .matches(/^[^A-Z]*$/, noCapitalLetterMsg()),
  password: yup.string().trim().required(requiredMsg()).min(6, minLengthMsg(6)),
  confirm_password: yup
    .string()
    .trim()
    .required(requiredMsg())
    .min(6, minLengthMsg(6))
    .test(
      "match-new-password",
      passwordMatchMsg("ucp_confirm_password", "ucp_password"),
      function (value) {
        if (!value || value.length < 6) return true;
        return value === this.resolve(yup.ref("password"));
      },
    ),
});
