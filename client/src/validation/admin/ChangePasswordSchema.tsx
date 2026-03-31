import * as yup from "yup";
import {
  maxLengthMsg,
  minLengthMsg,
  noCapitalLetterMsg,
  passwordEqualMsg,
  passwordMatchMsg,
  requiredMsg,
} from "../messages/ValidationMessages";

export const ChangePasswordSchema = yup.object({
  account: yup
    .string()
    .trim()
    .required(requiredMsg())
    .matches(/^[^A-Z]*$/, noCapitalLetterMsg()),
  name: yup.string().trim().required(requiredMsg()).max(255, maxLengthMsg(255)),
  password: yup
    .string()
    .trim()
    .required(requiredMsg())
    .min(6, minLengthMsg(6))
    .max(255, maxLengthMsg(255)),
  new_password: yup
    .string()
    .trim()
    .required(requiredMsg())
    .min(6, minLengthMsg(6))
    .max(255, maxLengthMsg(255))
    .test(
      "not-equal-to-password",
      passwordEqualMsg("cp_new_password", "cp_password"),
      function (value) {
        if (!value || value.length < 6) return true;
        return value !== this.resolve(yup.ref("password"));
      },
    ),
  confirm_password: yup
    .string()
    .trim()
    .required(requiredMsg())
    .min(6, minLengthMsg(6))
    .max(255, maxLengthMsg(255))
    .test(
      "match-new-password",
      passwordMatchMsg("cp_confirm_password", "cp_new_password"),
      function (value) {
        if (!value || value.length < 6) return true;
        return value === this.resolve(yup.ref("new_password"));
      },
    ),
});
